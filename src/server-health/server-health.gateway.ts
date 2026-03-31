import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { JwtService } from '@nestjs/jwt';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { ServerHealthService } from './server-health.service';

@WebSocketGateway({
  namespace: 'server-health',
  cors: {
    origin: process.env.CORS_ORIGIN || '*',
    credentials: true,
  },
})
export class ServerHealthGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(ServerHealthGateway.name);
  private readonly pollIntervals = new Map<string, NodeJS.Timeout>();

  constructor(
    private readonly serverHealthService: ServerHealthService,
    private readonly jwtService: JwtService,
  ) {}

  handleConnection(@ConnectedSocket() client: Socket) {
    client.emit('health:ready', { connected: true });
  }

  handleDisconnect(@ConnectedSocket() client: Socket) {
    const interval = this.pollIntervals.get(client.id);
    if (interval) {
      clearInterval(interval);
      this.pollIntervals.delete(client.id);
    }
  }

  @SubscribeMessage('health:subscribe')
  async subscribe(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { serverId: number },
  ) {
    const user = await this.authenticate(client);
    await this.serverHealthService.assertOwnership(body.serverId, user.id);

    const room = this.getRoom(body.serverId);
    await client.join(room);

    // Clear any existing interval for this client
    const existing = this.pollIntervals.get(client.id);
    if (existing) {
      clearInterval(existing);
    }

    // Start polling every 60 seconds
    const interval = setInterval(async () => {
      try {
        const result = await this.serverHealthService.collectHealth(
          body.serverId,
          user.id,
        );

        this.server
          .to(room)
          .emit('health:snapshot', result.snapshot);

        if (result.triggeredAlerts.length > 0) {
          this.server
            .to(room)
            .emit('health:alert-triggered', result.triggeredAlerts);
        }
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Health collection failed';
        this.logger.warn(
          `Health poll failed for server ${body.serverId}: ${message}`,
        );
      }
    }, 60_000);

    this.pollIntervals.set(client.id, interval);

    // Collect an initial snapshot immediately
    try {
      const result = await this.serverHealthService.collectHealth(
        body.serverId,
        user.id,
      );
      client.emit('health:snapshot', result.snapshot);

      if (result.triggeredAlerts.length > 0) {
        client.emit('health:alert-triggered', result.triggeredAlerts);
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Initial health collection failed';
      client.emit('health:error', { message });
    }

    return { ok: true, serverId: body.serverId };
  }

  @SubscribeMessage('health:unsubscribe')
  async unsubscribe(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { serverId: number },
  ) {
    const room = this.getRoom(body.serverId);
    await client.leave(room);

    const interval = this.pollIntervals.get(client.id);
    if (interval) {
      clearInterval(interval);
      this.pollIntervals.delete(client.id);
    }

    return { ok: true };
  }

  private getRoom(serverId: number) {
    return `server-health:${serverId}`;
  }

  private async authenticate(client: Socket) {
    const token = this.extractToken(client);
    const payload = this.jwtService.verify(token, {
      secret: process.env.JWT_SECRET || 'your-super-secret-key-change-this',
    }) as { sub: number; email: string };

    return {
      id: payload.sub,
      email: payload.email,
    };
  }

  private extractToken(client: Socket) {
    const authToken =
      (client.handshake.auth?.token as string | undefined) ||
      (client.handshake.headers.authorization as string | undefined);

    if (!authToken) {
      throw new Error('Missing token');
    }

    return authToken.startsWith('Bearer ') ? authToken.slice(7) : authToken;
  }
}
