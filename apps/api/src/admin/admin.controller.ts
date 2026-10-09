import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Query,
} from '@nestjs/common';
import { AccountStatus, Role } from '@prisma/client';
import { Roles } from '../common/decorators/roles.decorator.js';
import { Role as RoleEnum } from '../common/enums/role.enum.js';
import {
  CurrentUser,
  type AuthUser,
} from '../common/decorators/current-user.decorator.js';
import { UsersService } from '../users/users.service.js';
import { PrismaService } from '../prisma/prisma.service.js';

@Controller('admin')
@Roles(RoleEnum.SUPER_ADMIN, RoleEnum.MODERATOR)
export class AdminController {
  constructor(
    private readonly usersService: UsersService,
    private readonly prisma: PrismaService,
  ) {}

  @Get('dashboard')
  async dashboard() {
    const [users, pending, active, suspended] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.user.count({ where: { status: AccountStatus.PENDING } }),
      this.prisma.user.count({ where: { status: AccountStatus.ACTIVE } }),
      this.prisma.user.count({ where: { status: AccountStatus.SUSPENDED } }),
    ]);

    return {
      users: { total: users, pending, active, suspended },
      phase: 'Faz 0 — Auth & Admin iskeleti',
    };
  }

  @Get('users')
  listUsers(
    @Query('role') role?: Role,
    @Query('status') status?: AccountStatus,
    @Query('search') search?: string,
    @Query('skip') skip?: string,
    @Query('take') take?: string,
  ) {
    return this.usersService.findAll({
      role,
      status,
      search,
      skip: skip ? Number(skip) : 0,
      take: take ? Number(take) : 20,
    });
  }

  @Get('users/:id')
  getUser(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

  @Roles(RoleEnum.SUPER_ADMIN)
  @Patch('users/:id/role')
  updateRole(
    @Param('id') id: string,
    @Body('role') role: Role,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.usersService.updateRole(id, role, actor.id);
  }

  @Roles(RoleEnum.SUPER_ADMIN)
  @Patch('users/:id/status')
  updateStatus(
    @Param('id') id: string,
    @Body('status') status: AccountStatus,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.usersService.updateStatus(id, status, actor.id);
  }

  @Get('audit-logs')
  @Roles(RoleEnum.SUPER_ADMIN)
  auditLogs(
    @Query('skip') skip?: string,
    @Query('take') take?: string,
  ) {
    return this.prisma.auditLog.findMany({
      skip: skip ? Number(skip) : 0,
      take: Math.min(take ? Number(take) : 50, 200),
      orderBy: { createdAt: 'desc' },
    });
  }
}
