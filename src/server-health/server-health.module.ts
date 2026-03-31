import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PrismaModule } from '../prisma/prisma.module';
import { SshModule } from '../ssh/ssh.module';
import { ServersModule } from '../servers/servers.module';
import { ServerHealthController } from './server-health.controller';
import { ServerHealthGateway } from './server-health.gateway';
import { ServerHealthService } from './server-health.service';

@Module({
  imports: [
    PrismaModule,
    SshModule,
    ServersModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'your-super-secret-key-change-this',
    }),
  ],
  controllers: [ServerHealthController],
  providers: [ServerHealthService, ServerHealthGateway],
  exports: [ServerHealthService],
})
export class ServerHealthModule {}
