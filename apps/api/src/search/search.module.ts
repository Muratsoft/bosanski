import { Module } from '@nestjs/common';
import { DictionaryModule } from '../dictionary/dictionary.module.js';
import { LessonsModule } from '../lessons/lessons.module.js';
import { ForumModule } from '../forum/forum.module.js';
import { SearchController } from './search.controller.js';

@Module({
  imports: [DictionaryModule, LessonsModule, ForumModule],
  controllers: [SearchController],
})
export class SearchModule {}
