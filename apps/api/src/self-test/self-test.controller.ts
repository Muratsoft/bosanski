import { Body, Controller, Get, Post } from '@nestjs/common';
import { Roles } from '../common/decorators/roles.decorator.js';
import { Role } from '../common/enums/role.enum.js';
import {
  CurrentUser,
  type AuthUser,
} from '../common/decorators/current-user.decorator.js';
import { SelfTestService } from './self-test.service.js';

@Controller('self-test')
export class SelfTestController {
  constructor(private readonly selfTestService: SelfTestService) {}

  @Post('start')
  start(
    @CurrentUser() user: AuthUser,
    @Body('level') level?: string,
  ) {
    return this.selfTestService.start(user.id, level || 'A1');
  }

  @Post('submit')
  submit(
    @CurrentUser() user: AuthUser,
    @Body()
    body: {
      level?: string;
      answers: { id: string; chosen: string; correctAnswer: string }[];
    },
  ) {
    return this.selfTestService.submit(user.id, body);
  }

  @Roles(Role.SUPER_ADMIN, Role.MODERATOR, Role.TEACHER)
  @Get('inbox')
  inbox(@CurrentUser() user: AuthUser) {
    return this.selfTestService.teacherFeed(user.id);
  }
}
