import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleDestroy,
} from '@nestjs/common';
import { Client as SSHClient } from 'ssh2';
import * as net from 'net';
import { CryptoService } from '../crypto/crypto.service';
import { PrismaService } from '../prisma/prisma.service';
import { SshService } from '../ssh/ssh.service';
import { CreateConnectionDto } from './dto/create-connection.dto';
import { UpdateConnectionDto } from './dto/update-connection.dto';

interface DbSession {
  connectionId: number;
  type: string;
  client: any;
  sshClient?: SSHClient;
  tunnelServer?: net.Server;
}

@Injectable()
export class DatabaseService implements OnModuleDestroy {
  private readonly logger = new Logger(DatabaseService.name);
  private readonly sessions = new Map<string, DbSession>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly crypto: CryptoService,
    private readonly sshService: SshService,
  ) {}

  onModuleDestroy() {
    for (const [id] of this.sessions) {
      this.closeSession(id);
    }
  }

  // ── CRUD ──────────────────────────────────────────────

  async createConnection(userId: number, dto: CreateConnectionDto) {
    const passwordEnc = this.crypto.encrypt(dto.password);

    if (dto.useSSHTunnel && dto.serverId) {
      const server = await this.prisma.server.findFirst({
        where: { id: dto.serverId, ownerId: userId, deletedAt: null },
      });
      if (!server) {
        throw new NotFoundException('Server not found for SSH tunnel');
      }
    }

    return this.prisma.databaseConnection.create({
      data: {
        name: dto.name,
        type: dto.type,
        host: dto.host,
        port: dto.port,
        databaseName: dto.databaseName || null,
        username: dto.username,
        passwordEnc,
        useSSHTunnel: dto.useSSHTunnel || false,
        serverId: dto.useSSHTunnel ? dto.serverId : null,
        ownerId: userId,
      },
    });
  }

  async getConnections(userId: number) {
    return this.prisma.databaseConnection.findMany({
      where: { ownerId: userId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        type: true,
        host: true,
        port: true,
        databaseName: true,
        username: true,
        useSSHTunnel: true,
        serverId: true,
        createdAt: true,
      },
    });
  }

  async getConnection(userId: number, id: number) {
    const conn = await this.prisma.databaseConnection.findUnique({
      where: { id },
    });
    if (!conn) throw new NotFoundException('Connection not found');
    if (conn.ownerId !== userId)
      throw new ForbiddenException('Not your connection');
    return conn;
  }

  async updateConnection(userId: number, id: number, dto: UpdateConnectionDto) {
    const conn = await this.getConnection(userId, id);
    const data: any = { ...dto };
    if (dto.password) {
      data.passwordEnc = this.crypto.encrypt(dto.password);
      delete data.password;
    }
    return this.prisma.databaseConnection.update({
      where: { id: conn.id },
      data,
    });
  }

  async deleteConnection(userId: number, id: number) {
    const conn = await this.getConnection(userId, id);
    return this.prisma.databaseConnection.delete({ where: { id: conn.id } });
  }

  // ── CONNECT / DISCONNECT ──────────────────────────────

  async connect(
    sessionId: string,
    userId: number,
    connectionId: number,
  ): Promise<{ type: string; database?: string }> {
    this.closeSession(sessionId);

    const conn = await this.getConnection(userId, connectionId);
    const password = this.crypto.decrypt(conn.passwordEnc);

    let dbHost = conn.host;
    let dbPort = conn.port;
    let sshClient: SSHClient | undefined;
    let tunnelServer: net.Server | undefined;

    if (conn.useSSHTunnel && conn.serverId) {
      const server = await this.prisma.server.findFirst({
        where: { id: conn.serverId, ownerId: userId, deletedAt: null },
      });
      if (!server) throw new NotFoundException('SSH tunnel server not found');

      const sshConfig = await this.sshService.buildConnectConfig(server as any);
      const tunnel = await this.createSSHTunnel(
        sshConfig,
        conn.host,
        conn.port,
      );
      sshClient = tunnel.sshClient;
      tunnelServer = tunnel.server;
      dbHost = '127.0.0.1';
      dbPort = tunnel.localPort;
    }

    let client: any;
    try {
      client = await this.createDbClient(
        conn.type,
        dbHost,
        dbPort,
        conn.username,
        password,
        conn.databaseName,
      );
    } catch (err) {
      if (sshClient) sshClient.end();
      if (tunnelServer) tunnelServer.close();
      throw err;
    }

    this.sessions.set(sessionId, {
      connectionId: conn.id,
      type: conn.type,
      client,
      sshClient,
      tunnelServer,
    });

    return { type: conn.type, database: conn.databaseName };
  }

  closeSession(sessionId: string) {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    try {
      if (session.type === 'mongodb' && session.client?.close) {
        session.client.close().catch(() => {});
      } else if (session.client?.end) {
        session.client.end();
      }
    } catch {}

    if (session.sshClient) {
      try {
        session.sshClient.end();
      } catch {}
    }
    if (session.tunnelServer) {
      try {
        session.tunnelServer.close();
      } catch {}
    }

    this.sessions.delete(sessionId);
  }

  // ── QUERY EXECUTION ───────────────────────────────────

  async executeQuery(
    sessionId: string,
    query: string,
    database?: string,
  ): Promise<{
    columns: string[];
    rows: any[][];
    rowCount: number;
    executionTime: number;
  }> {
    const session = this.getSession(sessionId);
    const start = Date.now();

    switch (session.type) {
      case 'mysql':
        return this.executeMysqlQuery(session.client, query, database, start);
      case 'postgresql':
        return this.executePgQuery(session.client, query, database, start);
      case 'mongodb':
        return this.executeMongoQuery(session.client, query, database, start);
      default:
        throw new BadRequestException(`Unsupported DB type: ${session.type}`);
    }
  }

  // ── SCHEMA INTROSPECTION ──────────────────────────────

  async getDatabases(sessionId: string): Promise<string[]> {
    const session = this.getSession(sessionId);
    switch (session.type) {
      case 'mysql':
        return this.getMysqlDatabases(session.client);
      case 'postgresql':
        return this.getPgDatabases(session.client);
      case 'mongodb':
        return this.getMongoDatabases(session.client);
      default:
        return [];
    }
  }

  async getTables(sessionId: string, database: string): Promise<string[]> {
    const session = this.getSession(sessionId);
    switch (session.type) {
      case 'mysql':
        return this.getMysqlTables(session.client, database);
      case 'postgresql':
        return this.getPgTables(session.client, database);
      case 'mongodb':
        return this.getMongoCollections(session.client, database);
      default:
        return [];
    }
  }

  async getColumns(
    sessionId: string,
    database: string,
    table: string,
  ): Promise<{ name: string; type: string; nullable: boolean }[]> {
    const session = this.getSession(sessionId);
    switch (session.type) {
      case 'mysql':
        return this.getMysqlColumns(session.client, database, table);
      case 'postgresql':
        return this.getPgColumns(session.client, database, table);
      case 'mongodb':
        return this.getMongoFields(session.client, database, table);
      default:
        return [];
    }
  }

  // ── TEST CONNECTION ───────────────────────────────────

  async testConnection(
    userId: number,
    connectionId: number,
  ): Promise<{ ok: boolean; error?: string; latencyMs?: number }> {
    const tempSessionId = `test-${Date.now()}`;
    const start = Date.now();
    try {
      await this.connect(tempSessionId, userId, connectionId);
      const latencyMs = Date.now() - start;
      this.closeSession(tempSessionId);
      return { ok: true, latencyMs };
    } catch (err) {
      this.closeSession(tempSessionId);
      return {
        ok: false,
        error: err instanceof Error ? err.message : 'Connection failed',
      };
    }
  }

  // ── PRIVATE: DB CLIENT CREATION ───────────────────────

  private async createDbClient(
    type: string,
    host: string,
    port: number,
    username: string,
    password: string,
    database?: string,
  ): Promise<any> {
    switch (type) {
      case 'mysql': {
        const mysql = await import('mysql2/promise');
        const conn = await mysql.createConnection({
          host,
          port,
          user: username,
          password,
          database: database || undefined,
          connectTimeout: 10000,
        });
        return conn;
      }
      case 'postgresql': {
        const { Client } = await import('pg');
        const client = new Client({
          host,
          port,
          user: username,
          password,
          database: database || 'postgres',
          connectionTimeoutMillis: 10000,
        });
        await client.connect();
        return client;
      }
      case 'mongodb': {
        const { MongoClient } = await import('mongodb');
        const uri = `mongodb://${username}:${encodeURIComponent(password)}@${host}:${port}/${database || 'admin'}?authSource=admin`;
        const client = new MongoClient(uri, {
          connectTimeoutMS: 10000,
          serverSelectionTimeoutMS: 10000,
        });
        await client.connect();
        return client;
      }
      default:
        throw new BadRequestException(`Unsupported database type: ${type}`);
    }
  }

  // ── PRIVATE: SSH TUNNEL ───────────────────────────────

  private createSSHTunnel(
    sshConfig: any,
    remoteHost: string,
    remotePort: number,
  ): Promise<{ sshClient: SSHClient; server: net.Server; localPort: number }> {
    return new Promise((resolve, reject) => {
      const sshClient = new SSHClient();
      const timeout = setTimeout(() => {
        sshClient.end();
        reject(new Error('SSH tunnel connection timed out'));
      }, 15000);

      sshClient
        .on('ready', () => {
          clearTimeout(timeout);
          const server = net.createServer((sock) => {
            sshClient.forwardOut(
              '127.0.0.1',
              0,
              remoteHost,
              remotePort,
              (err, stream) => {
                if (err) {
                  sock.end();
                  return;
                }
                sock.pipe(stream).pipe(sock);
              },
            );
          });

          server.listen(0, '127.0.0.1', () => {
            const addr = server.address() as net.AddressInfo;
            resolve({ sshClient, server, localPort: addr.port });
          });
        })
        .on('error', (err) => {
          clearTimeout(timeout);
          reject(new Error(`SSH tunnel failed: ${err.message}`));
        })
        .connect(sshConfig);
    });
  }

  // ── PRIVATE: MYSQL OPERATIONS ─────────────────────────

  private async executeMysqlQuery(
    client: any,
    query: string,
    database: string | undefined,
    start: number,
  ) {
    if (database) await client.query(`USE \`${database}\``);
    const [result] = await client.query(query);
    const executionTime = Date.now() - start;

    if (Array.isArray(result)) {
      const columns = result.length > 0 ? Object.keys(result[0]) : [];
      const rows = result.map((r: any) => columns.map((c) => r[c]));
      return { columns, rows, rowCount: result.length, executionTime };
    }
    return {
      columns: ['affectedRows', 'insertId'],
      rows: [[result.affectedRows, result.insertId]],
      rowCount: 1,
      executionTime,
    };
  }

  private async getMysqlDatabases(client: any): Promise<string[]> {
    const [rows] = await client.query('SHOW DATABASES');
    return rows.map((r: any) => r.Database);
  }

  private async getMysqlTables(
    client: any,
    database: string,
  ): Promise<string[]> {
    const [rows] = await client.query(
      `SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA = ?`,
      [database],
    );
    return rows.map((r: any) => r.TABLE_NAME);
  }

  private async getMysqlColumns(
    client: any,
    database: string,
    table: string,
  ) {
    const [rows] = await client.query(
      `SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? ORDER BY ORDINAL_POSITION`,
      [database, table],
    );
    return rows.map((r: any) => ({
      name: r.COLUMN_NAME,
      type: r.DATA_TYPE,
      nullable: r.IS_NULLABLE === 'YES',
    }));
  }

  // ── PRIVATE: POSTGRESQL OPERATIONS ────────────────────

  private async executePgQuery(
    client: any,
    query: string,
    _database: string | undefined,
    start: number,
  ) {
    const result = await client.query(query);
    const executionTime = Date.now() - start;

    if (result.rows) {
      const columns = result.fields?.map((f: any) => f.name) || [];
      const rows = result.rows.map((r: any) => columns.map((c: string) => r[c]));
      return { columns, rows, rowCount: result.rowCount || 0, executionTime };
    }
    return {
      columns: ['rowCount'],
      rows: [[result.rowCount]],
      rowCount: 1,
      executionTime,
    };
  }

  private async getPgDatabases(client: any): Promise<string[]> {
    const result = await client.query(
      `SELECT datname FROM pg_database WHERE datistemplate = false ORDER BY datname`,
    );
    return result.rows.map((r: any) => r.datname);
  }

  private async getPgTables(
    client: any,
    _database: string,
  ): Promise<string[]> {
    const result = await client.query(
      `SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename`,
    );
    return result.rows.map((r: any) => r.tablename);
  }

  private async getPgColumns(
    client: any,
    _database: string,
    table: string,
  ) {
    const result = await client.query(
      `SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_name = $1 AND table_schema = 'public' ORDER BY ordinal_position`,
      [table],
    );
    return result.rows.map((r: any) => ({
      name: r.column_name,
      type: r.data_type,
      nullable: r.is_nullable === 'YES',
    }));
  }

  // ── PRIVATE: MONGODB OPERATIONS ───────────────────────

  private async executeMongoQuery(
    client: any,
    query: string,
    database: string | undefined,
    start: number,
  ) {
    const dbName = database || 'admin';
    const db = client.db(dbName);

    // Parse simple MongoDB commands: db.collection.find({...})
    const findMatch = query.match(
      /^db\.(\w+)\.find\((\{.*\})?\)(?:\.limit\((\d+)\))?$/s,
    );
    const countMatch = query.match(/^db\.(\w+)\.countDocuments\((\{.*\})?\)$/s);
    const insertMatch = query.match(
      /^db\.(\w+)\.insertOne\((\{.*\})\)$/s,
    );

    if (findMatch) {
      const collection = findMatch[1];
      const filter = findMatch[2] ? JSON.parse(findMatch[2]) : {};
      const limit = findMatch[3] ? parseInt(findMatch[3], 10) : 100;
      const docs = await db
        .collection(collection)
        .find(filter)
        .limit(limit)
        .toArray();
      const executionTime = Date.now() - start;
      if (docs.length === 0) {
        return { columns: ['_id'], rows: [], rowCount: 0, executionTime };
      }
      const columns = [
        ...new Set(docs.flatMap((d: any) => Object.keys(d))),
      ] as string[];
      const rows = docs.map((d: any) =>
        columns.map((c) => {
          const v = d[c];
          return typeof v === 'object' ? JSON.stringify(v) : v;
        }),
      );
      return { columns, rows, rowCount: docs.length, executionTime };
    }

    if (countMatch) {
      const collection = countMatch[1];
      const filter = countMatch[2] ? JSON.parse(countMatch[2]) : {};
      const count = await db
        .collection(collection)
        .countDocuments(filter);
      return {
        columns: ['count'],
        rows: [[count]],
        rowCount: 1,
        executionTime: Date.now() - start,
      };
    }

    if (insertMatch) {
      const collection = insertMatch[1];
      const doc = JSON.parse(insertMatch[2]);
      const result = await db.collection(collection).insertOne(doc);
      return {
        columns: ['insertedId', 'acknowledged'],
        rows: [[String(result.insertedId), result.acknowledged]],
        rowCount: 1,
        executionTime: Date.now() - start,
      };
    }

    // Fallback: treat as collection name and list docs
    try {
      const docs = await db.collection(query.trim()).find({}).limit(100).toArray();
      const executionTime = Date.now() - start;
      if (docs.length === 0) {
        return { columns: ['_id'], rows: [], rowCount: 0, executionTime };
      }
      const columns = [
        ...new Set(docs.flatMap((d: any) => Object.keys(d))),
      ] as string[];
      const rows = docs.map((d: any) =>
        columns.map((c) => {
          const v = d[c];
          return typeof v === 'object' ? JSON.stringify(v) : v;
        }),
      );
      return { columns, rows, rowCount: docs.length, executionTime };
    } catch {
      throw new BadRequestException(
        'Unsupported MongoDB query format. Use: db.collection.find({}) or db.collection.countDocuments({})',
      );
    }
  }

  private async getMongoDatabases(client: any): Promise<string[]> {
    const result = await client.db('admin').admin().listDatabases();
    return result.databases.map((d: any) => d.name);
  }

  private async getMongoCollections(
    client: any,
    database: string,
  ): Promise<string[]> {
    const collections = await client.db(database).listCollections().toArray();
    return collections.map((c: any) => c.name).sort();
  }

  private async getMongoFields(
    client: any,
    database: string,
    collection: string,
  ) {
    const sample = await client
      .db(database)
      .collection(collection)
      .findOne({});
    if (!sample) return [];
    return Object.entries(sample).map(([name, value]) => ({
      name,
      type: typeof value === 'object'
        ? Array.isArray(value)
          ? 'array'
          : 'object'
        : typeof value,
      nullable: true,
    }));
  }

  // ── PRIVATE: HELPERS ──────────────────────────────────

  private getSession(sessionId: string): DbSession {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new BadRequestException(
        'No active database session. Connect first.',
      );
    }
    return session;
  }
}
