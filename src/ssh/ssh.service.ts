import { Injectable } from '@nestjs/common';
import { ConnectConfig } from 'ssh2';
import { CryptoService } from '../crypto/crypto.service';
import { PrismaService } from '../prisma/prisma.service';

interface ServerConnectRecord {
  host: string;
  port: number;
  user: string;
  authMethod: string;
  passwordEnc: string | null;
  sshKeyEnc: string | null;
  sshKeyPath: string | null;
  sshKeyVaultId: string | null;
}

@Injectable()
export class SshService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly crypto: CryptoService,
  ) {}

  async buildConnectConfig(
    server: ServerConnectRecord,
  ): Promise<ConnectConfig> {
    const base: ConnectConfig = {
      host: server.host,
      port: server.port,
      username: server.user,
      readyTimeout: 8000,
      keepaliveInterval: 10000,
    };

    switch (server.authMethod) {
      case 'password':
        if (!server.passwordEnc) {
          throw new Error('Encrypted password is missing.');
        }
        return {
          ...base,
          password: this.crypto.decrypt(server.passwordEnc),
        };

      case 'key-stored':
        if (!server.sshKeyEnc) {
          throw new Error('Encrypted private key is missing.');
        }
        return {
          ...base,
          privateKey: this.crypto.decrypt(server.sshKeyEnc),
        };

      case 'key-path': {
        if (!server.sshKeyPath) {
          throw new Error('SSH key path is missing.');
        }

        const fs = await import('fs');
        if (!fs.existsSync(server.sshKeyPath)) {
          throw new Error(
            `SSH key file not found: ${server.sshKeyPath}. Has the file moved or been deleted?`,
          );
        }

        return {
          ...base,
          privateKey: fs.readFileSync(server.sshKeyPath),
        };
      }

      case 'key-vault': {
        if (!server.sshKeyVaultId) {
          throw new Error('Key vault reference is missing.');
        }

        const vaultKey = await this.prisma.sshKeyVault.findUnique({
          where: { id: server.sshKeyVaultId },
        });

        if (!vaultKey) {
          throw new Error('Vault key not found.');
        }

        return {
          ...base,
          privateKey: this.crypto.decrypt(vaultKey.privateKeyEnc),
        };
      }

      default:
        throw new Error(`Unknown authMethod: ${server.authMethod}`);
    }
  }
}
