import {
  Body,
  Controller,
  DefaultValuePipe,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { PublicUser } from '../auth/types/jwt-payload.interface';
import { CreateHealthAlertDto } from './dto/create-health-alert.dto';
import { ServerHealthService } from './server-health.service';

@ApiTags('server-health')
@Controller('server-health')
@UseGuards(AuthGuard('jwt'))
@ApiBearerAuth('JWT-auth')
export class ServerHealthController {
  constructor(private readonly serverHealthService: ServerHealthService) {}

  // ── Static alert routes (must be before :serverId param routes) ──

  @Get('alerts')
  @ApiOperation({ summary: 'List health alert rules for the current user' })
  @ApiResponse({
    status: 200,
    description: 'List of alert rules',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - missing or invalid token',
  })
  getAlerts(@CurrentUser() user: PublicUser) {
    return this.serverHealthService.getAlerts(user.id);
  }

  @Post('alerts')
  @ApiOperation({ summary: 'Create a health alert rule' })
  @ApiResponse({
    status: 201,
    description: 'Alert rule created successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid input data',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - missing or invalid token',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - server does not belong to user',
  })
  createAlert(
    @Body() dto: CreateHealthAlertDto,
    @CurrentUser() user: PublicUser,
  ) {
    return this.serverHealthService.createAlert(user.id, dto);
  }

  @Delete('alerts/:id')
  @ApiOperation({ summary: 'Delete a health alert rule' })
  @ApiParam({
    name: 'id',
    description: 'Alert rule ID',
    example: 1,
  })
  @ApiResponse({
    status: 200,
    description: 'Alert rule deleted successfully',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - missing or invalid token',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - alert does not belong to user',
  })
  @ApiResponse({
    status: 404,
    description: 'Alert not found',
  })
  deleteAlert(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: PublicUser,
  ) {
    return this.serverHealthService.deleteAlert(id, user.id);
  }

  // ── Parameterized server routes ──

  @Get(':serverId/current')
  @ApiOperation({ summary: 'Get latest health snapshot for a server' })
  @ApiParam({
    name: 'serverId',
    description: 'Server ID',
    example: 1,
  })
  @ApiResponse({
    status: 200,
    description: 'Latest health snapshot',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - missing or invalid token',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - server does not belong to user',
  })
  @ApiResponse({
    status: 404,
    description: 'Server not found or no health data available',
  })
  getCurrentHealth(
    @Param('serverId', ParseIntPipe) serverId: number,
    @CurrentUser() user: PublicUser,
  ) {
    return this.serverHealthService.getCurrentHealth(serverId, user.id);
  }

  @Get(':serverId/history')
  @ApiOperation({ summary: 'Get recent health snapshots for a server' })
  @ApiParam({
    name: 'serverId',
    description: 'Server ID',
    example: 1,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Number of snapshots to return',
    example: 60,
  })
  @ApiResponse({
    status: 200,
    description: 'List of recent health snapshots',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - missing or invalid token',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - server does not belong to user',
  })
  @ApiResponse({
    status: 404,
    description: 'Server not found',
  })
  getHealthHistory(
    @Param('serverId', ParseIntPipe) serverId: number,
    @CurrentUser() user: PublicUser,
    @Query('limit', new DefaultValuePipe(60), ParseIntPipe) limit: number,
  ) {
    return this.serverHealthService.getHealthHistory(serverId, user.id, limit);
  }

  @Post(':serverId/collect')
  @ApiOperation({ summary: 'Trigger manual health data collection via SSH' })
  @ApiParam({
    name: 'serverId',
    description: 'Server ID',
    example: 1,
  })
  @ApiResponse({
    status: 201,
    description: 'Health snapshot collected successfully',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - missing or invalid token',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - server does not belong to user',
  })
  @ApiResponse({
    status: 404,
    description: 'Server not found',
  })
  collectHealth(
    @Param('serverId', ParseIntPipe) serverId: number,
    @CurrentUser() user: PublicUser,
  ) {
    return this.serverHealthService.collectHealth(serverId, user.id);
  }
}
