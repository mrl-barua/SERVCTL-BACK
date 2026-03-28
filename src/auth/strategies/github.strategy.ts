import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-github2';
import { AuthService } from '../auth.service';

@Injectable()
export class GitHubStrategy extends PassportStrategy(Strategy, 'github') {
  private readonly logger = new Logger(GitHubStrategy.name);

  constructor(
    private config: ConfigService,
    private authService: AuthService,
  ) {
    const clientID = config.get<string>('GITHUB_CLIENT_ID') || 'disabled-client';
    const clientSecret =
      config.get<string>('GITHUB_CLIENT_SECRET') || 'disabled-secret';
    const callbackURL =
      config.get<string>('GITHUB_CALLBACK_URL') ||
      'http://localhost:3000/auth/github/callback';

    super({
      clientID,
      clientSecret,
      callbackURL,
      scope: ['user:email'],
    });

    if (!this.config.get<string>('GITHUB_CLIENT_ID')) {
      this.logger.warn(
        'GitHub OAuth is not configured. Set GITHUB_CLIENT_ID/SECRET/CALLBACK_URL to enable it.',
      );
    }
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
