import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { AuthProvider } from '@prisma/client';
import { Strategy, type Profile } from 'passport-facebook';
import { AuthService } from '../auth.service.js';

@Injectable()
export class FacebookStrategy extends PassportStrategy(Strategy, 'facebook') {
  constructor(
    config: ConfigService,
    private readonly authService: AuthService,
  ) {
    const clientID = config.get<string>('FACEBOOK_APP_ID') || 'disabled';
    const clientSecret = config.get<string>('FACEBOOK_APP_SECRET') || 'disabled';

    super({
      clientID,
      clientSecret,
      callbackURL: config.get<string>(
        'FACEBOOK_CALLBACK_URL',
        'http://localhost:3001/api/auth/facebook/callback',
      ),
      profileFields: ['id', 'emails', 'displayName', 'photos'],
      scope: ['email'],
    });
  }

  async validate(
    _accessToken: string,
    _refreshToken: string,
    profile: Profile,
    done: (err: Error | null, user?: unknown) => void,
  ) {
    const email = profile.emails?.[0]?.value;
    if (!email) {
      return done(new Error('Facebook hesabında e-posta yok'));
    }

    const result = await this.authService.upsertOAuthUser({
      email,
      displayName: profile.displayName || email.split('@')[0],
      provider: AuthProvider.FACEBOOK,
      providerId: profile.id,
      avatarUrl: profile.photos?.[0]?.value,
    });

    done(null, result);
  }
}
