import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { CalendarService } from './calendar.service.js';

@Injectable()
export class CalendarScheduler {
  private readonly logger = new Logger(CalendarScheduler.name);

  constructor(private readonly calendarService: CalendarService) {}

  @Cron(CronExpression.EVERY_5_MINUTES)
  async handleReminders() {
    const result = await this.calendarService.processReminders();
    if (result.sent > 0) {
      this.logger.log(`${result.sent} ders hatırlatması gönderildi`);
    }
  }
}
