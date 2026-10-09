import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateCategoryDto } from './dto/create-category.dto.js';
import { UpdateCategoryDto } from './dto/update-category.dto.js';
import { CreateLessonDto } from './dto/create-lesson.dto.js';
import { UpdateLessonDto } from './dto/update-lesson.dto.js';

@Injectable()
export class LessonsService {
  constructor(private readonly prisma: PrismaService) {}

  listCategories(publishedOnly = true) {
    return this.prisma.category.findMany({
      where: publishedOnly ? { published: true } : undefined,
      orderBy: [{ sortOrder: 'asc' }, { title: 'asc' }],
      include: {
        _count: { select: { lessons: true } },
      },
    });
  }

  async getCategory(slug: string, publishedOnly = true) {
    const category = await this.prisma.category.findUnique({
      where: { slug },
      include: {
        lessons: {
          where: publishedOnly ? { published: true } : undefined,
          orderBy: [{ sortOrder: 'asc' }, { title: 'asc' }],
        },
      },
    });
    if (!category || (publishedOnly && !category.published)) {
      throw new NotFoundException('Kategori bulunamadı');
    }
    return category;
  }

  async createCategory(dto: CreateCategoryDto) {
    try {
      return await this.prisma.category.create({
        data: {
          ...dto,
          published: dto.published ?? true,
          sortOrder: dto.sortOrder ?? 0,
        },
      });
    } catch {
      throw new ConflictException('Slug zaten kullanılıyor');
    }
  }

  async updateCategory(id: string, dto: UpdateCategoryDto) {
    await this.ensureCategory(id);
    return this.prisma.category.update({ where: { id }, data: dto });
  }

  async removeCategory(id: string) {
    await this.ensureCategory(id);
    await this.prisma.category.delete({ where: { id } });
    return { message: 'Kategori silindi' };
  }

  async listLessons(params: {
    categoryId?: string;
    q?: string;
    level?: string;
    publishedOnly?: boolean;
    skip?: number;
    take?: number;
  }) {
    const where: Prisma.LessonWhereInput = {};
    if (params.publishedOnly !== false) where.published = true;
    if (params.categoryId) where.categoryId = params.categoryId;
    if (params.level) where.level = params.level;
    if (params.q?.trim()) {
      const q = params.q.trim();
      where.OR = [
        { title: { contains: q } },
        { summary: { contains: q } },
        { content: { contains: q } },
      ];
    }

    const take = Math.min(params.take ?? 20, 100);
    const skip = params.skip ?? 0;

    const [total, items] = await this.prisma.$transaction([
      this.prisma.lesson.count({ where }),
      this.prisma.lesson.findMany({
        where,
        skip,
        take,
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
        include: {
          category: { select: { id: true, title: true, slug: true } },
        },
      }),
    ]);

    return { total, items };
  }

  async getLesson(slug: string, publishedOnly = true) {
    const lesson = await this.prisma.lesson.findUnique({
      where: { slug },
      include: {
        category: true,
        media: { orderBy: { sortOrder: 'asc' } },
      },
    });
    if (!lesson || (publishedOnly && !lesson.published)) {
      throw new NotFoundException('Ders bulunamadı');
    }
    return lesson;
  }

  async createLesson(dto: CreateLessonDto, authorId?: string) {
    await this.ensureCategory(dto.categoryId);
    try {
      return await this.prisma.lesson.create({
        data: {
          ...dto,
          authorId,
          published: dto.published ?? false,
          level: dto.level ?? 'A1',
          sortOrder: dto.sortOrder ?? 0,
        },
        include: {
          category: { select: { id: true, title: true, slug: true } },
        },
      });
    } catch {
      throw new ConflictException('Slug zaten kullanılıyor');
    }
  }

  async updateLesson(id: string, dto: UpdateLessonDto) {
    await this.ensureLesson(id);
    if (dto.categoryId) {
      await this.ensureCategory(dto.categoryId);
    }
    return this.prisma.lesson.update({
      where: { id },
      data: dto,
      include: {
        category: { select: { id: true, title: true, slug: true } },
      },
    });
  }

  async removeLesson(id: string) {
    await this.ensureLesson(id);
    await this.prisma.lesson.delete({ where: { id } });
    return { message: 'Ders silindi' };
  }

  private async ensureCategory(id: string) {
    const cat = await this.prisma.category.findUnique({ where: { id } });
    if (!cat) throw new NotFoundException('Kategori bulunamadı');
    return cat;
  }

  private async ensureLesson(id: string) {
    const lesson = await this.prisma.lesson.findUnique({ where: { id } });
    if (!lesson) throw new NotFoundException('Ders bulunamadı');
    return lesson;
  }
}
