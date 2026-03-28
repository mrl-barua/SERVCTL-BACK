import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { QuickCommandsController } from './quick-commands.controller';
import { QuickCommandsService } from './quick-commands.service';

@Module({
  imports: [PrismaModule],
  controllers: [QuickCommandsController],
  providers: [QuickCommandsService],
  exports: [QuickCommandsService],
})
export class QuickCommandsModule {}
