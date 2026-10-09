import { Controller, Get, Query } from '@nestjs/common';
import { Public } from '../common/decorators/public.decorator.js';
import { DictionaryService } from '../dictionary/dictionary.service.js';
import { LessonsService } from '../lessons/lessons.service.js';
import { ForumService } from '../forum/forum.service.js';

@Controller('search')
export class SearchController {
  constructor(
    private readonly dictionary: DictionaryService,
    private readonly lessons: LessonsService,
    private readonly forum: ForumService,
  ) {}

  @Public()
  @Get()
  async search(@Query('q') q?: string) {
    if (!q?.trim()) {
      return {
        dictionary: { total: 0, items: [] },
        lessons: { total: 0, items: [] },
        forum: { total: 0, items: [] },
      };
    }

    const [dictionary, lessons, forum] = await Promise.all([
      this.dictionary.search({ q, take: 10 }),
      this.lessons.listLessons({ q, take: 10 }),
      this.forum.listTopics({ q, take: 10 }),
    ]);

    return { dictionary, lessons, forum };
  }
}
