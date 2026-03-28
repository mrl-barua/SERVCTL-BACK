import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { CreateQuickCommandDto } from './dto/create-quick-command.dto';
import { ReorderQuickCommandsDto } from './dto/reorder-quick-commands.dto';
import { UpdateQuickCommandDto } from './dto/update-quick-command.dto';
import { QuickCommandsService } from './quick-commands.service';

@ApiTags('quick-commands')
@Controller('quick-commands')
@UseGuards(AuthGuard('jwt'))
@ApiBearerAuth('JWT-auth')
export class QuickCommandsController {
  constructor(private readonly service: QuickCommandsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all quick commands for current user' })
  @ApiResponse({ status: 200, description: 'Quick commands list returned' })
  findAll(@CurrentUser() user: any) {
    return this.service.findAll(user.id);
  }

  @Get('for-server/:serverId')
  @ApiOperation({ summary: 'Get quick commands filtered for selected server' })
  @ApiParam({ name: 'serverId', example: 1 })
  @ApiResponse({ status: 200, description: 'Filtered quick commands returned' })
  @ApiResponse({ status: 404, description: 'Server not found' })
  findForServer(
    @CurrentUser() user: any,
    @Param('serverId', ParseIntPipe) serverId: number,
  ) {
    return this.service.findForServer(user.id, serverId);
  }

  @Post()
  @ApiOperation({ summary: 'Create a quick command' })
  @ApiResponse({ status: 201, description: 'Quick command created' })
  @ApiResponse({ status: 400, description: 'Invalid quick command payload' })
  create(@CurrentUser() user: any, @Body() dto: CreateQuickCommandDto) {
    return this.service.create(user.id, dto);
  }

  @Patch('reorder/batch')
  @ApiOperation({ summary: 'Reorder all quick commands' })
  @ApiResponse({ status: 200, description: 'Quick commands reordered' })
  @ApiResponse({ status: 400, description: 'Invalid reorder payload' })
  reorder(@CurrentUser() user: any, @Body() dto: ReorderQuickCommandsDto) {
    return this.service.reorder(user.id, dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update one quick command' })
  @ApiParam({ name: 'id', example: 1 })
  @ApiResponse({ status: 200, description: 'Quick command updated' })
  @ApiResponse({ status: 404, description: 'Quick command not found' })
  update(
    @CurrentUser() user: any,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateQuickCommandDto,
  ) {
    return this.service.update(user.id, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete one quick command' })
  @ApiParam({ name: 'id', example: 1 })
  @ApiResponse({ status: 200, description: 'Quick command deleted' })
  @ApiResponse({ status: 400, description: 'System command cannot be deleted' })
  @ApiResponse({ status: 404, description: 'Quick command not found' })
  remove(@CurrentUser() user: any, @Param('id', ParseIntPipe) id: number) {
    return this.service.remove(user.id, id);
  }
}
