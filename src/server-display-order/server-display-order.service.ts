import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ServerDisplayOrderService {
  constructor(private readonly prisma: PrismaService) {}

  async getOrder(userId: number, context: string): Promise<number[]> {
    const entries = await this.prisma.serverDisplayOrder.findMany({
      where: { userId, context },
      orderBy: { sortOrder: 'asc' },
      select: { serverId: true },
    });

    return entries.map((e) => e.serverId);
  }

  async saveOrder(
    userId: number,
    context: string,
    orderedServerIds: number[],
  ): Promise<number[]> {
    await this.prisma.$transaction(async (tx) => {
      await tx.serverDisplayOrder.deleteMany({
        where: { userId, context },
      });

      if (orderedServerIds.length > 0) {
        await tx.serverDisplayOrder.createMany({
          data: orderedServerIds.map((serverId, index) => ({
            userId,
            serverId,
            context,
            sortOrder: index,
          })),
        });
      }
    });

    return orderedServerIds;
  }
}
