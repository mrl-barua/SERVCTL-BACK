import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsInt, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';

export class CreateHealthAlertDto {
  @ApiProperty({
    description: 'Server ID to monitor',
    example: 1,
  })
  @IsInt()
  serverId: number;

  @ApiProperty({
    description: 'Metric to monitor',
    enum: ['cpu', 'memory', 'disk'],
    example: 'cpu',
  })
  @IsString()
  @IsIn(['cpu', 'memory', 'disk'])
  metric: string;

  @ApiProperty({
    description: 'Threshold percentage (0-100)',
    example: 80,
    minimum: 0,
    maximum: 100,
  })
  @IsNumber()
  @Min(0)
  @Max(100)
  threshold: number;

  @ApiPropertyOptional({
    description: 'Alert when metric goes above or below threshold',
    enum: ['above', 'below'],
    default: 'above',
    example: 'above',
  })
  @IsOptional()
  @IsString()
  @IsIn(['above', 'below'])
  direction?: string;
}
