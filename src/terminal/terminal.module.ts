import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { LogsModule } from '../logs/logs.module';
import { PrismaModule } from '../prisma/prisma.module';
import { SshModule } from '../ssh/ssh.module';
import { TerminalGateway } from './terminal.gateway';
import { TerminalService } from './terminal.service';

@Module({
  imports: [
    PrismaModule,
    LogsModule,
    SshModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'your-super-secret-key-change-this',
    }),
  ],
  providers: [TerminalService, TerminalGateway],
})
export class TerminalModule {}
