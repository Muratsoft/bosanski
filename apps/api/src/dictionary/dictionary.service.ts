import { Injectable, NotFoundException } from '@nestjs/common';
import { LangVariant, type Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateDictionaryDto } from './dto/create-dictionary.dto.js';
import { UpdateDictionaryDto } from './dto/update-dictionary.dto.js';

@Injectable()
export class DictionaryService {
  constructor(private readonly prisma: PrismaService) {}

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
