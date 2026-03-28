import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export type LogLevel = 'INFO' | 'WARN' | 'ERROR' | 'DEBUG' | 'OK';

export interface ServerLogEntry {
  id: string;
  timestamp: string;
  serverId: number;
  serverName: string;
  level: LogLevel;
  message: string;
}

@Injectable()
export class LogsService {
  private readonly entriesByServer = new Map<number, ServerLogEntry[]>();

  constructor(private prisma: PrismaService) {}

  async assertOwnership(serverId: number, userId: number) {
    const server = await this.prisma.server.findUnique({
      where: { id: serverId },
      select: { id: true, name: true, ownerId: true },
    });

    if (!server) {
      throw new NotFoundException('Server not found');
    }

    if (server.ownerId !== userId) {
      throw new ForbiddenException('You do not have access to this server');
    }

    return server;
  }

  async getLogs(
    userId: number,
    serverId: number,
    limit = 120,
    level?: string,
    search?: string,
  ) {
    const server = await this.assertOwnership(serverId, userId);
    this.seedServerLogs(server.id, server.name);

    let entries = [...(this.entriesByServer.get(server.id) || [])];

    if (level) {
      entries = entries.filter((entry) => entry.level === level.toUpperCase());
    }

    if (search) {
      const query = search.toLowerCase();
      entries = entries.filter(
        (entry) =>
          entry.message.toLowerCase().includes(query) ||
          entry.serverName.toLowerCase().includes(query),
      );
    }

    return entries.slice(0, Math.min(limit, 500));
  }

  appendLog(
    serverId: number,
    serverName: string,
    level: LogLevel,
    message: string,
  ) {
    const current = this.entriesByServer.get(serverId) || [];

    current.unshift({
      id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      timestamp: new Date().toISOString(),
      serverId,
      serverName,
      level,
      message,
    });

    if (current.length > 400) {
      current.length = 400;
    }

    this.entriesByServer.set(serverId, current);
    return current[0];
  }

  createSyntheticLog(serverId: number, serverName: string) {
    const levels: LogLevel[] = ['INFO', 'WARN', 'ERROR', 'DEBUG', 'OK'];
    const messages: Record<LogLevel, string[]> = {
      INFO: [
        'Health check passed',
        'Configuration cache refreshed',
        'Session token validated',
      ],
      WARN: [
        'High memory usage detected',
        'Response latency over threshold',
        'SSH reconnection attempt started',
      ],
      ERROR: [
        'Failed to connect to upstream service',
        'Deploy hook returned non-zero exit code',
        'Log path temporarily unavailable',
      ],
      DEBUG: [
        'Executing scheduled worker tick',
        'Loaded environment variables',
        'Evaluating deploy step state',
      ],
      OK: [
        'Deployment completed successfully',
        'Service restarted successfully',
        'Backup sync completed',
      ],
    };

    const level = levels[Math.floor(Math.random() * levels.length)];
    const levelMessages = messages[level];
    const message = levelMessages[Math.floor(Math.random() * levelMessages.length)];

    return this.appendLog(serverId, serverName, level, message);
  }

  private seedServerLogs(serverId: number, serverName: string) {
    if (this.entriesByServer.has(serverId)) {
      return;
    }

    const seeded: ServerLogEntry[] = [];
    for (let index = 0; index < 50; index++) {
      const entry = this.createSyntheticLog(serverId, serverName);
      seeded.push(entry);
    }

    seeded.sort((left, right) =>
      right.timestamp.localeCompare(left.timestamp),
    );

    this.entriesByServer.set(serverId, seeded);
  }
}
