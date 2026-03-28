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
import { Server, Socket } from 'socket.io';
import { LogsService } from './logs.service';

@WebSocketGateway({
  namespace: 'logs',
  cors: {
    origin: process.env.CORS_ORIGIN || '*',
    credentials: true,
  },
})
export class LogsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly tailIntervals = new Map<string, NodeJS.Timeout>();

  constructor(
    private readonly logsService: LogsService,
    private readonly jwtService: JwtService,
  ) {}

  handleConnection(@ConnectedSocket() client: Socket) {
    client.emit('logs:ready', { connected: true });
  }

  handleDisconnect(@ConnectedSocket() client: Socket) {
    const interval = this.tailIntervals.get(client.id);
    if (interval) {
      clearInterval(interval);
      this.tailIntervals.delete(client.id);
    }
  }

  @SubscribeMessage('logs:subscribe')
  async subscribe(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { serverId: number },
  ) {
    const user = await this.authenticate(client);
    const server = await this.logsService.assertOwnership(
      body.serverId,
      user.id,
    );

    const room = this.getRoom(server.id);
    await client.join(room);

    const existing = this.tailIntervals.get(client.id);
    if (existing) {
      clearInterval(existing);
    }

    const interval = setInterval(() => {
      const entry = this.logsService.createSyntheticLog(server.id, server.name);
      this.server.to(room).emit('logs:entry', entry);
    }, 2500);

    this.tailIntervals.set(client.id, interval);

    return {
      ok: true,
      serverId: server.id,
    };
  }

  @SubscribeMessage('logs:unsubscribe')
  async unsubscribe(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { serverId: number },
  ) {
    const room = this.getRoom(body.serverId);
    await client.leave(room);

    const interval = this.tailIntervals.get(client.id);
    if (interval) {
      clearInterval(interval);
      this.tailIntervals.delete(client.id);
    }

    return { ok: true };
  }

  private getRoom(serverId: number) {
    return `logs:${serverId}`;
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
