import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import {
  AccountStatus,
  AuthProvider,
  Role,
  type User,
} from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { createHash, randomBytes } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service.js';
import { RegisterDto } from './dto/register.dto.js';
import { LoginDto } from './dto/login.dto.js';
import { TurnstileService } from './turnstile.service.js';
import { MailService } from '../mail/mail.service.js';

const BCRYPT_ROUNDS = 12;

export type SafeUser = {
  id: string;
  email: string;
  displayName: string;
  role: Role;
  status: AccountStatus;
  avatarUrl: string | null;
  referralCode: string;
};

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly turnstile: TurnstileService,
    private readonly mail: MailService,
  ) {}

  async register(dto: RegisterDto, ip?: string) {
    await this.turnstile.verify(dto.turnstileToken, ip);

    const email = dto.email.toLowerCase().trim();
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new ConflictException('Bu e-posta zaten kayıtlı');
    }

    let referredById: string | undefined;
    if (dto.referralCode) {
      const referrer = await this.prisma.user.findUnique({
        where: { referralCode: dto.referralCode },
      });
      if (!referrer) {
        throw new BadRequestException('Geçersiz davet kodu');
      }
      referredById = referrer.id;
    }

    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);

    const user = await this.prisma.user.create({
      data: {
        email,
        passwordHash,
        displayName: dto.displayName.trim(),
        role: Role.MEMBER,
        status: AccountStatus.PENDING,
        provider: AuthProvider.LOCAL,
        referredById,
      },
    });

    await this.mail.sendWelcome(user.email, user.displayName);
    await this.prisma.auditLog.create({
      data: {
        actorId: user.id,
        action: 'USER_REGISTERED',
        entityType: 'User',
        entityId: user.id,
        ip: ip ?? null,
      },
    });

    const tokens = await this.issueTokens(user);
    return { user: this.toSafeUser(user), ...tokens };
  }

  async login(dto: LoginDto, ip?: string) {
    await this.turnstile.verify(dto.turnstileToken, ip);

    const email = dto.email.toLowerCase().trim();
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user || !user.passwordHash) {
      throw new UnauthorizedException('E-posta veya şifre hatalı');
    }

    const ok = await bcrypt.compare(dto.password, user.passwordHash);
    if (!ok) {
      throw new UnauthorizedException('E-posta veya şifre hatalı');
    }

    if (user.status === AccountStatus.SUSPENDED) {
      throw new UnauthorizedException('Hesabınız askıya alınmış');
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    const tokens = await this.issueTokens(user);
    return { user: this.toSafeUser(user), ...tokens };
  }

  async forgotPassword(email: string, turnstileToken?: string, ip?: string) {
    await this.turnstile.verify(turnstileToken, ip);

    const user = await this.prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    // Bilgi sızdırmamak için her zaman aynı yanıt
    if (!user) {
      return { message: 'E-posta kayıtlıysa sıfırlama bağlantısı gönderildi' };
    }

    const rawToken = randomBytes(32).toString('hex');
    const tokenHash = this.hashToken(rawToken);
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

    await this.prisma.passwordResetToken.create({
      data: { userId: user.id, tokenHash, expiresAt },
    });

    await this.mail.sendPasswordReset(user.email, rawToken);

    return { message: 'E-posta kayıtlıysa sıfırlama bağlantısı gönderildi' };
  }

  async resetPassword(token: string, password: string) {
    const tokenHash = this.hashToken(token);
    const record = await this.prisma.passwordResetToken.findUnique({
      where: { tokenHash },
    });

    if (!record || record.usedAt || record.expiresAt < new Date()) {
      throw new BadRequestException('Geçersiz veya süresi dolmuş token');
    }

    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: record.userId },
        data: { passwordHash },
      }),
      this.prisma.passwordResetToken.update({
        where: { id: record.id },
        data: { usedAt: new Date() },
      }),
      this.prisma.refreshToken.updateMany({
        where: { userId: record.userId, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
    ]);

    return { message: 'Şifre güncellendi' };
  }

  async refresh(refreshToken: string) {
    let payload: { sub: string; type?: string };
    try {
      payload = await this.jwt.verifyAsync(refreshToken, {
        secret: this.config.getOrThrow<string>('JWT_REFRESH_SECRET'),
      });
    } catch {
      throw new UnauthorizedException('Geçersiz refresh token');
    }

    if (payload.type !== 'refresh') {
      throw new UnauthorizedException('Geçersiz refresh token');
    }

    const tokenHash = this.hashToken(refreshToken);
    const stored = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });

    if (!stored || stored.revokedAt || stored.expiresAt < new Date()) {
      throw new UnauthorizedException('Refresh token geçersiz');
    }

    await this.prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revokedAt: new Date() },
    });

    const tokens = await this.issueTokens(stored.user);
    return { user: this.toSafeUser(stored.user), ...tokens };
  }

  async logout(refreshToken?: string) {
    if (!refreshToken) {
      return { message: 'Çıkış yapıldı' };
    }
    const tokenHash = this.hashToken(refreshToken);
    await this.prisma.refreshToken.updateMany({
      where: { tokenHash, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    return { message: 'Çıkış yapıldı' };
  }

  async validateUserById(id: string): Promise<SafeUser | null> {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user || user.status === AccountStatus.SUSPENDED) {
      return null;
    }
    return this.toSafeUser(user);
  }

  async upsertOAuthUser(input: {
    email: string;
    displayName: string;
    provider: AuthProvider;
    providerId: string;
    avatarUrl?: string;
  }) {
    const email = input.email.toLowerCase().trim();

    let user = await this.prisma.user.findFirst({
      where: {
        OR: [
          { email },
          { provider: input.provider, providerId: input.providerId },
        ],
      },
    });

    if (!user) {
      user = await this.prisma.user.create({
        data: {
          email,
          displayName: input.displayName,
          provider: input.provider,
          providerId: input.providerId,
          avatarUrl: input.avatarUrl,
          role: Role.MEMBER,
          status: AccountStatus.PENDING,
          emailVerifiedAt: new Date(),
        },
      });
      await this.mail.sendWelcome(user.email, user.displayName);
    } else {
      user = await this.prisma.user.update({
        where: { id: user.id },
        data: {
          provider: input.provider,
          providerId: input.providerId,
          avatarUrl: input.avatarUrl ?? user.avatarUrl,
          lastLoginAt: new Date(),
          emailVerifiedAt: user.emailVerifiedAt ?? new Date(),
        },
      });
    }

    return this.issueTokens(user).then((tokens) => ({
      user: this.toSafeUser(user!),
      ...tokens,
    }));
  }

  private async issueTokens(user: User) {
    const accessExpires =
      this.config.get<string>('JWT_EXPIRES_IN') ?? '15m';
    const refreshExpires =
      this.config.get<string>('JWT_REFRESH_EXPIRES_IN') ?? '7d';

    const accessToken = await this.jwt.signAsync(
      {
        sub: user.id,
        email: user.email,
        role: user.role,
        status: user.status,
      },
      {
        secret: this.config.getOrThrow<string>('JWT_SECRET'),
        expiresIn: accessExpires as `${number}m` | `${number}d` | `${number}h`,
      },
    );

    const refreshToken = await this.jwt.signAsync(
      { sub: user.id, type: 'refresh' },
      {
        secret: this.config.getOrThrow<string>('JWT_REFRESH_SECRET'),
        expiresIn: refreshExpires as `${number}m` | `${number}d` | `${number}h`,
      },
    );

    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await this.prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: this.hashToken(refreshToken),
        expiresAt,
      },
    });

    return { accessToken, refreshToken };
  }

  private hashToken(token: string) {
    return createHash('sha256').update(token).digest('hex');
  }

  toSafeUser(user: User): SafeUser {
    return {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      role: user.role,
      status: user.status,
      avatarUrl: user.avatarUrl,
      referralCode: user.referralCode,
    };
  }
}
