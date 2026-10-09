import { Module } from '@nestjs/common';
import { AiModule } from '../ai/ai.module.js';
import { GamesController } from './games.controller.js';
import { GamesService } from './games.service.js';

@Module({
  imports: [AiModule],
  controllers: [GamesController],
  providers: [GamesService],
  exports: [GamesService],
})
export class GamesModule {}

