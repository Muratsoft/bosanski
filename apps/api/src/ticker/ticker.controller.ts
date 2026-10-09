import { Controller, Get } from '@nestjs/common';
import { Public } from '../common/decorators/public.decorator.js';
import { TickerService } from './ticker.service.js';

@Controller('ticker')
export class TickerController {
  constructor(private readonly ticker: TickerService) {}

  @Public()
  @Get()
  list() {
    return this.ticker.getWords();
  }
}
