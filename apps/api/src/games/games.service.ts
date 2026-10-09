import { BadRequestException, Injectable } from '@nestjs/common';
import { GameType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import { SaveScoreDto } from './dto/save-score.dto.js';

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

@Injectable()
export class GamesService {
  constructor(private readonly prisma: PrismaService) {}

  async quiz(count = 8) {
    const take = Math.min(Math.max(count, 4), 20);
    const words = await this.prisma.dictionaryEntry.findMany({
      where: { published: true },
      take: 200,
    });
    if (words.length < 4) {
      throw new BadRequestException('Quiz için yeterli sözlük kaydı yok');
    }

    const picked = shuffle(words).slice(0, Math.min(take, words.length));
    return picked.map((w, index) => {
      const askTr = index % 2 === 0;
      const prompt = askTr ? w.wordTr : w.wordTarget;
      const answer = askTr ? w.wordTarget : w.wordTr;
      const pool = words
        .filter((x) => x.id !== w.id)
        .map((x) => (askTr ? x.wordTarget : x.wordTr));
      const distractors = shuffle([...new Set(pool)])
        .filter((x) => x !== answer)
        .slice(0, 3);
      const choices = shuffle([answer, ...distractors]);

      return {
        id: w.id,
        prompt,
        direction: askTr ? 'TR→BCS' : 'BCS→TR',
        choices,
        answer,
        hint: w.partOfSpeech,
      };
    });
  }

  async flashcards(count = 10) {
    const take = Math.min(Math.max(count, 4), 30);
    const words = await this.prisma.dictionaryEntry.findMany({
      where: { published: true },
      take: 200,
    });
    return shuffle(words)
      .slice(0, Math.min(take, words.length))
      .map((w) => ({
        id: w.id,
        front: w.wordTr,
        back: w.wordTarget,
        variant: w.variant,
        exampleTr: w.exampleTr,
        exampleTarget: w.exampleTarget,
        notes: w.notes,
      }));
  }

  async match(count = 6) {
    const take = Math.min(Math.max(count, 4), 12);
    const words = await this.prisma.dictionaryEntry.findMany({
      where: { published: true },
      take: 200,
    });
    if (words.length < 4) {
      throw new BadRequestException('Eşleştirme için yeterli kelime yok');
    }
    const pairs = shuffle(words)
      .slice(0, Math.min(take, words.length))
      .map((w) => ({
        id: w.id,
        tr: w.wordTr,
        target: w.wordTarget,
      }));
    return {
      pairs,
      left: shuffle(pairs.map((p) => ({ id: p.id, label: p.tr }))),
      right: shuffle(pairs.map((p) => ({ id: p.id, label: p.target }))),
    };
  }

  async saveScore(userId: string, dto: SaveScoreDto) {
    if (dto.score > dto.total) {
      throw new BadRequestException('Skor toplamdan büyük olamaz');
    }
    return this.prisma.gameScore.create({
      data: {
        userId,
        gameType: dto.gameType,
        score: dto.score,
        total: dto.total,
        durationSec: dto.durationSec,
      },
    });
  }

  async leaderboard(gameType?: GameType, take = 10) {
    const scores = await this.prisma.gameScore.findMany({
      where: gameType ? { gameType } : undefined,
      orderBy: [{ score: 'desc' }, { durationSec: 'asc' }, { createdAt: 'desc' }],
      take: Math.min(take, 50),
      include: {
        user: { select: { id: true, displayName: true } },
      },
    });
    return scores.map((s) => ({
      id: s.id,
      gameType: s.gameType,
      score: s.score,
      total: s.total,
      durationSec: s.durationSec,
      createdAt: s.createdAt,
      user: s.user,
      percent: Math.round((s.score / Math.max(s.total, 1)) * 100),
    }));
  }

  myScores(userId: string) {
    return this.prisma.gameScore.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
  }
}
