import {
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Client } from 'ssh2';
import { PrismaService } from '../prisma/prisma.service';
import { SshService } from '../ssh/ssh.service';
import { CreateHealthAlertDto } from './dto/create-health-alert.dto';

@Injectable()
export class ServerHealthService {
  private readonly logger = new Logger(ServerHealthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly sshService: SshService,
  ) {}

  async getCurrentHealth(serverId: number, userId: number) {
    await this.assertOwnership(serverId, userId);

    const snapshot = await this.prisma.serverHealthSnapshot.findFirst({
      where: { serverId },
      orderBy: { createdAt: 'desc' },
    });

    if (!snapshot) {
      throw new NotFoundException('No health data available for this server');
    }

    return snapshot;
  }

  async getHealthHistory(serverId: number, userId: number, limit: number) {
    await this.assertOwnership(serverId, userId);

    return this.prisma.serverHealthSnapshot.findMany({
      where: { serverId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  async collectHealth(serverId: number, userId: number) {
    const server = await this.assertOwnership(serverId, userId);

    const connectConfig = await this.sshService.buildConnectConfig(server);

    const commands = [
      'top -bn1 | grep "Cpu(s)"',
      'free -m',
      'df -h /',
      'cat /proc/loadavg',
    ];

    const outputs = await this.executeCommands(connectConfig, commands);

    const cpu = this.parseCpu(outputs[0]);
    const memory = this.parseMemory(outputs[1]);
    const disk = this.parseDisk(outputs[2]);
    const loadAvg = this.parseLoadAvg(outputs[3]);

    const snapshot = await this.prisma.serverHealthSnapshot.create({
      data: {
        serverId,
        cpuPercent: cpu,
        memPercent: memory.percent,
        diskPercent: disk.percent,
        memTotalMb: memory.totalMb,
        memUsedMb: memory.usedMb,
        diskTotalGb: disk.totalGb,
        diskUsedGb: disk.usedGb,
        loadAvg1: loadAvg.avg1,
        loadAvg5: loadAvg.avg5,
        loadAvg15: loadAvg.avg15,
      },
    });

    const triggeredAlerts = await this.checkAlerts(serverId, snapshot);

    return { snapshot, triggeredAlerts };
  }

  async getAlerts(userId: number) {
    return this.prisma.healthAlert.findMany({
      where: { ownerId: userId, active: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createAlert(userId: number, dto: CreateHealthAlertDto) {
    await this.assertOwnership(dto.serverId, userId);

    return this.prisma.healthAlert.create({
      data: {
        serverId: dto.serverId,
        metric: dto.metric,
        threshold: dto.threshold,
        direction: dto.direction || 'above',
        ownerId: userId,
      },
    });
  }

  async deleteAlert(alertId: number, userId: number) {
    const alert = await this.prisma.healthAlert.findUnique({
      where: { id: alertId },
    });

    if (!alert) {
      throw new NotFoundException('Alert not found');
    }

    if (alert.ownerId !== userId) {
      throw new ForbiddenException('You do not have access to this alert');
    }

    await this.prisma.healthAlert.delete({
      where: { id: alertId },
    });

    return { message: 'Alert deleted successfully' };
  }

  async assertOwnership(serverId: number, userId: number) {
    const server = await this.prisma.server.findUnique({
      where: { id: serverId },
      select: {
        id: true,
        host: true,
        port: true,
        user: true,
        authMethod: true,
        passwordEnc: true,
        sshKeyEnc: true,
        sshKeyPath: true,
        sshKeyVaultId: true,
        ownerId: true,
        name: true,
      },
    });

    if (!server) {
      throw new NotFoundException('Server not found');
    }

    if (server.ownerId !== userId) {
      throw new ForbiddenException('You do not have access to this server');
    }

    return server;
  }

  private executeCommands(
    connectConfig: Record<string, unknown>,
    commands: string[],
  ): Promise<string[]> {
    return new Promise((resolve, reject) => {
      const conn = new Client();
      const results: string[] = [];
      let currentIndex = 0;

      const runNext = () => {
        if (currentIndex >= commands.length) {
          conn.end();
          resolve(results);
          return;
        }

        const cmd = commands[currentIndex];
        conn.exec(cmd, (err, stream) => {
          if (err) {
            conn.end();
            reject(err);
            return;
          }

          let output = '';
          stream.on('data', (data: Buffer) => {
            output += data.toString();
          });
          stream.stderr.on('data', (data: Buffer) => {
            output += data.toString();
          });
          stream.on('close', () => {
            results.push(output.trim());
            currentIndex++;
            runNext();
          });
        });
      };

      conn.on('ready', runNext);
      conn.on('error', (err) => reject(err));
      conn.connect(connectConfig);
    });
  }

  private parseCpu(output: string): number {
    // Format: %Cpu(s):  2.3 us,  0.7 sy,  0.0 ni, 96.7 id, ...
    const idleMatch = output.match(/([\d.]+)\s*id/);
    if (idleMatch) {
      const idle = parseFloat(idleMatch[1]);
      return Math.round((100 - idle) * 10) / 10;
    }

    // Fallback: try to parse total from us + sy
    const usMatch = output.match(/([\d.]+)\s*us/);
    const syMatch = output.match(/([\d.]+)\s*sy/);
    if (usMatch && syMatch) {
      return Math.round((parseFloat(usMatch[1]) + parseFloat(syMatch[1])) * 10) / 10;
    }

    this.logger.warn(`Failed to parse CPU output: ${output}`);
    return 0;
  }

  private parseMemory(output: string): {
    percent: number;
    totalMb: number;
    usedMb: number;
  } {
    // Format:
    //               total        used        free      shared  buff/cache   available
    // Mem:          15887        4521        8123         312        3242       10811
    const memLine = output
      .split('\n')
      .find((line) => line.startsWith('Mem:'));

    if (memLine) {
      const parts = memLine.split(/\s+/);
      const totalMb = parseFloat(parts[1]) || 0;
      const usedMb = parseFloat(parts[2]) || 0;
      const percent = totalMb > 0 ? Math.round((usedMb / totalMb) * 1000) / 10 : 0;
      return { percent, totalMb, usedMb };
    }

    this.logger.warn(`Failed to parse memory output: ${output}`);
    return { percent: 0, totalMb: 0, usedMb: 0 };
  }

  private parseDisk(output: string): {
    percent: number;
    totalGb: number;
    usedGb: number;
  } {
    // Format:
    // Filesystem      Size  Used Avail Use% Mounted on
    // /dev/sda1        50G   23G   25G  48% /
    const lines = output.split('\n');
    const rootLine = lines.find(
      (line) => line.includes('/') && !line.startsWith('Filesystem'),
    );

    if (rootLine) {
      const parts = rootLine.split(/\s+/);
      const percentStr = parts.find((p) => p.endsWith('%'));
      const percent = percentStr ? parseFloat(percentStr.replace('%', '')) : 0;
      const totalGb = this.parseSize(parts[1]);
      const usedGb = this.parseSize(parts[2]);
      return { percent, totalGb, usedGb };
    }

    this.logger.warn(`Failed to parse disk output: ${output}`);
    return { percent: 0, totalGb: 0, usedGb: 0 };
  }

  private parseSize(sizeStr: string): number {
    if (!sizeStr) return 0;
    const match = sizeStr.match(/([\d.]+)([TGMK]?)/i);
    if (!match) return 0;
    const value = parseFloat(match[1]);
    const unit = (match[2] || '').toUpperCase();
    switch (unit) {
      case 'T':
        return value * 1024;
      case 'G':
        return value;
      case 'M':
        return value / 1024;
      case 'K':
        return value / (1024 * 1024);
      default:
        return value;
    }
  }

  private parseLoadAvg(output: string): {
    avg1: number;
    avg5: number;
    avg15: number;
  } {
    // Format: 0.12 0.15 0.10 1/234 5678
    const parts = output.trim().split(/\s+/);
    return {
      avg1: parseFloat(parts[0]) || 0,
      avg5: parseFloat(parts[1]) || 0,
      avg15: parseFloat(parts[2]) || 0,
    };
  }

  private async checkAlerts(
    serverId: number,
    snapshot: {
      cpuPercent: number;
      memPercent: number;
      diskPercent: number;
    },
  ) {
    const alerts = await this.prisma.healthAlert.findMany({
      where: { serverId, active: true },
    });

    const triggered: Array<{
      alertId: number;
      metric: string;
      threshold: number;
      direction: string;
      currentValue: number;
    }> = [];

    for (const alert of alerts) {
      let currentValue = 0;
      switch (alert.metric) {
        case 'cpu':
          currentValue = snapshot.cpuPercent;
          break;
        case 'memory':
          currentValue = snapshot.memPercent;
          break;
        case 'disk':
          currentValue = snapshot.diskPercent;
          break;
        default:
          continue;
      }

      const isTriggered =
        alert.direction === 'above'
          ? currentValue > alert.threshold
          : currentValue < alert.threshold;

      if (isTriggered) {
        triggered.push({
          alertId: alert.id,
          metric: alert.metric,
          threshold: alert.threshold,
          direction: alert.direction,
          currentValue,
        });
      }
    }

    return triggered;
  }
}
