import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class CreateConnectionDto {
  @ApiProperty({ example: 'Production MySQL' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ enum: ['mysql', 'postgresql', 'mongodb'], example: 'mysql' })
  @IsString()
  @IsIn(['mysql', 'postgresql', 'mongodb'])
  type: string;

  @ApiProperty({ example: '127.0.0.1' })
  @IsString()
  @IsNotEmpty()
  host: string;

  @ApiProperty({ example: 3306, minimum: 1, maximum: 65535 })
  @IsInt()
  @Min(1)
  @Max(65535)
  port: number;

  @ApiPropertyOptional({ example: 'myapp_db' })
  @IsOptional()
  @IsString()
  databaseName?: string;

  @ApiProperty({ example: 'root' })
  @IsString()
  @IsNotEmpty()
  username: string;

  @ApiProperty({ example: 'password123' })
  @IsString()
  @IsNotEmpty()
  password: string;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  useSSHTunnel?: boolean;

  @ApiPropertyOptional({ example: 1, description: 'Server ID for SSH tunnel' })
  @IsOptional()
  @IsInt()
  serverId?: number;
}
