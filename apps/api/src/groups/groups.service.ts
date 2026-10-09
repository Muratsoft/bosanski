import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateGroupDto } from './dto/create-group.dto.js';
import { CreateMaterialDto } from './dto/create-material.dto.js';

function slugify(input: string) {
  return input
    .toLocaleLowerCase('tr-TR')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60);
}

const STAFF: Role[] = [Role.SUPER_ADMIN, Role.MODERATOR, Role.TEACHER];

@Injectable()
export class GroupsService {
  constructor(private readonly prisma: PrismaService) {}

  private isStaff(role: string) {
    return STAFF.includes(role as Role);
  }

  listPublished() {
    return this.prisma.classGroup.findMany({
      where: { published: true },
      orderBy: [{ createdAt: 'desc' }],
      include: {
        teacher: { select: { id: true, displayName: true } },
        _count: { select: { members: true, materials: true } },
      },
    });
  }

  async listMine(userId: string, role: string) {
    if (this.isStaff(role)) {
      return this.prisma.classGroup.findMany({
        orderBy: [{ createdAt: 'desc' }],
        include: {
          teacher: { select: { id: true, displayName: true } },
          _count: { select: { members: true, materials: true } },
        },
      });
    }
    return this.prisma.classGroup.findMany({
      where: {
        OR: [
          { members: { some: { userId } } },
          { teacherId: userId },
        ],
      },
      orderBy: [{ createdAt: 'desc' }],
      include: {
        teacher: { select: { id: true, displayName: true } },
        _count: { select: { members: true, materials: true } },
      },
    });
  }

  async getBySlug(slug: string, userId?: string, role?: string) {
    const group = await this.prisma.classGroup.findUnique({
      where: { slug },
      include: {
        teacher: { select: { id: true, displayName: true, email: true } },
        members: {
          include: {
            user: { select: { id: true, displayName: true, email: true } },
          },
          orderBy: { joinedAt: 'asc' },
        },
        materials: {
          orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
        },
        _count: { select: { members: true, materials: true } },
      },
    });
    if (!group) throw new NotFoundException('Grup bulunamadı');

    const staff = role ? this.isStaff(role) : false;
    const isMember =
      !!userId &&
      (group.teacherId === userId ||
        group.members.some((m) => m.userId === userId));

    if (!group.published && !staff && !isMember) {
      throw new NotFoundException('Grup bulunamadı');
    }

    const canSeeAll = staff || isMember;
    return {
      ...group,
      materials: canSeeAll
        ? group.materials
        : group.materials.filter((m) => m.published).slice(0, 0),
      isMember,
      canManage: staff || group.teacherId === userId,
      locked: !canSeeAll,
    };
  }

  async create(dto: CreateGroupDto, teacherId: string) {
    const base = slugify(dto.slug || dto.name) || `grup-${Date.now()}`;
    let slug = base;
    let i = 1;
    while (await this.prisma.classGroup.findUnique({ where: { slug } })) {
      slug = `${base}-${i++}`;
    }
    return this.prisma.classGroup.create({
      data: {
        name: dto.name,
        slug,
        description: dto.description,
        level: dto.level || 'A1',
        periodLabel: dto.periodLabel,
        published: dto.published ?? true,
        teacherId,
      },
    });
  }

  async update(id: string, dto: Partial<CreateGroupDto>, userId: string, role: string) {
    const group = await this.prisma.classGroup.findUnique({ where: { id } });
    if (!group) throw new NotFoundException('Grup bulunamadı');
    if (!this.isStaff(role) && group.teacherId !== userId) {
      throw new ForbiddenException('Bu grubu düzenleyemezsin');
    }
    return this.prisma.classGroup.update({
      where: { id },
      data: {
        name: dto.name,
        description: dto.description,
        level: dto.level,
        periodLabel: dto.periodLabel,
        published: dto.published,
        ...(dto.slug ? { slug: slugify(dto.slug) } : {}),
      },
    });
  }

  async addMaterial(
    groupId: string,
    dto: CreateMaterialDto,
    authorId: string,
    role: string,
  ) {
    const group = await this.prisma.classGroup.findUnique({
      where: { id: groupId },
    });
    if (!group) throw new NotFoundException('Grup bulunamadı');
    if (!this.isStaff(role) && group.teacherId !== authorId) {
      throw new ForbiddenException('Materyal ekleyemezsin');
    }
    if (!dto.body && !dto.url) {
      throw new BadRequestException('Not veya link gerekli');
    }
    return this.prisma.groupMaterial.create({
      data: {
        groupId,
        type: dto.type,
        title: dto.title,
        body: dto.body,
        url: dto.url,
        sortOrder: dto.sortOrder ?? 0,
        published: dto.published ?? true,
        authorId,
      },
    });
  }

  async removeMaterial(materialId: string, userId: string, role: string) {
    const material = await this.prisma.groupMaterial.findUnique({
      where: { id: materialId },
      include: { group: true },
    });
    if (!material) throw new NotFoundException('Materyal bulunamadı');
    if (!this.isStaff(role) && material.group.teacherId !== userId) {
      throw new ForbiddenException('Silemezsin');
    }
    await this.prisma.groupMaterial.delete({ where: { id: materialId } });
    return { message: 'Silindi' };
  }

  async addMember(groupId: string, email: string, actorId: string, role: string) {
    const group = await this.prisma.classGroup.findUnique({
      where: { id: groupId },
    });
    if (!group) throw new NotFoundException('Grup bulunamadı');
    if (!this.isStaff(role) && group.teacherId !== actorId) {
      throw new ForbiddenException('Üye ekleyemezsin');
    }
    const user = await this.prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });
    if (!user) throw new NotFoundException('Bu e-posta ile kullanıcı yok');
    return this.prisma.classGroupMember.upsert({
      where: {
        groupId_userId: { groupId, userId: user.id },
      },
      create: { groupId, userId: user.id },
      update: {},
      include: {
        user: { select: { id: true, displayName: true, email: true } },
      },
    });
  }

  async removeMember(
    groupId: string,
    userId: string,
    actorId: string,
    role: string,
  ) {
    const group = await this.prisma.classGroup.findUnique({
      where: { id: groupId },
    });
    if (!group) throw new NotFoundException('Grup bulunamadı');
    if (!this.isStaff(role) && group.teacherId !== actorId) {
      throw new ForbiddenException('Üye çıkaramazsın');
    }
    await this.prisma.classGroupMember.deleteMany({
      where: { groupId, userId },
    });
    return { message: 'Üye çıkarıldı' };
  }
}
