import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AccountStatus, ReminderKind, Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import { MailService } from '../mail/mail.service.js';
import { CreateEventDto } from './dto/create-event.dto.js';
import { UpdateEventDto } from './dto/update-event.dto.js';

@Injectable()
export class CalendarService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mail: MailService,
  ) {}

  listUpcoming(params?: { take?: number; from?: Date }) {
    const from = params?.from ?? new Date();
    return this.prisma.calendarEvent.findMany({
      where: {
        published: true,
        startAt: { gte: from },
      },
      orderBy: { startAt: 'asc' },
      take: Math.min(params?.take ?? 50, 100),
      include: {
        teacher: { select: { id: true, displayName: true } },
        _count: { select: { enrollments: true } },
      },
    });
  }

  listAll() {
    return this.prisma.calendarEvent.findMany({
      orderBy: { startAt: 'asc' },
      include: {
        teacher: { select: { id: true, displayName: true } },
        _count: { select: { enrollments: true } },
      },
    });
  }

  async getOne(id: string, userId?: string) {
    const event = await this.prisma.calendarEvent.findUnique({
      where: { id },
      include: {
        teacher: { select: { id: true, displayName: true, email: true } },
        _count: { select: { enrollments: true } },
      },
    });
    if (!event || !event.published) {
      throw new NotFoundException('Ders bulunamadı');
    }

    let enrolled = false;
    if (userId) {
      const row = await this.prisma.calendarEnrollment.findUnique({
        where: { eventId_userId: { eventId: id, userId } },
      });
      enrolled = Boolean(row);
    }

    return { ...event, enrolled };
  }

  async create(dto: CreateEventDto, teacherId: string) {
    this.assertTimes(dto.startAt, dto.endAt);
    return this.prisma.calendarEvent.create({
      data: {
        title: dto.title.trim(),
        description: dto.description?.trim(),
        startAt: new Date(dto.startAt),
        endAt: new Date(dto.endAt),
        meetUrl: dto.meetUrl?.trim() || this.suggestMeetPlaceholder(),
        calendarUrl: dto.calendarUrl?.trim(),
        level: dto.level ?? 'A1',
        capacity: dto.capacity ?? 20,
        published: dto.published ?? true,
        teacherId,
      },
      include: {
        teacher: { select: { id: true, displayName: true } },
        _count: { select: { enrollments: true } },
      },
    });
  }

  async update(id: string, dto: UpdateEventDto) {
    await this.ensureEvent(id);
    if (dto.startAt && dto.endAt) {
      this.assertTimes(dto.startAt, dto.endAt);
    }
    return this.prisma.calendarEvent.update({
      where: { id },
      data: {
        ...dto,
        startAt: dto.startAt ? new Date(dto.startAt) : undefined,
        endAt: dto.endAt ? new Date(dto.endAt) : undefined,
        title: dto.title?.trim(),
        description: dto.description?.trim(),
        meetUrl: dto.meetUrl?.trim(),
        calendarUrl: dto.calendarUrl?.trim(),
      },
      include: {
        teacher: { select: { id: true, displayName: true } },
        _count: { select: { enrollments: true } },
      },
    });
  }

  async remove(id: string) {
    await this.ensureEvent(id);
    await this.prisma.calendarEvent.delete({ where: { id } });
    return { message: 'Ders silindi' };
  }

  async enroll(eventId: string, userId: string, status: string, role: string) {
    if (status === AccountStatus.SUSPENDED) {
      throw new ForbiddenException('Hesabınız askıya alınmış');
    }

    const event = await this.ensureEvent(eventId);
    if (!event.published) {
      throw new NotFoundException('Ders bulunamadı');
    }
    if (event.startAt < new Date()) {
      throw new BadRequestException('Bu ders geçmişte');
    }

    const count = await this.prisma.calendarEnrollment.count({
      where: { eventId },
    });
    if (count >= event.capacity) {
      throw new BadRequestException('Kontenjan dolu');
    }

    // Ödeme onayı henüz ACTIVE değilse staff hariç kayıt engeli (iş modeli)
    const staffRoles: Role[] = [
      Role.SUPER_ADMIN,
      Role.MODERATOR,
      Role.TEACHER,
    ];
    const isStaff = staffRoles.includes(role as Role);
    if (!isStaff && status !== AccountStatus.ACTIVE) {
      throw new ForbiddenException(
        'Canlı derse kayıt için hesabınızın aktif olması gerekir',
      );
    }

    try {
      return await this.prisma.calendarEnrollment.create({
        data: { eventId, userId },
        include: {
          event: {
            select: {
              id: true,
              title: true,
              startAt: true,
              meetUrl: true,
            },
          },
        },
      });
    } catch {
      throw new ConflictException('Zaten kayıtlısınız');
    }
  }

  async unenroll(eventId: string, userId: string) {
    await this.prisma.calendarEnrollment.deleteMany({
      where: { eventId, userId },
    });
    return { message: 'Kayıt iptal edildi' };
  }

  myEnrollments(userId: string) {
    return this.prisma.calendarEnrollment.findMany({
      where: { userId, event: { startAt: { gte: new Date() } } },
      orderBy: { event: { startAt: 'asc' } },
      include: {
        event: {
          include: {
            teacher: { select: { id: true, displayName: true } },
          },
        },
      },
    });
  }

  /**
   * 24s ve 1s kala kayıtlı öğrencilere hatırlatma gönderir.
   */
  async processReminders() {
    const now = Date.now();
    const windows: { kind: ReminderKind; minMs: number; maxMs: number }[] = [
      {
        kind: ReminderKind.LESSON_24H,
        minMs: 23 * 60 * 60 * 1000,
        maxMs: 25 * 60 * 60 * 1000,
      },
      {
        kind: ReminderKind.LESSON_1H,
        minMs: 50 * 60 * 1000,
        maxMs: 70 * 60 * 1000,
      },
    ];

    let sent = 0;

    for (const window of windows) {
      const from = new Date(now + window.minMs);
      const to = new Date(now + window.maxMs);

      const events = await this.prisma.calendarEvent.findMany({
        where: {
          published: true,
          startAt: { gte: from, lte: to },
        },
        include: {
          enrollments: {
            include: {
              user: { select: { id: true, email: true, displayName: true } },
            },
          },
        },
      });

      for (const event of events) {
        for (const enrollment of event.enrollments) {
          const exists = await this.prisma.reminderLog.findUnique({
            where: {
              eventId_userId_kind: {
                eventId: event.id,
                userId: enrollment.userId,
                kind: window.kind,
              },
            },
          });
          if (exists) continue;

          await this.mail.sendLessonReminder({
            email: enrollment.user.email,
            displayName: enrollment.user.displayName,
            title: event.title,
            startAt: event.startAt,
            meetUrl: event.meetUrl,
            kind: window.kind === ReminderKind.LESSON_24H ? '24h' : '1h',
          });

          await this.prisma.reminderLog.create({
            data: {
              eventId: event.id,
              userId: enrollment.userId,
              kind: window.kind,
            },
          });
          sent += 1;
        }
      }
    }

    return { sent };
  }

  private assertTimes(startAt: string, endAt: string) {
    const start = new Date(startAt);
    const end = new Date(endAt);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      throw new BadRequestException('Geçersiz tarih');
    }
    if (end <= start) {
      throw new BadRequestException('Bitiş başlangıçtan sonra olmalı');
    }
  }

  private async ensureEvent(id: string) {
    const event = await this.prisma.calendarEvent.findUnique({ where: { id } });
    if (!event) throw new NotFoundException('Ders bulunamadı');
    return event;
  }

  private suggestMeetPlaceholder() {
    return 'https://meet.google.com/new';
  }
}
