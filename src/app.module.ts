import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import * as Joi from 'joi';
import { AppController } from './app.controller';
import { AuditModule } from './audit/audit.module';
import { AuthModule } from './auth/auth.module';
import { CryptoModule } from './crypto/crypto.module';
import { DeployModule } from './deploy/deploy.module';
import { KeysModule } from './keys/keys.module';
import { LogsModule } from './logs/logs.module';
import { NetworkModule } from './network/network.module';
import { PrismaModule } from './prisma/prisma.module';
import { QuickCommandsModule } from './quick-commands/quick-commands.module';
import { ServerDisplayOrderModule } from './server-display-order/server-display-order.module';
import { ServerGroupsModule } from './server-groups/server-groups.module';
import { ServerHealthModule } from './server-health/server-health.module';
import { ServerTagsModule } from './server-tags/server-tags.module';
import { ServersModule } from './servers/servers.module';
import { SshModule } from './ssh/ssh.module';
import { DatabaseModule } from './database/database.module';
import { TerminalModule } from './terminal/terminal.module';
import { HealthController } from './health/health.controller';

@Module({
  controllers: [AppController, HealthController],
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
      validationSchema: Joi.object({
        DATABASE_URL: Joi.string().required(),
        JWT_SECRET: Joi.string().min(32).required(),
        ENCRYPTION_KEY: Joi.string().length(64).hex().required(),
        PORT: Joi.number().default(3000),
        NODE_ENV: Joi.string()
          .valid('development', 'production', 'test')
          .default('development'),
        CORS_ORIGIN: Joi.string().default(''),
        FRONTEND_URL: Joi.string().uri().default('http://localhost:5173'),
        SMTP_HOST: Joi.string().optional().allow(''),
        SMTP_PORT: Joi.number().default(587),
      }),
      validationOptions: {
        allowUnknown: true,
        abortEarly: false,
      },
    }),
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 30,
      },
    ]),
    PrismaModule,
    AuditModule,
    CryptoModule,
    NetworkModule,
    AuthModule,
    KeysModule,
    ServersModule,
    LogsModule,
    DeployModule,
    SshModule,
    TerminalModule,
    DatabaseModule,
    QuickCommandsModule,
    ServerDisplayOrderModule,
    ServerGroupsModule,
    ServerHealthModule,
    ServerTagsModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
