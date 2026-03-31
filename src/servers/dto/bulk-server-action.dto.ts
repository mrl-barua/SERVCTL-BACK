import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsInt } from 'class-validator';

export class BulkServerActionDto {
  @ApiProperty({
    example: [1, 2, 3],
    description: 'Array of server IDs to act on',
  })
  @IsArray()
  @IsInt({ each: true })
  serverIds: number[];
}
