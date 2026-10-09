import { Module } from '@nestjs/common';
import { CalendarController } from './calendar.controller.js';
import { CalendarService } from './calendar.service.js';
import { CalendarScheduler } from './calendar.scheduler.js';

@Module({
  controllers: [CalendarController],
  providers: [CalendarService, CalendarScheduler],
  exports: [CalendarService],
})
export class CalendarModule {}
