# WebSocket Real-Time Updates

Comprehensive guide for implementing and using WebSocket real-time updates in GuessLyfe.

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Events](#events)
- [Client Integration](#client-integration)
- [Server Integration](#server-integration)
- [Authentication](#authentication)
- [Room Subscriptions](#room-subscriptions)
- [Scaling](#scaling)
- [Examples](#examples)
- [Troubleshooting](#troubleshooting)

## Overview

GuessLyfe uses Socket.IO for real-time WebSocket communication, providing instant updates for:
- Market creation and trading
- Creator share transactions
- Dividend distributions
- User notifications
- System announcements

### Features

✅ **JWT Authentication** - Secure WebSocket connections
✅ **Room-Based Subscriptions** - Subscribe to specific markets, creators, or users
✅ **Redis Scaling** - Horizontal scaling across multiple servers
✅ **Auto-Reconnection** - Graceful handling of connection drops
✅ **Heartbeat/Ping-Pong** - Connection health monitoring
✅ **Type-Safe Events** - Full TypeScript support

### Connection URL

```
Production: wss://api.guesslyfe.com
Development: ws://localhost:3000
```

## Architecture

```
┌─────────────┐
│   Clients   │
└──────┬──────┘
       │ WebSocket
       ↓
┌─────────────────────────────────────┐
│     Socket.IO Server (NestJS)       │
│  ┌──────────────────────────────┐   │
│  │    EventsGateway             │   │
│  │  - Authentication            │   │
│  │  - Room Management           │   │
│  │  - Event Distribution        │   │
│  └──────────────────────────────┘   │
│              ↓                      │
│  ┌──────────────────────────────┐   │
│  │   WebSocketService           │   │
│  │  - emitMarketCreated()       │   │
│  │  - emitMarketTrade()         │   │
│  │  - emitNotification()        │   │
│  │  - ...                       │   │
│  └──────────────────────────────┘   │
└──────────────┬──────────────────────┘
               │
               ↓ (if multi-instance)
       ┌──────────────┐
       │    Redis     │
       │   Pub/Sub    │
       └──────────────┘
```

## Events

### Event Types

| Event | Description | Rooms | Data |
|-------|-------------|-------|------|
| `market:created` | New market created | global | MarketCreatedEvent |
| `market:trade` | Trade executed | market:{id}, user:{address} | MarketTradeEvent |
| `market:resolved` | Market resolved | market:{id}, global | MarketResolvedEvent |
| `shares:trade` | Creator shares traded | creator:{id}, user:{address} | SharesTradeEvent |
| `shares:unlocked` | Shares unlocked | creator:{id}, user:{address} | SharesUnlockedEvent |
| `dividend:available` | Dividend available | user:{address} | DividendAvailableEvent |
| `notification` | User notification | user:{address} | NotificationEvent |
| `system:maintenance` | Maintenance mode | global (broadcast) | SystemMaintenanceEvent |
| `system:announcement` | System announcement | global (broadcast) | SystemAnnouncementEvent |

### Event Structure

All events follow this structure:

```typescript
{
  type: string;          // Event type (e.g., "market:trade")
  timestamp: string;     // ISO 8601 timestamp
  data: {                // Event-specific data
    // ...
  }
}
```

### Event Data Types

#### MarketCreatedEvent

```typescript
{
  marketId: string;
  question: string;
  creator: string;
  creatorHandle?: string;
  category?: string;
  endDate: string;        // ISO 8601
  initialPrice: string;   // Wei
  imageUrl?: string;
}
```

#### MarketTradeEvent

```typescript
{
  marketId: string;
  tradeId: string;
  trader: string;         // Wallet address
  direction: 'buy' | 'sell';
  outcome: number;        // 0 for NO, 1 for YES
  amount: string;         // Wei
  shares: string;         // Wei
  price: string;          // Wei
  newYesPrice: string;    // Wei
  newNoPrice: string;     // Wei
  timestamp: string;      // ISO 8601
}
```

#### NotificationEvent

```typescript
{
  notificationId: string;
  userId: string;
  type: 'market_resolved' | 'trade_executed' | 'dividend_available' | 'custom';
  title: string;
  message: string;
  data?: Record<string, any>;
  actionUrl?: string;
  read: boolean;
  timestamp: string;
}
```

*See `src/gateways/dto/ws-events.dto.ts` for all event types.*

## Client Integration

### Installation

```bash
npm install socket.io-client
# or
yarn add socket.io-client
```

### Basic Connection (JavaScript/TypeScript)

```typescript
import { io, Socket } from 'socket.io-client';

// Get JWT token (from login/authentication)
const token = 'YOUR_JWT_TOKEN';

// Connect to WebSocket server
const socket: Socket = io('wss://api.guesslyfe.com', {
  auth: {
    token: token
  },
  transports: ['websocket', 'polling'], // Try WebSocket first, fallback to polling
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
});

// Connection events
socket.on('connect', () => {
  console.log('Connected to WebSocket server');
  console.log('Socket ID:', socket.id);
});

socket.on('connected', (data) => {
  console.log('Welcome message:', data.message);
  console.log('Auto-joined rooms:', data.rooms);
});

socket.on('disconnect', (reason) => {
  console.log('Disconnected:', reason);
});

socket.on('error', (error) => {
  console.error('WebSocket error:', error);
});

// Reconnection events
socket.on('reconnect', (attemptNumber) => {
  console.log('Reconnected after', attemptNumber, 'attempts');
});

socket.on('reconnect_attempt', (attemptNumber) => {
  console.log('Reconnection attempt', attemptNumber);
});

socket.on('reconnect_error', (error) => {
  console.error('Reconnection error:', error);
});
```

### React Hook Example

```typescript
// hooks/useWebSocket.ts
import { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';

export function useWebSocket(token: string | null) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!token) return;

    const newSocket = io('wss://api.guesslyfe.com', {
      auth: { token },
      transports: ['websocket', 'polling'],
    });

    newSocket.on('connect', () => {
      setIsConnected(true);
    });

    newSocket.on('disconnect', () => {
      setIsConnected(false);
    });

    setSocket(newSocket);

    return () => {
      newSocket.close();
    };
  }, [token]);

  return { socket, isConnected };
}

// Usage in component
function App() {
  const { token } = useAuth();
  const { socket, isConnected } = useWebSocket(token);

  useEffect(() => {
    if (!socket) return;

    socket.on('notification', (event) => {
      console.log('New notification:', event.data);
      showToast(event.data.message);
    });

    return () => {
      socket.off('notification');
    };
  }, [socket]);

  return (
    <div>
      Status: {isConnected ? 'Connected' : 'Disconnected'}
    </div>
  );
}
```

### Subscribing to Rooms

```typescript
// Subscribe to market updates
socket.emit('subscribe', {
  room: 'market',
  id: 'market123'
}, (response) => {
  console.log('Subscription response:', response);
  // { success: true, room: 'market:market123', message: '...' }
});

// Subscribe to creator updates
socket.emit('subscribe', {
  room: 'creator',
  id: '0x1234...'
});

// Unsubscribe from room
socket.emit('unsubscribe', {
  room: 'market',
  id: 'market123'
});

// Get current subscriptions
socket.emit('getRooms', (rooms: string[]) => {
  console.log('Subscribed rooms:', rooms);
});
```

### Listening to Events

```typescript
// Market created
socket.on('market:created', (event) => {
  console.log('New market:', event.data);
  // Update UI with new market
});

// Market trade
socket.on('market:trade', (event) => {
  const trade = event.data;
  console.log('Trade executed:', trade);
  // Update market price, volume, etc.
});

// Market resolved
socket.on('market:resolved', (event) => {
  console.log('Market resolved:', event.data);
  // Show resolution notification
  // Update market status
});

// Notification
socket.on('notification', (event) => {
  const notification = event.data;
  console.log('Notification:', notification);
  // Show toast/banner
  // Update notification badge
});

// Shares trade
socket.on('shares:trade', (event) => {
  console.log('Shares traded:', event.data);
  // Update creator share price
});

// Dividend available
socket.on('dividend:available', (event) => {
  console.log('Dividend available:', event.data);
  // Show claim button
});
```

### Complete React Example

```typescript
import React, { useEffect, useState } from 'react';
import { io } from 'socket.io-client';

function MarketView({ marketId }) {
  const [trades, setTrades] = useState([]);
  const [price, setPrice] = useState({ yes: '0', no: '0' });
  const { token } = useAuth();

  useEffect(() => {
    const socket = io('wss://api.guesslyfe.com', {
      auth: { token },
    });

    // Subscribe to market
    socket.emit('subscribe', {
      room: 'market',
      id: marketId
    });

    // Listen for trades
    socket.on('market:trade', (event) => {
      const trade = event.data;

      // Add to trades list
      setTrades(prev => [trade, ...prev]);

      // Update prices
      setPrice({
        yes: trade.newYesPrice,
        no: trade.newNoPrice
      });

      // Show toast notification
      toast.success(`New ${trade.direction} trade: ${trade.shares} shares`);
    });

    // Listen for resolution
    socket.on('market:resolved', (event) => {
      const { outcome, reason } = event.data;
      toast.success(`Market resolved: ${outcome === 1 ? 'YES' : 'NO'}`);
      // Navigate to results page
    });

    return () => {
      socket.emit('unsubscribe', {
        room: 'market',
        id: marketId
      });
      socket.close();
    };
  }, [marketId, token]);

  return (
    <div>
      <h2>Live Trades</h2>
      <div>YES: {price.yes} | NO: {price.no}</div>
      <ul>
        {trades.map(trade => (
          <li key={trade.tradeId}>
            {trade.direction} {trade.shares} @ {trade.price}
          </li>
        ))}
      </ul>
    </div>
  );
}
```

## Server Integration

### Emitting Events from Services

```typescript
import { Injectable } from '@nestjs/common';
import { WebSocketService } from '@/gateways/websocket.service';

@Injectable()
export class MarketService {
  constructor(
    private readonly wsService: WebSocketService,
    // ... other dependencies
  ) {}

  async createMarket(data: CreateMarketDto) {
    // Create market in database
    const market = await this.repository.save(data);

    // Emit real-time event
    this.wsService.emitMarketCreated({
      marketId: market.id,
      question: market.question,
      creator: market.creator,
      creatorHandle: market.creatorHandle,
      category: market.category,
      endDate: market.endDate.toISOString(),
      initialPrice: market.initialPrice,
      imageUrl: market.imageUrl,
    });

    return market;
  }

  async executeTrade(tradeData: ExecuteTradeDto) {
    // Execute trade logic
    const trade = await this.executeTradeLogic(tradeData);

    // Emit real-time event
    this.wsService.emitMarketTrade({
      marketId: trade.marketId,
      tradeId: trade.id,
      trader: trade.trader,
      direction: trade.direction,
      outcome: trade.outcome,
      amount: trade.amount,
      shares: trade.shares,
      price: trade.price,
      newYesPrice: trade.newYesPrice,
      newNoPrice: trade.newNoPrice,
      timestamp: trade.createdAt.toISOString(),
    });

    return trade;
  }

  async resolveMarket(marketId: string, outcome: number, reason?: string) {
    // Resolve market logic
    const market = await this.resolveLogic(marketId, outcome, reason);

    // Emit real-time event
    this.wsService.emitMarketResolved({
      marketId: market.id,
      question: market.question,
      outcome: outcome,
      resolvedBy: market.resolvedBy,
      reason: reason,
      timestamp: new Date().toISOString(),
      totalVolume: market.totalVolume,
      totalParticipants: market.totalParticipants,
    });

    return market;
  }
}
```

### Sending Notifications

```typescript
@Injectable()
export class NotificationService {
  constructor(private readonly wsService: WebSocketService) {}

  async sendNotification(userId: string, notification: CreateNotificationDto) {
    // Save notification to database
    const saved = await this.repository.save({
      userId,
      ...notification,
    });

    // Send real-time notification
    this.wsService.emitNotification({
      notificationId: saved.id,
      userId: userId,
      type: notification.type,
      title: notification.title,
      message: notification.message,
      data: notification.data,
      actionUrl: notification.actionUrl,
      read: false,
      timestamp: saved.createdAt.toISOString(),
    });

    return saved;
  }

  async sendBulkNotifications(notifications: Array<{ userId: string; data: any }>) {
    // Prepare notification events
    const events = notifications.map(n => ({
      notificationId: generateId(),
      userId: n.userId,
      type: n.data.type,
      title: n.data.title,
      message: n.data.message,
      read: false,
      timestamp: new Date().toISOString(),
    }));

    // Send all at once
    this.wsService.emitBulkNotifications(events);
  }
}
```

## Authentication

WebSocket connections require JWT authentication.

### Token Validation

The gateway automatically:
1. Extracts token from `auth.token` or `Authorization` header
2. Verifies JWT signature and expiration
3. Extracts user info (userId, wallet address)
4. Auto-subscribes user to their personal room

### Token Refresh

```typescript
// When token expires, reconnect with new token
function refreshConnection(newToken: string) {
  socket.auth = { token: newToken };
  socket.disconnect().connect();
}

// Or just create new socket
function createNewConnection(newToken: string) {
  if (socket) {
    socket.close();
  }
  socket = io('wss://api.guesslyfe.com', {
    auth: { token: newToken }
  });
}
```

## Room Subscriptions

### Auto-Joined Rooms

On connection, clients are automatically subscribed to:
1. **User Room** (`user:{address}`) - Personal notifications, dividends, shares unlocked
2. **Global Room** (`global:all`) - System announcements, maintenance

### Manual Subscriptions

```typescript
// Subscribe to market
socket.emit('subscribe', {
  room: 'market',
  id: 'market123'
});

// Subscribe to creator
socket.emit('subscribe', {
  room: 'creator',
  id: '0x1234...'
});
```

### Room Naming Convention

- Market: `market:{marketId}`
- Creator: `creator:{creatorId}`
- User: `user:{walletAddress}`
- Global: `global:all`

## Scaling

### Multi-Instance Support with Redis

For production deployments with multiple backend instances, configure Redis adapter.

**Step 1: Install Dependencies**

```bash
npm install @socket.io/redis-adapter redis
```

**Step 2: Configure Environment**

```bash
# .env
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your-password
REDIS_DB=0
```

**Step 3: Apply Adapter in main.ts**

```typescript
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { RedisIoAdapter } from './gateways/redis-io.adapter';
import { ConfigService } from '@nestjs/config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Get config service
  const configService = app.get(ConfigService);

  // Create and apply Redis adapter
  const redisAdapter = new RedisIoAdapter(app, configService);
  await redisAdapter.connectToRedis();
  app.useWebSocketAdapter(redisAdapter);

  await app.listen(3000);
}
bootstrap();
```

**How it works:**

```
Client A → Server 1 (emits event to room X)
                ↓
            Redis Pub/Sub
                ↓
Client B ← Server 2 (receives event, forwards to Client B)
```

### Load Balancing

When using multiple instances with load balancer:

```
       ┌─────────────┐
       │   Clients   │
       └──────┬──────┘
              │
       ┌──────▼────────┐
       │ Load Balancer │
       └───┬───────┬───┘
           │       │
     ┌─────▼─┐   ┌─▼─────┐
     │ App 1 │   │ App 2 │
     └───┬───┘   └───┬───┘
         │           │
         └─────┬─────┘
           ┌───▼───┐
           │ Redis │
           └───────┘
```

**Nginx Configuration Example:**

```nginx
upstream websocket {
    ip_hash; # Sticky sessions for WebSocket
    server 10.0.1.1:3000;
    server 10.0.1.2:3000;
}

server {
    listen 443 ssl;
    server_name api.guesslyfe.com;

    location / {
        proxy_pass http://websocket;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

## Examples

### Vue.js Example

```vue
<template>
  <div>
    <div>Status: {{ isConnected ? 'Connected' : 'Disconnected' }}</div>
    <div>Subscribed Rooms: {{ rooms.length }}</div>

    <div v-for="trade in trades" :key="trade.tradeId">
      {{ trade.direction }} {{ trade.shares }} @ {{ trade.price }}
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import { io } from 'socket.io-client';

const isConnected = ref(false);
const rooms = ref([]);
const trades = ref([]);

let socket = null;

onMounted(() => {
  const token = localStorage.getItem('token');

  socket = io('wss://api.guesslyfe.com', {
    auth: { token }
  });

  socket.on('connect', () => {
    isConnected.value = true;

    // Subscribe to market
    socket.emit('subscribe', {
      room: 'market',
      id: 'market123'
    });
  });

  socket.on('disconnect', () => {
    isConnected.value = false;
  });

  socket.on('market:trade', (event) => {
    trades.value.unshift(event.data);
  });
});

onUnmounted(() => {
  if (socket) {
    socket.close();
  }
});
</script>
```

### Python Client Example

```python
import socketio

# Create Socket.IO client
sio = socketio.Client()

@sio.event
def connect():
    print('Connected to WebSocket server')
    # Subscribe to market
    sio.emit('subscribe', {
        'room': 'market',
        'id': 'market123'
    })

@sio.event
def disconnect():
    print('Disconnected from WebSocket server')

@sio.on('market:trade')
def on_market_trade(data):
    print('Trade received:', data)

# Connect with JWT token
sio.connect('wss://api.guesslyfe.com', auth={'token': 'YOUR_JWT_TOKEN'})

# Keep connection alive
sio.wait()
```

## Troubleshooting

### Connection Issues

**Problem**: Cannot connect to WebSocket

**Solutions**:
- Verify WebSocket URL is correct
- Check token is valid (not expired)
- Ensure CORS is configured for your domain
- Check firewall allows WebSocket connections
- Try polling fallback: `transports: ['polling', 'websocket']`

### Authentication Failures

**Problem**: `Authentication failed` error

**Solutions**:
- Verify JWT token is valid
- Check token is passed correctly: `auth: { token: 'YOUR_TOKEN' }`
- Ensure token hasn't expired
- Verify JWT_SECRET matches backend

### Not Receiving Events

**Problem**: Connected but not receiving events

**Solutions**:
- Verify you're subscribed to the correct room
- Check event listener name matches exactly (case-sensitive)
- Ensure server is emitting to the correct room
- Check Redis connection if using multiple instances

### Debugging

```typescript
// Enable Socket.IO debug logs
localStorage.debug = 'socket.io-client:*';

// Check connection state
console.log('Connected:', socket.connected);
console.log('Socket ID:', socket.id);

// Get subscribed rooms
socket.emit('getRooms', (rooms) => {
  console.log('Subscribed rooms:', rooms);
});

// Test ping
socket.emit('ping', (response) => {
  console.log('Pong received:', response);
});
```

## Performance

### Recommended Limits

- Max connections per instance: 10,000
- Max rooms per client: 100
- Heartbeat interval: 25 seconds
- Ping timeout: 60 seconds

### Monitoring

```typescript
// Get WebSocket statistics
import { WebSocketService } from '@/gateways/websocket.service';

@Injectable()
export class MonitoringService {
  constructor(private wsService: WebSocketService) {}

  getWebSocketStats() {
    return {
      connectedClients: this.wsService.getConnectedClientsCount(),
      activeRooms: this.wsService.getActiveRooms(),
      timestamp: new Date(),
    };
  }
}
```

## Security

### Best Practices

1. **Always use HTTPS/WSS** in production
2. **Validate JWT tokens** on every connection
3. **Rate limit connections** per IP
4. **Sanitize event data** before emitting
5. **Use room-based permissions** - only send data user is allowed to see
6. **Rotate JWT secrets** periodically
7. **Monitor for abuse** - unusual connection patterns

---

**Last Updated**: 2025-01-16
**API Version**: 1.0
**Maintained By**: Backend Team
