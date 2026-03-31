import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { ServerTagsController } from './server-tags.controller';
import { ServerTagsService } from './server-tags.service';

@Module({
  imports: [PrismaModule],
  controllers: [ServerTagsController],
  providers: [ServerTagsService],
  exports: [ServerTagsService],
})
export class ServerTagsModule {}
