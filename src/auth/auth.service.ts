import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { User } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';
import { MailService } from '../mail/mail.service';
import { PrismaService } from '../prisma/prisma.service';
import { QuickCommandsService } from '../quick-commands/quick-commands.service';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { RegisterDto } from './dto/register.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';

@Injectable()
export class AuthService {
  private readonly resetRateLimiter = new Map<
    string,
    { count: number; windowStart: number }
  >();

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private mailService: MailService,
    private quickCommandsService: QuickCommandsService,
  ) {}

  private toPublicUser(user: User) {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      avatar: user.avatar,
      provider: user.provider ?? 'local',
    };
  }

  private getRefreshSecret() {
    return (
      process.env.JWT_REFRESH_SECRET ||
      process.env.JWT_SECRET ||
      'your-super-secret-key-change-this'
    );
  }

  private getRefreshExpiresIn() {
    return (process.env.JWT_REFRESH_EXPIRES_IN ?? '30d') as any;
  }

  private issueTokenPair(user: { id: number; email: string }) {
    const payload = {
      sub: user.id,
      email: user.email,
    };

    const access_token = this.jwtService.sign(payload);
    const refresh_token = this.jwtService.sign(payload, {
      secret: this.getRefreshSecret(),
      expiresIn: this.getRefreshExpiresIn(),
    });

    return {
      access_token,
      refresh_token,
    };
  }

  private generateResetToken(): string {
    return randomBytes(32).toString('hex');
  }

  private getFrontendUrl(): string {
    return process.env.FRONTEND_URL || 'http://localhost:5173';
  }

  private checkResendRateLimit(email: string): void {
    const normalizedEmail = email.toLowerCase().trim();
    const now = Date.now();
    const current = this.resetRateLimiter.get(normalizedEmail);
    const windowSizeMs = 60 * 60 * 1000;

    if (!current || now - current.windowStart > windowSizeMs) {
      this.resetRateLimiter.set(normalizedEmail, {
        count: 1,
        windowStart: now,
      });
      return;
    }

    if (current.count >= 3) {
      throw new HttpException(
        'Too many reset requests. Please try again later.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    this.resetRateLimiter.set(normalizedEmail, {
      ...current,
      count: current.count + 1,
    });
  }

  private async issueResetTokenForUser(user: {
    id: number;
    email: string;
    name: string;
  }): Promise<void> {
    await this.prisma.passwordResetToken.deleteMany({
      where: {
        userId: user.id,
        used: false,
      },
    });

    const token = this.generateResetToken();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

    await this.prisma.passwordResetToken.create({
      data: {
        token,
        userId: user.id,
        expiresAt,
      },
    });

    const resetUrl = `${this.getFrontendUrl()}/reset-password?token=${token}`;

    await this.mailService.sendPasswordReset({
      to: user.email,
      name: user.name,
      resetUrl,
      expiresInMinutes: 15,
    });
  }

  async register(registerDto: RegisterDto) {
    const { email, password, name } = registerDto;

    // Check if user already exists
    const existingUser = await this.prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new BadRequestException('User with this email already exists');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const user = await this.prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
      },
    });

    await this.quickCommandsService.seedDefaults(user.id);

    const tokens = this.issueTokenPair(user);

    return {
      ...tokens,
      user: this.toPublicUser(user),
    };
  }

  async login(loginDto: LoginDto) {
    const { email, password } = loginDto;

    // Find user by email
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!user.password) {
      throw new UnauthorizedException(
        'This account uses social sign-in. Please use an SSO provider.',
      );
    }

    // Validate password
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const tokens = this.issueTokenPair(user);

    return {
      ...tokens,
      user: this.toPublicUser(user),
    };
  }

  async findOrCreateSSOUser(data: {
    provider: string;
    providerId: string;
    email?: string;
    name?: string;
    avatar?: string;
  }): Promise<{
    access_token: string;
    refresh_token: string;
    user: ReturnType<AuthService['toPublicUser']>;
  }> {
    let user = await this.prisma.user.findFirst({
      where: {
        provider: data.provider,
        providerId: data.providerId,
      },
    });

    if (!user && data.email) {
      user = await this.prisma.user.findUnique({
        where: { email: data.email.toLowerCase().trim() },
      });

      if (user) {
        user = await this.prisma.user.update({
          where: { id: user.id },
          data: {
            provider: data.provider,
            providerId: data.providerId,
            avatar: data.avatar ?? user.avatar,
            name: data.name || user.name,
          },
        });
      }
    }

    if (!user) {
      if (!data.email) {
        throw new BadRequestException(
          'No email was provided by the identity provider.',
        );
      }

      user = await this.prisma.user.create({
        data: {
          email: data.email.toLowerCase().trim(),
          name: data.name || 'SSO User',
          provider: data.provider,
          providerId: data.providerId,
          avatar: data.avatar,
          password: null,
        },
      });

      await this.quickCommandsService.seedDefaults(user.id);
    }

    const tokens = this.issueTokenPair(user);

    return {
      ...tokens,
      user: this.toPublicUser(user),
    };
  }

  async validateUser(id: number) {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      avatar: user.avatar,
      provider: user.provider ?? 'local',
    };
  }

  async refreshTokens(refreshTokenDto: RefreshTokenDto) {
    try {
      const payload = this.jwtService.verify(refreshTokenDto.refresh_token, {
        secret: this.getRefreshSecret(),
      }) as { sub: number; email: string };

      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
      });

      if (!user) {
        throw new UnauthorizedException('User not found');
      }

      const tokens = this.issueTokenPair(user);

      return {
        ...tokens,
        user: this.toPublicUser(user),
      };
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async updateProfile(userId: number, updateProfileDto: UpdateProfileDto) {
    const { email, name, password } = updateProfileDto;

    if (!email && !name && !password) {
      throw new BadRequestException('Provide at least one field to update');
    }

    if (email) {
      const existingUser = await this.prisma.user.findUnique({
        where: { email },
      });

      if (existingUser && existingUser.id !== userId) {
        throw new BadRequestException('User with this email already exists');
      }
    }

    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: {
        ...(email ? { email } : {}),
        ...(name ? { name } : {}),
        ...(password ? { password: await bcrypt.hash(password, 10) } : {}),
      },
    });

    return {
      id: updatedUser.id,
      email: updatedUser.email,
      name: updatedUser.name,
    };
  }

  async forgotPassword(forgotPasswordDto: ForgotPasswordDto): Promise<void> {
    const email = forgotPasswordDto.email.toLowerCase().trim();
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return;
    }

    await this.issueResetTokenForUser(user);
  }

  async resendReset(forgotPasswordDto: ForgotPasswordDto): Promise<void> {
    const email = forgotPasswordDto.email.toLowerCase().trim();
    this.checkResendRateLimit(email);

    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return;
    }

    await this.issueResetTokenForUser(user);
  }

  async resetPassword(resetPasswordDto: ResetPasswordDto): Promise<void> {
    const { token, password, confirmPassword } = resetPasswordDto;

    if (password !== confirmPassword) {
      throw new BadRequestException('Passwords do not match.');
    }

    const record = await this.prisma.passwordResetToken.findUnique({
      where: { token },
      include: { user: true },
    });

    if (!record || record.used || record.expiresAt < new Date()) {
      throw new BadRequestException('Reset link is invalid or has expired.');
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    await this.prisma.user.update({
      where: { id: record.userId },
      data: {
        password: hashedPassword,
      },
    });

    await this.prisma.passwordResetToken.updateMany({
      where: {
        userId: record.userId,
      },
      data: {
        used: true,
      },
    });
  }
}
