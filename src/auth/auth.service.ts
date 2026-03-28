import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';
import { MailService } from '../mail/mail.service';
import { PrismaService } from '../prisma/prisma.service';
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
  ) {}

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

    const tokens = this.issueTokenPair(user);

    return {
      ...tokens,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
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

    // Validate password
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const tokens = this.issueTokenPair(user);

    return {
      ...tokens,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
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
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
        },
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
