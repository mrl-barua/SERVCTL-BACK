import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { LogsModule } from '../logs/logs.module';
import { PrismaModule } from '../prisma/prisma.module';
import { DeployController } from './deploy.controller';
import { DeployGateway } from './deploy.gateway';
import { DeployService } from './deploy.service';

@Module({
  imports: [
    PrismaModule,
    LogsModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'your-super-secret-key-change-this',
    }),
  ],
  controllers: [DeployController],
  providers: [DeployService, DeployGateway],
  exports: [DeployService],
})
export class DeployModule {}
