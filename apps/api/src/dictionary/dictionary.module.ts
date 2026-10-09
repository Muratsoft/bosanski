import { Module } from '@nestjs/common';
import { AiModule } from '../ai/ai.module.js';
import { DictionaryController } from './dictionary.controller.js';
import { DictionaryService } from './dictionary.service.js';

@Module({
  imports: [AiModule],
  controllers: [DictionaryController],
  providers: [DictionaryService],
  exports: [DictionaryService],
})
export class DictionaryModule {}
