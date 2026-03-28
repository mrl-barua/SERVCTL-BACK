import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Response } from 'express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { RegisterDto } from './dto/register.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { CurrentUser } from './decorators/current-user.decorator';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  private getFrontendUrl() {
    return process.env.FRONTEND_URL || 'http://localhost:5173';
  }

  @Get('github')
  @UseGuards(AuthGuard('github'))
  @ApiOperation({ summary: 'Redirect to GitHub OAuth login' })
  @ApiResponse({ status: 302, description: 'Redirect to GitHub' })
  githubLogin() {
    return;
  }

  @Get('github/callback')
  @UseGuards(AuthGuard('github'))
  @ApiOperation({ summary: 'Handle GitHub OAuth callback' })
  @ApiResponse({ status: 302, description: 'Redirect to frontend callback' })
  githubCallback(@Req() req: any, @Res() res: Response) {
    const token = encodeURIComponent(req.user.access_token);
    res.redirect(`${this.getFrontendUrl()}/auth/callback?token=${token}`);
  }

  @Get('google')
  @UseGuards(AuthGuard('google'))
  @ApiOperation({ summary: 'Redirect to Google OAuth login' })
  @ApiResponse({ status: 302, description: 'Redirect to Google' })
  googleLogin() {
    return;
  }

  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  @ApiOperation({ summary: 'Handle Google OAuth callback' })
  @ApiResponse({ status: 302, description: 'Redirect to frontend callback' })
  googleCallback(@Req() req: any, @Res() res: Response) {
    const token = encodeURIComponent(req.user.access_token);
    res.redirect(`${this.getFrontendUrl()}/auth/callback?token=${token}`);
  }

  @Get('facebook')
  @UseGuards(AuthGuard('facebook'))
  @ApiOperation({ summary: 'Redirect to Facebook OAuth login' })
  @ApiResponse({ status: 302, description: 'Redirect to Facebook' })
  facebookLogin() {
    return;
  }

  @Get('facebook/callback')
  @UseGuards(AuthGuard('facebook'))
  @ApiOperation({ summary: 'Handle Facebook OAuth callback' })
  @ApiResponse({ status: 302, description: 'Redirect to frontend callback' })
  facebookCallback(@Req() req: any, @Res() res: Response) {
    const token = encodeURIComponent(req.user.access_token);
    res.redirect(`${this.getFrontendUrl()}/auth/callback?token=${token}`);
  }

  @Post('register')
  @ApiOperation({ summary: 'Register a new user' })
  @ApiResponse({
    status: 201,
    description: 'User registered successfully',
    schema: {
      example: {
        access_token: 'eyJhbGciOiJIUzI1NiIs...',
        user: {
          id: 1,
          email: 'user@example.com',
          name: 'John Doe',
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid input or user already exists',
  })
  register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @Post('login')
  @ApiOperation({ summary: 'Login user' })
  @ApiResponse({
    status: 200,
    description: 'Login successful',
    schema: {
      example: {
        access_token: 'eyJhbGciOiJIUzI1NiIs...',
        user: {
          id: 1,
          email: 'user@example.com',
          name: 'John Doe',
        },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Invalid credentials',
  })
  login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @Post('forgot-password')
  @ApiOperation({ summary: 'Request password reset link' })
  @ApiResponse({
    status: 200,
    description: 'Reset link request accepted',
    schema: {
      example: {
        message: 'If that email exists, a reset link was sent.',
      },
    },
  })
  forgotPassword(@Body() forgotPasswordDto: ForgotPasswordDto) {
    return this.authService.forgotPassword(forgotPasswordDto).then(() => ({
      message: 'If that email exists, a reset link was sent.',
    }));
  }

  @Post('resend-reset')
  @ApiOperation({ summary: 'Resend password reset link' })
  @ApiResponse({
    status: 200,
    description: 'Reset link resent',
    schema: {
      example: {
        message: 'Reset link resent.',
      },
    },
  })
  @ApiResponse({
    status: 429,
    description: 'Too many reset requests for this email',
  })
  resendReset(@Body() forgotPasswordDto: ForgotPasswordDto) {
    return this.authService.resendReset(forgotPasswordDto).then(() => ({
      message: 'Reset link resent.',
    }));
  }

  @Post('reset-password')
  @ApiOperation({ summary: 'Reset password with token' })
  @ApiResponse({
    status: 200,
    description: 'Password updated successfully',
    schema: {
      example: {
        message: 'Password updated successfully.',
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Passwords do not match or reset token is invalid/expired',
  })
  resetPassword(@Body() resetPasswordDto: ResetPasswordDto) {
    return this.authService.resetPassword(resetPasswordDto).then(() => ({
      message: 'Password updated successfully.',
    }));
  }

  @Post('refresh')
  @ApiOperation({ summary: 'Refresh access token using refresh token' })
  @ApiResponse({
    status: 200,
    description: 'Tokens refreshed successfully',
  })
  @ApiResponse({
    status: 401,
    description: 'Invalid refresh token',
  })
  refresh(@Body() refreshTokenDto: RefreshTokenDto) {
    return this.authService.refreshTokens(refreshTokenDto);
  }

  @Get('me')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get current user information' })
  @ApiResponse({
    status: 200,
    description: 'Current user data',
    schema: {
      example: {
        id: 1,
        email: 'user@example.com',
        name: 'John Doe',
        iat: 1234567890,
        exp: 1234567890,
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - missing or invalid token',
  })
  getCurrentUser(@CurrentUser() user: any) {
    return user;
  }

  @Post('profile')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Update current user profile' })
  @ApiResponse({
    status: 200,
    description: 'Profile updated successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid profile update payload',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - missing or invalid token',
  })
  updateProfile(
    @CurrentUser() user: any,
    @Body() updateProfileDto: UpdateProfileDto,
  ) {
    return this.authService.updateProfile(user.id, updateProfileDto);
  }
}
