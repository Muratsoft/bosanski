import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
} from '@nestjs/common';
import type { Request } from 'express';
import { Public } from '../common/decorators/public.decorator.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { Role } from '../common/enums/role.enum.js';
import {
  CurrentUser,
  type AuthUser,
} from '../common/decorators/current-user.decorator.js';
import { GroupsService } from './groups.service.js';
import { CreateGroupDto } from './dto/create-group.dto.js';
import { CreateMaterialDto } from './dto/create-material.dto.js';
import { AddMemberDto } from './dto/add-member.dto.js';

@Controller('groups')
export class GroupsController {
  constructor(private readonly groupsService: GroupsService) {}

  @Public()
  @Get()
  list() {
    return this.groupsService.listPublished();
  }

  @Get('mine')
  mine(@CurrentUser() user: AuthUser) {
    return this.groupsService.listMine(user.id, user.role);
  }

  @Public()
  @Get(':slug')
  getOne(@Param('slug') slug: string, @Req() req: Request) {
    const user = req.user as AuthUser | undefined;
    return this.groupsService.getBySlug(slug, user?.id, user?.role);
  }

  @Roles(Role.SUPER_ADMIN, Role.MODERATOR, Role.TEACHER)
  @Post()
  create(@Body() dto: CreateGroupDto, @CurrentUser() user: AuthUser) {
    return this.groupsService.create(dto, user.id);
  }

  @Roles(Role.SUPER_ADMIN, Role.MODERATOR, Role.TEACHER)
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: CreateGroupDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.groupsService.update(id, dto, user.id, user.role);
  }

  @Roles(Role.SUPER_ADMIN, Role.MODERATOR, Role.TEACHER)
  @Post(':id/materials')
  addMaterial(
    @Param('id') id: string,
    @Body() dto: CreateMaterialDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.groupsService.addMaterial(id, dto, user.id, user.role);
  }

  @Roles(Role.SUPER_ADMIN, Role.MODERATOR, Role.TEACHER)
  @Delete('materials/:materialId')
  removeMaterial(
    @Param('materialId') materialId: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.groupsService.removeMaterial(materialId, user.id, user.role);
  }

  @Roles(Role.SUPER_ADMIN, Role.MODERATOR, Role.TEACHER)
  @Post(':id/members')
  addMember(
    @Param('id') id: string,
    @Body() dto: AddMemberDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.groupsService.addMember(id, dto.email, user.id, user.role);
  }

  @Roles(Role.SUPER_ADMIN, Role.MODERATOR, Role.TEACHER)
  @Delete(':id/members/:userId')
  removeMember(
    @Param('id') id: string,
    @Param('userId') userId: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.groupsService.removeMember(id, userId, user.id, user.role);
  }
}
