import { ApiProperty } from '@nestjs/swagger';
import { IsString, Matches, MinLength } from 'class-validator';

export class ResetPasswordDto {
  @ApiProperty({
    example: '1f0d66f4f309eaeb08438f6f1d02f7e2...',
    description: 'Password reset token received by email',
  })
  @IsString()
  token: string;

  @ApiProperty({
    example: 'StrongPass1!',
    description:
      'New password (must include uppercase, number, and special character)',
  })
  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters' })
  @Matches(/^(?=.*[A-Z])(?=.*[0-9])(?=.*[^A-Za-z0-9])/, {
    message: 'Password must contain uppercase, number, and special character',
  })
  password: string;

  @ApiProperty({
    example: 'StrongPass1!',
    description: 'Must match password',
  })
  @IsString()
  confirmPassword: string;
}
