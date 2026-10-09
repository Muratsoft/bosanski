import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { AiProvider } from '../ai/ai.provider.js';
import { GamesService } from '../games/games.service.js';

@Injectable()
export class SelfTestService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ai: AiProvider,
    private readonly games: GamesService,
  ) {}

  async start(userId: string, level = 'A1') {
    const quiz = await this.games.quiz({
      count: 5,
      level,
      variant: 'COMMON',
      topic: 'kendini sına — temel kelime ve kalıplar',
      source: 'ai',
    });
    return {
      level,
      source: quiz.source,
      questions: quiz.items.map(({ answer: _a, ...rest }) => rest),
      // cevaplar sunucuda tutulmaz; client answer ile submit eder — güvenlik için
      // ikinci istekte soruları yeniden üretmeyiz, answer client'tan gelir ve AI özetler
      answerKey: quiz.items.map((q) => ({ id: q.id, answer: q.answer })),
    };
  }

  async submit(
    userId: string,
    body: {
      level?: string;
      answers: { id: string; chosen: string; correctAnswer: string }[];
    },
  ) {
    const total = body.answers.length || 1;
    const score = body.answers.filter(
      (a) => a.chosen.trim().toLocaleLowerCase('tr-TR') ===
        a.correctAnswer.trim().toLocaleLowerCase('tr-TR'),
    ).length;

    const membership = await this.prisma.classGroupMember.findFirst({
      where: { userId },
      include: { group: true },
      orderBy: { joinedAt: 'desc' },
    });
    const teacherId = membership?.group.teacherId || null;

    let summary = `Skor: ${score}/${total} (%${Math.round((score / total) * 100)})`;
    if (this.ai.hasRemoteModel()) {
      try {
        summary = await this.ai.completePrompt(
          [
            'Öğrenci kendini sınadı. Kısa Türkçe öğretmen özeti yaz (3-5 cümle).',
            `Seviye: ${body.level || 'A1'}`,
            `Skor: ${score}/${total}`,
            `Cevaplar: ${JSON.stringify(body.answers)}`,
            'Güçlü / zayıf yanları belirt, 1 pratik öneri ver.',
          ].join('\n'),
        );
      } catch {
        // keep basic summary
      }
    }

    const row = await this.prisma.selfTestResult.create({
      data: {
        studentId: userId,
        teacherId,
        level: body.level || 'A1',
        score,
        total,
        summary,
        detailJson: JSON.stringify(body.answers),
      },
      include: {
        student: { select: { displayName: true, email: true } },
        teacher: { select: { displayName: true, email: true } },
      },
    });

    return row;
  }

  teacherFeed(teacherId: string) {
    return this.prisma.selfTestResult.findMany({
      where: { teacherId },
      orderBy: { createdAt: 'desc' },
      take: 40,
      include: {
        student: { select: { id: true, displayName: true, email: true } },
      },
    });
  }
}
