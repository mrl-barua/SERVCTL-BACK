import {
  IsString,
  IsOptional,
  IsNumber,
  IsIn,
  Min,
  Max,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ServerDto {
  @ApiProperty({
    example: 'Production Server',
    description: 'Server name',
  })
  @IsString()
  name: string;

  @ApiProperty({
    example: '192.168.1.100',
    description: 'Server host IP address or domain',
  })
  @IsString()
  host: string;

  @ApiProperty({
    example: 'ubuntu',
    description: 'SSH user',
    required: false,
  })
  @IsString()
  @IsOptional()
  user?: string;

  @ApiProperty({
    example: 22,
    description: 'SSH port',
    required: false,
    minimum: 1,
    maximum: 65535,
  })
  @IsNumber()
  @IsOptional()
  @Min(1)
  @Max(65535)
  port?: number;

  @ApiProperty({
    example: 'prod',
    description: 'Environment',
    required: false,
    enum: ['prod', 'live', 'qa', 'test'],
  })
  @IsString()
  @IsOptional()
  @IsIn(['prod', 'live', 'qa', 'test'])
  env?: string;

  @ApiProperty({
    example: 'Main production server',
    description: 'Server notes',
    required: false,
  })
  @IsString()
  @IsOptional()
  notes?: string;

  @ApiProperty({
    example: 'git pull && npm install && npm run build',
    description: 'Deploy script',
    required: false,
  })
  @IsString()
  @IsOptional()
  deploy?: string;

  @ApiProperty({
    example: '/var/log/app.log',
    description: 'Log file path',
    required: false,
  })
  @IsString()
  @IsOptional()
  logpath?: string;
}

export class UpdateServerDto {
  @ApiProperty({
    example: 'Production Server',
    description: 'Server name',
    required: false,
  })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiProperty({
    example: '192.168.1.100',
    description: 'Server host IP address or domain',
    required: false,
  })
  @IsString()
  @IsOptional()
  host?: string;

  @ApiProperty({
    example: 'ubuntu',
    description: 'SSH user',
    required: false,
  })
  @IsString()
  @IsOptional()
  user?: string;

  @ApiProperty({
    example: 22,
    description: 'SSH port',
    required: false,
    minimum: 1,
    maximum: 65535,
  })
  @IsNumber()
  @IsOptional()
  @Min(1)
  @Max(65535)
  port?: number;

  @ApiProperty({
    example: 'prod',
    description: 'Environment',
    required: false,
    enum: ['prod', 'live', 'qa', 'test'],
  })
  @IsString()
  @IsOptional()
  @IsIn(['prod', 'live', 'qa', 'test'])
  env?: string;

  @ApiProperty({
    example: 'Main production server',
    description: 'Server notes',
    required: false,
  })
  @IsString()
  @IsOptional()
  notes?: string;

  @ApiProperty({
    example: 'git pull && npm install && npm run build',
    description: 'Deploy script',
    required: false,
  })
  @IsString()
  @IsOptional()
  deploy?: string;

  @ApiProperty({
    example: '/var/log/app.log',
    description: 'Log file path',
    required: false,
  })
  @IsString()
  @IsOptional()
  logpath?: string;

  @ApiProperty({
    example: 'running',
    description: 'Server status',
    required: false,
  })
  @IsString()
  @IsOptional()
  status?: string;

  @ApiProperty({
    example: 99.5,
    description: 'Server uptime percentage',
    required: false,
  })
  @IsNumber()
  @IsOptional()
  uptime?: number;
}
