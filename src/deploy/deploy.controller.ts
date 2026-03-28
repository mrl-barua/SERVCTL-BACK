import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { DeployService } from './deploy.service';

@ApiTags('deploy')
@Controller('deploy')
@UseGuards(AuthGuard('jwt'))
@ApiBearerAuth('JWT-auth')
export class DeployController {
  constructor(private readonly deployService: DeployService) {}

  @Get(':serverId/status')
  @ApiOperation({ summary: 'Get deploy status for a server' })
  @ApiResponse({ status: 200, description: 'Deploy status fetched' })
  getStatus(
    @CurrentUser() user: any,
    @Param('serverId', ParseIntPipe) serverId: number,
  ) {
    return this.deployService.getStatus(user.id, serverId);
  }

  @Get(':serverId/history')
  @ApiOperation({ summary: 'Get deploy history lines for a server' })
  @ApiResponse({ status: 200, description: 'Deploy history fetched' })
  getHistory(
    @CurrentUser() user: any,
    @Param('serverId', ParseIntPipe) serverId: number,
  ) {
    return this.deployService.getHistory(user.id, serverId);
  }

  @Get('steps')
  @ApiOperation({ summary: 'Get deploy step labels' })
  @ApiResponse({ status: 200, description: 'Deploy steps fetched' })
  getSteps() {
    return { steps: this.deployService.getSteps() };
  }

  @Post(':serverId/start')
  @ApiOperation({ summary: 'Start deployment for a server' })
  @ApiResponse({ status: 200, description: 'Deploy started' })
  start(
    @CurrentUser() user: any,
    @Param('serverId', ParseIntPipe) serverId: number,
  ) {
    return this.deployService.startDeploy(user.id, serverId);
  }

  @Post(':serverId/stop')
  @ApiOperation({ summary: 'Stop deployment for a server' })
  @ApiResponse({ status: 200, description: 'Deploy stopped' })
  stop(
    @CurrentUser() user: any,
    @Param('serverId', ParseIntPipe) serverId: number,
  ) {
    return this.deployService.stopDeploy(user.id, serverId);
  }
}
