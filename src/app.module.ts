import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { DeployModule } from './deploy/deploy.module';
import { LogsModule } from './logs/logs.module';
import { PrismaModule } from './prisma/prisma.module';
import { ServersModule } from './servers/servers.module';
import { TerminalModule } from './terminal/terminal.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    PrismaModule,
    AuthModule,
    ServersModule,
    LogsModule,
    DeployModule,
    TerminalModule,
  ],
})
export class AppModule {}
