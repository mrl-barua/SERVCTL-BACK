import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsInt } from 'class-validator';

export class ReorderQuickCommandsDto {
  @ApiProperty({
    description: 'Array of quick command IDs in desired sort order',
    type: [Number],
    example: [4, 2, 5, 1],
  })
  @IsArray()
  @IsInt({ each: true })
  orderedIds: number[];
}
