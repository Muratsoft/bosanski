import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AccountStatus, type Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateTopicDto } from './dto/create-topic.dto.js';
import { CreateEntryDto } from './dto/create-entry.dto.js';

function slugify(title: string) {
  const base = title
    .toLocaleLowerCase('tr-TR')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9ğüşıöç\s-]/gi, '')
    .replace(/[ğ]/g, 'g')
    .replace(/[ü]/g, 'u')
    .replace(/[ş]/g, 's')
    .replace(/[ı]/g, 'i')
    .replace(/[ö]/g, 'o')
    .replace(/[ç]/g, 'c')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 80);
  return base || `baslik-${Date.now()}`;
}

@Injectable()
export class ForumService {
  constructor(private readonly prisma: PrismaService) {}

  async listTopics(params?: {
    q?: string;
    skip?: number;
    take?: number;
    includeHidden?: boolean;
  }) {
    const where: Prisma.ForumTopicWhereInput = {};
    if (!params?.includeHidden) where.hidden = false;
    if (params?.q?.trim()) {
      where.title = { contains: params.q.trim() };
    }

    const take = Math.min(params?.take ?? 40, 100);
    const skip = params?.skip ?? 0;

    const [total, items] = await this.prisma.$transaction([
      this.prisma.forumTopic.count({ where }),
      this.prisma.forumTopic.findMany({
        where,
        skip,
        take,
        orderBy: [{ lastEntryAt: 'desc' }, { createdAt: 'desc' }],
        include: {
          author: { select: { id: true, displayName: true } },
          _count: { select: { entries: true } },
        },
      }),
    ]);

    return { total, items };
  }

  async feed(take = 20) {
    const entries = await this.prisma.forumEntry.findMany({
      where: { hidden: false, topic: { hidden: false } },
      take: Math.min(take, 50),
      orderBy: { createdAt: 'desc' },
      include: {
        author: { select: { id: true, displayName: true } },
        topic: { select: { id: true, title: true, slug: true } },
      },
    });
    return entries;
  }

  async getTopic(slug: string, includeHidden = false) {
    const topic = await this.prisma.forumTopic.findUnique({
      where: { slug },
      include: {
        author: { select: { id: true, displayName: true } },
        entries: {
          where: includeHidden ? undefined : { hidden: false },
          orderBy: { createdAt: 'asc' },
          include: {
            author: { select: { id: true, displayName: true } },
          },
        },
      },
    });
    if (!topic || (!includeHidden && topic.hidden)) {
      throw new NotFoundException('Başlık bulunamadı');
    }
    return topic;
  }

  async createTopic(
    dto: CreateTopicDto,
    userId: string,
    userStatus: string,
  ) {
    this.assertCanPost(userStatus);

    let slug = slugify(dto.title);
    const exists = await this.prisma.forumTopic.findUnique({ where: { slug } });
    if (exists) {
      slug = `${slug}-${Date.now().toString(36)}`;
    }

    const now = new Date();
    return this.prisma.$transaction(async (tx) => {
      const topic = await tx.forumTopic.create({
        data: {
          title: dto.title.trim(),
          slug,
          authorId: userId,
          entryCount: 1,
          lastEntryAt: now,
        },
      });

      const entry = await tx.forumEntry.create({
        data: {
          topicId: topic.id,
          authorId: userId,
          body: dto.body.trim(),
        },
        include: {
          author: { select: { id: true, displayName: true } },
        },
      });

      return { ...topic, entries: [entry] };
    });
  }

  async addEntry(
    slug: string,
    dto: CreateEntryDto,
    userId: string,
    userStatus: string,
  ) {
    this.assertCanPost(userStatus);
    const topic = await this.prisma.forumTopic.findUnique({ where: { slug } });
    if (!topic || topic.hidden) {
      throw new NotFoundException('Başlık bulunamadı');
    }
    if (topic.locked) {
      throw new ForbiddenException('Bu başlık kilitli');
    }

    const now = new Date();
    return this.prisma.$transaction(async (tx) => {
      const entry = await tx.forumEntry.create({
        data: {
          topicId: topic.id,
          authorId: userId,
          body: dto.body.trim(),
        },
        include: {
          author: { select: { id: true, displayName: true } },
          topic: { select: { id: true, title: true, slug: true } },
        },
      });

      await tx.forumTopic.update({
        where: { id: topic.id },
        data: {
          entryCount: { increment: 1 },
          lastEntryAt: now,
        },
      });

      return entry;
    });
  }

