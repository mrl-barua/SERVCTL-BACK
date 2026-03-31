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
import { AuthGuard } from '@nestjs/passport';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { PublicUser } from '../auth/types/jwt-payload.interface';
import { AddServersToGroupDto } from './dto/add-servers-to-group.dto';
import { CreateServerGroupDto } from './dto/create-server-group.dto';
import { ReorderGroupsDto } from './dto/reorder-groups.dto';
import { UpdateServerGroupDto } from './dto/update-server-group.dto';
import { ServerGroupsService } from './server-groups.service';

@ApiTags('server-groups')
@Controller('server-groups')
@UseGuards(AuthGuard('jwt'))
@ApiBearerAuth('JWT-auth')
export class ServerGroupsController {
  constructor(private readonly serverGroupsService: ServerGroupsService) {}

  @Get()
  @ApiOperation({ summary: 'List all server groups for the current user' })
  @ApiResponse({ status: 200, description: 'List of server groups with member counts' })
  @ApiResponse({ status: 401, description: 'Unauthorized - missing or invalid token' })
  findAll(@CurrentUser() user: PublicUser) {
    return this.serverGroupsService.findAll(user.id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new server group' })
  @ApiResponse({ status: 201, description: 'Server group created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiResponse({ status: 401, description: 'Unauthorized - missing or invalid token' })
  create(
    @CurrentUser() user: PublicUser,
    @Body() dto: CreateServerGroupDto,
  ) {
    return this.serverGroupsService.create(user.id, dto);
  }

  @Patch('reorder')
  @ApiOperation({ summary: 'Reorder server groups' })
  @ApiResponse({ status: 200, description: 'Groups reordered successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiResponse({ status: 401, description: 'Unauthorized - missing or invalid token' })
  reorder(
    @CurrentUser() user: PublicUser,
    @Body() dto: ReorderGroupsDto,
  ) {
    return this.serverGroupsService.reorder(user.id, dto.orderedIds);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a server group' })
  @ApiParam({ name: 'id', description: 'Server group ID', example: 1 })
  @ApiResponse({ status: 200, description: 'Server group updated successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiResponse({ status: 401, description: 'Unauthorized - missing or invalid token' })
  @ApiResponse({ status: 403, description: 'Forbidden - group does not belong to user' })
  @ApiResponse({ status: 404, description: 'Server group not found' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: PublicUser,
    @Body() dto: UpdateServerGroupDto,
  ) {
    return this.serverGroupsService.update(id, user.id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a server group' })
  @ApiParam({ name: 'id', description: 'Server group ID', example: 1 })
  @ApiResponse({ status: 200, description: 'Server group deleted successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized - missing or invalid token' })
  @ApiResponse({ status: 403, description: 'Forbidden - group does not belong to user' })
  @ApiResponse({ status: 404, description: 'Server group not found' })
  delete(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: PublicUser,
  ) {
    return this.serverGroupsService.delete(id, user.id);
  }

  @Post(':id/servers')
  @ApiOperation({ summary: 'Add servers to a group' })
  @ApiParam({ name: 'id', description: 'Server group ID', example: 1 })
  @ApiResponse({ status: 201, description: 'Servers added to group successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiResponse({ status: 401, description: 'Unauthorized - missing or invalid token' })
  @ApiResponse({ status: 403, description: 'Forbidden - group does not belong to user' })
  @ApiResponse({ status: 404, description: 'Server group not found' })
  addServers(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: PublicUser,
    @Body() dto: AddServersToGroupDto,
  ) {
    return this.serverGroupsService.addServers(id, user.id, dto.serverIds);
  }

  @Delete(':id/servers/:serverId')
  @ApiOperation({ summary: 'Remove a server from a group' })
  @ApiParam({ name: 'id', description: 'Server group ID', example: 1 })
  @ApiParam({ name: 'serverId', description: 'Server ID', example: 1 })
  @ApiResponse({ status: 200, description: 'Server removed from group successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized - missing or invalid token' })
  @ApiResponse({ status: 403, description: 'Forbidden - group does not belong to user' })
  @ApiResponse({ status: 404, description: 'Server group or membership not found' })
  removeServer(
    @Param('id', ParseIntPipe) id: number,
    @Param('serverId', ParseIntPipe) serverId: number,
    @CurrentUser() user: PublicUser,
  ) {
    return this.serverGroupsService.removeServer(id, user.id, serverId);
  }
}
