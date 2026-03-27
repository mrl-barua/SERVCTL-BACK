import {
  IsString,
  IsOptional,
  IsNumber,
  IsIn,
  Min,
  Max,
} from 'class-validator';

export class ServerDto {
  @IsString()
  name: string;

  @IsString()
  host: string;

  @IsString()
  @IsOptional()
  user?: string;

  @IsNumber()
  @IsOptional()
  @Min(1)
  @Max(65535)
  port?: number;

  @IsString()
  @IsOptional()
  @IsIn(['prod', 'live', 'qa', 'test'])
  env?: string;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsString()
  @IsOptional()
  deploy?: string;

  @IsString()
  @IsOptional()
  logpath?: string;
}

export class UpdateServerDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  host?: string;

  @IsString()
  @IsOptional()
  user?: string;

  @IsNumber()
  @IsOptional()
  @Min(1)
  @Max(65535)
  port?: number;

  @IsString()
  @IsOptional()
  @IsIn(['prod', 'live', 'qa', 'test'])
  env?: string;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsString()
  @IsOptional()
  deploy?: string;

  @IsString()
  @IsOptional()
  logpath?: string;

  @IsString()
  @IsOptional()
  status?: string;

  @IsNumber()
  @IsOptional()
  uptime?: number;
}
