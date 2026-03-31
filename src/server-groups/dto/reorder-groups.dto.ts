import { ApiProperty } from '@nestjs/swagger';
import { ArrayNotEmpty, IsArray, IsInt } from 'class-validator';

export class ReorderGroupsDto {
  @ApiProperty({ example: [3, 1, 2], type: [Number] })
  @IsArray()
  @ArrayNotEmpty()
  @IsInt({ each: true })
  orderedIds: number[];
}
