import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-github2';
import { AuthService } from '../auth.service';

@Injectable()
export class GitHubStrategy extends PassportStrategy(Strategy, 'github') {
  constructor(
    private config: ConfigService,
    private authService: AuthService,
  ) {
    super({
      clientID: config.get<string>('GITHUB_CLIENT_ID') || '',
      clientSecret: config.get<string>('GITHUB_CLIENT_SECRET') || '',
      callbackURL: config.get<string>('GITHUB_CALLBACK_URL') || '',
      scope: ['user:email'],
    });
  }

  async validate(accessToken: string, refreshToken: string, profile: any) {
    const email = profile.emails?.[0]?.value;
    const name = profile.displayName || profile.username;

    return this.authService.findOrCreateSSOUser({
      provider: 'github',
      providerId: profile.id,
      email,
      name,
      avatar: profile.photos?.[0]?.value,
    });
  }
}
