import { Controller, Get, Query } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { NetworkService } from './network.service';

@ApiTags('network')
@Controller('network')
export class NetworkController {
  constructor(
    private readonly networkService: NetworkService,
    private readonly configService: ConfigService,
  ) {}

  @Get('check')
  @ApiOperation({ summary: 'Check host reachability warning by deploy mode' })
  @ApiQuery({ name: 'host', required: true, example: '10.0.1.10' })
  @ApiResponse({ status: 200, description: 'Network warning result' })
  check(@Query('host') host: string) {
    const deployMode = this.configService.get<string>('DEPLOY_MODE') || 'local';
    const warning = this.networkService.getNetworkWarning(host, deployMode);
    return {
      deployMode,
      warning,
    };
  }
}
