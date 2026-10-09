import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { Public } from '../common/decorators/public.decorator.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { Role } from '../common/enums/role.enum.js';
import {
  CurrentUser,
  type AuthUser,
} from '../common/decorators/current-user.decorator.js';
import { CalendarService } from './calendar.service.js';
import { CreateEventDto } from './dto/create-event.dto.js';
import { UpdateEventDto } from './dto/update-event.dto.js';

@Controller('calendar')
export class CalendarController {
  constructor(private readonly calendarService: CalendarService) {}

  @Public()
  @Get('events')
  listUpcoming(@Query('take') take?: string) {
    return this.calendarService.listUpcoming({
      take: take ? Number(take) : 50,
    });
  }

  @Public()
  @Get('events/:id')
  getOne(@Param('id') id: string, @CurrentUser() user?: AuthUser) {
    return this.calendarService.getOne(id, user?.id);
  }

  @Get('mine')
  mine(@CurrentUser() user: AuthUser) {
    return this.calendarService.myEnrollments(user.id);
  }

  @Post('events/:id/enroll')
  enroll(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.calendarService.enroll(id, user.id, user.status, user.role);
  }

  @Delete('events/:id/enroll')
  unenroll(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.calendarService.unenroll(id, user.id);
  }

  @Roles(Role.SUPER_ADMIN, Role.MODERATOR, Role.TEACHER)
  @Get('admin/events')
  adminList() {
    return this.calendarService.listAll();
  }

  @Roles(Role.SUPER_ADMIN, Role.MODERATOR, Role.TEACHER)
  @Post('admin/events')
  create(@Body() dto: CreateEventDto, @CurrentUser() user: AuthUser) {
    return this.calendarService.create(dto, user.id);
  }

  @Roles(Role.SUPER_ADMIN, Role.MODERATOR, Role.TEACHER)
  @Patch('admin/events/:id')
  update(@Param('id') id: string, @Body() dto: UpdateEventDto) {
    return this.calendarService.update(id, dto);
  }

  @Roles(Role.SUPER_ADMIN, Role.MODERATOR)
  @Delete('admin/events/:id')
  remove(@Param('id') id: string) {
    return this.calendarService.remove(id);
  }

  @Roles(Role.SUPER_ADMIN)
  @Post('admin/reminders/run')
  runReminders() {
    return this.calendarService.processReminders();
  }
}
