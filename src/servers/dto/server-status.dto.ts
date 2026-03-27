import { ApiProperty } from '@nestjs/swagger';

export class ServerStatusDto {
  @ApiProperty({
    example: 1,
    description: 'Server ID',
  })
  id: number;

  @ApiProperty({
    example: 'running',
    description: 'Current server status',
    enum: ['running', 'stopped', 'error'],
  })
  status: string;

  @ApiProperty({
    example: 99.5,
    description: 'Server uptime percentage',
  })
  uptime: number;

  @ApiProperty({
    example: '2024-01-15T10:30:00Z',
    description: 'Last status check timestamp',
  })
  lastCheck: string;
}
