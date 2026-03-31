import { ApiProperty } from '@nestjs/swagger';
import { ArrayNotEmpty, IsArray, IsInt } from 'class-validator';

export class AssignTagDto {
  @ApiProperty({ example: [1, 2, 3], description: 'Array of server IDs to assign this tag to' })
  @IsArray()
  @ArrayNotEmpty()
  @IsInt({ each: true })
  serverIds: number[];
}
