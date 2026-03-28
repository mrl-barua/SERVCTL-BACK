import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

@Injectable()
export class CryptoService {
  private readonly key: Buffer;

  constructor(private readonly config: ConfigService) {
    const keyHex = this.config.get<string>('ENCRYPTION_KEY') || '';
    if (!/^[a-fA-F0-9]{64}$/.test(keyHex)) {
      throw new Error(
        'ENCRYPTION_KEY must be exactly 64 hexadecimal characters (32 bytes).',
      );
    }

    this.key = Buffer.from(keyHex, 'hex');
  }

  encrypt(plaintext: string): string {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-cbc', this.key, iv);
    const encrypted = Buffer.concat([
      cipher.update(plaintext, 'utf8'),
      cipher.final(),
    ]);

    return `${iv.toString('hex')}:${encrypted.toString('hex')}`;
  }

  decrypt(ciphertext: string): string {
    const [ivHex, encHex] = (ciphertext || '').split(':');
    if (!ivHex || !encHex) {
      throw new Error('Invalid encrypted payload format.');
    }

    const iv = Buffer.from(ivHex, 'hex');
    const enc = Buffer.from(encHex, 'hex');
    const decipher = crypto.createDecipheriv('aes-256-cbc', this.key, iv);

    return Buffer.concat([decipher.update(enc), decipher.final()]).toString(
      'utf8',
    );
  }
}
