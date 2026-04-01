import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class ExecuteQueryDto {
  @ApiProperty({ example: 'SELECT * FROM users LIMIT 10' })
  @IsString()
  @IsNotEmpty()
  query: string;

  @ApiPropertyOptional({ example: 'myapp_db' })
  @IsOptional()
  @IsString()
  database?: string;
}
