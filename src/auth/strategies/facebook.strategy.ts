import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-facebook';
import { AuthService } from '../auth.service';

@Injectable()
export class FacebookStrategy extends PassportStrategy(Strategy, 'facebook') {
  constructor(
    private config: ConfigService,
    private authService: AuthService,
  ) {
    super({
      clientID: config.get<string>('FACEBOOK_APP_ID') || '',
      clientSecret: config.get<string>('FACEBOOK_APP_SECRET') || '',
      callbackURL: config.get<string>('FACEBOOK_CALLBACK_URL') || '',
      scope: ['email'],
      profileFields: ['id', 'emails', 'name', 'photos'],
    });
  }

  async validate(accessToken: string, refreshToken: string, profile: any) {
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
