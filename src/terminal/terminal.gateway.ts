import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
} from '@nestjs/websockets';
import { JwtService } from '@nestjs/jwt';
import { Socket } from 'socket.io';
import { TerminalService } from './terminal.service';

@WebSocketGateway({
  namespace: 'terminal',
  cors: {
    origin: process.env.CORS_ORIGIN || '*',
    credentials: true,
  },
})
export class TerminalGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly sessions = new Map<
    string,
    {
      userId: number;
      serverId: number;
      serverName: string;
      serverUser: string;
      serverHost: string;
    }
  >();

  constructor(
    private readonly terminalService: TerminalService,
    private readonly jwtService: JwtService,
  ) {}

  handleConnection(@ConnectedSocket() client: Socket) {
    client.emit('terminal:ready', { connected: true });
  }

  handleDisconnect(@ConnectedSocket() client: Socket) {
    this.sessions.delete(client.id);
  }

  @SubscribeMessage('terminal:connect')
  async connectToServer(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { serverId: number },
  ) {
    const user = await this.authenticate(client);
    const session = await this.terminalService.createSession(user.id, body.serverId);
    this.sessions.set(client.id, session);

    client.emit('terminal:connected', {
      serverId: session.serverId,
      serverName: session.serverName,
      serverUser: session.serverUser,
    });

    return { ok: true };
  }

  @SubscribeMessage('terminal:command')
  async execute(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { command: string },
  ) {
    const session = this.sessions.get(client.id);
    if (!session) {
      client.emit('terminal:output', {
        type: 'error',
        lines: ['No active terminal session. Connect to a server first.'],
      });
      return;
    }

    const result = this.terminalService.executeAllowedCommand(
      session,
      body.command,
    );

    client.emit('terminal:output', {
      type: result.ok ? 'output' : 'error',
      command: body.command,
      lines: result.lines,
    });
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
