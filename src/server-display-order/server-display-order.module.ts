import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { ServerDisplayOrderController } from './server-display-order.controller';
import { ServerDisplayOrderService } from './server-display-order.service';

@Module({
  imports: [PrismaModule],
  controllers: [ServerDisplayOrderController],
  providers: [ServerDisplayOrderService],
  exports: [ServerDisplayOrderService],
})
export class ServerDisplayOrderModule {}
