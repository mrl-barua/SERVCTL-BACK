import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import {
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class CreateServerDto {
  @ApiProperty({ example: 'Production Server' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: '10.0.1.10' })
  @IsString()
  @IsNotEmpty()
  host: string;

  @ApiPropertyOptional({ example: 22, minimum: 1, maximum: 65535 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(65535)
  port?: number;

  @ApiPropertyOptional({ example: 'ubuntu' })
  @IsOptional()
  @IsString()
  user?: string;

  @ApiPropertyOptional({
    enum: ['prod', 'live', 'qa', 'test'],
    example: 'prod',
  })
  @IsOptional()
  @IsString()
  @IsIn(['prod', 'live', 'qa', 'test'])
  env?: string;

  @ApiPropertyOptional({ example: 'api + nginx node' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ example: 'bash deploy.sh' })
  @IsOptional()
  @IsString()
  deploy?: string;

  @ApiPropertyOptional({
    enum: ['file', 'journalctl', 'docker'],
    example: 'file',
  })
  @IsOptional()
  @IsString()
  @IsIn(['file', 'journalctl', 'docker'])
  logType?: string;

  @ApiPropertyOptional({ example: '/var/log/app.log' })
  @IsOptional()
  @IsString()
  logPath?: string;

  @ApiPropertyOptional({ example: 'app-container' })
  @IsOptional()
  @IsString()
  dockerName?: string;

  @ApiProperty({
    enum: ['password', 'key-stored', 'key-path', 'key-vault'],
    example: 'password',
  })
  @IsString()
  @IsIn(['password', 'key-stored', 'key-path', 'key-vault'])
  authMethod: string;

  @ApiPropertyOptional({ example: 's3cr3t' })
  @IsOptional()
  @IsString()
  password?: string;

  @ApiPropertyOptional({ example: '-----BEGIN OPENSSH PRIVATE KEY-----' })
  @IsOptional()
  @IsString()
  sshKey?: string;

  @ApiPropertyOptional({ example: 'prod-key' })
  @IsOptional()
  @IsString()
  sshKeyLabel?: string;

  @ApiPropertyOptional({ example: '/home/dev/.ssh/id_rsa' })
  @IsOptional()
  @IsString()
  sshKeyPath?: string;

  @ApiPropertyOptional({ example: 'ckx...' })
  @IsOptional()
  @IsString()
  vaultKeyId?: string;
}

export class UpdateServerDto extends PartialType(CreateServerDto) {}
