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
  quiz(@Query('count') count?: string) {
    return this.gamesService.quiz(count ? Number(count) : 8);
  }

  @Public()
  @Get('flashcards')
  flashcards(@Query('count') count?: string) {
    return this.gamesService.flashcards(count ? Number(count) : 10);
  }

  @Public()
  @Get('match')
  match(@Query('count') count?: string) {
    return this.gamesService.match(count ? Number(count) : 6);
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
