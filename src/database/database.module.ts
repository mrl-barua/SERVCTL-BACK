import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { CryptoModule } from '../crypto/crypto.module';
import { PrismaModule } from '../prisma/prisma.module';
import { SshModule } from '../ssh/ssh.module';
import { DatabaseController } from './database.controller';
import { DatabaseGateway } from './database.gateway';
import { DatabaseService } from './database.service';

@Module({
  imports: [
    PrismaModule,
    CryptoModule,
    SshModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'your-super-secret-key-change-this',
    }),
  ],
  controllers: [DatabaseController],
  providers: [DatabaseService, DatabaseGateway],
})
export class DatabaseModule {}
