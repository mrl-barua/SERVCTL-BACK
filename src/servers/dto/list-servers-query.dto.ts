import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class ListServersQueryDto {
  @ApiPropertyOptional({ example: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ example: 20, minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @ApiPropertyOptional({
    example: 'prod',
    enum: ['prod', 'live', 'qa', 'test'],
  })
  @IsOptional()
  @IsString()
  @IsIn(['prod', 'live', 'qa', 'test'])
  env?: string;

  @ApiPropertyOptional({
    example: 'online',
    enum: ['online', 'offline', 'unknown'],
  })
  @IsOptional()
  @IsString()
  @IsIn(['online', 'offline', 'unknown'])
  status?: string;

  @ApiPropertyOptional({
    example: 'web-prod',
    description: 'Case-insensitive name contains filter',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    example: 1,
    description: 'Filter by server group ID',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  groupId?: number;

  @ApiPropertyOptional({
    example: 1,
    description: 'Filter by server tag ID',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  tagId?: number;
}
