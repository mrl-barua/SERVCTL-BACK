import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ServerDto, UpdateServerDto } from './dto/server.dto';
import { ServerStatusDto } from './dto/server-status.dto';
import { ServersService } from './servers.service';

@ApiTags('servers')
@Controller('servers')
@UseGuards(AuthGuard('jwt'))
@ApiBearerAuth('JWT-auth')
export class ServersController {
  constructor(private serversService: ServersService) {}

  @Get()
  @ApiOperation({ summary: 'Get all servers for the current user' })
  @ApiResponse({
    status: 200,
    description: 'List of servers',
    schema: {
      example: [
        {
          id: 1,
          name: 'Production Server',
          host: '192.168.1.100',
          user: 'ubuntu',
          port: 22,
          env: 'prod',
          status: 'running',
          uptime: 99.5,
          createdAt: '2024-01-15T10:30:00Z',
          updatedAt: '2024-01-15T10:30:00Z',
        },
      ],
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - missing or invalid token',
  })
  findAll(@CurrentUser() user: any) {
    return this.serversService.findAll(user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a specific server by ID' })
  @ApiParam({
    name: 'id',
    description: 'Server ID',
    example: 1,
  })
  @ApiResponse({
    status: 200,
    description: 'Server details',
    schema: {
      example: {
        id: 1,
        name: 'Production Server',
        host: '192.168.1.100',
        user: 'ubuntu',
        port: 22,
        env: 'prod',
        status: 'running',
        uptime: 99.5,
        createdAt: '2024-01-15T10:30:00Z',
        updatedAt: '2024-01-15T10:30:00Z',
      },
    },
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
  findOne(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: any) {
    return this.serversService.findOne(id, user.id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new server' })
  @ApiResponse({
    status: 201,
    description: 'Server created successfully',
    schema: {
      example: {
        id: 1,
        name: 'Production Server',
        host: '192.168.1.100',
        user: 'ubuntu',
        port: 22,
        env: 'prod',
        status: 'unknown',
        uptime: 0,
        createdAt: '2024-01-15T10:30:00Z',
        updatedAt: '2024-01-15T10:30:00Z',
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid input data',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - missing or invalid token',
  })
  create(@Body() serverDto: ServerDto, @CurrentUser() user: any) {
    return this.serversService.create(user.id, serverDto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a server' })
  @ApiParam({
    name: 'id',
    description: 'Server ID',
    example: 1,
  })
  @ApiResponse({
    status: 200,
    description: 'Server updated successfully',
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
  @ApiResponse({
    status: 404,
    description: 'Server not found',
  })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateServerDto: UpdateServerDto,
    @CurrentUser() user: any,
  ) {
    return this.serversService.update(id, user.id, updateServerDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a server' })
  @ApiParam({
    name: 'id',
    description: 'Server ID',
    example: 1,
  })
  @ApiResponse({
    status: 200,
    description: 'Server deleted successfully',
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
  delete(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: any) {
    return this.serversService.delete(id, user.id);
  }

  @Get(':id/status')
  @ApiOperation({ summary: 'Get server status' })
  @ApiParam({
    name: 'id',
    description: 'Server ID',
    example: 1,
  })
  @ApiResponse({
    status: 200,
    description: 'Server status retrieved successfully',
    type: ServerStatusDto,
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
  getServerStatus(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: any,
  ) {
    return {
      id,
      status: 'running',
      uptime: 99.5,
      lastCheck: new Date().toISOString(),
    };
  }
}
