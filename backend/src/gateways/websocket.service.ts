import { Injectable } from '@nestjs/common';
import { EventsGateway } from './events.gateway';
import {
  WsEventType,
  MarketCreatedEvent,
  MarketTradeEvent,
  MarketResolvedEvent,
  SharesTradeEvent,
  SharesUnlockedEvent,
  DividendAvailableEvent,
  NotificationEvent,
  SystemMaintenanceEvent,
  SystemAnnouncementEvent,
} from './dto/ws-events.dto';
import { LoggerService } from '../common/logging/logger.service';

/**
 * WebSocket Service
 *
 * Provides high-level methods for emitting WebSocket events from anywhere in the application.
 * Use this service instead of directly accessing EventsGateway.
 *
 * Usage:
 * ```typescript
 * @Injectable()
 * export class MarketService {
 *   constructor(private wsService: WebSocketService) {}
 *
 *   async createMarket(data) {
 *     // ... create market logic
 *
 *     // Emit real-time event
 *     this.wsService.emitMarketCreated({
 *       marketId: market.id,
 *       question: market.question,
 *       creator: market.creator,
 *       // ...
 *     });
 *   }
 * }
 * ```
 */
@Injectable()
export class WebSocketService {
  private readonly logger = new LoggerService(WebSocketService.name);

  constructor(private readonly eventsGateway: EventsGateway) {}

  // ===========================================================================
  // Market Events
  // ===========================================================================

  /**
   * Emit market created event
   * Sent to: global room
   */
  emitMarketCreated(data: MarketCreatedEvent): void {
    try {
      this.eventsGateway.broadcast(WsEventType.MARKET_CREATED, data);
      this.logger.logInfo('Market created event emitted', { marketId: data.marketId });
    } catch (error) {
      this.logger.logError('Failed to emit market created event', error, { marketId: data.marketId });
    }
  }

  /**
   * Emit market trade event
   * Sent to: market room, trader's user room
   */
  emitMarketTrade(data: MarketTradeEvent): void {
    try {
      // Emit to market subscribers
      this.eventsGateway.emitToMarket(data.marketId, WsEventType.MARKET_TRADE, data);

      // Emit to trader
      this.eventsGateway.emitToUser(data.trader, WsEventType.MARKET_TRADE, data);

      this.logger.logInfo('Market trade event emitted', {
        marketId: data.marketId,
        trader: data.trader,
        direction: data.direction,
      });
    } catch (error) {
      this.logger.logError('Failed to emit market trade event', error, {
        marketId: data.marketId,
        tradeId: data.tradeId,
      });
    }
  }

  /**
   * Emit market resolved event
   * Sent to: market room, global room
   */
  emitMarketResolved(data: MarketResolvedEvent): void {
    try {
      // Emit to market subscribers
      this.eventsGateway.emitToMarket(data.marketId, WsEventType.MARKET_RESOLVED, data);

      // Also broadcast to global
      this.eventsGateway.broadcast(WsEventType.MARKET_RESOLVED, data);

      this.logger.logInfo('Market resolved event emitted', {
        marketId: data.marketId,
        outcome: data.outcome,
      });
    } catch (error) {
      this.logger.logError('Failed to emit market resolved event', error, { marketId: data.marketId });
    }
  }

  // ===========================================================================
  // Creator Share Events
  // ===========================================================================

  /**
   * Emit shares trade event
   * Sent to: creator room, trader's user room
   */
  emitSharesTrade(data: SharesTradeEvent): void {
    try {
      // Emit to creator subscribers
      this.eventsGateway.emitToCreator(data.creatorId, WsEventType.SHARES_TRADE, data);

      // Emit to trader
      this.eventsGateway.emitToUser(data.trader, WsEventType.SHARES_TRADE, data);

      this.logger.logInfo('Shares trade event emitted', {
        creatorId: data.creatorId,
        trader: data.trader,
        direction: data.direction,
      });
    } catch (error) {
      this.logger.logError('Failed to emit shares trade event', error, {
        creatorId: data.creatorId,
        tradeId: data.tradeId,
      });
    }
  }

