import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { EventsGateway } from './events.gateway';
import { WebSocketService } from './websocket.service';

/**
 * WebSocket Module
 *
 * Provides real-time WebSocket functionality for the application.
 *
 * Features:
 * - JWT-authenticated WebSocket connections
 * - Room-based subscriptions (market, creator, user, global)
 * - Redis adapter for horizontal scaling
 * - Heartbeat/ping-pong for connection health
 * - Comprehensive event emitters
 *
 * Events:
 * - market:created - New market created
 * - market:trade - Trade executed
 * - market:resolved - Market resolved
 * - shares:trade - Creator shares traded
 * - shares:unlocked - Shares unlocked
 * - dividend:available - Dividend available
 * - notification - User notification
 * - system:maintenance - Maintenance mode
 * - system:announcement - System announcement
 *
 * Usage:
 * 1. Import WebSocketModule in AppModule
 * 2. Inject WebSocketService in your services
 * 3. Call emitter methods to send real-time updates
 *
 * Example:
 * ```typescript
 * @Injectable()
 * export class MarketService {
 *   constructor(private wsService: WebSocketService) {}
 *
 *   async createMarket(data) {
 *     const market = await this.repository.save(data);
 *
 *     // Emit real-time event
 *     this.wsService.emitMarketCreated({
 *       marketId: market.id,
 *       question: market.question,
 *       creator: market.creator,
 *       endDate: market.endDate.toISOString(),
 *       initialPrice: market.initialPrice,
 *     });
 *
 *     return market;
 *   }
 * }
 * ```
 *
 * Client Connection:
 * ```typescript
 * import { io } from 'socket.io-client';
 *
 * const socket = io('wss://api.guesslyfe.com', {
 *   auth: {
 *     token: 'YOUR_JWT_TOKEN'
 *   },
 *   transports: ['websocket', 'polling']
 * });
 *
 * // Subscribe to market
 * socket.emit('subscribe', {
 *   room: 'market',
 *   id: 'market123'
 * });
 *
 * // Listen for events
 * socket.on('market:trade', (event) => {
 *   console.log('New trade:', event.data);
 * });
 *
 * socket.on('notification', (event) => {
 *   console.log('New notification:', event.data);
 * });
 * ```
 *
 * Scaling:
 * To enable multi-instance scaling with Redis:
 * 1. Set up Redis (REDIS_HOST, REDIS_PORT, etc.)
 * 2. Apply RedisIoAdapter in main.ts:
 *    ```typescript
 *    const redisAdapter = new RedisIoAdapter(app, configService);
 *    await redisAdapter.connectToRedis();
 *    app.useWebSocketAdapter(redisAdapter);
 *    ```
 */
@Module({
  imports: [
    ConfigModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: {
          expiresIn: configService.get<string>('JWT_EXPIRATION', '7d'),
        },
      }),
    }),
  ],
  providers: [EventsGateway, WebSocketService],
  exports: [WebSocketService], // Export for use in other modules
})
export class WebSocketModule {}
