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
import { DatabaseService } from './database.service';

@WebSocketGateway({
  namespace: 'database',
  cors: {
    origin: process.env.CORS_ORIGIN || '*',
    credentials: true,
  },
})
export class DatabaseGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly jwtService: JwtService,
  ) {}

  handleConnection(@ConnectedSocket() client: Socket) {
    client.emit('database:ready', { connected: true });
  }

  handleDisconnect(@ConnectedSocket() client: Socket) {
    this.databaseService.closeSession(client.id);
  }

  @SubscribeMessage('database:connect')
  async connectToDatabase(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { connectionId: number },
  ) {
    const user = await this.authenticate(client);
    try {
      const result = await this.databaseService.connect(
        client.id,
        user.id,
        body.connectionId,
      );
      client.emit('database:connected', result);
      return { ok: true };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to connect';
      client.emit('database:error', { message });
      return { ok: false, message };
    }
  }

  @SubscribeMessage('database:query')
  async executeQuery(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { query: string; database?: string },
  ) {
    await this.authenticate(client);
    try {
      const result = await this.databaseService.executeQuery(
        client.id,
        body.query,
        body.database,
      );
      client.emit('database:results', result);
      return { ok: true };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Query execution failed';
      client.emit('database:error', { message });
      return { ok: false, message };
    }
  }

  @SubscribeMessage('database:databases')
  async listDatabases(@ConnectedSocket() client: Socket) {
    await this.authenticate(client);
    try {
      const databases = await this.databaseService.getDatabases(client.id);
      client.emit('database:databases-list', { databases });
      return { ok: true };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to list databases';
      client.emit('database:error', { message });
      return { ok: false, message };
    }
  }

  @SubscribeMessage('database:tables')
  async listTables(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { database: string },
  ) {
    await this.authenticate(client);
    try {
      const tables = await this.databaseService.getTables(
        client.id,
        body.database,
      );
      client.emit('database:tables-list', { database: body.database, tables });
      return { ok: true };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to list tables';
      client.emit('database:error', { message });
      return { ok: false, message };
    }
  }

  @SubscribeMessage('database:columns')
  async listColumns(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { database: string; table: string },
  ) {
    await this.authenticate(client);
    try {
      const columns = await this.databaseService.getColumns(
        client.id,
        body.database,
        body.table,
      );
      client.emit('database:columns-list', {
        database: body.database,
        table: body.table,
        columns,
      });
      return { ok: true };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to list columns';
      client.emit('database:error', { message });
      return { ok: false, message };
    }
  }

  @SubscribeMessage('database:views')
  async listViews(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { database: string },
  ) {
    await this.authenticate(client);
    try {
      const views = await this.databaseService.getViews(client.id, body.database);
      client.emit('database:views-list', { database: body.database, views });
      return { ok: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to list views';
      client.emit('database:error', { message });
      return { ok: false, message };
    }
  }

  @SubscribeMessage('database:types')
  async listTypes(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { database: string },
  ) {
    await this.authenticate(client);
    try {
      const types = await this.databaseService.getTypes(client.id, body.database);
      client.emit('database:types-list', { database: body.database, types });
      return { ok: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to list types';
      client.emit('database:error', { message });
      return { ok: false, message };
    }
  }

  @SubscribeMessage('database:indexes')
  async listIndexes(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { database: string; table: string },
  ) {
    await this.authenticate(client);
    try {
      const indexes = await this.databaseService.getIndexes(client.id, body.database, body.table);
      client.emit('database:indexes-list', { database: body.database, table: body.table, indexes });
      return { ok: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to list indexes';
      client.emit('database:error', { message });
      return { ok: false, message };
    }
  }

  private async authenticate(client: Socket) {
    const token = this.extractToken(client);
    const payload = this.jwtService.verify(token, {
      secret: process.env.JWT_SECRET || 'your-super-secret-key-change-this',
    }) as { sub: number; email: string };
    return { id: payload.sub, email: payload.email };
  }

  private extractToken(client: Socket) {
    const authToken =
      (client.handshake.auth?.token as string | undefined) ||
      (client.handshake.headers.authorization as string | undefined);
    if (!authToken) throw new Error('Missing token');
    return authToken.startsWith('Bearer ') ? authToken.slice(7) : authToken;
  }
}
