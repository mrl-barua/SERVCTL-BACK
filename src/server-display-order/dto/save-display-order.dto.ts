import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsInt } from 'class-validator';

export class SaveDisplayOrderDto {
  @ApiProperty({
    description: 'Ordered array of server IDs',
    example: [3, 1, 4, 2],
    type: [Number],
  })
  @IsArray()
  @IsInt({ each: true })
  orderedServerIds: number[];
}
