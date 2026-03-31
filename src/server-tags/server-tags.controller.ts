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
import { AssignTagDto } from './dto/assign-tag.dto';
import { CreateServerTagDto } from './dto/create-server-tag.dto';
import { UpdateServerTagDto } from './dto/update-server-tag.dto';
import { ServerTagsService } from './server-tags.service';

@ApiTags('server-tags')
@Controller('server-tags')
@UseGuards(AuthGuard('jwt'))
@ApiBearerAuth('JWT-auth')
export class ServerTagsController {
  constructor(private readonly serverTagsService: ServerTagsService) {}

  @Get()
  @ApiOperation({ summary: 'List all tags for the current user' })
  @ApiResponse({ status: 200, description: 'List of tags' })
  @ApiResponse({ status: 401, description: 'Unauthorized - missing or invalid token' })
  findAll(@CurrentUser() user: PublicUser) {
    return this.serverTagsService.findAll(user.id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new server tag' })
  @ApiResponse({ status: 201, description: 'Tag created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiResponse({ status: 401, description: 'Unauthorized - missing or invalid token' })
  @ApiResponse({ status: 409, description: 'Tag with this name already exists' })
  create(@Body() dto: CreateServerTagDto, @CurrentUser() user: PublicUser) {
    return this.serverTagsService.create(user.id, dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a server tag' })
  @ApiParam({ name: 'id', description: 'Tag ID', example: 1 })
  @ApiResponse({ status: 200, description: 'Tag updated successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiResponse({ status: 401, description: 'Unauthorized - missing or invalid token' })
  @ApiResponse({ status: 403, description: 'Forbidden - tag does not belong to user' })
  @ApiResponse({ status: 404, description: 'Tag not found' })
  @ApiResponse({ status: 409, description: 'Tag with this name already exists' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateServerTagDto,
    @CurrentUser() user: PublicUser,
  ) {
    return this.serverTagsService.update(id, user.id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a server tag (cascades to assignments)' })
  @ApiParam({ name: 'id', description: 'Tag ID', example: 1 })
  @ApiResponse({ status: 200, description: 'Tag deleted successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized - missing or invalid token' })
  @ApiResponse({ status: 403, description: 'Forbidden - tag does not belong to user' })
  @ApiResponse({ status: 404, description: 'Tag not found' })
  delete(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: PublicUser) {
    return this.serverTagsService.delete(id, user.id);
  }

  @Post(':id/assign')
  @ApiOperation({ summary: 'Assign a tag to one or more servers' })
  @ApiParam({ name: 'id', description: 'Tag ID', example: 1 })
  @ApiResponse({ status: 201, description: 'Tag assigned successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiResponse({ status: 401, description: 'Unauthorized - missing or invalid token' })
  @ApiResponse({ status: 403, description: 'Forbidden - tag does not belong to user' })
  @ApiResponse({ status: 404, description: 'Tag or server not found' })
  assign(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AssignTagDto,
    @CurrentUser() user: PublicUser,
  ) {
    return this.serverTagsService.assign(id, user.id, dto.serverIds);
  }

  @Delete(':id/servers/:serverId')
  @ApiOperation({ summary: 'Unassign a tag from a server' })
  @ApiParam({ name: 'id', description: 'Tag ID', example: 1 })
  @ApiParam({ name: 'serverId', description: 'Server ID', example: 1 })
  @ApiResponse({ status: 200, description: 'Tag unassigned successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized - missing or invalid token' })
  @ApiResponse({ status: 403, description: 'Forbidden - tag does not belong to user' })
  @ApiResponse({ status: 404, description: 'Tag or assignment not found' })
  unassign(
    @Param('id', ParseIntPipe) id: number,
    @Param('serverId', ParseIntPipe) serverId: number,
    @CurrentUser() user: PublicUser,
  ) {
    return this.serverTagsService.unassign(id, serverId, user.id);
  }
}
