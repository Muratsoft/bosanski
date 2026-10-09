import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { GameType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import { AiProvider } from '../ai/ai.provider.js';
import { SaveScoreDto } from './dto/save-score.dto.js';

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function parseJsonPayload<T>(raw: string): T {
  const cleaned = raw
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();
  const start = cleaned.indexOf('{');
  const startArr = cleaned.indexOf('[');
  let body = cleaned;
  if (startArr >= 0 && (start < 0 || startArr < start)) {
    const end = cleaned.lastIndexOf(']');
    body = cleaned.slice(startArr, end + 1);
  } else if (start >= 0) {
    const end = cleaned.lastIndexOf('}');
    body = cleaned.slice(start, end + 1);
  }
  return JSON.parse(body) as T;
}

export type GameOptions = {
  count?: number;
  level?: string;
  variant?: string;
  topic?: string;
  source?: 'ai' | 'dictionary' | 'auto';
};

@Injectable()
export class GamesService {
  private readonly logger = new Logger(GamesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly ai: AiProvider,
  ) {}

  async quiz(opts: GameOptions = {}) {
    const take = Math.min(Math.max(opts.count ?? 8, 4), 20);
    const preferAi = (opts.source ?? 'ai') !== 'dictionary';

    if (preferAi && this.ai.hasRemoteModel()) {
      try {
        const aiQuiz = await this.aiQuiz(take, opts);
        if (aiQuiz.length >= 4) {
          return { source: 'ai' as const, items: aiQuiz };
        }
      } catch (err) {
        this.logger.warn(
          `AI quiz fallback: ${err instanceof Error ? err.message : err}`,
        );
      }
    }

    return {
      source: 'dictionary' as const,
      items: await this.dictionaryQuiz(take),
    };
  }

  async flashcards(opts: GameOptions = {}) {
    const take = Math.min(Math.max(opts.count ?? 10, 4), 30);
    const preferAi = (opts.source ?? 'ai') !== 'dictionary';

    if (preferAi && this.ai.hasRemoteModel()) {
      try {
        const cards = await this.aiFlashcards(take, opts);
        if (cards.length >= 4) {
          return { source: 'ai' as const, items: cards };
        }
      } catch (err) {
        this.logger.warn(
          `AI flashcard fallback: ${err instanceof Error ? err.message : err}`,
        );
      }
    }

    return {
      source: 'dictionary' as const,
      items: await this.dictionaryFlashcards(take),
    };
  }

  async match(opts: GameOptions = {}) {
    const take = Math.min(Math.max(opts.count ?? 6, 4), 12);
    const preferAi = (opts.source ?? 'ai') !== 'dictionary';

    if (preferAi && this.ai.hasRemoteModel()) {
      try {
        const round = await this.aiMatch(take, opts);
        if (round.pairs.length >= 4) {
          return { source: 'ai' as const, ...round };
        }
      } catch (err) {
        this.logger.warn(
          `AI match fallback: ${err instanceof Error ? err.message : err}`,
        );
      }
    }

    return {
      source: 'dictionary' as const,
      ...(await this.dictionaryMatch(take)),
    };
  }

  private levelLabel(opts: GameOptions) {
    return opts.level || 'A1';
  }

  private variantLabel(opts: GameOptions) {
    const v = (opts.variant || 'COMMON').toUpperCase();
    const map: Record<string, string> = {
      COMMON: 'ortak Boşnakça / Sırpça / Hırvatça / Karadağça',
      BS: 'Boşnakça',
      HR: 'Hırvatça',
      SR: 'Sırpça',
      CNR: 'Karadağça',
    };
    return map[v] || map.COMMON;
  }

  private async aiQuiz(count: number, opts: GameOptions) {
    const topic = opts.topic?.trim() || 'günlük konuşma ve temel kelimeler';
    const prompt = [
      `Sen BCS dil öğretmenisin. Seviye: ${this.levelLabel(opts)}. Dil: ${this.variantLabel(opts)}.`,
      `Konu: ${topic}.`,
      `Tam ${count} adet çoktan seçmeli quiz sorusu üret.`,
      'Sadece JSON döndür, markdown yok.',
      'Şema: {"questions":[{"id":"q1","prompt":"...","direction":"TR→BCS veya BCS→TR","choices":["a","b","c","d"],"answer":"doğru seçenek","hint":"kısa ipucu"}]}',
      'Kurallar: choices tam 4 adet olsun; answer choices içinde olsun; Türkçe öğrenenler için uygun olsun.',
    ].join('\n');

    const raw = await this.ai.completePrompt(prompt);
    const data = parseJsonPayload<{
      questions?: {
        id?: string;
        prompt: string;
        direction?: string;
        choices: string[];
        answer: string;
        hint?: string;
      }[];
    }>(raw);

    const questions = (data.questions || [])
      .filter(
        (q) =>
          q.prompt &&
          Array.isArray(q.choices) &&
          q.choices.length >= 2 &&
          q.answer,
      )
      .slice(0, count)
      .map((q, i) => {
        const choices = shuffle([...new Set(q.choices)]).slice(0, 4);
        const answer = choices.includes(q.answer)
          ? q.answer
          : choices[0] || q.answer;
        return {
          id: q.id || `ai-quiz-${i + 1}`,
          prompt: q.prompt,
          direction: q.direction || 'TR→BCS',
          choices: shuffle(
            choices.includes(answer) ? choices : [...choices, answer],
          ).slice(0, 4),
          answer,
          hint: q.hint || null,
        };
      });

    if (questions.length < 4) {
      throw new Error('AI quiz yetersiz soru üretti');
    }
    return questions;
  }

  private async aiFlashcards(count: number, opts: GameOptions) {
    const topic = opts.topic?.trim() || 'temel kelime ve kalıplar';
    const prompt = [
      `Sen BCS dil öğretmenisin. Seviye: ${this.levelLabel(opts)}. Dil: ${this.variantLabel(opts)}.`,
      `Konu: ${topic}.`,
      `Tam ${count} flashcard üret.`,
      'Sadece JSON döndür, markdown yok.',
      'Şema: {"cards":[{"id":"c1","front":"Türkçe","back":"BCS","variant":"COMMON","exampleTr":"...","exampleTarget":"..."}]}',
      'front Türkçe, back hedef dil olsun. Kısa örnek cümle ekle.',
    ].join('\n');

    const raw = await this.ai.completePrompt(prompt);
    const data = parseJsonPayload<{
      cards?: {
        id?: string;
        front: string;
        back: string;
        variant?: string;
        exampleTr?: string;
        exampleTarget?: string;
        notes?: string;
      }[];
    }>(raw);

    const cards = (data.cards || [])
      .filter((c) => c.front && c.back)
      .slice(0, count)
      .map((c, i) => ({
        id: c.id || `ai-card-${i + 1}`,
        front: c.front,
        back: c.back,
        variant: c.variant || opts.variant || 'COMMON',
        exampleTr: c.exampleTr || null,
        exampleTarget: c.exampleTarget || null,
        notes: c.notes || null,
      }));

    if (cards.length < 4) {
      throw new Error('AI flashcard yetersiz');
    }
    return cards;
  }

  private async aiMatch(count: number, opts: GameOptions) {
    const topic = opts.topic?.trim() || 'temel kelimeler';
    const prompt = [
      `Sen BCS dil öğretmenisin. Seviye: ${this.levelLabel(opts)}. Dil: ${this.variantLabel(opts)}.`,
      `Konu: ${topic}.`,
      `Tam ${count} Türkçe↔BCS eşleştirme çifti üret.`,
      'Sadece JSON döndür, markdown yok.',
      'Şema: {"pairs":[{"id":"p1","tr":"merhaba","target":"zdravo"}]}',
    ].join('\n');

    const raw = await this.ai.completePrompt(prompt);
    const data = parseJsonPayload<{
      pairs?: { id?: string; tr: string; target: string }[];
    }>(raw);

    const pairs = (data.pairs || [])
      .filter((p) => p.tr && p.target)
      .slice(0, count)
      .map((p, i) => ({
        id: p.id || `ai-pair-${i + 1}`,
        tr: p.tr,
        target: p.target,
      }));

    if (pairs.length < 4) {
      throw new Error('AI eşleştirme yetersiz');
    }

    return {
      pairs,
      left: shuffle(pairs.map((p) => ({ id: p.id, label: p.tr }))),
      right: shuffle(pairs.map((p) => ({ id: p.id, label: p.target }))),
    };
  }

  private async dictionaryQuiz(take: number) {
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

  private async dictionaryFlashcards(take: number) {
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

  private async dictionaryMatch(take: number) {
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
