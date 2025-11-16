/**
 * WebSocket Event DTOs
 *
 * Type definitions for all real-time events emitted via WebSocket
 */

/**
 * Event Types
 */
export enum WsEventType {
  // Market events
  MARKET_CREATED = 'market:created',
  MARKET_TRADE = 'market:trade',
  MARKET_RESOLVED = 'market:resolved',

  // Creator share events
  SHARES_TRADE = 'shares:trade',
  SHARES_UNLOCKED = 'shares:unlocked',

  // Dividend events
  DIVIDEND_AVAILABLE = 'dividend:available',

  // User notifications
  NOTIFICATION = 'notification',

  // System events
  SYSTEM_MAINTENANCE = 'system:maintenance',
  SYSTEM_ANNOUNCEMENT = 'system:announcement',
}

/**
 * Base WebSocket Event
 */
export interface WsEvent<T = any> {
  type: WsEventType;
  timestamp: string;
  data: T;
}

/**
 * Market Created Event
 */
export interface MarketCreatedEvent {
  marketId: string;
  question: string;
  creator: string;
  creatorHandle?: string;
  category?: string;
  endDate: string;
  initialPrice: string;
  imageUrl?: string;
}

/**
 * Market Trade Event
 */
export interface MarketTradeEvent {
  marketId: string;
  tradeId: string;
  trader: string;
  direction: 'buy' | 'sell';
  outcome: number; // 0 for NO, 1 for YES
  amount: string;
  shares: string;
  price: string;
  newYesPrice: string;
  newNoPrice: string;
  timestamp: string;
}

/**
 * Market Resolved Event
 */
export interface MarketResolvedEvent {
  marketId: string;
  question: string;
  outcome: number; // 0 for NO, 1 for YES
  resolvedBy: string;
  reason?: string;
  timestamp: string;
  totalVolume: string;
  totalParticipants: number;
}

/**
 * Shares Trade Event
 */
export interface SharesTradeEvent {
  creatorId: string;
  creatorHandle: string;
  tradeId: string;
  trader: string;
  direction: 'buy' | 'sell';
  amount: string;
  shares: string;
  price: string;
  newPrice: string;
  timestamp: string;
}

/**
 * Shares Unlocked Event
 */
export interface SharesUnlockedEvent {
  creatorId: string;
  creatorHandle: string;
  holder: string;
  amount: string;
  newUnlockedAmount: string;
  reason: 'time_based' | 'manual' | 'creator_action';
  timestamp: string;
}

/**
 * Dividend Available Event
 */
export interface DividendAvailableEvent {
  creatorId: string;
  creatorHandle: string;
  holder: string;
  amount: string;
  source: 'market_fees' | 'creator_earnings';
  timestamp: string;
}

/**
 * Notification Event
 */
export interface NotificationEvent {
  notificationId: string;
  userId: string;
  type: 'market_resolved' | 'trade_executed' | 'dividend_available' | 'creator_approved' | 'shares_unlocked' | 'custom';
  title: string;
  message: string;
  data?: Record<string, any>;
  actionUrl?: string;
  read: boolean;
  timestamp: string;
}

/**
 * System Maintenance Event
 */
export interface SystemMaintenanceEvent {
  enabled: boolean;
  message: string;
  estimatedDuration?: string;
  affectedServices?: string[];
}

/**
 * System Announcement Event
 */
export interface SystemAnnouncementEvent {
  id: string;
  title: string;
  message: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  actionUrl?: string;
}

/**
 * Room Types for Subscriptions
 */
export enum WsRoom {
  MARKET = 'market',
  CREATOR = 'creator',
  USER = 'user',
  GLOBAL = 'global',
}

/**
 * Subscription Request
 */
export interface SubscriptionRequest {
  room: WsRoom;
  id: string; // marketId, creatorId, or userAddress
}

/**
 * Subscription Response
 */
export interface SubscriptionResponse {
  success: boolean;
  room: string; // Formatted room name (e.g., "market:123")
  message?: string;
}
