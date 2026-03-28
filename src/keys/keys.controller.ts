import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
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
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { KeysService } from './keys.service';

class CreateKeyDto {
  @IsString()
  label: string;

  @IsString()
  privateKey: string;

  @IsOptional()
  @IsString()
  passphrase?: string;
}

class VerifyKeyDto {
  @IsString()
  host: string;

  @IsString()
  user: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(65535)
  port?: number;
}

@ApiTags('keys')
@Controller('keys')
@UseGuards(AuthGuard('jwt'))
@ApiBearerAuth('JWT-auth')
export class KeysController {
  constructor(private readonly keysService: KeysService) {}

  @Post()
  @ApiOperation({ summary: 'Upload/save SSH key into key vault' })
  @ApiResponse({ status: 201, description: 'SSH key saved' })
  create(@CurrentUser() user: any, @Body() dto: CreateKeyDto) {
    return this.keysService.create(user.id, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List current user SSH keys (without private key)' })
  @ApiResponse({ status: 200, description: 'SSH keys listed' })
  list(@CurrentUser() user: any) {
    return this.keysService.list(user.id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete SSH key from vault' })
  @ApiResponse({ status: 200, description: 'SSH key deleted' })
  remove(@CurrentUser() user: any, @Param('id') id: string) {
    return this.keysService.remove(user.id, id);
  }

  @Post(':id/verify')
  @ApiOperation({ summary: 'Verify SSH key with SSH handshake only' })
  @ApiResponse({ status: 200, description: 'SSH key verified' })
  verify(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() dto: VerifyKeyDto,
  ) {
    return this.keysService.verify(user.id, id, dto);
  }
}
