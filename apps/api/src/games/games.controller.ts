import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { GameType } from '@prisma/client';
import { Public } from '../common/decorators/public.decorator.js';
import {
  CurrentUser,
  type AuthUser,
} from '../common/decorators/current-user.decorator.js';
import { GamesService } from './games.service.js';
import { SaveScoreDto } from './dto/save-score.dto.js';

@Controller('games')
export class GamesController {
  constructor(private readonly gamesService: GamesService) {}

  @Public()
  @Get('quiz')
  quiz(
    @Query('count') count?: string,
    @Query('level') level?: string,
    @Query('variant') variant?: string,
    @Query('topic') topic?: string,
    @Query('source') source?: 'ai' | 'dictionary' | 'auto',
  ) {
    return this.gamesService.quiz({
      count: count ? Number(count) : 8,
      level,
      variant,
      topic,
      source,
    });
  }

  @Public()
  @Get('flashcards')
  flashcards(
    @Query('count') count?: string,
    @Query('level') level?: string,
    @Query('variant') variant?: string,
    @Query('topic') topic?: string,
    @Query('source') source?: 'ai' | 'dictionary' | 'auto',
  ) {
    return this.gamesService.flashcards({
      count: count ? Number(count) : 10,
      level,
      variant,
      topic,
      source,
    });
  }

  @Public()
  @Get('match')
  match(
    @Query('count') count?: string,
    @Query('level') level?: string,
    @Query('variant') variant?: string,
    @Query('topic') topic?: string,
    @Query('source') source?: 'ai' | 'dictionary' | 'auto',
  ) {
    return this.gamesService.match({
      count: count ? Number(count) : 6,
      level,
      variant,
      topic,
      source,
    });
  }

  @Public()
  @Get('leaderboard')
  leaderboard(
    @Query('gameType') gameType?: GameType,
    @Query('take') take?: string,
  ) {
    return this.gamesService.leaderboard(
      gameType,
      take ? Number(take) : 10,
    );
  }

  @Post('scores')
  saveScore(@Body() dto: SaveScoreDto, @CurrentUser() user: AuthUser) {
    return this.gamesService.saveScore(user.id, dto);
  }

  @Get('me')
  myScores(@CurrentUser() user: AuthUser) {
    return this.gamesService.myScores(user.id);
  }
}
