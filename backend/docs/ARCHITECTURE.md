# System Architecture

Comprehensive architecture documentation for the GuessLyfe prediction market platform.

## Table of Contents

- [Overview](#overview)
- [High-Level Architecture](#high-level-architecture)
- [Technology Stack](#technology-stack)
- [System Components](#system-components)
- [Data Flow](#data-flow)
- [API Architecture](#api-architecture)
- [Database Architecture](#database-architecture)
- [Blockchain Integration](#blockchain-integration)
- [Real-Time Communication](#real-time-communication)
- [Caching Strategy](#caching-strategy)
- [Background Jobs](#background-jobs)
- [Security Architecture](#security-architecture)
- [Scalability](#scalability)
- [Monitoring and Observability](#monitoring-and-observability)
- [Disaster Recovery](#disaster-recovery)

---

## Overview

GuessLyfe is a prediction market platform built on blockchain technology, allowing users to create and trade on opinion markets. The platform combines traditional web2 infrastructure with web3 blockchain integration.

### Key Features

- **Opinion Markets**: Create and trade on prediction markets
- **Creator Shares**: Trade shares of content creators
- **Dividend Distribution**: Automated dividend calculations and distributions
- **Real-Time Updates**: WebSocket-based live updates
- **Admin Panel**: Comprehensive platform management
- **Multi-Chain Support**: Ethereum-compatible chains (Base, Ethereum)

### Architecture Principles

1. **Modularity**: Loosely coupled, highly cohesive modules
2. **Scalability**: Horizontal scaling for all components
3. **Resilience**: Fault-tolerant with graceful degradation
4. **Security**: Defense in depth, least privilege
5. **Observability**: Comprehensive logging, metrics, and tracing
6. **Performance**: Sub-second response times, efficient caching

---

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                              Client Layer                                │
│                                                                          │
│   ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                │
│   │   Web App    │  │  Mobile App  │  │  Admin Panel │                │
│   │  (React)     │  │ (React Native│  │   (React)    │                │
│   └──────────────┘  └──────────────┘  └──────────────┘                │
└─────────────────────────┬──────────────────────┬───────────────────────┘
                          │                      │
                          │ HTTPS/WSS            │ HTTPS
                          ▼                      ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         Load Balancer (HTTPS/SSL)                       │
│                          Cloud Load Balancer                            │
└─────────────────────────┬──────────────────────────────────────────────┘
                          │
                          │
┌─────────────────────────┴───────────────────────────────────────────────┐
│                        Application Layer (Cloud Run)                     │
│                                                                          │
│   ┌─────────────────────────────────────────────────────────────┐      │
│   │                    NestJS Application                        │      │
│   │                                                              │      │
│   │  ┌──────────┐  ┌───────────┐  ┌──────────┐  ┌──────────┐  │      │
│   │  │   API    │  │ WebSocket │  │Background│  │  Admin   │  │      │
│   │  │  Layer   │  │  Gateway  │  │   Jobs   │  │   API    │  │      │
│   │  └──────────┘  └───────────┘  └──────────┘  └──────────┘  │      │
│   │                                                              │      │
│   │  ┌──────────────────────────────────────────────────────┐  │      │
│   │  │              Business Logic Layer                     │  │      │
│   │  │  (Services, Guards, Interceptors, Pipes)             │  │      │
│   │  └──────────────────────────────────────────────────────┘  │      │
│   │                                                              │      │
│   │  ┌──────────────────────────────────────────────────────┐  │      │
│   │  │                Data Access Layer                      │  │      │
│   │  │  (Repositories, TypeORM, Cache Manager)              │  │      │
│   │  └──────────────────────────────────────────────────────┘  │      │
│   └─────────────────────────────────────────────────────────────┘      │
└─────────────────┬────────────────┬────────────────┬────────────────────┘
                  │                │                │
                  ▼                ▼                ▼
    ┌──────────────────┐  ┌──────────────┐  ┌─────────────┐
    │   Cloud SQL      │  │ Memorystore  │  │   Secret    │
    │  (PostgreSQL)    │  │   (Redis)    │  │  Manager    │
    └──────────────────┘  └──────────────┘  └─────────────┘
                  │
                  │
                  ▼
    ┌──────────────────────────────────────────────────────┐
    │            Blockchain Layer                          │
    │                                                      │
    │  ┌──────────────┐  ┌──────────────┐                │
    │  │ Opinion      │  │   Creator    │                │
    │  │ Market       │  │   Shares     │                │
    │  │ Contract     │  │  Contract    │                │
    │  └──────────────┘  └──────────────┘                │
    │                                                      │
    │         Base Chain (Ethereum L2)                    │
    └──────────────────────────────────────────────────────┘
```

---

## Technology Stack

### Backend

- **Runtime**: Node.js 18 LTS
- **Framework**: NestJS 10.x (TypeScript)
- **API**: RESTful HTTP, WebSocket (Socket.IO)
- **Validation**: class-validator, class-transformer
- **Documentation**: Swagger/OpenAPI

### Database

- **Primary Database**: PostgreSQL 15
- **ORM**: TypeORM 0.3.x
- **Migrations**: TypeORM CLI
- **Cache**: Redis 7.x
- **Cache Library**: cache-manager with redis-store

### Blockchain

- **Networks**: Base (Mainnet/Sepolia), Ethereum
- **Library**: ethers.js v6
- **Smart Contracts**: Solidity 0.8.x
- **Development**: Hardhat

### Infrastructure

- **Cloud Provider**: Google Cloud Platform (GCP)
- **Compute**: Cloud Run (serverless containers)
- **Database**: Cloud SQL (managed PostgreSQL)
- **Cache**: Memorystore (managed Redis)
- **Load Balancer**: Cloud Load Balancing
- **CDN**: Cloud CDN
- **Monitoring**: Cloud Monitoring, Cloud Logging
- **Secrets**: Secret Manager

### DevOps

- **Containerization**: Docker
- **CI/CD**: GitHub Actions
- **Version Control**: Git, GitHub
- **Testing**: Jest, Supertest
- **Linting**: ESLint, Prettier

---

## System Components

### 1. API Layer

**Responsibility**: Handle HTTP requests, validate input, return responses

**Components**:
- Controllers (route handlers)
- DTOs (Data Transfer Objects)
- Swagger decorators
- Request validation pipes

**Example**:
```typescript
@Controller('markets')
@ApiTags('Markets')
export class MarketController {
  constructor(private readonly marketService: MarketService) {}

  @Post()
  @ApiOperation({ summary: 'Create market' })
  create(@Body() dto: CreateMarketDto) {
    return this.marketService.create(dto);
  }
}
```

### 2. Business Logic Layer

**Responsibility**: Implement business rules, orchestrate operations

**Components**:
- Services (business logic)
- Guards (authentication, authorization)
- Interceptors (cross-cutting concerns)
- Pipes (transformation, validation)

**Example**:
```typescript
@Injectable()
export class MarketService {
  constructor(
    private readonly marketRepo: Repository<OpinionMarket>,
    private readonly blockchainService: BlockchainService,
    private readonly cacheService: CacheService,
  ) {}

  async create(dto: CreateMarketDto): Promise<OpinionMarket> {
    // Create in database
    const market = await this.marketRepo.save(dto);

    // Deploy on blockchain
    await this.blockchainService.deployMarket(market.id);

    // Invalidate cache
    await this.cacheService.del('markets:list');

    return market;
  }
}
```

### 3. Data Access Layer

**Responsibility**: Interact with databases, manage data persistence

**Components**:
- Entities (database models)
- Repositories (data access)
- TypeORM configuration
- Database migrations

**Example**:
```typescript
@Entity('opinion_markets')
export class OpinionMarket {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  question: string;

  @Column()
  creatorId: string;

  @ManyToOne(() => User, (user) => user.markets)
  creator: User;

  @OneToMany(() => Trade, (trade) => trade.market)
  trades: Trade[];
}
```

### 4. WebSocket Gateway

**Responsibility**: Real-time bidirectional communication

**Components**:
- Events Gateway (Socket.IO)
- WebSocket Service
- Room management
- Redis adapter (for scaling)

**Example**:
```typescript
@WebSocketGateway()
export class EventsGateway {
  @WebSocketServer()
  server: Server;

  emitMarketUpdate(marketId: string, data: any) {
    this.server.to(`market:${marketId}`).emit('market:update', data);
  }
}
```

### 5. Background Jobs

**Responsibility**: Asynchronous task processing

**Components**:
- BullMQ (queue)
- Job processors
- Scheduled tasks (cron)

**Jobs**:
- Market resolution
- Dividend calculation
- Notification sending
- Cache warming
- Data aggregation

### 6. Blockchain Integration

**Responsibility**: Interact with smart contracts

**Components**:
- Blockchain Service
- Contract ABIs
- Ethers.js providers
- Transaction management

**Example**:
```typescript
@Injectable()
export class BlockchainService {
  private contract: Contract;

  async executeTrade(marketId: string, outcome: number, amount: string) {
    const tx = await this.contract.trade(marketId, outcome, amount);
    const receipt = await tx.wait();
    return receipt;
  }
}
```

---

## Data Flow

### Market Creation Flow

```
┌──────────┐      ┌─────────────┐      ┌──────────────┐      ┌────────────┐
│  Client  │─────▶│ API Gateway │─────▶│   Service    │─────▶│  Database  │
└──────────┘      └─────────────┘      └──────────────┘      └────────────┘
      │                                        │
      │                                        ▼
      │                                ┌──────────────┐
      │                                │  Blockchain  │
      │                                │   Service    │
      │                                └──────────────┘
      │                                        │
      │                                        ▼
      │                                ┌──────────────┐
      │                                │Smart Contract│
      │                                └──────────────┘
      │                                        │
      ▼                                        ▼
┌──────────┐      ┌─────────────┐      ┌──────────────┐
│WebSocket │◀─────│  WS Service │◀─────│  Event Bus   │
└──────────┘      └─────────────┘      └──────────────┘

Flow Steps:
1. Client sends POST /markets request
2. API Gateway validates JWT
3. Controller validates DTO
4. Service creates database record
5. Service calls blockchain service
6. Blockchain service deploys market contract
7. Service publishes event
8. WebSocket broadcasts to subscribers
```

### Trade Execution Flow

```
┌──────────┐      ┌─────────────┐      ┌──────────────┐
│  Client  │─────▶│ API Gateway │─────▶│Trade Service │
└──────────┘      └─────────────┘      └──────────────┘
                                               │
                                               ▼
                                        ┌──────────────┐
                                        │  Blockchain  │
                                        │   Service    │
                                        └──────────────┘
                                               │
                                               ▼
                                        ┌──────────────┐
                                        │Smart Contract│
                                        │  trade()     │
                                        └──────────────┘
                                               │
                                               ▼
                                        ┌──────────────┐
                                        │   Database   │
                                        │  Save Trade  │
                                        └──────────────┘
                                               │
                                               ▼
                                        ┌──────────────┐
                                        │ Cache Update │
                                        └──────────────┘
                                               │
                                               ▼
                                        ┌──────────────┐
                                        │   WebSocket  │
                                        │  Broadcast   │
                                        └──────────────┘

Flow Steps:
1. Client submits trade request
2. Validate user balance
3. Execute blockchain transaction
4. Wait for confirmation
5. Save trade to database
6. Update cached market data
7. Broadcast trade event via WebSocket
```

---

## API Architecture

### RESTful API Design

**Base URL**: `https://api.guesslyfe.com`

**Endpoints Structure**:
```
/auth/*           - Authentication
/users/*          - User management
/markets/*        - Opinion markets
/trades/*         - Trading
/positions/*      - User positions
/creators/*       - Creator management
/dividends/*      - Dividend operations
/notifications/*  - Notifications
/admin/*          - Admin operations
```

### API Versioning

Currently v1 (implicit). Future versions will use URL versioning:
```
/v1/markets
/v2/markets
```

### Request/Response Format

**Request**:
```json
POST /markets
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "question": "Will BTC reach $100k?",
  "category": "crypto",
  "endDate": "2024-12-31T23:59:59Z"
}
```

**Success Response**:
```json
HTTP/1.1 201 Created
Content-Type: application/json

{
  "id": "uuid",
  "question": "Will BTC reach $100k?",
  "category": "crypto",
  "status": "active",
  "yesPrice": "0.50",
  "noPrice": "0.50",
  "createdAt": "2024-01-01T00:00:00Z"
}
```

**Error Response**:
```json
HTTP/1.1 400 Bad Request
Content-Type: application/json

{
  "statusCode": 400,
  "message": "Validation failed",
  "errors": [
    {
      "field": "endDate",
      "message": "End date must be in the future"
    }
  ],
  "timestamp": "2024-01-01T00:00:00Z",
  "path": "/markets"
}
```

### Rate Limiting

- **Global**: 100 requests per 15 minutes per IP
- **Authenticated**: 1000 requests per 15 minutes per user
- **Admin**: Unlimited

### Pagination

```
GET /markets?page=1&limit=20&sort=createdAt:desc&filter=category:crypto
```

Response includes pagination metadata:
```json
{
  "data": [...],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "totalPages": 8,
    "hasNext": true,
    "hasPrevious": false
  }
}
```

---

## Database Architecture

### Database Schema

**Core Tables**:

```sql
-- Users
users (
  id UUID PRIMARY KEY,
  wallet_address VARCHAR(42) UNIQUE NOT NULL,
  username VARCHAR(50),
  email VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
)

-- Opinion Markets
opinion_markets (
  id UUID PRIMARY KEY,
  question VARCHAR(500) NOT NULL,
  category VARCHAR(50) NOT NULL,
  creator_id UUID REFERENCES users(id),
  end_date TIMESTAMP NOT NULL,
  status VARCHAR(20) DEFAULT 'active',
  yes_price DECIMAL(10,6),
  no_price DECIMAL(10,6),
  total_liquidity DECIMAL(20,6),
  contract_address VARCHAR(42),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
)

-- Trades
trades (
  id UUID PRIMARY KEY,
  market_id UUID REFERENCES opinion_markets(id),
  trader_id UUID REFERENCES users(id),
  outcome SMALLINT,  -- 0=NO, 1=YES
  direction VARCHAR(10),  -- 'buy' or 'sell'
  amount DECIMAL(20,6),
  shares DECIMAL(20,6),
  price DECIMAL(10,6),
  tx_hash VARCHAR(66),
  created_at TIMESTAMP DEFAULT NOW()
)

-- Positions
positions (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  market_id UUID REFERENCES opinion_markets(id),
  outcome SMALLINT,
  shares DECIMAL(20,6),
  average_price DECIMAL(10,6),
  updated_at TIMESTAMP DEFAULT NOW()
)

-- Creator Shares
creator_shares (
  id UUID PRIMARY KEY,
  creator_id UUID REFERENCES users(id),
  holder_id UUID REFERENCES users(id),
  shares DECIMAL(20,6),
  locked_until TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
)

-- Dividends
dividends (
  id UUID PRIMARY KEY,
  creator_id UUID REFERENCES users(id),
  period_start TIMESTAMP,
  period_end TIMESTAMP,
  total_amount DECIMAL(20,6),
  distributed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
)

-- Notifications
notifications (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  type VARCHAR(50),
  title VARCHAR(200),
  message TEXT,
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
)
```

### Indexes

```sql
-- Performance indexes
CREATE INDEX idx_markets_category ON opinion_markets(category);
CREATE INDEX idx_markets_status ON opinion_markets(status);
CREATE INDEX idx_markets_creator ON opinion_markets(creator_id);
CREATE INDEX idx_markets_end_date ON opinion_markets(end_date);

CREATE INDEX idx_trades_market ON trades(market_id);
CREATE INDEX idx_trades_trader ON trades(trader_id);
CREATE INDEX idx_trades_created ON trades(created_at DESC);

CREATE INDEX idx_positions_user ON positions(user_id);
CREATE INDEX idx_positions_market ON positions(market_id);

CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_read ON notifications(read);
```

### Database Relationships

```
users (1) ──< (∞) opinion_markets
users (1) ──< (∞) trades
users (1) ──< (∞) positions
users (1) ──< (∞) creator_shares (as creator)
users (1) ──< (∞) creator_shares (as holder)
users (1) ──< (∞) notifications

opinion_markets (1) ──< (∞) trades
opinion_markets (1) ──< (∞) positions
```

---

## Blockchain Integration

### Smart Contracts

**OpinionMarket Contract**:
```solidity
contract OpinionMarket {
    struct Market {
        string question;
        uint256 endTime;
        uint256 totalLiquidity;
        mapping(uint8 => uint256) outcomePrices;
        bool resolved;
        uint8 winningOutcome;
    }

    mapping(bytes32 => Market) public markets;

    function createMarket(string memory question, uint256 endTime) external;
    function trade(bytes32 marketId, uint8 outcome, uint256 amount) external;
    function resolveMarket(bytes32 marketId, uint8 winningOutcome) external;
    function claimWinnings(bytes32 marketId) external;
}
```

**CreatorShares Contract**:
```solidity
contract CreatorShares {
    mapping(address => mapping(address => uint256)) public shares;
    mapping(address => uint256) public lockedUntil;

    function buyShares(address creator, uint256 amount) external;
    function sellShares(address creator, uint256 amount) external;
    function distributeDiv idends(address creator) external;
}
```

### Blockchain Service Architecture

```typescript
@Injectable()
export class BlockchainService {
  private provider: JsonRpcProvider;
  private wallet: Wallet;
  private opinionMarketContract: Contract;
  private creatorSharesContract: Contract;

  async deployMarket(marketId: string, question: string, endTime: number) {
    const tx = await this.opinionMarketContract.createMarket(
      marketId,
      question,
      endTime
    );
    return await tx.wait();
  }

  async executeTrade(marketId: string, outcome: number, amount: string) {
    const tx = await this.opinionMarketContract.trade(
      marketId,
      outcome,
      parseUnits(amount, 6) // USDC has 6 decimals
    );
    return await tx.wait();
  }
}
```

### Event Listening

```typescript
// Listen for blockchain events
this.opinionMarketContract.on('Trade', async (marketId, trader, outcome, amount, event) => {
  // Save to database
  await this.tradeRepository.save({
    marketId,
    trader,
    outcome,
    amount: formatUnits(amount, 6),
    txHash: event.transactionHash,
  });

  // Broadcast via WebSocket
  this.websocketService.emitMarketTrade({
    marketId,
    trader,
    outcome,
    amount: formatUnits(amount, 6),
  });
});
```

---

## Real-Time Communication

### WebSocket Architecture

**Connection Flow**:
```
Client                    Server
  │                         │
  ├─────── Connect ────────▶│
  │      (with JWT)          │
  │                         │
  │◀──── Authenticate ──────┤
  │                         │
  ├──── Subscribe ─────────▶│
  │  {room: "market:123"}   │
  │                         │
  │◀──── Subscribed ────────┤
  │                         │
  │                         │
  │◀──── Event ─────────────┤
  │  {type: "market:trade"} │
  │                         │
```

**Room Structure**:
- `global:all` - Global announcements
- `user:{address}` - User-specific events
- `market:{id}` - Market-specific events
- `creator:{id}` - Creator-specific events

**Event Types**:
- `market:created` - New market
- `market:trade` - Trade executed
- `market:resolved` - Market resolved
- `shares:trade` - Creator shares traded
- `dividend:available` - Dividend ready
- `notification` - User notification
- `system:maintenance` - Maintenance mode

### Scaling WebSockets

Uses Redis adapter for horizontal scaling:

```typescript
// Redis adapter configuration
const redisAdapter = new RedisIoAdapter(app, configService);
await redisAdapter.connectToRedis();
app.useWebSocketAdapter(redisAdapter);
```

Multiple instances share state via Redis Pub/Sub:
```
Instance 1 ─┐
            ├─────▶ Redis Pub/Sub ◀────┬─ Instance 2
Instance 3 ─┘                          └─ Instance 4
```

---

## Caching Strategy

### Cache Layers

**1. Application Cache (Redis)**
- User sessions
- Market data
- Leaderboards
- Frequent queries

**2. HTTP Cache (Cloud CDN)**
- Static assets
- Public API responses (with short TTL)

**3. Database Query Cache**
- TypeORM second-level cache
- Query result caching

### Cache Patterns

**Cache-Aside (Lazy Loading)**:
```typescript
async getMarket(id: string): Promise<Market> {
  // Try cache first
  const cached = await this.cacheService.get(`market:${id}`);
  if (cached) return cached;

  // Fetch from database
  const market = await this.marketRepository.findOne(id);

  // Store in cache
  await this.cacheService.set(`market:${id}`, market, 300); // 5 min TTL

  return market;
}
```

**Write-Through**:
```typescript
async updateMarket(id: string, data: any): Promise<Market> {
  // Update database
  const market = await this.marketRepository.update(id, data);

  // Update cache
  await this.cacheService.set(`market:${id}`, market, 300);

  return market;
}
```

**Cache Invalidation**:
```typescript
async createTrade(marketId: string, data: any): Promise<Trade> {
  const trade = await this.tradeRepository.save(data);

  // Invalidate affected caches
  await this.cacheService.del(`market:${marketId}`);
  await this.cacheService.del(`markets:list`);
  await this.cacheService.del(`user:${data.traderId}:positions`);

  return trade;
}
```

### Cache Keys Convention

```
user:{address}                - User data
user:{address}:positions      - User positions
market:{id}                   - Market data
market:{id}:trades            - Market trades
markets:list                  - Market list
markets:trending              - Trending markets
leaderboard:traders           - Trader leaderboard
session:{token}               - User session
```

---

## Background Jobs

### Job Queue Architecture

Uses BullMQ with Redis:

```typescript
// Queue configuration
@Injectable()
export class QueueService {
  private marketQueue: Queue;
  private dividendQueue: Queue;
  private notificationQueue: Queue;

  async addMarketResolutionJob(marketId: string, resolveAt: Date) {
    await this.marketQueue.add(
      'resolve-market',
      { marketId },
      { delay: resolveAt.getTime() - Date.now() }
    );
  }
}
```

### Scheduled Jobs

**Market Resolution** (every 5 minutes):
```typescript
@Cron('*/5 * * * *')
async resolveExpiredMarkets() {
  const expired = await this.marketRepository.find({
    where: { status: 'active', endDate: LessThan(new Date()) }
  });

  for (const market of expired) {
    await this.queueService.addMarketResolutionJob(market.id);
  }
}
```

**Dividend Calculation** (daily at midnight):
```typescript
@Cron('0 0 * * *')
async calculateDailyDividends() {
  const creators = await this.userRepository.find({
    where: { isCreator: true }
  });

  for (const creator of creators) {
    await this.dividendService.calculate(creator.id);
  }
}
```

**Cache Warming** (every 15 minutes):
```typescript
@Cron('*/15 * * * *')
async warmCache() {
  await this.cacheService.warmMarkets();
  await this.cacheService.warmLeaderboards();
}
```

---

## Security Architecture

### Authentication Flow

```
1. Client generates signature:
   message = "Sign this message to login"
   signature = wallet.signMessage(message)

2. Client sends to /auth/login:
   { address, signature, message }

3. Server verifies signature:
   recoveredAddress = ethers.verifyMessage(message, signature)
   if (recoveredAddress === address) ✓

4. Server generates JWT:
   token = sign({ sub: userId, address }, secret)

5. Client includes in requests:
   Authorization: Bearer <token>
```

### Authorization

**Role-Based Access Control (RBAC)**:
- `user` - Regular user
- `creator` - Verified creator
- `admin` - Platform administrator

**Guards**:
```typescript
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
@Delete('/markets/:id')
deleteMarket(@Param('id') id: string) {
  return this.marketService.delete(id);
}
```

### Security Headers

Configured via Helmet:
```typescript
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
  },
}));
```

### Rate Limiting

```typescript
// Global rate limiting
@Module({
  imports: [
    ThrottlerModule.forRoot({
      ttl: 60,
      limit: 100,
    }),
  ],
})

// Endpoint-specific
@Throttle(5, 60) // 5 requests per minute
@Post('/markets')
createMarket() {}
```

---

## Scalability

### Horizontal Scaling

**Cloud Run Auto-Scaling**:
- Scales 0→N based on traffic
- Each instance handles ~80 concurrent requests
- Min instances: 2 (production)
- Max instances: 20

**Load Distribution**:
```
Request ──▶ Load Balancer
              │
    ┌─────────┼─────────┐
    ▼         ▼         ▼
Instance 1 Instance 2 Instance 3
```

### Database Scaling

**Read Replicas**:
```
Write ──▶ Primary DB
           │
           ├──▶ Replica 1 (reads)
           ├──▶ Replica 2 (reads)
           └──▶ Replica 3 (reads)
```

**Connection Pooling**:
```typescript
{
  type: 'postgres',
  poolSize: 10,
  extra: {
    max: 10,
    min: 2,
    idleTimeoutMillis: 30000,
  },
}
```

### Caching for Scale

- 80%+ cache hit rate for reads
- Redis cluster for cache HA
- CDN for static content

---

## Monitoring and Observability

### Metrics

**Application Metrics**:
- HTTP request rate, latency, errors
- Database query performance
- Cache hit/miss ratio
- WebSocket connections
- Background job processing

**Business Metrics**:
- Markets created
- Trades executed
- Active users
- Revenue

**Infrastructure Metrics**:
- CPU utilization
- Memory usage
- Network I/O
- Disk usage

### Logging

**Structured Logging**:
```typescript
this.logger.log({
  action: 'create_market',
  marketId,
  userId,
  category,
  timestamp: new Date(),
});
```

**Log Levels**:
- `ERROR` - Application errors
- `WARN` - Potential issues
- `INFO` - Important events
- `DEBUG` - Detailed debugging

### Tracing

Cloud Trace for distributed tracing:
- Request flow across services
- Database query traces
- External API calls
- Blockchain transactions

### Alerting

**Alert Conditions**:
- Error rate >1%
- Response time p95 >500ms
- Database CPU >80%
- Redis memory >80%
- Failed jobs >10/hour

---

## Disaster Recovery

### Backup Strategy

**Database Backups**:
- Automated daily backups (retained 30 days)
- Point-in-time recovery (7 days)
- Manual backups before major changes

**Configuration Backups**:
- All configuration in Git
- Secrets in Secret Manager (versioned)

### Recovery Procedures

**Database Failure**:
1. Failover to replica (automatic, ~30 seconds)
2. Promote replica to primary
3. Create new replica

**Service Failure**:
1. Cloud Run auto-restart (seconds)
2. Rollback to previous version (minutes)
3. Scale up instances

**Region Failure**:
1. DNS failover to backup region
2. Restore database from backup
3. Deploy application

**RTO/RPO**:
- Recovery Time Objective: <15 minutes
- Recovery Point Objective: <5 minutes

---

## Future Architecture Considerations

### Microservices Migration

Potential service split:
- `auth-service` - Authentication
- `market-service` - Markets
- `trading-service` - Trading
- `notification-service` - Notifications
- `admin-service` - Admin operations

### Event-Driven Architecture

Replace synchronous calls with events:
- Use Cloud Pub/Sub for events
- Event sourcing for audit trail
- CQRS for read/write separation

### Multi-Region Deployment

- Active-active deployment
- Global load balancing
- Database replication across regions
- Reduced latency for global users

---

## Conclusion

This architecture provides:
- **Scalability**: Handle growth from 100 to 100,000+ users
- **Reliability**: 99.9% uptime with automatic failover
- **Performance**: Sub-second response times
- **Security**: Defense in depth, comprehensive audit trail
- **Observability**: Complete visibility into system behavior

For implementation details, see:
- [DEVELOPMENT.md](./DEVELOPMENT.md) - Development setup
- [DEPLOYMENT.md](./DEPLOYMENT.md) - Production deployment
- [SECURITY.md](./SECURITY.md) - Security details
- [TESTING.md](./TESTING.md) - Testing strategy

---

**Last Updated**: 2024-11-16
**Version**: 1.0.0
