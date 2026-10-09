import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { Public } from '../common/decorators/public.decorator.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { Role } from '../common/enums/role.enum.js';
import {
  CurrentUser,
  type AuthUser,
} from '../common/decorators/current-user.decorator.js';
import { ForumService } from './forum.service.js';
import { CreateTopicDto } from './dto/create-topic.dto.js';
import { CreateEntryDto } from './dto/create-entry.dto.js';
import { VoteDto } from './dto/vote.dto.js';
import { ReportDto } from './dto/report.dto.js';

@Controller('forum')
export class ForumController {
  constructor(private readonly forumService: ForumService) {}

  @Public()
  @Get('topics')
  listTopics(
    @Query('q') q?: string,
    @Query('skip') skip?: string,
    @Query('take') take?: string,
  ) {
    return this.forumService.listTopics({
      q,
      skip: skip ? Number(skip) : 0,
      take: take ? Number(take) : 40,
    });
  }

  @Public()
  @Get('feed')
  feed(@Query('take') take?: string) {
    return this.forumService.feed(take ? Number(take) : 20);
  }

  @Public()
  @Get('topics/:slug')
  getTopic(@Param('slug') slug: string) {
    return this.forumService.getTopic(slug);
  }

  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post('topics')
  createTopic(@Body() dto: CreateTopicDto, @CurrentUser() user: AuthUser) {
    return this.forumService.createTopic(dto, user.id, user.status);
  }

  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @Post('topics/:slug/entries')
  addEntry(
    @Param('slug') slug: string,
    @Body() dto: CreateEntryDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.forumService.addEntry(slug, dto, user.id, user.status);
  }

  @Post('entries/:id/vote')
  vote(
    @Param('id') id: string,
    @Body() dto: VoteDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.forumService.vote(id, user.id, dto.value);
  }

  @Post('entries/:id/report')
  report(
    @Param('id') id: string,
    @Body() dto: ReportDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.forumService.report(id, user.id, dto.reason);
  }

  @Roles(Role.SUPER_ADMIN, Role.MODERATOR)
  @Patch('entries/:id/hide')
  hideEntry(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.forumService.hideEntry(id, user.id);
  }

  @Roles(Role.SUPER_ADMIN, Role.MODERATOR)
  @Patch('topics/:id/hide')
  hideTopic(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.forumService.hideTopic(id, user.id);
  }

  @Roles(Role.SUPER_ADMIN, Role.MODERATOR)
  @Get('reports')
  listReports() {
    return this.forumService.listReports();
  }

  @Roles(Role.SUPER_ADMIN, Role.MODERATOR)
  @Patch('reports/:id/resolve')
  resolveReport(@Param('id') id: string) {
    return this.forumService.resolveReport(id);
  }
}
