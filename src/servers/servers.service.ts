import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ServerDto, UpdateServerDto } from './dto/server.dto';

@Injectable()
export class ServersService {
  constructor(private prisma: PrismaService) {}

  async findAll(userId: number) {
    return this.prisma.server.findMany({
      where: { ownerId: userId },
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
}
