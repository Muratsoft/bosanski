import { Module } from '@nestjs/common';
import { AiController } from './ai.controller.js';
import { AiService } from './ai.service.js';
import { AiProvider } from './ai.provider.js';

@Module({
  controllers: [AiController],
  providers: [AiService, AiProvider],
  exports: [AiService],
})
export class AiModule {}
