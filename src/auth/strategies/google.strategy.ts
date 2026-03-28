import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-google-oauth20';
import { AuthService } from '../auth.service';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  private readonly logger = new Logger(GoogleStrategy.name);

  constructor(
    private config: ConfigService,
    private authService: AuthService,
  ) {
    const clientID =
      config.get<string>('GOOGLE_CLIENT_ID') || 'disabled-client';
    const clientSecret =
      config.get<string>('GOOGLE_CLIENT_SECRET') || 'disabled-secret';
    const callbackURL =
      config.get<string>('GOOGLE_CALLBACK_URL') ||
      'http://localhost:3000/auth/google/callback';

    super({
      clientID,
      clientSecret,
      callbackURL,
      scope: ['email', 'profile'],
    });

    if (!this.config.get<string>('GOOGLE_CLIENT_ID')) {
      this.logger.warn(
        'Google OAuth is not configured. Set GOOGLE_CLIENT_ID/SECRET/CALLBACK_URL to enable it.',
      );
    }
  }

  async validate(accessToken: string, refreshToken: string, profile: any) {
    return this.authService.findOrCreateSSOUser({
      provider: 'google',
      providerId: profile.id,
      email: profile.emails?.[0]?.value,
      name: profile.displayName,
      avatar: profile.photos?.[0]?.value,
    });
  }
}
