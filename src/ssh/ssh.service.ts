import { Injectable, Logger } from '@nestjs/common';
import { Client, ConnectConfig } from 'ssh2';
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
  private readonly logger = new Logger(SshService.name);

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

  /**
   * Attempt a real SSH connection to check if a server is reachable.
   * Returns { online: true, latencyMs } on success, { online: false, error } on failure.
   */
  async pingServer(
    server: ServerConnectRecord,
  ): Promise<{ online: boolean; latencyMs?: number; error?: string }> {
    try {
      const config = await this.buildConnectConfig(server);
      const start = Date.now();

      return await new Promise((resolve) => {
        const client = new Client();
        const timeout = setTimeout(() => {
          client.end();
          resolve({ online: false, error: 'Connection timed out' });
        }, 10000);

        client
          .on('ready', () => {
            clearTimeout(timeout);
            const latencyMs = Date.now() - start;
            client.end();
            resolve({ online: true, latencyMs });
          })
          .on('error', (err) => {
            clearTimeout(timeout);
            client.end();
            resolve({ online: false, error: err.message });
          })
          .connect(config);
      });
    } catch (err) {
      this.logger.warn(`Ping failed for ${server.host}: ${err.message}`);
      return { online: false, error: err.message };
    }
  }
}
