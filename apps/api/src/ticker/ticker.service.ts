import { Injectable, Logger } from '@nestjs/common';
import { AiProvider } from '../ai/ai.provider.js';

export type TickerWord = {
  tr: string;
  target: string;
  variant: string;
};

export type TickerResponse = {
  source: 'ai' | 'seed';
  words: TickerWord[];
};

const VARIANTS = new Set(['BS', 'HR', 'SR', 'CNR', 'COMMON']);

const SEED: TickerWord[] = [
  { tr: 'merhaba', target: 'zdravo', variant: 'BS' },
  { tr: 'teşekkürler', target: 'hvala', variant: 'COMMON' },
  { tr: 'lütfen', target: 'molim', variant: 'COMMON' },
  { tr: 'evet', target: 'da', variant: 'COMMON' },
  { tr: 'hayır', target: 'ne', variant: 'COMMON' },
  { tr: 'su', target: 'voda', variant: 'COMMON' },
  { tr: 'ekmek', target: 'hljeb', variant: 'BS' },
  { tr: 'ekmek', target: 'kruh', variant: 'HR' },
  { tr: 'süt', target: 'mlijeko', variant: 'BS' },
  { tr: 'ev', target: 'kuća', variant: 'COMMON' },
  { tr: 'okul', target: 'škola', variant: 'COMMON' },
  { tr: 'arkadaş', target: 'prijatelj', variant: 'COMMON' },
  { tr: 'günaydın', target: 'dobro jutro', variant: 'COMMON' },
  { tr: 'iyi geceler', target: 'laku noć', variant: 'COMMON' },
  { tr: 'nasılsın', target: 'kako si', variant: 'COMMON' },
  { tr: 'bir', target: 'jedan', variant: 'COMMON' },
  { tr: 'iki', target: 'dva', variant: 'COMMON' },
  { tr: 'üç', target: 'tri', variant: 'COMMON' },
];

function parseWords(raw: string): TickerWord[] {
  const cleaned = raw
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  const body = start >= 0 ? cleaned.slice(start, end + 1) : cleaned;
  const data = JSON.parse(body) as {
    words?: { tr?: string; target?: string; variant?: string }[];
  };

  const seen = new Set<string>();
  const words: TickerWord[] = [];
  for (const item of data.words || []) {
    const tr = item.tr?.replace(/\s+/g, ' ').trim().slice(0, 40);
    const target = item.target?.replace(/\s+/g, ' ').trim().slice(0, 40);
    const variant = (item.variant || 'COMMON').toUpperCase();
    if (!tr || !target || !VARIANTS.has(variant)) continue;
    const key = `${tr.toLocaleLowerCase('tr')}::${target.toLocaleLowerCase('tr')}`;
    if (seen.has(key)) continue;
    seen.add(key);
    words.push({ tr, target, variant });
  }
  return words;
}

@Injectable()
export class TickerService {
  private readonly logger = new Logger(TickerService.name);
  private cache: { at: number; ttl: number; data: TickerResponse } | null =
    null;
  private inflight: Promise<TickerResponse> | null = null;

  constructor(private readonly ai: AiProvider) {}

  async getWords(): Promise<TickerResponse> {
    if (this.cache && Date.now() - this.cache.at < this.cache.ttl) {
      return this.cache.data;
    }
    if (!this.inflight) {
      this.inflight = this.refresh().finally(() => {
        this.inflight = null;
      });
    }
    return this.inflight;
  }

  private remember(data: TickerResponse, ttl: number) {
    this.cache = { at: Date.now(), ttl, data };
    return data;
  }

  private async refresh(): Promise<TickerResponse> {
    if (!this.ai.hasRemoteModel()) {
      return this.remember({ source: 'seed', words: SEED }, 15 * 60 * 1000);
    }

    try {
      const raw = await this.ai.completePrompt(
        [
          'Türkçe konuşan öğrenciler için günlük kelime şeridi hazırla.',
          '24 kısa kelime veya kalıp üret. Boşnakça (BS), Hırvatça (HR), Sırpça (SR) ve Karadağca (CNR) karışık olsun.',
          'Aynı anlamın varyantı farklıysa ayrı satır yaz (ör. ekmek/hljeb BS, ekmek/kruh HR).',
          'Sadece JSON döndür, markdown yok.',
          'Şema: {"words":[{"tr":"merhaba","target":"zdravo","variant":"BS"}]}',
          'variant yalnızca BS, HR, SR veya CNR. Tekrar etme. Cümle yazma.',
        ].join('\n'),
      );
      const words = parseWords(raw).slice(0, 28);
      if (words.length < 8) throw new Error('YZ kelime listesi kısa');
      this.logger.log(`Kelime şeridi Gemini ile güncellendi (${words.length})`);
      return this.remember({ source: 'ai', words }, 6 * 60 * 60 * 1000);
    } catch (err) {
      this.logger.warn(
        `Kelime şeridi yedek liste: ${err instanceof Error ? err.message : err}`,
      );
      return this.remember({ source: 'seed', words: SEED }, 15 * 60 * 1000);
    }
  }
}
