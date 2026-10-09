import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Faz 0–3: konsola log. Sonraki fazda Resend/SendGrid bağlanacak.
 */
@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  constructor(private readonly config: ConfigService) {}

  async sendWelcome(email: string, displayName: string) {
    this.logger.log(`[MAIL:welcome] → ${email} (${displayName})`);
  }

  async sendPasswordReset(email: string, token: string) {
    const appUrl = this.config.get<string>('APP_URL', 'http://localhost:3000');
    const link = `${appUrl}/sifre-sifirla?token=${token}`;
    this.logger.log(`[MAIL:password-reset] → ${email} | ${link}`);
  }

  async sendLessonReminder(input: {
    email: string;
    displayName: string;
    title: string;
    startAt: Date;
    meetUrl: string | null;
    kind: '24h' | '1h';
  }) {
    const when = input.startAt.toLocaleString('tr-TR', {
      timeZone: 'Europe/Istanbul',
      dateStyle: 'full',
      timeStyle: 'short',
    });
    const label = input.kind === '24h' ? '24 saat' : '1 saat';
    this.logger.log(
      `[MAIL:lesson-reminder:${input.kind}] → ${input.email} | ${label} kala | ${input.title} | ${when} | meet=${input.meetUrl || '-'}`,
    );
  }

  async sendPaymentApproved(input: {
    email: string;
    displayName: string;
    planName: string;
    endsAt: Date;
    bonusDays: number;
  }) {
    const ends = input.endsAt.toLocaleDateString('tr-TR', {
      timeZone: 'Europe/Istanbul',
    });
    this.logger.log(
      `[MAIL:payment-approved] → ${input.email} | ${input.planName} aktif | bitiş ${ends} | bonus=${input.bonusDays}g`,
    );
  }

  async sendPaymentDueReminder(input: {
    email: string;
    displayName: string;
    planName: string;
    endsAt: Date;
    daysLeft: number;
  }) {
    const ends = input.endsAt.toLocaleDateString('tr-TR', {
      timeZone: 'Europe/Istanbul',
    });
    this.logger.log(
      `[MAIL:payment-due:${input.daysLeft}d] → ${input.email} | ${input.planName} | bitiş ${ends}`,
    );
  }
}
