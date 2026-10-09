import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { Roles } from '../common/decorators/roles.decorator.js';
import { Role } from '../common/enums/role.enum.js';
import {
  CurrentUser,
  type AuthUser,
} from '../common/decorators/current-user.decorator.js';
import { HomeworkService } from './homework.service.js';
import { CreateHomeworkDto } from './dto/create-homework.dto.js';
import { SubmitHomeworkDto } from './dto/submit-homework.dto.js';

@Controller('homework')
export class HomeworkController {
  constructor(private readonly homeworkService: HomeworkService) {}

  @Roles(Role.SUPER_ADMIN, Role.MODERATOR, Role.TEACHER)
  @Post()
  create(@Body() dto: CreateHomeworkDto, @CurrentUser() user: AuthUser) {
    return this.homeworkService.create(dto, user.id, user.role);
  }

  @Get('group/:groupId')
  listForGroup(
    @Param('groupId') groupId: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.homeworkService.listForGroup(groupId, user.id, user.role);
  }

  @Roles(Role.SUPER_ADMIN, Role.MODERATOR, Role.TEACHER)
  @Get('inbox')
  inbox(@CurrentUser() user: AuthUser) {
    return this.homeworkService.teacherInbox(user.id, user.role);
  }

  @Post(':id/submit')
  submit(
    @Param('id') id: string,
    @Body() dto: SubmitHomeworkDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.homeworkService.submit(id, user.id, dto);
  }
}
