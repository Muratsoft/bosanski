import { Module } from '@nestjs/common';
import { AiModule } from '../ai/ai.module.js';
import { TickerController } from './ticker.controller.js';
import { TickerService } from './ticker.service.js';

@Module({
  imports: [AiModule],
  controllers: [TickerController],
  providers: [TickerService],
})
export class TickerModule {}
