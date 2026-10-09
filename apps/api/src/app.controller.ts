import { Controller, Get } from '@nestjs/common';
import { Public } from './common/decorators/public.decorator.js';

@Controller()
export class AppController {
  @Public()
  @Get()
  root() {
    return {
      name: 'Bosanski API',
      version: '0.1.0',
      docs: '/api/health',
    };
  }
}
