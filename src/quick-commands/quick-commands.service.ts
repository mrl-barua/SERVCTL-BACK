import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { QuickCommand } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateQuickCommandDto } from './dto/create-quick-command.dto';
import { ReorderQuickCommandsDto } from './dto/reorder-quick-commands.dto';
import { UpdateQuickCommandDto } from './dto/update-quick-command.dto';

@Injectable()
export class QuickCommandsService {
  constructor(private readonly prisma: PrismaService) {}

  async seedDefaults(userId: number): Promise<void> {
    const existing = await this.prisma.quickCommand.count({
      where: { userId },
    });
    if (existing > 0) {
      return;
    }

    const defaults = [
      { label: 'uptime', command: 'uptime', icon: '⏱', sortOrder: 0 },
      { label: 'disk usage', command: 'df -h', icon: '💾', sortOrder: 1 },
      { label: 'memory', command: 'free -h', icon: '🧠', sortOrder: 2 },
      {
        label: 'processes',
        command: 'ps aux --sort=-%cpu | head -10',
        icon: '⚙',
        sortOrder: 3,
      },
      { label: 'network', command: 'ss -tuln', icon: '🌐', sortOrder: 4 },
      { label: 'who', command: 'who', icon: '👤', sortOrder: 5 },
      { label: 'last logins', command: 'last -10', icon: '🔐', sortOrder: 6 },
      { label: 'docker ps', command: 'docker ps', icon: '🐳', sortOrder: 7 },
      {
        label: 'sys log tail',
        command: 'sudo tail -50 /var/log/syslog',
        icon: '📋',
        sortOrder: 8,
      },
      {
        label: 'nginx status',
        command: 'sudo systemctl status nginx',
        icon: '🔁',
        sortOrder: 9,
      },
    ];

    await this.prisma.quickCommand.createMany({
      data: defaults.map((item) => ({
        ...item,
        userId,
        scope: 'all',
        isSystem: true,
      })),
    });
  }

  async findAll(userId: number): Promise<QuickCommand[]> {
    await this.seedDefaults(userId);

    return this.prisma.quickCommand.findMany({
      where: { userId },
      include: {
        server: {
          select: {
            id: true,
            name: true,
            env: true,
            host: true,
            status: true,
          },
        },
      },
      orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
    });
  }

  async findForServer(
    userId: number,
    serverId: number,
  ): Promise<QuickCommand[]> {
    const server = await this.prisma.server.findFirst({
      where: { id: serverId, ownerId: userId },
      select: { id: true },
    });

    if (!server) {
      throw new NotFoundException('Server not found');
    }

    await this.seedDefaults(userId);

    return this.prisma.quickCommand.findMany({
      where: {
        userId,
        OR: [{ scope: 'all' }, { scope: 'server', serverId }],
      },
      include: {
        server: {
          select: {
            id: true,
            name: true,
            env: true,
            host: true,
            status: true,
          },
        },
      },
      orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
    });
  }

  async create(
    userId: number,
    dto: CreateQuickCommandDto,
  ): Promise<QuickCommand> {
    if (dto.scope === 'server') {
      if (!dto.serverId) {
        throw new BadRequestException(
          'serverId is required when scope is "server"',
        );
      }

      const server = await this.prisma.server.findFirst({
        where: { id: dto.serverId, ownerId: userId },
        select: { id: true },
      });

      if (!server) {
        throw new NotFoundException('Server not found');
      }
    }

    const last = await this.prisma.quickCommand.findFirst({
      where: { userId },
      orderBy: { sortOrder: 'desc' },
      select: { sortOrder: true },
    });

    return this.prisma.quickCommand.create({
      data: {
        label: dto.label.trim(),
        command: dto.command.trim(),
        scope: dto.scope,
        icon: dto.icon?.trim() || null,
        userId,
        serverId: dto.scope === 'all' ? null : dto.serverId,
        sortOrder: dto.sortOrder ?? (last ? last.sortOrder + 1 : 0),
      },
      include: {
        server: {
          select: {
            id: true,
            name: true,
            env: true,
            host: true,
            status: true,
          },
        },
      },
    });
  }

  async update(
    userId: number,
    id: number,
    dto: UpdateQuickCommandDto,
  ): Promise<QuickCommand> {
    const current = await this.prisma.quickCommand.findFirst({
      where: { id, userId },
    });

    if (!current) {
      throw new NotFoundException('Quick command not found');
    }

    if (current.isSystem && dto.command !== undefined) {
      throw new BadRequestException(
        'System commands cannot have their command modified. You can change the label and icon only.',
      );
    }

    const nextScope = dto.scope ?? current.scope;
    let nextServerId = dto.serverId ?? current.serverId;

    if (nextScope === 'all') {
      nextServerId = null;
    } else {
      if (!nextServerId) {
        throw new BadRequestException(
          'serverId is required when scope is "server"',
        );
      }

      const server = await this.prisma.server.findFirst({
        where: { id: nextServerId, ownerId: userId },
        select: { id: true },
      });

      if (!server) {
        throw new NotFoundException('Server not found');
      }
    }

    return this.prisma.quickCommand.update({
      where: { id },
      data: {
        ...(dto.label !== undefined ? { label: dto.label.trim() } : {}),
        ...(dto.command !== undefined ? { command: dto.command.trim() } : {}),
        ...(dto.icon !== undefined ? { icon: dto.icon.trim() || null } : {}),
        ...(dto.sortOrder !== undefined ? { sortOrder: dto.sortOrder } : {}),
        ...(dto.scope !== undefined ? { scope: nextScope } : {}),
        serverId: nextServerId,
      },
      include: {
        server: {
          select: {
            id: true,
            name: true,
            env: true,
            host: true,
            status: true,
          },
        },
      },
    });
  }

  async remove(userId: number, id: number): Promise<void> {
    const cmd = await this.prisma.quickCommand.findFirst({
      where: { id, userId },
      select: { id: true, isSystem: true },
    });

    if (!cmd) {
      throw new NotFoundException('Quick command not found');
    }

    if (cmd.isSystem) {
      throw new BadRequestException(
        'System default commands cannot be deleted. You can edit their label/icon instead.',
      );
    }

    await this.prisma.quickCommand.delete({ where: { id } });
  }

  async reorder(userId: number, dto: ReorderQuickCommandsDto): Promise<void> {
    const userCommands = await this.prisma.quickCommand.findMany({
      where: { userId },
      select: { id: true },
      orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
    });

    const allIds = userCommands.map((item) => item.id);
    const incoming = dto.orderedIds;

    if (allIds.length !== incoming.length) {
      throw new BadRequestException(
        'Reorder payload must include all command IDs.',
      );
    }

    const allSet = new Set(allIds);
    if (incoming.some((id) => !allSet.has(id))) {
      throw new BadRequestException('Invalid command IDs in reorder payload.');
    }

    await this.prisma.$transaction(
      incoming.map((id, index) =>
        this.prisma.quickCommand.update({
          where: { id },
          data: { sortOrder: index },
        }),
      ),
    );
  }
}
