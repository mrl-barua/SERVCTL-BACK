import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { ServerGroupsController } from './server-groups.controller';
import { ServerGroupsService } from './server-groups.service';

@Module({
  imports: [PrismaModule],
  controllers: [ServerGroupsController],
  providers: [ServerGroupsService],
  exports: [ServerGroupsService],
})
export class ServerGroupsModule {}
