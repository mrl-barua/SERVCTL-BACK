import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AuthModule } from './auth/auth.module';
import { CryptoModule } from './crypto/crypto.module';
import { DeployModule } from './deploy/deploy.module';
import { KeysModule } from './keys/keys.module';
import { LogsModule } from './logs/logs.module';
import { NetworkModule } from './network/network.module';
import { PrismaModule } from './prisma/prisma.module';
import { QuickCommandsModule } from './quick-commands/quick-commands.module';
import { ServersModule } from './servers/servers.module';
import { SshModule } from './ssh/ssh.module';
import { TerminalModule } from './terminal/terminal.module';
import { HealthController } from './health/health.controller';

@Module({
  controllers: [AppController, HealthController],
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    PrismaModule,
    CryptoModule,
    NetworkModule,
    AuthModule,
    KeysModule,
    ServersModule,
    LogsModule,
    DeployModule,
    SshModule,
    TerminalModule,
    QuickCommandsModule,
  ],
})
export class AppModule {}