  /**
   * Emit shares unlocked event
   * Sent to: holder's user room, creator room
   */
  emitSharesUnlocked(data: SharesUnlockedEvent): void {
    try {
      // Emit to holder
      this.eventsGateway.emitToUser(data.holder, WsEventType.SHARES_UNLOCKED, data);

      // Emit to creator subscribers
      this.eventsGateway.emitToCreator(data.creatorId, WsEventType.SHARES_UNLOCKED, data);

      this.logger.logInfo('Shares unlocked event emitted', {
        creatorId: data.creatorId,
        holder: data.holder,
        amount: data.amount,
      });
    } catch (error) {
      this.logger.logError('Failed to emit shares unlocked event', error, {
        creatorId: data.creatorId,
        holder: data.holder,
      });
    }
  }

  // ===========================================================================
  // Dividend Events
  // ===========================================================================

  /**
   * Emit dividend available event
   * Sent to: holder's user room
   */
  emitDividendAvailable(data: DividendAvailableEvent): void {
    try {
      // Emit to holder
      this.eventsGateway.emitToUser(data.holder, WsEventType.DIVIDEND_AVAILABLE, data);

      this.logger.logInfo('Dividend available event emitted', {
        creatorId: data.creatorId,
        holder: data.holder,
        amount: data.amount,
      });
    } catch (error) {
      this.logger.logError('Failed to emit dividend available event', error, {
        creatorId: data.creatorId,
        holder: data.holder,
      });
    }
  }

  // ===========================================================================
  // Notification Events
  // ===========================================================================

  /**
   * Emit notification event
   * Sent to: user's room
   */
  emitNotification(data: NotificationEvent): void {
    try {
      // Emit to user
      this.eventsGateway.emitToUser(data.userId, WsEventType.NOTIFICATION, data);

      this.logger.logInfo('Notification event emitted', {
        userId: data.userId,
        type: data.type,
      });
    } catch (error) {
      this.logger.logError('Failed to emit notification event', error, {
        userId: data.userId,
        notificationId: data.notificationId,
      });
    }
  }

  /**
   * Emit notification to multiple users
   */
  emitBulkNotifications(notifications: NotificationEvent[]): void {
    for (const notification of notifications) {
      this.emitNotification(notification);
    }
  }

  // ===========================================================================
  // System Events
  // ===========================================================================

  /**
   * Emit system maintenance event
   * Sent to: all connected clients
   */
  emitSystemMaintenance(data: SystemMaintenanceEvent): void {
    try {
      this.eventsGateway.broadcast(WsEventType.SYSTEM_MAINTENANCE, data);

      this.logger.logWarn('System maintenance event emitted', {
        enabled: data.enabled,
        message: data.message,
      });
    } catch (error) {
      this.logger.logError('Failed to emit system maintenance event', error);
    }
  }

  /**
   * Emit system announcement
   * Sent to: all connected clients
   */
  emitSystemAnnouncement(data: SystemAnnouncementEvent): void {
    try {
      this.eventsGateway.broadcast(WsEventType.SYSTEM_ANNOUNCEMENT, data);

      this.logger.logInfo('System announcement event emitted', {
        id: data.id,
        priority: data.priority,
      });
    } catch (error) {
      this.logger.logError('Failed to emit system announcement event', error);
    }
  }

  // ===========================================================================
  // Utility Methods
  // ===========================================================================

  /**
   * Get connected clients count
   */
  getConnectedClientsCount(): number {
    return this.eventsGateway.getConnectedClientsCount();
  }

  /**
   * Get room size
   */
  getRoomSize(room: string): number {
    return this.eventsGateway.getRoomSize(room);
  }

  /**
   * Get active rooms
   */
  getActiveRooms(): string[] {
    return this.eventsGateway.getActiveRooms();
  }

  /**
   * Get WebSocket statistics
   */
  getStatistics() {
    return {
      connectedClients: this.getConnectedClientsCount(),
      activeRooms: this.getActiveRooms(),
      roomCount: this.getActiveRooms().length,
      timestamp: new Date().toISOString(),
    };
  }
}
