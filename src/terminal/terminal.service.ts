import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { LogsService } from '../logs/logs.service';

interface SessionContext {
  userId: number;
  serverId: number;
  serverName: string;
  serverUser: string;
  serverHost: string;
}

@Injectable()
export class TerminalService {
  constructor(
    private prisma: PrismaService,
    private logsService: LogsService,
  ) {}

  async createSession(
    userId: number,
    serverId: number,
  ): Promise<SessionContext> {
    const server = await this.prisma.server.findUnique({
      where: { id: serverId },
      select: {
        id: true,
        name: true,
        user: true,
        host: true,
        ownerId: true,
      },
    });

    if (!server) {
      throw new NotFoundException('Server not found');
    }

    if (server.ownerId !== userId) {
      throw new ForbiddenException('You do not have access to this server');
    }

    return {
      userId,
      serverId: server.id,
      serverName: server.name,
      serverUser: server.user,
      serverHost: server.host,
    };
  }

  executeAllowedCommand(context: SessionContext, command: string) {
    const clean = command.trim();

    if (!this.isAllowed(clean)) {
      this.logsService.appendLog(
        context.serverId,
        context.serverName,
        'WARN',
        `Blocked terminal command: ${clean}`,
      );

      return {
        ok: false,
        lines: [`Command blocked by security policy: ${clean}`],
      };
    }

    const output = this.renderOutput(clean, context);

    this.logsService.appendLog(
      context.serverId,
      context.serverName,
      'INFO',
      `Executed terminal command: ${clean}`,
    );

    return {
      ok: true,
      lines: output,
    };
  }

  private isAllowed(command: string) {
    const exact = new Set([
      'uptime',
      'df -h',
      'free -h',
      'docker ps',
      'who',
      'whoami',
      'pwd',
      'hostname',
      'ss -tuln',
      'last -10',
      'ps aux --sort=-%cpu | head -10',
      'sudo systemctl status nginx',
      'sudo tail -50 /var/log/syslog',
      'clear',
      'exit',
    ]);

    if (exact.has(command)) {
      return true;
    }

    return command.startsWith('echo ');
  }

  private renderOutput(command: string, context: SessionContext) {
    if (command === 'uptime') {
      return [
        ` ${new Date().toLocaleTimeString()} up 12 days, 3:14, 1 user, load average: 0.14, 0.18, 0.22`,
      ];
    }

    if (command === 'df -h') {
      return [
        'Filesystem      Size  Used Avail Use% Mounted on',
        '/dev/sda1        60G   18G   40G  31% /',
        'tmpfs           2.0G     0  2.0G   0% /dev/shm',
      ];
    }

    if (command === 'free -h') {
      return [
        '              total        used        free      shared  buff/cache   available',
        'Mem:          7.7Gi       2.0Gi       3.8Gi       120Mi       1.9Gi       5.3Gi',
        'Swap:         2.0Gi       0.0Gi       2.0Gi',
      ];
    }

    if (command === 'docker ps') {
      return [
        'CONTAINER ID   IMAGE        STATUS       PORTS                  NAMES',
        'ab12cd34ef56   nginx:1.27   Up 3 hours   0.0.0.0:80->80/tcp     web',
        'cd34ef56ab12   redis:7      Up 3 hours   0.0.0.0:6379->6379/tcp cache',
      ];
    }

    if (command === 'who') {
      return [
        `${context.serverUser} pts/0 ${new Date().toISOString().slice(0, 16).replace('T', ' ')} (10.0.0.5)`,
      ];
    }

    if (command === 'whoami') {
      return [context.serverUser];
    }

    if (command === 'pwd') {
      return [`/home/${context.serverUser}`];
    }

    if (command === 'hostname') {
      return [context.serverName];
    }

    if (command === 'ss -tuln') {
      return [
        'Netid State  Recv-Q Send-Q Local Address:Port Peer Address:Port',
        'tcp   LISTEN 0      511    0.0.0.0:80        0.0.0.0:*',
        'tcp   LISTEN 0      128    0.0.0.0:22        0.0.0.0:*',
      ];
    }

    if (command === 'last -10') {
      return [
        `${context.serverUser} pts/0 10.0.0.5 Sat Mar 28 09:00 still logged in`,
        `${context.serverUser} pts/1 10.0.0.9 Fri Mar 27 18:12 - 18:48 (00:36)`,
      ];
    }

    if (command === 'ps aux --sort=-%cpu | head -10') {
      return [
        'USER       PID %CPU %MEM    VSZ   RSS TTY      STAT START   TIME COMMAND',
        'root      1182 12.1  2.1 182340 88320 ?        Ssl  08:31   0:44 node server.js',
        'www-data  2401  8.7  1.2 152200 48220 ?        S    08:40   0:23 nginx: worker process',
      ];
    }

    if (command === 'sudo systemctl status nginx') {
      return [
        'nginx.service - A high performance web server and a reverse proxy server',
        '   Loaded: loaded (/lib/systemd/system/nginx.service; enabled)',
        '   Active: active (running) since Sat 2026-03-28 08:31:22 UTC',
      ];
    }

    if (command === 'sudo tail -50 /var/log/syslog') {
      return [
        'Mar 28 10:10:01 deploy-host systemd[1]: Started Session 153 of user ubuntu.',
        'Mar 28 10:10:03 deploy-host sshd[4221]: Accepted publickey for ubuntu from 10.0.0.5 port 52210 ssh2',
        'Mar 28 10:10:10 deploy-host sudo: ubuntu : TTY=pts/0 ; PWD=/home/ubuntu ; USER=root ; COMMAND=/usr/bin/systemctl status nginx',
      ];
    }

    if (command.startsWith('echo ')) {
      return [command.slice(5)];
    }

    if (command === 'clear') {
      return [];
    }

    if (command === 'exit') {
      return [`Connection to ${context.serverHost} closed.`];
    }

    return ['Command executed.'];
  }
}
