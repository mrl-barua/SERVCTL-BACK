import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateQuickCommandDto {
  @ApiProperty({
    description: 'Display label shown on quick command button',
    example: 'disk usage',
    minLength: 1,
    maxLength: 40,
  })
  @IsString()
  @MinLength(1)
  @MaxLength(40)
  label: string;

  @ApiProperty({
    description: 'Shell command executed in terminal',
    example: 'df -h',
    minLength: 1,
    maxLength: 500,
  })
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  command: string;

  @ApiProperty({
    description: 'Command scope: all servers or one specific server',
    enum: ['all', 'server'],
    example: 'all',
  })
  @IsIn(['all', 'server'])
  scope: 'all' | 'server';

  @ApiPropertyOptional({
    description: 'Server ID required when scope is server',
    example: 12,
  })
  @IsOptional()
  @IsInt()
  serverId?: number;

  @ApiPropertyOptional({
    description: 'Optional emoji icon displayed on command button',
    example: '💾',
    maxLength: 4,
  })
  @IsOptional()
  @IsString()
  @MaxLength(4)
  icon?: string;

  @ApiPropertyOptional({
    description: 'Optional explicit sort order',
    example: 3,
  })
  @IsOptional()
  @IsInt()
  sortOrder?: number;
}
