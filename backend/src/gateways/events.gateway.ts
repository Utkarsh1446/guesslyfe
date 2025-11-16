import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { LoggerService } from '../common/logging/logger.service';
import { WsRoom, SubscriptionRequest, SubscriptionResponse } from './dto/ws-events.dto';

/**
 * Events Gateway
 *
 * WebSocket gateway for real-time updates across the platform.
 *
 * Features:
 * - JWT authentication on connection
 * - Room-based subscriptions (market, creator, user)
 * - Redis adapter for horizontal scaling
 * - Heartbeat/ping-pong for connection health
 * - Graceful reconnection handling
 *
 * Events emitted:
 * - market:created - New market created
 * - market:trade - Trade executed on market
 * - market:resolved - Market resolved
 * - shares:trade - Creator shares traded
 * - shares:unlocked - Creator shares unlocked
 * - dividend:available - Dividend available for claim
 * - notification - User notification
 *
 * Client usage:
 * ```typescript
 * const socket = io('wss://api.guesslyfe.com', {
 *   auth: { token: 'JWT_TOKEN' }
 * });
 *
 * socket.emit('subscribe', { room: 'market', id: 'market123' });
 * socket.on('market:trade', (data) => console.log(data));
 * ```
 */
@Injectable()
@WebSocketGateway({
  cors: {
    origin: process.env.CORS_ALLOWED_ORIGINS?.split(',') || '*',
    credentials: true,
  },
  namespace: '/',
  transports: ['websocket', 'polling'],
  pingInterval: 25000, // 25 seconds
  pingTimeout: 60000, // 1 minute
})
export class EventsGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new LoggerService(EventsGateway.name);

  // Track connected clients and their subscriptions
  private connectedClients: Map<
    string,
    {
      socketId: string;
      userId?: string;
      address?: string;
      rooms: Set<string>;
    }
  > = new Map();

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Called after gateway initialization
   */
  afterInit(server: Server) {
    this.logger.logInfo('WebSocket Gateway initialized', {
      cors: this.configService.get('CORS_ALLOWED_ORIGINS'),
      pingInterval: 25000,
      pingTimeout: 60000,
    });
  }

  /**
   * Handle new client connections
   */
  async handleConnection(client: Socket) {
    try {
      const token = client.handshake.auth?.token || client.handshake.headers?.authorization?.replace('Bearer ', '');

      if (!token) {
        this.logger.logWarn('WebSocket connection without token', {
          socketId: client.id,
          ip: client.handshake.address,
        });
        client.emit('error', { message: 'Authentication required' });
        client.disconnect(true);
        return;
      }

      // Verify JWT token
      const payload = await this.jwtService.verifyAsync(token, {
        secret: this.configService.get('JWT_SECRET'),
      });

      // Store client info
      this.connectedClients.set(client.id, {
        socketId: client.id,
        userId: payload.sub,
        address: payload.address,
        rooms: new Set(),
      });

      // Auto-subscribe to user's personal room
      const userRoom = this.getRoomName(WsRoom.USER, payload.address);
      await client.join(userRoom);
      this.connectedClients.get(client.id)?.rooms.add(userRoom);

      // Auto-subscribe to global room
      await client.join(this.getRoomName(WsRoom.GLOBAL, 'all'));
      this.connectedClients.get(client.id)?.rooms.add(this.getRoomName(WsRoom.GLOBAL, 'all'));

      this.logger.logInfo('WebSocket client connected', {
        socketId: client.id,
        userId: payload.sub,
        address: payload.address,
        ip: client.handshake.address,
      });

      // Send welcome message
      client.emit('connected', {
        message: 'Connected to GuessLyfe real-time updates',
        userId: payload.sub,
        rooms: [userRoom, this.getRoomName(WsRoom.GLOBAL, 'all')],
      });
    } catch (error) {
      this.logger.logError('WebSocket authentication failed', error, {
        socketId: client.id,
        ip: client.handshake.address,
      });
      client.emit('error', { message: 'Authentication failed' });
      client.disconnect(true);
    }
  }

  /**
   * Handle client disconnections
   */
  handleDisconnect(client: Socket) {
    const clientInfo = this.connectedClients.get(client.id);

    if (clientInfo) {
      this.logger.logInfo('WebSocket client disconnected', {
        socketId: client.id,
        userId: clientInfo.userId,
        address: clientInfo.address,
        roomCount: clientInfo.rooms.size,
      });

      this.connectedClients.delete(client.id);
    } else {
      this.logger.logWarn('Unknown client disconnected', {
        socketId: client.id,
      });
    }
  }

  /**
   * Subscribe to a room
   */
  @SubscribeMessage('subscribe')
  async handleSubscribe(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: SubscriptionRequest,
  ): Promise<SubscriptionResponse> {
    try {
      const clientInfo = this.connectedClients.get(client.id);

      if (!clientInfo) {
        throw new UnauthorizedException('Client not authenticated');
      }

      const roomName = this.getRoomName(data.room, data.id);

      // Join the room
      await client.join(roomName);

      // Track subscription
      clientInfo.rooms.add(roomName);

      this.logger.logInfo('Client subscribed to room', {
        socketId: client.id,
        userId: clientInfo.userId,
        room: roomName,
      });

      return {
        success: true,
        room: roomName,
        message: `Subscribed to ${roomName}`,
      };
    } catch (error) {
      this.logger.logError('Subscription failed', error, {
        socketId: client.id,
        room: data.room,
        id: data.id,
      });

      return {
        success: false,
        room: this.getRoomName(data.room, data.id),
        message: error.message || 'Subscription failed',
      };
    }
  }

  /**
   * Unsubscribe from a room
   */
  @SubscribeMessage('unsubscribe')
  async handleUnsubscribe(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: SubscriptionRequest,
  ): Promise<SubscriptionResponse> {
    try {
      const clientInfo = this.connectedClients.get(client.id);

      if (!clientInfo) {
        throw new UnauthorizedException('Client not authenticated');
      }

      const roomName = this.getRoomName(data.room, data.id);

      // Leave the room
      await client.leave(roomName);

      // Remove from tracking
      clientInfo.rooms.delete(roomName);

      this.logger.logInfo('Client unsubscribed from room', {
        socketId: client.id,
        userId: clientInfo.userId,
        room: roomName,
      });

      return {
        success: true,
        room: roomName,
        message: `Unsubscribed from ${roomName}`,
      };
    } catch (error) {
      this.logger.logError('Unsubscription failed', error, {
        socketId: client.id,
        room: data.room,
        id: data.id,
      });

      return {
        success: false,
        room: this.getRoomName(data.room, data.id),
        message: error.message || 'Unsubscription failed',
      };
    }
  }

  /**
   * Get list of subscribed rooms
   */
  @SubscribeMessage('getRooms')
  handleGetRooms(@ConnectedSocket() client: Socket): string[] {
    const clientInfo = this.connectedClients.get(client.id);
    return clientInfo ? Array.from(clientInfo.rooms) : [];
  }

  /**
   * Ping handler for connection health
   */
  @SubscribeMessage('ping')
  handlePing(@ConnectedSocket() client: Socket): { pong: boolean; timestamp: number } {
    return {
      pong: true,
      timestamp: Date.now(),
    };
  }

  /**
   * Get formatted room name
   */
  private getRoomName(room: WsRoom, id: string): string {
    return `${room}:${id}`;
  }

  /**
   * Emit event to specific room
   */
  emitToRoom(room: string, event: string, data: any): void {
    this.server.to(room).emit(event, {
      type: event,
      timestamp: new Date().toISOString(),
      data,
    });

    this.logger.logInfo('Event emitted to room', {
      room,
      event,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Emit event to specific user
   */
  emitToUser(userAddress: string, event: string, data: any): void {
    const room = this.getRoomName(WsRoom.USER, userAddress);
    this.emitToRoom(room, event, data);
  }

  /**
   * Emit event to market subscribers
   */
  emitToMarket(marketId: string, event: string, data: any): void {
    const room = this.getRoomName(WsRoom.MARKET, marketId);
    this.emitToRoom(room, event, data);
  }

  /**
   * Emit event to creator subscribers
   */
  emitToCreator(creatorId: string, event: string, data: any): void {
    const room = this.getRoomName(WsRoom.CREATOR, creatorId);
    this.emitToRoom(room, event, data);
  }

  /**
   * Broadcast event to all connected clients
   */
  broadcast(event: string, data: any): void {
    this.server.emit(event, {
      type: event,
      timestamp: new Date().toISOString(),
      data,
    });

    this.logger.logInfo('Event broadcasted', {
      event,
      connectedClients: this.connectedClients.size,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Get connected clients count
   */
  getConnectedClientsCount(): number {
    return this.connectedClients.size;
  }

  /**
   * Get room subscribers count
   */
  getRoomSize(room: string): number {
    return this.server.sockets.adapter.rooms.get(room)?.size || 0;
  }

  /**
   * Get all active rooms
   */
  getActiveRooms(): string[] {
    const rooms: string[] = [];
    this.server.sockets.adapter.rooms.forEach((_, room) => {
      // Skip individual socket IDs (they're also stored as rooms)
      if (!this.connectedClients.has(room)) {
        rooms.push(room);
      }
    });
    return rooms;
  }
}
