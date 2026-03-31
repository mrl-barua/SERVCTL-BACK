import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { CryptoService } from '../crypto/crypto.service';
import { NetworkService } from '../network/network.service';
import { PrismaService } from '../prisma/prisma.service';
import { SshService } from '../ssh/ssh.service';
import { ListServersQueryDto } from './dto/list-servers-query.dto';
import { CreateServerDto, UpdateServerDto } from './dto/create-server.dto';
import { UpdateServerStatusDto } from './dto/update-server-status.dto';

const SERVER_PUBLIC_SELECT = {
  id: true,
  name: true,
  host: true,
  user: true,
  port: true,
  env: true,
  notes: true,
  deploy: true,
  logPath: true,
  logType: true,
  dockerName: true,
  authMethod: true,
  sshKeyLabel: true,
  networkType: true,
  status: true,
  uptime: true,
  createdAt: true,
  updatedAt: true,
  groupMemberships: {
    select: {
      group: { select: { id: true, name: true, color: true } },
    },
  },
  tagAssignments: {
    select: {
      tag: { select: { id: true, name: true, color: true } },
    },
  },
} as const;

@Injectable()
export class ServersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly crypto: CryptoService,
    private readonly networkService: NetworkService,
    private readonly audit: AuditService,
    private readonly ssh: SshService,
  ) {}

  async findAll(userId: number, query: ListServersQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where = {
      ownerId: userId,
      deletedAt: null,
      ...(query.env ? { env: query.env } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.search
        ? {
            name: {
              contains: query.search,
              mode: 'insensitive' as const,
            },
          }
        : {}),
      ...(query.groupId
        ? { groupMemberships: { some: { groupId: query.groupId } } }
        : {}),
      ...(query.tagId
        ? { tagAssignments: { some: { tagId: query.tagId } } }
        : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.server.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: SERVER_PUBLIC_SELECT,
      }),
      this.prisma.server.count({ where }),
    ]);

    return {
      items,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  async getServerStatus(id: number, userId: number) {
    const server = await this.prisma.server.findUnique({
      where: { id },
      select: {
        id: true,
        ownerId: true,
        status: true,
        uptime: true,
        updatedAt: true,
      },
    });

    if (!server) {
      throw new NotFoundException('Server not found');
    }

    if (server.ownerId !== userId) {
      throw new ForbiddenException('You do not have access to this server');
    }

    return {
      id: server.id,
      status: server.status,
      uptime: server.uptime,
      lastCheck: server.updatedAt.toISOString(),
    };
  }

  async findOne(id: number, userId: number) {
    const server = await this.prisma.server.findUnique({
      where: { id },
      select: {
        ...SERVER_PUBLIC_SELECT,
        ownerId: true,
      },
    });

    if (!server) {
      throw new NotFoundException('Server not found');
    }

    if (server.ownerId !== userId) {
      throw new ForbiddenException('You do not have access to this server');
    }

    const { ownerId, ...result } = server;
    return result;
  }

  async create(userId: number, dto: CreateServerDto) {
    const isPrivate = this.networkService.isPrivateHost(dto.host);
    const deployMode = this.config.get<string>('DEPLOY_MODE') || 'local';

    if (isPrivate && deployMode === 'cloud') {
      throw new BadRequestException({
        code: 'PRIVATE_HOST_BLOCKED',
        message:
          'Private network servers cannot be reached from the SERVCTL cloud.',
        installGuide: true,
      });
    }

    const serverData: Record<string, unknown> = {
      ownerId: userId,
      name: dto.name,
      host: dto.host,
      port: dto.port || 22,
      user: dto.user || 'ubuntu',
      env: dto.env || 'prod',
      notes: dto.notes,
      deploy: dto.deploy,
      logPath: dto.logPath,
      logType: dto.logType || 'file',
      dockerName: dto.dockerName,
      authMethod: dto.authMethod,
      networkType: isPrivate ? 'private' : 'public',
    };

    await this.applyAuthMethod(userId, dto, serverData, deployMode);

    return this.prisma.server.create({
      data: serverData as Prisma.ServerUncheckedCreateInput,
      select: SERVER_PUBLIC_SELECT,
    });
  }

  async update(id: number, userId: number, updateServerDto: UpdateServerDto) {
    const server = await this.prisma.server.findUnique({
      where: { id },
      select: { ownerId: true },
    });

    if (!server) {
      throw new NotFoundException('Server not found');
    }

    if (server.ownerId !== userId) {
      throw new ForbiddenException('You do not have access to this server');
    }

    const updatedServer = await this.prisma.server.update({
      where: { id },
      data: (await this.buildUpdatePayload(
        id,
        userId,
        updateServerDto,
        this.config.get<string>('DEPLOY_MODE') || 'local',
      )) as Prisma.ServerUncheckedUpdateInput,
      select: SERVER_PUBLIC_SELECT,
    });

    return updatedServer;
  }

  async delete(id: number, userId: number) {
    const server = await this.prisma.server.findUnique({
      where: { id },
      select: { ownerId: true },
    });

    if (!server) {
      throw new NotFoundException('Server not found');
    }

    if (server.ownerId !== userId) {
      throw new ForbiddenException('You do not have access to this server');
    }

    await this.prisma.server.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    await this.audit.log(userId, 'delete', 'server', id, { softDelete: true });

    return { message: 'Server deleted successfully' };
  }

  async updateStatus(
    id: number,
    userId: number,
    updateServerStatusDto: UpdateServerStatusDto,
  ) {
    const server = await this.prisma.server.findUnique({
      where: { id },
      select: { ownerId: true },
    });

    if (!server) {
      throw new NotFoundException('Server not found');
    }

    if (server.ownerId !== userId) {
      throw new ForbiddenException('You do not have access to this server');
    }

    return this.prisma.server.update({
      where: { id },
      data: {
        status: updateServerStatusDto.status,
        ...(updateServerStatusDto.uptime !== undefined
          ? { uptime: updateServerStatusDto.uptime }
          : {}),
      },
      select: {
        id: true,
        status: true,
        uptime: true,
        updatedAt: true,
      },
    });
  }

  async verifyKeyPath(path: string) {
    const fs = await import('fs');
    const normalized = path.trim();

    if (!normalized) {
      throw new BadRequestException('Key path is required.');
    }

    try {
      const exists = fs.existsSync(normalized);
      if (!exists) {
        return {
          ok: false,
          message: 'File not found or not readable.',
        };
      }

      fs.accessSync(normalized, fs.constants.R_OK);
      return {
        ok: true,
        message: 'Key file found and readable.',
      };
    } catch {
      return {
        ok: false,
        message: 'File not found or not readable.',
      };
    }
  }

  private async buildUpdatePayload(
    serverId: number,
    userId: number,
    dto: UpdateServerDto,
    deployMode: string,
  ) {
    const current = await this.prisma.server.findUnique({
      where: { id: serverId },
      select: {
        ownerId: true,
        host: true,
        authMethod: true,
      },
    });

    if (!current) {
      throw new NotFoundException('Server not found');
    }

    if (current.ownerId !== userId) {
      throw new ForbiddenException('You do not have access to this server');
    }

    const nextHost = dto.host || current.host;
    const isPrivate = this.networkService.isPrivateHost(nextHost);
    if (isPrivate && deployMode === 'cloud') {
      throw new BadRequestException({
        code: 'PRIVATE_HOST_BLOCKED',
        message:
          'Private network servers cannot be reached from the SERVCTL cloud.',
        installGuide: true,
      });
    }

    const nextAuthMethod = dto.authMethod || current.authMethod;
    const shouldUpdateAuth =
      dto.authMethod !== undefined ||
      dto.password !== undefined ||
      dto.sshKey !== undefined ||
      dto.sshKeyPath !== undefined ||
      dto.vaultKeyId !== undefined;

    const data: Record<string, unknown> = {
      ...(dto.name !== undefined ? { name: dto.name } : {}),
      ...(dto.host !== undefined ? { host: dto.host } : {}),
      ...(dto.port !== undefined ? { port: dto.port } : {}),
      ...(dto.user !== undefined ? { user: dto.user } : {}),
      ...(dto.env !== undefined ? { env: dto.env } : {}),
      ...(dto.notes !== undefined ? { notes: dto.notes } : {}),
      ...(dto.deploy !== undefined ? { deploy: dto.deploy } : {}),
      ...(dto.logPath !== undefined ? { logPath: dto.logPath } : {}),
      ...(dto.logType !== undefined ? { logType: dto.logType } : {}),
      ...(dto.dockerName !== undefined ? { dockerName: dto.dockerName } : {}),
      ...(dto.authMethod !== undefined ? { authMethod: nextAuthMethod } : {}),
      networkType: isPrivate ? 'private' : 'public',
    };

    if (shouldUpdateAuth) {
      await this.applyAuthMethod(
        userId,
        { ...dto, authMethod: nextAuthMethod },
        data,
        deployMode,
      );
    }

    return data;
  }

  private async applyAuthMethod(
    userId: number,
    dto: {
      authMethod: string;
      password?: string;
      sshKey?: string;
      sshKeyLabel?: string;
      sshKeyPath?: string;
      vaultKeyId?: string;
    },
    serverData: Record<string, unknown>,
    deployMode: string,
  ) {
    serverData.passwordEnc = null;
    serverData.sshKeyEnc = null;
    serverData.sshKeyPath = null;
    serverData.sshKeyVaultId = null;

    if (dto.authMethod === 'password') {
      if (!dto.password) {
        throw new BadRequestException(
          'Password is required for password auth.',
        );
      }

      serverData.passwordEnc = this.crypto.encrypt(dto.password);
      return;
    }

    if (dto.authMethod === 'key-stored') {
      if (!dto.sshKey) {
        throw new BadRequestException('SSH private key is required.');
      }

      if (
        !dto.sshKey.includes('BEGIN') ||
        !dto.sshKey.includes('PRIVATE KEY')
      ) {
        throw new BadRequestException('Invalid SSH private key format.');
      }

      serverData.sshKeyEnc = this.crypto.encrypt(dto.sshKey);
      serverData.sshKeyLabel = dto.sshKeyLabel || 'uploaded-key';
      return;
    }

    if (dto.authMethod === 'key-path') {
      if (deployMode === 'cloud') {
        throw new BadRequestException(
          'Key path authentication is only available in local mode.',
        );
      }

      if (!dto.sshKeyPath) {
        throw new BadRequestException('SSH key path is required.');
      }

      const fs = await import('fs');
      if (!fs.existsSync(dto.sshKeyPath)) {
        throw new BadRequestException(
          `SSH key file not found: ${dto.sshKeyPath}`,
        );
      }

      serverData.sshKeyPath = dto.sshKeyPath;
      serverData.sshKeyLabel =
        dto.sshKeyLabel || dto.sshKeyPath.split(/[\\/]/).pop() || 'key-path';
      return;
    }

    if (dto.authMethod === 'key-vault') {
      if (!dto.vaultKeyId) {
        throw new BadRequestException('Vault key selection is required.');
      }

      const vaultKey = await this.prisma.sshKeyVault.findFirst({
        where: { id: dto.vaultKeyId, userId },
      });

      if (!vaultKey) {
        throw new NotFoundException('SSH key not found in vault.');
      }

      serverData.sshKeyVaultId = dto.vaultKeyId;
      serverData.sshKeyLabel = vaultKey.label;
      return;
    }

    throw new BadRequestException(`Unknown authMethod: ${dto.authMethod}`);
  }

  async bulkPing(userId: number, serverIds: number[]) {
    const servers = await this.prisma.server.findMany({
      where: { id: { in: serverIds }, ownerId: userId, deletedAt: null },
      select: {
        id: true,
        name: true,
        host: true,
        port: true,
        user: true,
        authMethod: true,
        passwordEnc: true,
        sshKeyEnc: true,
        sshKeyPath: true,
        sshKeyVaultId: true,
      },
    });

    const results = await Promise.all(
      servers.map(async (server) => {
        const pingResult = await this.ssh.pingServer(server);
        const nextStatus = pingResult.online ? 'online' : 'offline';
        const uptime = pingResult.online ? 100 : 0;

        await this.prisma.server.update({
          where: { id: server.id },
          data: { status: nextStatus, uptime },
        });

        return {
          id: server.id,
          name: server.name,
          status: nextStatus,
          uptime,
          latencyMs: pingResult.latencyMs,
          error: pingResult.error,
        };
      }),
    );

    return { updated: results.length, results };
  }

  async bulkDelete(userId: number, serverIds: number[]) {
    const result = await this.prisma.server.updateMany({
      where: { id: { in: serverIds }, ownerId: userId, deletedAt: null },
      data: { deletedAt: new Date() },
    });

    await this.audit.log(userId, 'bulk-delete', 'server', serverIds.join(','), {
      count: result.count,
    });

    return { deleted: result.count };
  }
}
