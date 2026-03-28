import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { RegisterDto } from './dto/register.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { CurrentUser } from './decorators/current-user.decorator';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

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
