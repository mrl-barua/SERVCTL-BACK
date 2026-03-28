import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { NetworkController } from './network.controller';
import { NetworkService } from './network.service';

@Module({
  imports: [ConfigModule],
  controllers: [NetworkController],
  providers: [NetworkService],
  exports: [NetworkService],
})
export class NetworkModule {}
