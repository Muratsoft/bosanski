import {
  BadRequestException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class TurnstileService {
  private readonly logger = new Logger(TurnstileService.name);

  constructor(private readonly config: ConfigService) {}

  async verify(token: string | undefined, ip?: string): Promise<void> {
    const enabled = this.config.get<string>('TURNSTILE_ENABLED') === 'true';
    if (!enabled) {
      return;
    }

    if (!token) {
      throw new BadRequestException('Bot koruması doğrulanamadı');
    }

    const secret = this.config.get<string>('TURNSTILE_SECRET_KEY');
    if (!secret) {
      this.logger.warn('TURNSTILE_ENABLED=true ama SECRET_KEY yok');
      throw new BadRequestException('Bot koruması yapılandırılmamış');
    }

    const body = new URLSearchParams({
      secret,
      response: token,
    });
    if (ip) {
      body.set('remoteip', ip);
    }

    const response = await fetch(
      'https://challenges.cloudflare.com/turnstile/v0/siteverify',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body,
      },
    );

    const data = (await response.json()) as { success?: boolean };
    if (!data.success) {
      throw new BadRequestException('Bot koruması başarısız');
    }
  }
}
