import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  OnModuleDestroy,
} from '@nestjs/common';
import { Client } from 'ssh2';
import { LogsService } from '../logs/logs.service';
import { PrismaService } from '../prisma/prisma.service';
import { SshService } from '../ssh/ssh.service';

interface SessionContext {
  userId: number;
  serverId: number;
  serverName: string;
  serverUser: string;
  serverHost: string;
}

interface ActiveSession {
  context: SessionContext;
  client: Client;
  busy: boolean;
}

@Injectable()
export class TerminalService implements OnModuleDestroy {
  private readonly sessions = new Map<string, ActiveSession>();
  private readonly commandTimeoutMs = 15000;

  onModuleDestroy() {
    for (const [sessionId, session] of this.sessions) {
      try {
        session.client.end();
      } catch {
        // Ignore errors during shutdown
      }
    }
    this.sessions.clear();
  }

  constructor(
    private readonly prisma: PrismaService,
    private readonly logsService: LogsService,
    private readonly sshService: SshService,
  ) {}

  async createSession(
    socketId: string,
    userId: number,
    serverId: number,
  ): Promise<SessionContext> {
    this.closeSession(socketId);

    const server = await this.prisma.server.findUnique({
      where: { id: serverId },
      select: {
        id: true,
        name: true,
        user: true,
        host: true,
        port: true,
        authMethod: true,
        passwordEnc: true,
        sshKeyEnc: true,
        sshKeyPath: true,
        sshKeyVaultId: true,
        ownerId: true,
      },
    });

    if (!server) {
      throw new NotFoundException('Server not found');
    }

    if (server.ownerId !== userId) {
      throw new ForbiddenException('You do not have access to this server');
    }

    const context: SessionContext = {
      userId,
      serverId: server.id,
      serverName: server.name,
      serverUser: server.user,
      serverHost: server.host,
    };

    const connectConfig = await this.sshService.buildConnectConfig({
      host: server.host,
      port: server.port,
      user: server.user,
      authMethod: server.authMethod,
      passwordEnc: server.passwordEnc,
      sshKeyEnc: server.sshKeyEnc,
      sshKeyPath: server.sshKeyPath,
      sshKeyVaultId: server.sshKeyVaultId,
    });

    const client = await this.openSshConnection(
      connectConfig as Record<string, any>,
    );

    this.sessions.set(socketId, {
      context,
      client,
      busy: false,
    });

    this.logsService.appendLog(
      context.serverId,
      context.serverName,
      'INFO',
      'Terminal SSH session connected',
    );

    return context;
  }

  async executeAllowedCommand(socketId: string, command: string) {
    const session = this.sessions.get(socketId);
    if (!session) {
      return {
        ok: false,
        lines: ['No active terminal session. Connect to a server first.'],
      };
    }

    const clean = command.trim();

    if (!clean) {
      return {
        ok: true,
        lines: [],
      };
    }

    if (clean === 'clear') {
      return {
        ok: true,
        lines: [],
      };
    }

    if (clean === 'exit') {
      this.closeSession(socketId);
      return {
        ok: true,
        lines: [`Connection to ${session.context.serverHost} closed.`],
      };
    }

    if (session.busy) {
      return {
        ok: false,
        lines: ['Another command is still running. Please wait.'],
      };
    }

    session.busy = true;

    try {
      const result = await this.executeSshCommand(session.client, clean);

      this.logsService.appendLog(
        session.context.serverId,
        session.context.serverName,
        'INFO',
        `Executed terminal command: ${clean}`,
      );

      return {
        ok: result.exitCode === 0,
        lines: result.lines,
      };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Terminal execution failed';

      this.logsService.appendLog(
        session.context.serverId,
        session.context.serverName,
        'ERROR',
        `Terminal command failed: ${clean} (${message})`,
      );

      return {
        ok: false,
        lines: [message],
      };
    } finally {
      session.busy = false;
    }
  }

  // Expose session context for gateways that need session metadata (e.g. server user)
  getSessionContext(socketId: string) {
    const session = this.sessions.get(socketId);
    return session ? session.context : null;
  }

  closeSession(socketId: string) {
    const existing = this.sessions.get(socketId);
    if (!existing) {
      return;
    }

    try {
      existing.client.end();
    } catch {
      // no-op
    }

    this.sessions.delete(socketId);
  }

  // Command allowlist removed: SSH authentication/authorization is the security boundary.

  private openSshConnection(connectConfig: Record<string, any>) {
    return new Promise<Client>((resolve, reject) => {
      const client = new Client();

      const timeout = setTimeout(() => {
        try {
          client.end();
        } catch {
          // no-op
        }
        reject(new BadRequestException('SSH connection timed out.'));
      }, 10000);

      client
        .on('ready', () => {
          clearTimeout(timeout);
          resolve(client);
        })
        .on('error', (error) => {
          clearTimeout(timeout);
          reject(
            new BadRequestException(
              `SSH connection failed: ${error.message || 'Unknown error'}`,
            ),
          );
        })
        .connect(connectConfig);
    });
  }

  private executeSshCommand(client: Client, command: string) {
    return new Promise<{ lines: string[]; exitCode: number }>(
      (resolve, reject) => {
        client.exec(command, { pty: true }, (err, stream) => {
          if (err) {
            reject(new Error(`Failed to execute command: ${err.message}`));
            return;
          }

          const lines: string[] = [];
          let stdoutTail = '';
          let stderrTail = '';
          let settled = false;

          const flushChunk = (chunk: string, target: 'stdout' | 'stderr') => {
            const current = target === 'stdout' ? stdoutTail : stderrTail;
            const merged = `${current}${chunk}`;
            const parts = merged.split(/\r?\n/);

            if (parts.length > 1) {
              lines.push(...parts.slice(0, -1).filter(Boolean));
            }

            if (target === 'stdout') {
              stdoutTail = parts[parts.length - 1] || '';
            } else {
              stderrTail = parts[parts.length - 1] || '';
            }
          };

          const done = (exitCode: number) => {
            if (settled) {
              return;
            }
            settled = true;
            clearTimeout(timeout);

            if (stdoutTail.trim()) {
              lines.push(stdoutTail.trim());
            }
            if (stderrTail.trim()) {
              lines.push(stderrTail.trim());
            }

            resolve({
              lines,
              exitCode,
            });
          };

          const timeout = setTimeout(() => {
            if (settled) {
              return;
            }
            settled = true;
            stream.close();
            reject(new Error('Command timed out after 15 seconds.'));
          }, this.commandTimeoutMs);

          stream.on('data', (chunk: Buffer) => {
            flushChunk(chunk.toString('utf8'), 'stdout');
          });

          stream.stderr.on('data', (chunk: Buffer) => {
            flushChunk(chunk.toString('utf8'), 'stderr');
          });

          stream.on('close', (code: number | undefined) => {
            done(code ?? 0);
          });
        });
      },
    );
  }
}
