import { Injectable, NotFoundException } from '@nestjs/common';
import { AccountStatus, Role, type Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import { AuthService } from '../auth/auth.service.js';

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authService: AuthService,
  ) {}

  async findAll(params?: {
    role?: Role;
    status?: AccountStatus;
    search?: string;
    skip?: number;
    take?: number;
  }) {
    const where: Prisma.UserWhereInput = {};
    if (params?.role) where.role = params.role;
    if (params?.status) where.status = params.status;
    if (params?.search) {
      where.OR = [
        { email: { contains: params.search } },
        { displayName: { contains: params.search } },
      ];
    }

    const [total, users] = await this.prisma.$transaction([
      this.prisma.user.count({ where }),
      this.prisma.user.findMany({
        where,
        skip: params?.skip ?? 0,
        take: Math.min(params?.take ?? 20, 100),
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return {
      total,
      items: users.map((u) => this.authService.toSafeUser(u)),
    };
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundException('Kullanıcı bulunamadı');
    }
    return this.authService.toSafeUser(user);
  }

  async updateRole(id: string, role: Role, actorId: string) {
    const user = await this.prisma.user.update({
      where: { id },
      data: { role },
    });
    await this.prisma.auditLog.create({
      data: {
        actorId,
        action: 'USER_ROLE_UPDATED',
        entityType: 'User',
        entityId: id,
        meta: JSON.stringify({ role }),
      },
    });
    return this.authService.toSafeUser(user);
  }

  async updateStatus(id: string, status: AccountStatus, actorId: string) {
    const user = await this.prisma.user.update({
      where: { id },
      data: { status },
    });
    await this.prisma.auditLog.create({
      data: {
        actorId,
        action: 'USER_STATUS_UPDATED',
        entityType: 'User',
        entityId: id,
        meta: JSON.stringify({ status }),
      },
    });
    return this.authService.toSafeUser(user);
  }
}
