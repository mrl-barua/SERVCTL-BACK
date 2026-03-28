import { Module } from '@nestjs/common';
import { CryptoModule } from '../crypto/crypto.module';
import { PrismaModule } from '../prisma/prisma.module';
import { SshService } from './ssh.service';

@Module({
  imports: [PrismaModule, CryptoModule],
  providers: [SshService],
  exports: [SshService],
})
export class SshModule {}
