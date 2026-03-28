import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { LogsService } from '../logs/logs.service';

const DEPLOY_STEPS = [
  'pulling latest code',
  'installing dependencies',
  'running migrations',
  'building assets',
  'restarting services',
];

type DeployStatus = 'idle' | 'running' | 'done' | 'failed';

export interface DeployState {
  serverId: number;
  status: DeployStatus;
  progress: number;
  step: number;
  updatedAt: string;
  startedAt?: string;
}

@Injectable()
export class DeployService {
  private readonly states = new Map<number, DeployState>();
  private readonly history = new Map<number, string[]>();
  private readonly timers = new Map<number, NodeJS.Timeout>();
  private readonly listeners = new Set<(payload: DeployState) => void>();

  constructor(
    private prisma: PrismaService,
    private logsService: LogsService,
  ) {}

  onProgress(listener: (payload: DeployState) => void) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private emit(payload: DeployState) {
    this.listeners.forEach((listener) => listener(payload));
  }

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

  async startDeploy(userId: number, serverId: number) {
    const server = await this.assertOwnership(serverId, userId);
    const current = this.states.get(serverId);

    if (current?.status === 'running') {
      return current;
    }

    const startedAt = new Date().toISOString();
    const state: DeployState = {
      serverId,
      status: 'running',
      progress: 0,
      step: 0,
      startedAt,
      updatedAt: startedAt,
    };

    this.states.set(serverId, state);
    this.pushHistory(serverId, `Deploy started for ${server.name}`);
    this.logsService.appendLog(serverId, server.name, 'INFO', 'Deploy started');
    await this.prisma.server.update({
      where: { id: serverId },
      data: { status: 'online' },
    });

    this.emit(state);
    this.startTimer(serverId, server.name);

    return state;
  }

  async stopDeploy(userId: number, serverId: number) {
    const server = await this.assertOwnership(serverId, userId);

    this.stopTimer(serverId);

    const state: DeployState = {
      serverId,
      status: 'failed',
      progress: 0,
      step: -1,
      updatedAt: new Date().toISOString(),
    };

    this.states.set(serverId, state);
    this.pushHistory(serverId, `Deploy stopped for ${server.name}`);
    this.logsService.appendLog(serverId, server.name, 'WARN', 'Deploy manually stopped');
    this.emit(state);

    return state;
  }

  async getStatus(userId: number, serverId: number) {
    await this.assertOwnership(serverId, userId);

    return (
      this.states.get(serverId) || {
        serverId,
        status: 'idle',
        progress: 0,
        step: -1,
        updatedAt: new Date().toISOString(),
      }
    );
  }

  async getHistory(userId: number, serverId: number) {
    await this.assertOwnership(serverId, userId);
    return this.history.get(serverId) || [];
  }

  getSteps() {
    return DEPLOY_STEPS;
  }

  private startTimer(serverId: number, serverName: string) {
    this.stopTimer(serverId);

    const timer = setInterval(() => {
      const state = this.states.get(serverId);
      if (!state || state.status !== 'running') {
        this.stopTimer(serverId);
        return;
      }

      if (state.step >= DEPLOY_STEPS.length) {
        state.status = 'done';
        state.progress = 100;
        state.updatedAt = new Date().toISOString();
        this.states.set(serverId, state);
        this.pushHistory(serverId, `Deploy finished for ${serverName}`);
        this.logsService.appendLog(serverId, serverName, 'OK', 'Deployment completed successfully');
        this.emit(state);
        this.stopTimer(serverId);
        return;
      }

      const stepName = DEPLOY_STEPS[state.step];
      state.progress = Math.round((state.step / DEPLOY_STEPS.length) * 100);
      state.updatedAt = new Date().toISOString();
      this.states.set(serverId, state);

      if (stepName) {
        this.pushHistory(serverId, `[${state.progress}%] ${stepName}`);
        this.logsService.appendLog(serverId, serverName, 'INFO', `Deploy step: ${stepName}`);
      }

      state.step += 1;
      this.emit(state);
    }, 1300);

    this.timers.set(serverId, timer);
  }

  private stopTimer(serverId: number) {
    const timer = this.timers.get(serverId);
    if (timer) {
      clearInterval(timer);
      this.timers.delete(serverId);
    }
  }

  private pushHistory(serverId: number, line: string) {
    const existing = this.history.get(serverId) || [];
    existing.unshift(`${new Date().toISOString()} ${line}`);
    if (existing.length > 200) {
      existing.length = 200;
    }
    this.history.set(serverId, existing);
  }
}
