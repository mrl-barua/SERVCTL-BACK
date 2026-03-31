import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateServerGroupDto } from './dto/create-server-group.dto';
import { UpdateServerGroupDto } from './dto/update-server-group.dto';

@Injectable()
export class ServerGroupsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(userId: number) {
    return this.prisma.serverGroup.findMany({
      where: { ownerId: userId },
      orderBy: { sortOrder: 'asc' },
      include: {
        _count: { select: { members: true } },
      },
    });
  }

  async create(userId: number, dto: CreateServerGroupDto) {
    const maxOrder = await this.prisma.serverGroup.findFirst({
      where: { ownerId: userId },
      orderBy: { sortOrder: 'desc' },
      select: { sortOrder: true },
    });

    return this.prisma.serverGroup.create({
      data: {
        name: dto.name,
        color: dto.color ?? '#4f8ef7',
        sortOrder: (maxOrder?.sortOrder ?? -1) + 1,
        ownerId: userId,
      },
      include: {
        _count: { select: { members: true } },
      },
    });
  }

  async update(id: number, userId: number, dto: UpdateServerGroupDto) {
    const group = await this.prisma.serverGroup.findUnique({
      where: { id },
      select: { ownerId: true },
    });

    if (!group) {
      throw new NotFoundException('Server group not found');
    }

    if (group.ownerId !== userId) {
      throw new ForbiddenException('You do not have access to this group');
    }

    return this.prisma.serverGroup.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.color !== undefined ? { color: dto.color } : {}),
      },
      include: {
        _count: { select: { members: true } },
      },
    });
  }

  async delete(id: number, userId: number) {
    const group = await this.prisma.serverGroup.findUnique({
      where: { id },
      select: { ownerId: true },
    });

    if (!group) {
      throw new NotFoundException('Server group not found');
    }

    if (group.ownerId !== userId) {
      throw new ForbiddenException('You do not have access to this group');
    }

    await this.prisma.serverGroup.delete({ where: { id } });

    return { message: 'Server group deleted successfully' };
  }

  async addServers(id: number, userId: number, serverIds: number[]) {
    const group = await this.prisma.serverGroup.findUnique({
      where: { id },
      select: { ownerId: true },
    });

    if (!group) {
      throw new NotFoundException('Server group not found');
    }

    if (group.ownerId !== userId) {
      throw new ForbiddenException('You do not have access to this group');
    }

    // Verify all servers belong to the user
    const servers = await this.prisma.server.findMany({
      where: { id: { in: serverIds }, ownerId: userId, deletedAt: null },
      select: { id: true },
    });

    const validIds = servers.map((s) => s.id);

    // Get current max sortOrder in the group
    const maxMember = await this.prisma.serverGroupMembership.findFirst({
      where: { groupId: id },
      orderBy: { sortOrder: 'desc' },
      select: { sortOrder: true },
    });

    let nextOrder = (maxMember?.sortOrder ?? -1) + 1;

    await this.prisma.serverGroupMembership.createMany({
      data: validIds.map((serverId) => ({
        serverId,
        groupId: id,
        sortOrder: nextOrder++,
      })),
      skipDuplicates: true,
    });

    return this.prisma.serverGroup.findUnique({
      where: { id },
      include: {
        _count: { select: { members: true } },
      },
    });
  }

  async removeServer(id: number, userId: number, serverId: number) {
    const group = await this.prisma.serverGroup.findUnique({
      where: { id },
      select: { ownerId: true },
    });

    if (!group) {
      throw new NotFoundException('Server group not found');
    }

    if (group.ownerId !== userId) {
      throw new ForbiddenException('You do not have access to this group');
    }

    const membership = await this.prisma.serverGroupMembership.findUnique({
      where: { serverId_groupId: { serverId, groupId: id } },
    });

    if (!membership) {
      throw new NotFoundException('Server is not a member of this group');
    }

    await this.prisma.serverGroupMembership.delete({
      where: { id: membership.id },
    });

    return { message: 'Server removed from group successfully' };
  }

  async reorder(userId: number, orderedIds: number[]) {
    // Verify all groups belong to the user
    const groups = await this.prisma.serverGroup.findMany({
      where: { id: { in: orderedIds }, ownerId: userId },
      select: { id: true },
    });

    const ownedIds = new Set(groups.map((g) => g.id));

    const updates = orderedIds
      .filter((id) => ownedIds.has(id))
      .map((id, index) =>
        this.prisma.serverGroup.update({
          where: { id },
          data: { sortOrder: index },
        }),
      );

    await this.prisma.$transaction(updates);

    return this.findAll(userId);
  }
}
