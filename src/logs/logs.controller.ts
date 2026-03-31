import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { PublicUser } from '../auth/types/jwt-payload.interface';
import { LogsService } from './logs.service';

@ApiTags('logs')
@Controller('logs')
@UseGuards(AuthGuard('jwt'))
@ApiBearerAuth('JWT-auth')
export class LogsController {
  constructor(private readonly logsService: LogsService) {}

  @Get(':serverId')
  @ApiOperation({ summary: 'Get logs for a server' })
  @ApiQuery({ name: 'limit', required: false, example: 120 })
  @ApiQuery({ name: 'level', required: false, example: 'ERROR' })
  @ApiQuery({ name: 'search', required: false, example: 'deploy' })
  @ApiResponse({
    status: 200,
    description: 'Logs fetched successfully',
  })
  getLogs(
    @CurrentUser() user: PublicUser,
    @Param('serverId', ParseIntPipe) serverId: number,
    @Query('limit') limit?: string,
    @Query('level') level?: string,
    @Query('search') search?: string,
  ) {
    return this.logsService.getLogs(
      user.id,
      serverId,
      limit ? Number(limit) : 120,
      level,
      search,
    );
  }
}
