import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class UpdateServerGroupDto {
  @ApiPropertyOptional({ example: 'Staging Servers' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ example: '#e74c3c' })
  @IsOptional()
  @IsString()
  color?: string;
}
