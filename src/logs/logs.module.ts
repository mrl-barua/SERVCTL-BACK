import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PrismaModule } from '../prisma/prisma.module';
import { LogsController } from './logs.controller';
import { LogsGateway } from './logs.gateway';
import { LogsService } from './logs.service';

@Module({
  imports: [
    PrismaModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'your-super-secret-key-change-this',
    }),
  ],
  controllers: [LogsController],
  providers: [LogsService, LogsGateway],
  exports: [LogsService],
})
export class LogsModule {}
