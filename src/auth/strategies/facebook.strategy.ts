import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-facebook';
import { AuthService } from '../auth.service';
import { OAuthProfile } from '../types/jwt-payload.interface';

@Injectable()
export class FacebookStrategy extends PassportStrategy(Strategy, 'facebook') {
  private readonly logger = new Logger(FacebookStrategy.name);

  constructor(
    private config: ConfigService,
    private authService: AuthService,
  ) {
    const clientID = config.get<string>('FACEBOOK_APP_ID') || 'disabled-client';
    const clientSecret =
      config.get<string>('FACEBOOK_APP_SECRET') || 'disabled-secret';
    const callbackURL =
      config.get<string>('FACEBOOK_CALLBACK_URL') ||
      'http://localhost:3000/auth/facebook/callback';

    super({
      clientID,
      clientSecret,
      callbackURL,
      scope: ['email'],
      profileFields: ['id', 'emails', 'name', 'photos'],
    });

    if (!this.config.get<string>('FACEBOOK_APP_ID')) {
      this.logger.warn(
        'Facebook OAuth is not configured. Set FACEBOOK_APP_ID/SECRET/CALLBACK_URL to enable it.',
      );
    }
  }

  async validate(accessToken: string, refreshToken: string, profile: OAuthProfile) {
    const firstName = profile.name?.givenName || '';
    const lastName = profile.name?.familyName || '';

    return this.authService.findOrCreateSSOUser({
      provider: 'facebook',
      providerId: profile.id,
      email: profile.emails?.[0]?.value,
      name: `${firstName} ${lastName}`.trim(),
      avatar: profile.photos?.[0]?.value,
    });
  }
}