  async vote(entryId: string, userId: string, value: 1 | -1) {
    const entry = await this.prisma.forumEntry.findUnique({
      where: { id: entryId },
    });
    if (!entry || entry.hidden) {
      throw new NotFoundException('Entry bulunamadı');
    }

    const existing = await this.prisma.forumVote.findUnique({
      where: { entryId_userId: { entryId, userId } },
    });

    if (existing?.value === value) {
      await this.prisma.$transaction([
        this.prisma.forumVote.delete({ where: { id: existing.id } }),
        this.prisma.forumEntry.update({
          where: { id: entryId },
          data:
            value === 1
              ? { upvotes: { decrement: 1 } }
              : { downvotes: { decrement: 1 } },
        }),
      ]);
      return this.prisma.forumEntry.findUnique({ where: { id: entryId } });
    }

    if (existing) {
      await this.prisma.$transaction([
        this.prisma.forumVote.update({
          where: { id: existing.id },
          data: { value },
        }),
        this.prisma.forumEntry.update({
          where: { id: entryId },
          data:
            value === 1
              ? { upvotes: { increment: 1 }, downvotes: { decrement: 1 } }
              : { upvotes: { decrement: 1 }, downvotes: { increment: 1 } },
        }),
      ]);
    } else {
      await this.prisma.$transaction([
        this.prisma.forumVote.create({
          data: { entryId, userId, value },
        }),
        this.prisma.forumEntry.update({
          where: { id: entryId },
          data:
            value === 1
              ? { upvotes: { increment: 1 } }
              : { downvotes: { increment: 1 } },
        }),
      ]);
    }

    return this.prisma.forumEntry.findUnique({ where: { id: entryId } });
  }

  async report(entryId: string, reporterId: string, reason: string) {
    const entry = await this.prisma.forumEntry.findUnique({
      where: { id: entryId },
    });
    if (!entry) throw new NotFoundException('Entry bulunamadı');

    return this.prisma.forumReport.create({
      data: { entryId, reporterId, reason: reason.trim() },
    });
  }

  async hideEntry(entryId: string, actorId: string) {
    const entry = await this.prisma.forumEntry.update({
      where: { id: entryId },
      data: { hidden: true },
    });
    await this.prisma.auditLog.create({
      data: {
        actorId,
        action: 'FORUM_ENTRY_HIDDEN',
        entityType: 'ForumEntry',
        entityId: entryId,
      },
    });
    return entry;
  }

  async hideTopic(id: string, actorId: string) {
    const topic = await this.prisma.forumTopic.update({
      where: { id },
      data: { hidden: true },
    });
    await this.prisma.auditLog.create({
      data: {
        actorId,
        action: 'FORUM_TOPIC_HIDDEN',
        entityType: 'ForumTopic',
        entityId: id,
      },
    });
    return topic;
  }

  async listReports() {
    return this.prisma.forumReport.findMany({
      where: { resolved: false },
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: {
        reporter: { select: { id: true, displayName: true } },
        entry: {
          include: {
            author: { select: { id: true, displayName: true } },
            topic: { select: { id: true, title: true, slug: true } },
          },
        },
      },
    });
  }

  async resolveReport(id: string) {
    return this.prisma.forumReport.update({
      where: { id },
      data: { resolved: true },
    });
  }

  private assertCanPost(status: string) {
    if (status === AccountStatus.SUSPENDED) {
      throw new ForbiddenException('Hesabınız askıya alınmış');
    }
    if (
      status !== AccountStatus.ACTIVE &&
      status !== AccountStatus.PENDING
    ) {
      throw new ForbiddenException('Yazma yetkiniz yok');
    }
  }
}
