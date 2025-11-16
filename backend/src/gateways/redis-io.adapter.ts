import { IoAdapter } from '@nestjs/platform-socket.io';
import { ServerOptions } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { createClient } from 'redis';
import { INestApplicationContext } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Redis WebSocket Adapter
 *
 * Enables WebSocket scaling across multiple server instances using Redis pub/sub.
 *
 * When you have multiple backend instances (horizontal scaling), WebSocket
 * connections may be distributed across different servers. Redis adapter
 * ensures that events emitted from one server reach clients connected to
 * other servers.
 *
 * How it works:
 * 1. Client A connects to Server 1
 * 2. Client B connects to Server 2
 * 3. Server 1 emits event to room X
 * 4. Redis pub/sub broadcasts to Server 2
 * 5. Server 2 forwards event to Client B
 *
 * Configuration:
 * - REDIS_HOST: Redis server host
 * - REDIS_PORT: Redis server port
 * - REDIS_PASSWORD: Redis password (optional)
 * - REDIS_DB: Redis database number (default: 0)
 *
 * Usage in main.ts:
 * ```typescript
 * const configService = app.get(ConfigService);
 * const redisAdapter = new RedisIoAdapter(app, configService);
 * await redisAdapter.connectToRedis();
 * app.useWebSocketAdapter(redisAdapter);
 * ```
 */
export class RedisIoAdapter extends IoAdapter {
  private adapterConstructor: ReturnType<typeof createAdapter>;

  constructor(
    app: INestApplicationContext,
    private readonly configService: ConfigService,
  ) {
    super(app);
  }

  /**
   * Connect to Redis and create adapter
   */
  async connectToRedis(): Promise<void> {
    const redisHost = this.configService.get<string>('REDIS_HOST', 'localhost');
    const redisPort = this.configService.get<number>('REDIS_PORT', 6379);
    const redisPassword = this.configService.get<string>('REDIS_PASSWORD');
    const redisDb = this.configService.get<number>('REDIS_DB', 0);

    const redisUrl = redisPassword
      ? `redis://:${redisPassword}@${redisHost}:${redisPort}/${redisDb}`
      : `redis://${redisHost}:${redisPort}/${redisDb}`;

    console.log(`[WebSocket] Connecting to Redis: ${redisHost}:${redisPort} (DB: ${redisDb})`);

    try {
      // Create Redis clients for pub/sub
      const pubClient = createClient({
        url: redisUrl,
        socket: {
          reconnectStrategy: (retries) => {
            // Exponential backoff: 100ms, 200ms, 400ms, ... up to 3s
            const delay = Math.min(100 * Math.pow(2, retries), 3000);
            console.log(`[WebSocket Redis] Reconnecting pub client (attempt ${retries + 1})...`);
            return delay;
          },
        },
      });

      const subClient = pubClient.duplicate();

      // Handle pub client errors
      pubClient.on('error', (err) => {
        console.error('[WebSocket Redis Pub] Error:', err);
      });

      pubClient.on('connect', () => {
        console.log('[WebSocket Redis Pub] Connected');
      });

      pubClient.on('ready', () => {
        console.log('[WebSocket Redis Pub] Ready');
      });

      pubClient.on('reconnecting', () => {
        console.log('[WebSocket Redis Pub] Reconnecting...');
      });

      // Handle sub client errors
      subClient.on('error', (err) => {
        console.error('[WebSocket Redis Sub] Error:', err);
      });

      subClient.on('connect', () => {
        console.log('[WebSocket Redis Sub] Connected');
      });

      subClient.on('ready', () => {
        console.log('[WebSocket Redis Sub] Ready');
      });

      subClient.on('reconnecting', () => {
        console.log('[WebSocket Redis Sub] Reconnecting...');
      });

      // Connect clients
      await Promise.all([pubClient.connect(), subClient.connect()]);

      // Create adapter
      this.adapterConstructor = createAdapter(pubClient, subClient, {
        // Optional: Add custom options
        requestsTimeout: 5000, // Timeout for requests between servers
      });

      console.log('[WebSocket] Redis adapter created successfully');
    } catch (error) {
      console.error('[WebSocket] Failed to connect to Redis:', error);
      console.warn('[WebSocket] Continuing without Redis adapter (single-instance mode)');
      // Don't throw - allow app to start without Redis
      // WebSocket will work but only within single instance
    }
  }

  /**
   * Create socket.io server with Redis adapter
   */
  createIOServer(port: number, options?: ServerOptions): any {
    const server = super.createIOServer(port, options);

    // Apply Redis adapter if connected
    if (this.adapterConstructor) {
      server.adapter(this.adapterConstructor);
      console.log('[WebSocket] Redis adapter applied to Socket.IO server');
    } else {
      console.warn('[WebSocket] Running without Redis adapter (single-instance mode)');
    }

    return server;
  }
}
