import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateServerGroupDto {
  @ApiProperty({ example: 'Production Servers' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ example: '#4f8ef7', default: '#4f8ef7' })
  @IsOptional()
  @IsString()
  color?: string;
}
