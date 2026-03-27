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
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ServerDto, UpdateServerDto } from './dto/server.dto';
import { ServersService } from './servers.service';

@Controller('servers')
@UseGuards(AuthGuard('jwt'))
export class ServersController {
  constructor(private serversService: ServersService) {}

  @Get()
  findAll(@CurrentUser() user: any) {
    return this.serversService.findAll(user.id);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: any) {
    return this.serversService.findOne(id, user.id);
  }

  @Post()
  create(@Body() serverDto: ServerDto, @CurrentUser() user: any) {
    return this.serversService.create(user.id, serverDto);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateServerDto: UpdateServerDto,
    @CurrentUser() user: any,
  ) {
    return this.serversService.update(id, user.id, updateServerDto);
  }

  @Delete(':id')
  delete(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: any) {
    return this.serversService.delete(id, user.id);
  }
}
