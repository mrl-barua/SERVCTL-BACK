import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateServerTagDto } from './dto/create-server-tag.dto';
import { UpdateServerTagDto } from './dto/update-server-tag.dto';

@Injectable()
export class ServerTagsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(userId: number) {
    const tags = await this.prisma.serverTag.findMany({
      where: { ownerId: userId },
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { assignments: true } },
        assignments: { select: { serverId: true } },
      },
    });

    return tags.map((tag) => ({
      id: tag.id,
      name: tag.name,
      color: tag.color,
      createdAt: tag.createdAt,
      _count: { assignments: tag._count.assignments },
      serverIds: tag.assignments.map((a) => a.serverId),
    }));
  }

  async create(userId: number, dto: CreateServerTagDto) {
    const existing = await this.prisma.serverTag.findUnique({
      where: { ownerId_name: { ownerId: userId, name: dto.name } },
    });

    if (existing) {
      throw new ConflictException('A tag with this name already exists');
    }

    const tag = await this.prisma.serverTag.create({
      data: {
        name: dto.name,
        color: dto.color ?? '#4f8ef7',
        ownerId: userId,
      },
      include: {
        _count: { select: { assignments: true } },
      },
    });

    return {
      id: tag.id,
      name: tag.name,
      color: tag.color,
      createdAt: tag.createdAt,
      _count: { assignments: tag._count.assignments },
    };
  }

  async update(id: number, userId: number, dto: UpdateServerTagDto) {
    const tag = await this.prisma.serverTag.findUnique({
      where: { id },
      select: { ownerId: true },
    });

    if (!tag) {
      throw new NotFoundException('Tag not found');
    }

    if (tag.ownerId !== userId) {
      throw new ForbiddenException('You do not have access to this tag');
    }

    if (dto.name) {
      const duplicate = await this.prisma.serverTag.findUnique({
        where: { ownerId_name: { ownerId: userId, name: dto.name } },
      });

      if (duplicate && duplicate.id !== id) {
        throw new ConflictException('A tag with this name already exists');
      }
    }

    const updated = await this.prisma.serverTag.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.color !== undefined ? { color: dto.color } : {}),
      },
      include: {
        _count: { select: { assignments: true } },
      },
    });

    return {
      id: updated.id,
      name: updated.name,
      color: updated.color,
      createdAt: updated.createdAt,
      _count: { assignments: updated._count.assignments },
    };
  }

  async delete(id: number, userId: number) {
    const tag = await this.prisma.serverTag.findUnique({
      where: { id },
      select: { ownerId: true },
    });

    if (!tag) {
      throw new NotFoundException('Tag not found');
    }

    if (tag.ownerId !== userId) {
      throw new ForbiddenException('You do not have access to this tag');
    }

    await this.prisma.serverTag.delete({ where: { id } });

    return { message: 'Tag deleted successfully' };
  }

  async assign(id: number, userId: number, serverIds: number[]) {
    const tag = await this.prisma.serverTag.findUnique({
      where: { id },
      select: { ownerId: true },
    });

    if (!tag) {
      throw new NotFoundException('Tag not found');
    }

    if (tag.ownerId !== userId) {
      throw new ForbiddenException('You do not have access to this tag');
    }

    // Verify all servers belong to the user
    const servers = await this.prisma.server.findMany({
      where: { id: { in: serverIds }, ownerId: userId, deletedAt: null },
      select: { id: true },
    });

    const foundIds = new Set(servers.map((s) => s.id));
    const missing = serverIds.filter((sid) => !foundIds.has(sid));

    if (missing.length > 0) {
      throw new NotFoundException(
        `Servers not found or not owned by you: ${missing.join(', ')}`,
      );
    }

    // Upsert assignments (skip duplicates)
    await this.prisma.serverTagAssignment.createMany({
      data: serverIds.map((serverId) => ({ serverId, tagId: id })),
      skipDuplicates: true,
    });

    // Return the updated tag with fresh count and member server IDs
    const updated = await this.prisma.serverTag.findUnique({
      where: { id },
      include: {
        _count: { select: { assignments: true } },
        assignments: { select: { serverId: true } },
      },
    });

    return {
      id: updated.id,
      name: updated.name,
      color: updated.color,
      createdAt: updated.createdAt,
      _count: { assignments: updated._count.assignments },
      serverIds: updated.assignments.map((a) => a.serverId),
    };
  }

  async unassign(id: number, serverId: number, userId: number) {
    const tag = await this.prisma.serverTag.findUnique({
      where: { id },
      select: { ownerId: true },
    });

    if (!tag) {
      throw new NotFoundException('Tag not found');
    }

    if (tag.ownerId !== userId) {
      throw new ForbiddenException('You do not have access to this tag');
    }

    const assignment = await this.prisma.serverTagAssignment.findUnique({
      where: { serverId_tagId: { serverId, tagId: id } },
    });

    if (!assignment) {
      throw new NotFoundException('Tag assignment not found');
    }

    await this.prisma.serverTagAssignment.delete({
      where: { id: assignment.id },
    });

    return { message: 'Tag unassigned successfully' };
  }
}
