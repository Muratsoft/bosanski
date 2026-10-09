import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateHomeworkDto } from './dto/create-homework.dto.js';
import { SubmitHomeworkDto } from './dto/submit-homework.dto.js';

const STAFF: Role[] = [Role.SUPER_ADMIN, Role.MODERATOR, Role.TEACHER];

@Injectable()
export class HomeworkService {
  constructor(private readonly prisma: PrismaService) {}

  private isStaff(role: string) {
    return STAFF.includes(role as Role);
  }

  async create(dto: CreateHomeworkDto, authorId: string, role: string) {
    const group = await this.prisma.classGroup.findUnique({
      where: { id: dto.groupId },
    });
    if (!group) throw new NotFoundException('Grup bulunamadı');
    if (!this.isStaff(role) && group.teacherId !== authorId) {
      throw new ForbiddenException('Ödev oluşturamazsın');
    }
    return this.prisma.homework.create({
      data: {
        groupId: dto.groupId,
        title: dto.title,
        description: dto.description,
        attachmentUrl: dto.attachmentUrl,
        attachmentName: dto.attachmentName,
        dueAt: dto.dueAt ? new Date(dto.dueAt) : null,
        published: dto.published ?? true,
        authorId,
      },
    });
  }

  async listForGroup(groupId: string, userId: string, role: string) {
    const group = await this.prisma.classGroup.findUnique({
      where: { id: groupId },
      include: { members: true },
    });
    if (!group) throw new NotFoundException('Grup bulunamadı');
    const allowed =
      this.isStaff(role) ||
      group.teacherId === userId ||
      group.members.some((m) => m.userId === userId);
    if (!allowed) throw new ForbiddenException('Bu grubun ödevlerini göremezsin');

    const homeworks = await this.prisma.homework.findMany({
      where: {
        groupId,
        ...(this.isStaff(role) || group.teacherId === userId
          ? {}
          : { published: true }),
      },
      orderBy: [{ dueAt: 'asc' }, { createdAt: 'desc' }],
      include: {
        submissions: {
          include: {
            user: { select: { id: true, displayName: true, email: true } },
          },
        },
      },
    });

    return homeworks.map((h) => ({
      ...h,
      mySubmission: h.submissions.find((s) => s.userId === userId) || null,
      submissions:
        this.isStaff(role) || group.teacherId === userId ? h.submissions : undefined,
    }));
  }

  async submit(
    homeworkId: string,
    userId: string,
    dto: SubmitHomeworkDto,
  ) {
    const homework = await this.prisma.homework.findUnique({
      where: { id: homeworkId },
      include: { group: { include: { members: true } } },
    });
    if (!homework) throw new NotFoundException('Ödev bulunamadı');
    const member = homework.group.members.some((m) => m.userId === userId);
    if (!member) throw new ForbiddenException('Bu grubun üyesi değilsin');

    return this.prisma.homeworkSubmission.upsert({
      where: {
        homeworkId_userId: { homeworkId, userId },
      },
      create: {
        homeworkId,
        userId,
        done: dto.done ?? true,
        note: dto.note,
        fileUrl: dto.fileUrl,
      },
      update: {
        done: dto.done ?? true,
        note: dto.note,
        fileUrl: dto.fileUrl,
        completedAt: new Date(),
      },
    });
  }

  async teacherInbox(teacherId: string, role: string) {
    if (!this.isStaff(role)) throw new ForbiddenException();
    return this.prisma.homework.findMany({
      where: {
        OR: [{ authorId: teacherId }, { group: { teacherId } }],
      },
      orderBy: { createdAt: 'desc' },
      take: 30,
      include: {
        group: { select: { name: true, slug: true } },
        submissions: {
          where: { done: true },
          include: {
            user: { select: { id: true, displayName: true, email: true } },
          },
        },
        _count: { select: { submissions: true } },
      },
    });
  }
}
