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
import { DatabaseService } from './database.service';
import { CreateConnectionDto } from './dto/create-connection.dto';
import { UpdateConnectionDto } from './dto/update-connection.dto';

@ApiTags('Database')
@ApiBearerAuth('JWT-auth')
@UseGuards(AuthGuard('jwt'))
@Controller('database')
export class DatabaseController {
  constructor(private readonly databaseService: DatabaseService) {}

  @Post('connections')
  @ApiOperation({ summary: 'Create a database connection' })
  @ApiResponse({ status: 201, description: 'Connection created' })
  create(@CurrentUser() user: any, @Body() dto: CreateConnectionDto) {
    return this.databaseService.createConnection(user.id, dto);
  }

  @Get('connections')
  @ApiOperation({ summary: 'List database connections' })
  @ApiResponse({ status: 200, description: 'List of connections' })
  findAll(@CurrentUser() user: any) {
    return this.databaseService.getConnections(user.id);
  }

  @Patch('connections/:id')
  @ApiOperation({ summary: 'Update a database connection' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 200, description: 'Connection updated' })
  update(
    @CurrentUser() user: any,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateConnectionDto,
  ) {
    return this.databaseService.updateConnection(user.id, id, dto);
  }

  @Delete('connections/:id')
  @ApiOperation({ summary: 'Delete a database connection' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 200, description: 'Connection deleted' })
  remove(
    @CurrentUser() user: any,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.databaseService.deleteConnection(user.id, id);
  }

  @Post('connections/:id/test')
  @ApiOperation({ summary: 'Test a database connection' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 200, description: 'Connection test result' })
  test(
    @CurrentUser() user: any,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.databaseService.testConnection(user.id, id);
  }
}
