import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { AuthProvider } from '@prisma/client';
import { Strategy, type Profile, type VerifyCallback } from 'passport-google-oauth20';
import { AuthService } from '../auth.service.js';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(
    config: ConfigService,
    private readonly authService: AuthService,
  ) {
    const clientID = config.get<string>('GOOGLE_CLIENT_ID') || 'disabled';
    const clientSecret = config.get<string>('GOOGLE_CLIENT_SECRET') || 'disabled';

    super({
      clientID,
      clientSecret,
      callbackURL: config.get<string>(
        'GOOGLE_CALLBACK_URL',
        'http://localhost:3001/api/auth/google/callback',
      ),
      scope: ['email', 'profile'],
    });
  }

  async validate(
    _accessToken: string,
    _refreshToken: string,
    profile: Profile,
    done: VerifyCallback,
  ) {
    const email = profile.emails?.[0]?.value;
    if (!email) {
      return done(new Error('Google hesabında e-posta yok'), undefined);
    }

    const result = await this.authService.upsertOAuthUser({
      email,
      displayName: profile.displayName || email.split('@')[0],
      provider: AuthProvider.GOOGLE,
      providerId: profile.id,
      avatarUrl: profile.photos?.[0]?.value,
    });

    done(null, result);
  }
}
