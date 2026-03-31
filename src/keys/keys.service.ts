import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { createHash } from 'crypto';
import { Client, utils } from 'ssh2';
import { CryptoService } from '../crypto/crypto.service';
import { PrismaService } from '../prisma/prisma.service';

interface CreateVaultKeyInput {
  label: string;
  privateKey: string;
}

interface VerifyVaultKeyInput {
  host: string;
  port?: number;
  user: string;
}

@Injectable()
export class KeysService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly crypto: CryptoService,
  ) {}

  private parsePrivateKey(privateKey: string) {
    const parsed = utils.parseKey(privateKey);
    if (parsed instanceof Error) {
      throw new BadRequestException('Invalid SSH private key format.');
    }

    const key = Array.isArray(parsed) ? parsed[0] : parsed;
    if (!key) {
      throw new BadRequestException('Invalid SSH private key format.');
    }

    const pubSSHBuffer = key.getPublicSSH();
    const publicKey = pubSSHBuffer.toString('base64');
    const fingerprint = createHash('sha256')
      .update(pubSSHBuffer)
      .digest('base64');

    return {
      publicKey: `${key.type} ${publicKey}`,
      fingerprint: `SHA256:${fingerprint}`,
    };
  }

  async create(userId: number, input: CreateVaultKeyInput) {
    if (
      !input.privateKey.includes('BEGIN') ||
      !input.privateKey.includes('PRIVATE KEY')
    ) {
      throw new BadRequestException('Invalid SSH private key format.');
    }

    const { publicKey, fingerprint } = this.parsePrivateKey(input.privateKey);

    const saved = await this.prisma.sshKeyVault.create({
      data: {
        userId,
        label: input.label.trim(),
        publicKey,
        privateKeyEnc: this.crypto.encrypt(input.privateKey),
        fingerprint,
      },
    });

    return {
      id: saved.id,
      label: saved.label,
      publicKey: saved.publicKey,
      fingerprint: saved.fingerprint,
      createdAt: saved.createdAt,
    };
  }

  async list(userId: number) {
    const keys = await this.prisma.sshKeyVault.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { servers: true },
        },
      },
    });

    return keys.map((key) => ({
      id: key.id,
      label: key.label,
      fingerprint: key.fingerprint,
      publicKey: key.publicKey,
      createdAt: key.createdAt,
      usedByServers: key._count.servers,
    }));
  }

  async remove(userId: number, id: string) {
    const key = await this.prisma.sshKeyVault.findUnique({
      where: { id },
      include: { _count: { select: { servers: true } } },
    });

    if (!key) {
      throw new NotFoundException('SSH key not found in vault.');
    }

    if (key.userId !== userId) {
      throw new ForbiddenException('You do not have access to this key.');
    }

    await this.prisma.server.updateMany({
      where: { sshKeyVaultId: id, ownerId: userId },
      data: { sshKeyVaultId: null },
    });

    await this.prisma.sshKeyVault.delete({ where: { id } });

    return {
      message: 'SSH key removed from vault.',
      releasedServers: key._count.servers,
    };
  }

  async verify(userId: number, id: string, input: VerifyVaultKeyInput) {
    const key = await this.prisma.sshKeyVault.findUnique({ where: { id } });

    if (!key) {
      throw new NotFoundException('SSH key not found in vault.');
    }

    if (key.userId !== userId) {
      throw new ForbiddenException('You do not have access to this key.');
    }

    const privateKey = this.crypto.decrypt(key.privateKeyEnc);

    await new Promise<void>((resolve, reject) => {
      const client = new Client();
      const timeout = setTimeout(() => {
        client.end();
        reject(new BadRequestException('SSH verification timed out.'));
      }, 8000);

      client
        .on('ready', () => {
          clearTimeout(timeout);
          client.end();
          resolve();
        })
        .on('error', (err) => {
          clearTimeout(timeout);
          client.end();
          reject(
            new BadRequestException(`SSH verification failed: ${err.message}`),
          );
        })
        .connect({
          host: input.host,
          port: input.port || 22,
          username: input.user,
          privateKey,
          readyTimeout: 7000,
        });
    });

    return {
      ok: true,
      message: 'SSH key verified successfully.',
    };
  }
}
