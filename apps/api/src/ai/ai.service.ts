import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  AccountStatus,
  AiMode,
  LangVariant,
  Role,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import { AiProvider } from './ai.provider.js';
import { ChatDto } from './dto/chat.dto.js';

@Injectable()
export class AiService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly provider: AiProvider,
    private readonly config: ConfigService,
  ) {}

  async usage(userId: string, role: string, status: string) {
    const day = this.todayKey();
    const row = await this.prisma.aiUsageDay.findUnique({
      where: { userId_day: { userId, day } },
    });
    const limit = this.dailyLimit(role, status);
    return {
      day,
      used: row?.count ?? 0,
      limit,
      remaining: Math.max(0, limit - (row?.count ?? 0)),
      provider: this.activeProviderLabel(),
    };
  }

  listConversations(userId: string) {
    return this.prisma.aiConversation.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
      take: 30,
      select: {
        id: true,
        title: true,
        mode: true,
        level: true,
        variant: true,
        updatedAt: true,
      },
    });
  }

  async getConversation(userId: string, id: string) {
    const conv = await this.prisma.aiConversation.findFirst({
      where: { id, userId },
      include: {
        messages: { orderBy: { createdAt: 'asc' } },
      },
    });
    if (!conv) throw new NotFoundException('Sohbet bulunamadı');
    return conv;
  }

  async chat(
    userId: string,
    role: string,
    status: string,
    dto: ChatDto,
  ) {
    await this.assertQuota(userId, role, status);

    const mode = dto.mode ?? AiMode.GENERAL;
    const level = dto.level ?? 'A1';
    const variant = dto.variant ?? LangVariant.COMMON;

    let conversation = dto.conversationId
      ? await this.prisma.aiConversation.findFirst({
          where: { id: dto.conversationId, userId },
        })
      : null;

    if (!conversation) {
      conversation = await this.prisma.aiConversation.create({
        data: {
          userId,
          mode,
          level,
          variant,
          lessonId: dto.lessonId,
          title: dto.message.slice(0, 60),
        },
      });
    }

    const historyRows = await this.prisma.aiMessage.findMany({
      where: { conversationId: conversation.id },
      orderBy: { createdAt: 'asc' },
      take: 20,
    });

    const history = historyRows
      .filter((m) => m.role === 'user' || m.role === 'assistant')
      .map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      }));

    const reply = await this.provider.chat({
      message: dto.message.trim(),
      level: conversation.level || level,
      variant: conversation.variant || variant,
      lessonContext: dto.lessonContext,
      history,
    });

    await this.prisma.$transaction([
      this.prisma.aiMessage.create({
        data: {
          conversationId: conversation.id,
          role: 'user',
          content: dto.message.trim(),
        },
      }),
      this.prisma.aiMessage.create({
        data: {
          conversationId: conversation.id,
          role: 'assistant',
          content: reply,
        },
      }),
      this.prisma.aiConversation.update({
        where: { id: conversation.id },
        data: { updatedAt: new Date() },
      }),
    ]);

    await this.bumpUsage(userId);

    return {
      conversationId: conversation.id,
      reply,
      usage: await this.usage(userId, role, status),
    };
  }

  private dailyLimit(role: string, status: string) {
    const staffRoles: Role[] = [
      Role.SUPER_ADMIN,
      Role.MODERATOR,
      Role.TEACHER,
    ];
    const staff = staffRoles.includes(role as Role);
    if (staff) return 1000;

    if (status === AccountStatus.ACTIVE) {
      return Number(this.config.get('AI_DAILY_LIMIT_ACTIVE') || 40);
    }

    // PENDING demo
    return Number(this.config.get('AI_DAILY_LIMIT_DEMO') || 5);
  }

  private async assertQuota(userId: string, role: string, status: string) {
    if (status === AccountStatus.SUSPENDED) {
      throw new ForbiddenException('Hesabınız askıya alınmış');
    }
    const { used, limit } = await this.usage(userId, role, status);
    if (used >= limit) {
      throw new ForbiddenException(
        `Günlük AI kotası doldu (${limit}). ACTIVE üyelikte daha yüksek limit.`,
      );
    }
  }

  private async bumpUsage(userId: string) {
    const day = this.todayKey();
    await this.prisma.aiUsageDay.upsert({
      where: { userId_day: { userId, day } },
      create: { userId, day, count: 1 },
      update: { count: { increment: 1 } },
    });
  }

  private todayKey() {
    return new Date().toISOString().slice(0, 10);
  }

  private activeProviderLabel() {
    if (this.config.get('OPENAI_API_KEY')) return 'openai';
    if (this.config.get('GEMINI_API_KEY')) return 'gemini';
    return 'offline';
  }
}
