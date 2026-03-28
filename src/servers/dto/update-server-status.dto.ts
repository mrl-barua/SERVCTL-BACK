import { ApiProperty } from '@nestjs/swagger';
import {
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class UpdateServerStatusDto {
  @ApiProperty({ example: 'online', enum: ['online', 'offline', 'unknown'] })
  @IsString()
  @IsIn(['online', 'offline', 'unknown'])
  status: string;

  @ApiProperty({ example: 99.5, required: false, minimum: 0, maximum: 100 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  uptime?: number;
}
