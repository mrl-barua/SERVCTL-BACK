import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { JwtService } from '@nestjs/jwt';
import { Server, Socket } from 'socket.io';
import { DeployService } from './deploy.service';

@WebSocketGateway({
  namespace: 'deploy',
  cors: {
    origin: process.env.CORS_ORIGIN || '*',
    credentials: true,
  },
})
export class DeployGateway implements OnGatewayConnection {
  @WebSocketServer()
  server: Server;

  constructor(
    private readonly deployService: DeployService,
    private readonly jwtService: JwtService,
  ) {
    this.deployService.onProgress((payload) => {
      this.server
        .to(this.getRoom(payload.serverId))
        .emit('deploy:progress', payload);
    });
  }

  handleConnection(@ConnectedSocket() client: Socket) {
    client.emit('deploy:ready', { connected: true });
  }

  @SubscribeMessage('deploy:subscribe')
  async subscribe(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { serverId: number },
  ) {
    const user = await this.authenticate(client);
    await this.deployService.assertOwnership(body.serverId, user.id);
    await client.join(this.getRoom(body.serverId));

    const status = await this.deployService.getStatus(user.id, body.serverId);
    client.emit('deploy:progress', status);

    return { ok: true, serverId: body.serverId };
  }

  private getRoom(serverId: number) {
    return `deploy:${serverId}`;
  }

  private async authenticate(client: Socket) {
    const token = this.extractToken(client);
    const payload = this.jwtService.verify(token, {
      secret:
        process.env.JWT_SECRET || 'your-super-secret-key-change-this',
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

    return authToken.startsWith('Bearer ')
      ? authToken.slice(7)
      : authToken;
  }
}
