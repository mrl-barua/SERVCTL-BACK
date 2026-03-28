import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ListServersQueryDto } from './dto/list-servers-query.dto';
import { ServerDto, UpdateServerDto } from './dto/server.dto';
import { UpdateServerStatusDto } from './dto/update-server-status.dto';

@Injectable()
export class ServersService {
  constructor(private prisma: PrismaService) {}

  async findAll(userId: number, query: ListServersQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where = {
      ownerId: userId,
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
    };

    const [items, total] = await Promise.all([
      this.prisma.server.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          name: true,
          host: true,
          user: true,
          port: true,
          env: true,
          notes: true,
          deploy: true,
          logpath: true,
          status: true,
          uptime: true,
          createdAt: true,
          updatedAt: true,
        },
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
        id: true,
        name: true,
        host: true,
        user: true,
        port: true,
        env: true,
        notes: true,
        deploy: true,
        logpath: true,
        status: true,
        uptime: true,
        createdAt: true,
        updatedAt: true,
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

  async create(userId: number, serverDto: ServerDto) {
    const server = await this.prisma.server.create({
      data: {
        ...serverDto,
        ownerId: userId,
      },
      select: {
        id: true,
        name: true,
        host: true,
        user: true,
        port: true,
        env: true,
        notes: true,
        deploy: true,
        logpath: true,
        status: true,
        uptime: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return server;
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
      data: updateServerDto,
      select: {
        id: true,
        name: true,
        host: true,
        user: true,
        port: true,
        env: true,
        notes: true,
        deploy: true,
        logpath: true,
        status: true,
        uptime: true,
        createdAt: true,
        updatedAt: true,
      },
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

    await this.prisma.server.delete({
      where: { id },
    });

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
}
