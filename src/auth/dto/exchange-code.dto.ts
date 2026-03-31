import { ApiProperty } from '@nestjs/swagger';
import { IsString, Length } from 'class-validator';

export class ExchangeCodeDto {
  @ApiProperty({
    example: 'a1b2c3d4...',
    description: 'One-time authorization code from OAuth callback',
  })
  @IsString()
  @Length(64, 64)
  code: string;
}
