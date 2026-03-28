import { Controller, Get } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

@ApiTags('config')
@Controller()
export class AppController {
  constructor(private readonly configService: ConfigService) {}

  @Get('config')
  @ApiOperation({
    summary: 'Get frontend runtime configuration and feature flags',
  })
  @ApiResponse({ status: 200, description: 'Configuration payload' })
  getConfig() {
    const deployMode = this.configService.get<string>('DEPLOY_MODE') || 'local';

    return {
      deployMode,
      version: '0.1.0',
      features: {
        keyPath: deployMode === 'local',
        keyVault: true,
        privateNetworks: deployMode === 'local',
      },
    };
  }
}
