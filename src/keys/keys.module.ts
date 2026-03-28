import { Module } from '@nestjs/common';
import { CryptoModule } from '../crypto/crypto.module';
import { PrismaModule } from '../prisma/prisma.module';
import { KeysController } from './keys.controller';
import { KeysService } from './keys.service';

@Module({
  imports: [PrismaModule, CryptoModule],
  controllers: [KeysController],
  providers: [KeysService],
  exports: [KeysService],
})
export class KeysModule {}
