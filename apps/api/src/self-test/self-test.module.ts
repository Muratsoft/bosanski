import { Module } from '@nestjs/common';
import { GamesModule } from '../games/games.module.js';
import { AiModule } from '../ai/ai.module.js';
import { SelfTestController } from './self-test.controller.js';
import { SelfTestService } from './self-test.service.js';

@Module({
  imports: [GamesModule, AiModule],
  controllers: [SelfTestController],
  providers: [SelfTestService],
})
export class SelfTestModule {}
