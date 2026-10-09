import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import {
  CurrentUser,
  type AuthUser,
} from '../common/decorators/current-user.decorator.js';
import { AiService } from './ai.service.js';
import { ChatDto } from './dto/chat.dto.js';

@Controller('ai')
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Get('usage')
  usage(@CurrentUser() user: AuthUser) {
    return this.aiService.usage(user.id, user.role, user.status);
  }

  @Get('conversations')
  list(@CurrentUser() user: AuthUser) {
    return this.aiService.listConversations(user.id);
  }

  @Get('conversations/:id')
  getOne(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.aiService.getConversation(user.id, id);
  }

  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @Post('chat')
  chat(@Body() dto: ChatDto, @CurrentUser() user: AuthUser) {
    return this.aiService.chat(user.id, user.role, user.status, dto);
  }
}
