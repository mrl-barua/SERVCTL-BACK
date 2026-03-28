import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CryptoModule } from '../crypto/crypto.module';
import { NetworkModule } from '../network/network.module';
import { PrismaModule } from '../prisma/prisma.module';
import { ServersController } from './servers.controller';
import { ServersService } from './servers.service';

@Module({
  imports: [ConfigModule, PrismaModule, CryptoModule, NetworkModule],
  controllers: [ServersController],
  providers: [ServersService],
  exports: [ServersService],
})
export class ServersModule {}
