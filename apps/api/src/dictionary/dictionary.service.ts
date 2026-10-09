import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { LangVariant, type Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import { AiProvider } from '../ai/ai.provider.js';
import { CreateDictionaryDto } from './dto/create-dictionary.dto.js';
import { UpdateDictionaryDto } from './dto/update-dictionary.dto.js';

@Injectable()
export class DictionaryService {
  private readonly logger = new Logger(DictionaryService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly ai: AiProvider,
  ) {}

  async search(params: {
    q?: string;
    variant?: LangVariant;
    publishedOnly?: boolean;
    skip?: number;
    take?: number;
  }) {
    const where: Prisma.DictionaryEntryWhereInput = {};
    if (params.publishedOnly !== false) {
      where.published = true;
    }
    if (params.variant) {
      where.variant = params.variant;
    }
    if (params.q?.trim()) {
      const q = params.q.trim();
      where.OR = [
        { wordTr: { contains: q } },
        { wordTarget: { contains: q } },
        { exampleTr: { contains: q } },
        { exampleTarget: { contains: q } },
      ];
    }

    const take = Math.min(params.take ?? 30, 100);
    const skip = params.skip ?? 0;

    const [total, items] = await this.prisma.$transaction([
      this.prisma.dictionaryEntry.count({ where }),
      this.prisma.dictionaryEntry.findMany({
        where,
        skip,
        take,
        orderBy: [{ wordTr: 'asc' }],
      }),
    ]);

    return { total, items };
  }

  async findOne(id: string) {
    const entry = await this.prisma.dictionaryEntry.findUnique({
      where: { id },
    });
    if (!entry) {
      throw new NotFoundException('Sözlük kaydı bulunamadı');
    }
    return entry;
  }

  /**
   * Sözlükte yoksa veya ek açıklama istenince Gemini ile kelime/cümle açıklar.
   */
  async explainWithAi(q: string, variant?: LangVariant) {
    const term = q?.trim();
    if (!term || term.length < 1) {
      throw new BadRequestException('Aranacak kelime gerekli');
    }

    const local = await this.search({
      q: term,
      variant,
      publishedOnly: true,
      take: 8,
    });

    if (!this.ai.hasRemoteModel()) {
      return {
        source: 'dictionary' as const,
        query: term,
        matches: local.items,
        explanation:
          local.items.length > 0
            ? 'Sözlükte bulunan karşılıklar aşağıda. Yapay zeka anahtarı yok; ek açıklama üretilemedi.'
            : 'Sözlükte sonuç yok ve yapay zeka bağlı değil.',
      };
    }

    const variantName =
      variant === 'BS'
        ? 'Boşnakça'
        : variant === 'HR'
          ? 'Hırvatça'
          : variant === 'SR'
            ? 'Sırpça'
            : variant === 'CNR'
              ? 'Karadağça'
              : 'ortak Boşnakça / Sırpça / Hırvatça / Karadağça';

    const known = local.items
      .slice(0, 5)
      .map(
        (w) =>
          `- ${w.wordTr} → ${w.wordTarget} (${w.variant})${w.exampleTr ? `; ör. ${w.exampleTr}` : ''}`,
      )
      .join('\n');

    const prompt = [
      'Sen Türkçe konuşanlara Boşnakça, Sırpça, Hırvatça ve Karadağça öğreten bir dil öğretmenisin.',
      `Odak varyant: ${variantName}.`,
      `Kullanıcı kelimesi/ifadesi: "${term}"`,
      known
        ? `Sözlükte bulunan kayıtlar:\n${known}`
        : 'Sözlükte doğrudan kayıt bulunamadı.',
      'Türkçe açıkla. Hedef dilde 2 örnek cümle ver ve altına Türkçe çevirisini yaz.',
      'Varyant farkı varsa (ör. hljeb / kruh / hleb) belirt.',
      'Kısa ve net ol. Markdown kullanabilirsin.',
    ].join('\n');

    try {
      const explanation = await this.ai.completePrompt(prompt);
      return {
        source: 'ai' as const,
        query: term,
        matches: local.items,
        explanation,
      };
    } catch (err) {
      this.logger.warn(
        `Sözlük AI hata: ${err instanceof Error ? err.message : err}`,
      );
      return {
        source: 'dictionary' as const,
        query: term,
        matches: local.items,
        explanation:
          local.items.length > 0
            ? 'Yapay zeka şu an yanıt veremedi; sözlük sonuçları aşağıda.'
            : 'Yapay zeka yanıt veremedi ve sözlükte sonuç yok. Biraz sonra tekrar dene.',
      };
    }
  }

  create(dto: CreateDictionaryDto, authorId?: string) {
    return this.prisma.dictionaryEntry.create({
      data: {
        ...dto,
        authorId,
        published: dto.published ?? true,
      },
    });
  }

  async update(id: string, dto: UpdateDictionaryDto) {
    await this.findOne(id);
    return this.prisma.dictionaryEntry.update({
      where: { id },
      data: dto,
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.dictionaryEntry.delete({ where: { id } });
    return { message: 'Silindi' };
  }
}
