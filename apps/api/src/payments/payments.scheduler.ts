import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PaymentsService } from './payments.service.js';

@Injectable()
export class PaymentsScheduler {
  private readonly logger = new Logger(PaymentsScheduler.name);

  constructor(private readonly paymentsService: PaymentsService) {}

  @Cron(CronExpression.EVERY_HOUR)
  async handlePaymentReminders() {
    const result = await this.paymentsService.processPaymentReminders();
    if (result.sent > 0) {
      this.logger.log(`${result.sent} ödeme hatırlatması gönderildi`);
    }
  }
}
