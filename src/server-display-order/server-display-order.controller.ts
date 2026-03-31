import { Body, Controller, Get, Param, Put, UseGuards } from '@nestjs/common';
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
import { SaveDisplayOrderDto } from './dto/save-display-order.dto';
import { ServerDisplayOrderService } from './server-display-order.service';

@ApiTags('display-order')
@Controller('server-display-order')
@UseGuards(AuthGuard('jwt'))
@ApiBearerAuth('JWT-auth')
export class ServerDisplayOrderController {
  constructor(private readonly service: ServerDisplayOrderService) {}

  @Get(':context')
  @ApiOperation({ summary: 'Get ordered server IDs for a display context' })
  @ApiParam({
    name: 'context',
    description: 'Display context',
    enum: ['grid', 'sidebar'],
    example: 'grid',
  })
  @ApiResponse({
    status: 200,
    description: 'Ordered array of server IDs',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - missing or invalid token',
  })
  getOrder(
    @Param('context') context: string,
    @CurrentUser() user: PublicUser,
  ) {
    return this.service.getOrder(user.id, context);
  }

  @Put(':context')
  @ApiOperation({ summary: 'Save full display order for a context' })
  @ApiParam({
    name: 'context',
    description: 'Display context',
    enum: ['grid', 'sidebar'],
    example: 'grid',
  })
  @ApiResponse({
    status: 200,
    description: 'Display order saved successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid input data',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - missing or invalid token',
  })
  saveOrder(
    @Param('context') context: string,
    @Body() dto: SaveDisplayOrderDto,
    @CurrentUser() user: PublicUser,
  ) {
    return this.service.saveOrder(user.id, context, dto.orderedServerIds);
  }
}
