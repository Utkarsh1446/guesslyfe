# GuessLyfe Backend - Complete Documentation

## Table of Contents
1. [System Overview](#system-overview)
2. [Environment Configuration](#environment-configuration)
3. [API Endpoints](#api-endpoints)
4. [Scheduled Jobs](#scheduled-jobs)
5. [Bull Queue System](#bull-queue-system)
6. [Database Schema](#database-schema)
7. [Admin Panel Features](#admin-panel-features)
8. [Application Features](#application-features)
9. [Setup & Deployment](#setup--deployment)
10. [Testing](#testing)

---

## System Overview

GuessLyfe is a prediction market platform built on Base blockchain with the following architecture:

### Technology Stack
- **Framework**: NestJS (Node.js)
- **Database**: PostgreSQL with TypeORM
- **Queue System**: Bull (Redis-based)
- **Blockchain**: Base (Sepolia testnet)
- **Notifications**: SendGrid (email), Firebase (push), WebSocket (in-app)
- **Job Scheduling**: @nestjs/schedule (cron jobs)
- **Authentication**: JWT with Twitter OAuth

### Core Modules
1. **Auth** - Authentication and authorization
2. **Users** - User management
3. **Creators** - Creator profiles and management
4. **Markets** - Opinion market creation and trading
5. **Shares** - Creator share trading
6. **Dividends** - Dividend distribution and claims
7. **Twitter** - Twitter integration and verification
8. **Contracts** - Blockchain smart contract integration
9. **Jobs** - Background job processing and scheduled tasks

---

## Environment Configuration

### Required Environment Variables

Create a `.env` file in the `backend/` directory with the following variables:

#### Application Settings
```env
NODE_ENV=development
PORT=3000
API_PREFIX=api/v1
FRONTEND_URL=http://localhost:3001
```

#### Database (PostgreSQL)
```env
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=your-secure-password
DB_DATABASE=guessly
DB_SYNCHRONIZE=false
DB_LOGGING=true
```

#### Redis
```env
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0
```

#### JWT Authentication
```env
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRATION=7d
JWT_REFRESH_SECRET=your-super-secret-refresh-key-change-this-in-production
JWT_REFRESH_EXPIRATION=30d
```

#### Blockchain (Base Sepolia)
```env
BLOCKCHAIN_NETWORK=baseSepolia
BLOCKCHAIN_RPC_URL=https://sepolia.base.org
BLOCKCHAIN_CHAIN_ID=84532
BLOCKCHAIN_PROVIDER_PRIVATE_KEY=your-private-key-for-contract-interactions
```

#### Smart Contract Addresses
```env
CONTRACT_USDC=0x036CbD53842c5426634e7929541eC2318f3dCF7e
CONTRACT_FEE_COLLECTOR=0x9E0e83E0569d42a3A0420F68fe4D967F4C10F423
CONTRACT_CREATOR_SHARE_FACTORY=0xaE86eC369E33A74769Ef7A1609b76E84B417c5Db
CONTRACT_OPINION_MARKET=0x9cC5bBBceb80bE28f9be3F7dd69dC815Ba64099C
```

#### Twitter API (OAuth 2.0)
```env
TWITTER_CLIENT_ID=your-twitter-client-id
TWITTER_CLIENT_SECRET=your-twitter-client-secret
TWITTER_CALLBACK_URL=http://localhost:3000/api/v1/auth/twitter/callback
TWITTER_BEARER_TOKEN=your-twitter-bearer-token
```

#### CORS
```env
CORS_ORIGIN=http://localhost:3001
CORS_CREDENTIALS=true
```

#### Rate Limiting
```env
THROTTLE_TTL=60
THROTTLE_LIMIT=100
```

#### Bull Queue
```env
BULL_REDIS_HOST=localhost
BULL_REDIS_PORT=6379
BULL_REDIS_DB=1
```

#### Admin Dashboard
```env
ADMIN_USERNAME=admin
ADMIN_PASSWORD=change-this-strong-password-in-production
```

#### Notifications (Optional but Recommended)
```env
# SendGrid for email notifications
SENDGRID_API_KEY=your-sendgrid-api-key
SENDGRID_FROM_EMAIL=no-reply@guesslyfe.com

# Firebase Cloud Messaging for push notifications (optional)
FCM_SERVER_KEY=your-fcm-server-key

# Alert webhook for admin notifications
ALERT_WEBHOOK_URL=http://localhost:3000/alerts
```

#### Swagger Documentation
```env
SWAGGER_ENABLED=true
SWAGGER_TITLE=GuessLyfe API
SWAGGER_DESCRIPTION=GuessLyfe Prediction Market Platform API
SWAGGER_VERSION=1.0
```

---

## API Endpoints

### Base URL
```
http://localhost:3000/api/v1
```

### Authentication Endpoints

#### `POST /auth/twitter/login`
Initiate Twitter OAuth login flow
- **Response**: Redirect URL to Twitter authorization

#### `GET /auth/twitter/callback`
Twitter OAuth callback handler
- **Query Params**: `code`, `state`
- **Response**: JWT access and refresh tokens

#### `POST /auth/refresh`
Refresh access token
- **Body**: `{ refreshToken: string }`
- **Response**: New access and refresh tokens

#### `POST /auth/logout`
Logout user (invalidate tokens)
- **Headers**: `Authorization: Bearer {token}`
- **Response**: Success message

#### `GET /auth/profile`
Get current user profile
- **Headers**: `Authorization: Bearer {token}`
- **Response**: User object with creator info

### Users Endpoints

#### `GET /users/me`
Get current user info
- **Headers**: `Authorization: Bearer {token}`
- **Response**: User profile

#### `PATCH /users/me`
Update current user
- **Headers**: `Authorization: Bearer {token}`
- **Body**: User update fields
- **Response**: Updated user

#### `GET /users/:address`
Get user by wallet address
- **Params**: `address` (wallet address)
- **Response**: Public user profile

### Creators Endpoints

#### `GET /creators`
List all creators
- **Query Params**: `status`, `page`, `limit`, `sort`
- **Response**: Paginated list of creators

#### `GET /creators/:id`
Get creator by ID
- **Params**: `id` (creator UUID)
- **Response**: Creator profile with stats

#### `POST /creators`
Apply to become a creator
- **Headers**: `Authorization: Bearer {token}`
- **Body**: `{ twitterHandle: string, bio?: string }`
- **Response**: Creator application

#### `PATCH /creators/:id`
Update creator profile
- **Headers**: `Authorization: Bearer {token}`
- **Params**: `id` (creator UUID)
- **Body**: Creator update fields
- **Response**: Updated creator

#### `GET /creators/:id/markets`
Get all markets for a creator
- **Params**: `id` (creator UUID)
- **Query Params**: `status`, `page`, `limit`
- **Response**: Paginated markets

#### `GET /creators/:id/shares`
Get share information for creator
- **Params**: `id` (creator UUID)
- **Response**: Share price, supply, holders

#### `GET /creators/:id/dividends`
Get dividend history for creator
- **Params**: `id` (creator UUID)
- **Response**: Dividend epochs and distributions

#### `GET /creators/:id/volume`
Get trading volume stats
- **Params**: `id` (creator UUID)
- **Response**: Volume metrics and unlock status

#### `POST /creators/check-eligibility`
Check if Twitter user is eligible to be creator
- **Body**: `{ twitterHandle: string }`
- **Response**: Eligibility status and requirements

### Markets Endpoints

#### `GET /markets`
List all markets
- **Query Params**: `status`, `category`, `creatorId`, `page`, `limit`, `sort`
- **Response**: Paginated list of markets

#### `GET /markets/:id`
Get market by ID
- **Params**: `id` (market UUID)
- **Response**: Market details with current odds

#### `POST /markets`
Create new market
- **Headers**: `Authorization: Bearer {token}`
- **Body**: Market creation data
- **Response**: Created market

#### `GET /markets/:id/positions`
Get user positions in market
- **Headers**: `Authorization: Bearer {token}`
- **Params**: `id` (market UUID)
- **Response**: User's positions and value

#### `GET /markets/:id/trades`
Get trade history for market
- **Params**: `id` (market UUID)
- **Query Params**: `page`, `limit`
- **Response**: Paginated trades

#### `POST /markets/:id/bet`
Place bet on market outcome
- **Headers**: `Authorization: Bearer {token}`
- **Params**: `id` (market UUID)
- **Body**: `{ outcome: number, amount: number }`
- **Response**: Trade confirmation

#### `POST /markets/:id/resolve`
Resolve market (creator only)
- **Headers**: `Authorization: Bearer {token}`
- **Params**: `id` (market UUID)
- **Body**: `{ winningOutcome: number, note?: string }`
- **Response**: Resolution confirmation

#### `GET /markets/:id/price-quote`
Get price quote for bet
- **Params**: `id` (market UUID)
- **Query Params**: `outcome`, `amount`
- **Response**: Price quote and fees

#### `GET /markets/trending`
Get trending markets
- **Query Params**: `limit`
- **Response**: List of trending markets

### Shares Endpoints

#### `GET /shares/creator/:creatorId`
Get share information for creator
- **Params**: `creatorId` (creator UUID)
- **Response**: Share price, supply, market cap

#### `POST /shares/buy`
Buy creator shares
- **Headers**: `Authorization: Bearer {token}`
- **Body**: `{ creatorId: string, amount: number }`
- **Response**: Purchase confirmation

#### `POST /shares/sell`
Sell creator shares
- **Headers**: `Authorization: Bearer {token}`
- **Body**: `{ creatorId: string, amount: number }`
- **Response**: Sale confirmation

#### `GET /shares/price-quote`
Get price quote for share trade
- **Query Params**: `creatorId`, `amount`, `type` (buy/sell)
- **Response**: Price quote

#### `GET /shares/holdings`
Get user's share holdings
- **Headers**: `Authorization: Bearer {token}`
- **Response**: List of share holdings with values

#### `GET /shares/chart/:creatorId`
Get price chart data
- **Params**: `creatorId` (creator UUID)
- **Query Params**: `timeframe` (1h, 24h, 7d, 30d)
- **Response**: OHLC chart data

### Dividends Endpoints

#### `GET /dividends/claimable`
Get claimable dividends for user
- **Headers**: `Authorization: Bearer {token}`
- **Response**: Claimable dividends by creator

#### `POST /dividends/claim`
Claim dividends
- **Headers**: `Authorization: Bearer {token}`
- **Body**: `{ creatorIds: string[] }`
- **Response**: Claim confirmation

#### `GET /dividends/history`
Get dividend claim history
- **Headers**: `Authorization: Bearer {token}`
- **Query Params**: `page`, `limit`
- **Response**: Paginated claim history

#### `GET /dividends/epochs/:creatorId`
Get dividend epochs for creator
- **Params**: `creatorId` (creator UUID)
- **Response**: List of dividend epochs

### Twitter Endpoints

#### `GET /twitter/user/:username`
Get Twitter user info
- **Params**: `username` (Twitter handle)
- **Response**: Twitter user data with engagement

#### `POST /twitter/verify-tweet`
Verify tweet for campaign
- **Headers**: `Authorization: Bearer {token}`
- **Body**: `{ tweetUrl: string, campaignId: string }`
- **Response**: Verification result

#### `GET /twitter/metrics/:userId`
Get Twitter engagement metrics
- **Params**: `userId` (Twitter user ID)
- **Response**: Engagement rate and stats

### Health Check Endpoint

#### `GET /health`
Health check endpoint
- **Response**: API health status

---

## Scheduled Jobs

All scheduled jobs run automatically via NestJS Schedule. They can also be triggered manually for testing.

### 1. Daily Epoch Finalization
- **Schedule**: `0 0 * * *` (Midnight UTC daily)
- **Function**: `finalizeDailyEpochs()`
- **Purpose**: Finalize dividend epochs and distribute fees
- **Process**:
  1. Get all creators with active shares
  2. Calculate fees (2.5% share trading, 0.15% market trading)
  3. Finalize current epoch, create next epoch
  4. Queue dividend calculation jobs
  5. Send notifications to shareholders
- **Timeout**: 10 minutes
- **Alerts**: Warning if >5 min, critical if fails
- **Manual Trigger**: `triggerManualFinalization()`

### 2. Hourly Volume Tracking
- **Schedule**: `0 * * * *` (Every hour)
- **Function**: `trackCreatorVolumes()`
- **Purpose**: Track creator volumes and unlock shares at $30k threshold
- **Process**:
  1. Get all creators where `sharesUnlocked = false`
  2. Calculate total volume from all markets
  3. Update `creator.totalMarketVolume`
  4. If volume >= $30,000:
     - Set `sharesUnlocked = true`
     - Set `sharesUnlockedAt = now`
     - Verify on blockchain
     - Send notification to creator
  5. For unlocked creators, queue volume update jobs
- **Timeout**: None (processes all creators)
- **Alerts**: Warning if >2 min
- **Manual Trigger**: `triggerManualVolumeTracking()`

### 3. Twitter Data Update (Every 6 Hours)
- **Schedule**: `0 */6 * * *` (Every 6 hours)
- **Function**: `updateTwitterData()`
- **Purpose**: Sync creator Twitter metrics
- **Process**:
  1. Get all approved creators
  2. For each creator (batch size: 100):
     - Scrape latest follower count
     - Fetch recent tweets (last 30 days)
     - Calculate engagement rate
     - Update `postCount30d`
  3. Check if dropped below 1000 followers:
     - Send webhook alert to admin
     - Flag for review (does not auto-disable)
- **Rate Limiting**: 450 req/15min (1 req per 2 seconds)
- **Batch Processing**: 100 creators per batch, 5s between batches
- **Alerts**: Warning if >15 min
- **Manual Trigger**: `triggerManualTwitterUpdate()`

### 4. Market Status Check (Every 15 Minutes)
- **Schedule**: `*/15 * * * *` (Every 15 minutes)
- **Function**: `checkMarketStatuses()`
- **Purpose**: Monitor markets and send notifications
- **Process**:
  1. **Markets Ending Soon** (within 1 hour):
     - Send email to all participants
     - Send webhook to admin for resolution prep
  2. **Overdue Markets** (past end time but not resolved):
     - Regular alert: <60 min overdue
     - URGENT alert: >60 min overdue (priority 0)
  3. **Suspicious Activity**:
     - Volume spike: >5x average in 15 min
     - Unusual patterns: >20 small trades (<$10 avg)
  4. **Market Statistics**: Queue update jobs for probabilities
- **Alerts**: Warning if >5 min
- **Manual Trigger**: `triggerManualMarketCheck()`

### Job Monitoring

All scheduled jobs include:
- **Execution time tracking**
- **Error logging with stack traces**
- **Summary reports** (counts, success/fail)
- **Alert notifications** via webhook
- **Manual triggers** for testing

---

## Bull Queue System

### Queue Overview

6 Bull queues handle asynchronous background processing:

| Queue | Concurrency | Rate Limit | Retries | Purpose |
|-------|------------|------------|---------|---------|
| `epoch-finalizer` | 2 | 10/min | 3 | Epoch finalization |
| `dividend-calculator` | 3 | 20/min | 3 | Dividend calculations |
| `twitter-scraper` | 5 | 100/min | 5 | Twitter data scraping |
| `volume-tracker` | 10 | 200/min | 3 | Volume tracking |
| `market-checker` | 5 | 50/min | 3 | Market monitoring |
| `notification` | 20 | 500/min | 5 | Notifications |

### Job Retention
- **Completed jobs**: 7 days
- **Failed jobs**: 30 days

### Retry Strategy
- **Type**: Exponential backoff
- **Base delay**: 2 seconds
- **Max attempts**: 3-5 (depends on queue)

### Queue Processors

#### 1. Epoch Finalizer Processor
**Jobs**:
- `FINALIZE_EPOCH`: Finalize dividend epoch
- `CHECK_PENDING_EPOCHS`: Check for pending epochs

#### 2. Dividend Calculator Processor
**Jobs**:
- `CALCULATE_DIVIDENDS`: Calculate dividends for shareholders
- `DISTRIBUTE_EPOCH`: Distribute epoch dividends

**Key Logic**:
```typescript
// Pro-rata dividend calculation
const shareholderPercentage = (sharesHeld / totalShares) * 100
const dividendAmount = (epochFees * shareholderPercentage) / 100
```

#### 3. Twitter Scraper Processor
**Jobs**:
- `SCRAPE_USER`: Scrape Twitter user data
- `UPDATE_CREATOR_METRICS`: Update creator metrics
- `VERIFY_TWEET`: Verify tweet for campaigns

#### 4. Volume Tracker Processor
**Jobs**:
- `TRACK_MARKET_VOLUME`: Track market volume
- `UPDATE_CREATOR_VOLUME`: Update creator volume on-chain
- `SYNC_BLOCKCHAIN_DATA`: Sync blockchain data

#### 5. Market Checker Processor
**Jobs**:
- `CHECK_EXPIRED_MARKETS`: Check for expired markets
- `RESOLVE_MARKET`: Auto-resolve markets
- `UPDATE_MARKET_DATA`: Update market statistics

#### 6. Notification Processor
**Jobs**:
- `SEND_EMAIL`: Send email via SendGrid
- `SEND_PUSH`: Send push via FCM
- `SEND_WEBHOOK`: Send webhook POST

**Notification Types**:
1. `MARKET_RESOLVED`: Market outcome announced
2. `DIVIDENDS_AVAILABLE`: Dividends ready to claim
3. `SHARES_UNLOCKED`: Shares unlocked at $30k
4. `CREATOR_APPROVED`: Creator application approved
5. `NEW_FOLLOWER`: New follower notification
6. `PRICE_ALERT`: Price movement alert
7. `MARKET_ENDING_SOON`: Market ending in 1 hour
8. `MARKET_OVERDUE`: Market resolution overdue
9. `SUSPICIOUS_ACTIVITY`: Unusual trading detected
10. `SYSTEM_ALERT`: System notifications

**Email Templates**: HTML emails with GuessLyfe branding for each type

**User Preferences**:
- Quiet hours: 22:00 - 08:00 UTC (non-critical skipped)
- Critical notifications always sent

### Bull Board Admin Dashboard

**URL**: `http://localhost:3000/admin/queues`

**Authentication**: Basic Auth
- Username: From `ADMIN_USERNAME` env var
- Password: From `ADMIN_PASSWORD` env var

**Features**:
- View all queues and job counts
- Monitor active, completed, failed jobs
- Retry failed jobs
- View job details and logs
- Real-time updates

---

## Database Schema

### Core Entities

#### User
```typescript
- id: UUID (PK)
- walletAddress: string (unique)
- twitterId: string (unique)
- username: string
- profilePictureUrl: string
- isCreator: boolean
- createdAt: timestamp
- updatedAt: timestamp
```

#### Creator
```typescript
- id: UUID (PK)
- userId: UUID (FK -> User)
- twitterId: string (unique)
- twitterHandle: string
- creatorAddress: string (wallet)
- followerCount: number
- engagementRate: decimal
- postCount30d: number
- totalMarketVolume: decimal
- sharesUnlocked: boolean
- sharesUnlockedAt: timestamp
- shareContractAddress: string
- totalShares: number
- status: enum (PENDING, APPROVED, REJECTED)
- createdAt: timestamp
- updatedAt: timestamp
```

#### OpinionMarket
```typescript
- id: UUID (PK)
- creatorId: UUID (FK -> Creator)
- marketId: bigint (on-chain ID)
- title: string
- question: string
- description: text
- category: enum
- outcomes: jsonb
- duration: number (minutes)
- endTime: timestamp
- status: enum (ACTIVE, RESOLVED, DISPUTED, CANCELLED)
- volume: decimal
- totalTrades: number
- resolutionTime: timestamp
- winningOutcome: number
- createdAt: timestamp
- updatedAt: timestamp
```

#### MarketPosition
```typescript
- id: UUID (PK)
- marketId: UUID (FK -> OpinionMarket)
- userAddress: string
- outcome: number
- shares: decimal
- averagePrice: decimal
- totalInvested: decimal
- realized: boolean
- createdAt: timestamp
- updatedAt: timestamp
```

#### MarketTrade
```typescript
- id: UUID (PK)
- marketId: UUID (FK -> OpinionMarket)
- userAddress: string
- outcome: number
- amount: decimal
- shares: decimal
- price: decimal
- type: enum (BUY, SELL)
- transactionHash: string
- createdAt: timestamp
```

#### CreatorShare
```typescript
- id: UUID (PK)
- creatorId: UUID (FK -> Creator)
- holderAddress: string
- shares: decimal
- averagePrice: decimal
- totalInvested: decimal
- createdAt: timestamp
- updatedAt: timestamp
```

#### ShareTransaction
```typescript
- id: UUID (PK)
- creatorId: UUID (FK -> Creator)
- buyer: string (wallet)
- seller: string (wallet)
- shares: decimal
- price: decimal
- totalAmount: decimal
- type: enum (BUY, SELL)
- transactionHash: string
- createdAt: timestamp
```

#### DividendEpoch
```typescript
- id: UUID (PK)
- creatorId: UUID (FK -> Creator)
- epochNumber: number
- startTime: timestamp
- endTime: timestamp
- shareFeesCollected: decimal
- marketFeesCollected: decimal
- totalFees: decimal
- distributed: boolean
- createdAt: timestamp
- updatedAt: timestamp
```

#### ClaimableDividend
```typescript
- id: UUID (PK)
- dividendEpochId: UUID (FK -> DividendEpoch)
- creatorId: UUID (FK -> Creator)
- userAddress: string
- amount: decimal
- claimableAmount: decimal
- sharesHeld: decimal
- epochsIncluded: jsonb
- claimable: boolean
- isClaimed: boolean
- claimedAt: timestamp
- transactionHash: string
- createdAt: timestamp
- updatedAt: timestamp
```

#### Notification
```typescript
- id: UUID (PK)
- userAddress: string
- type: enum (10 types)
- title: string
- message: text
- data: jsonb
- read: boolean
- readAt: timestamp
- actionUrl: string
- createdAt: timestamp
- updatedAt: timestamp
```

### Indexes

**Performance-critical indexes**:
- `creator.twitterHandle`, `creator.totalMarketVolume`, `creator.sharesUnlocked`
- `opinion_market.creatorId`, `opinion_market.endTime`, `opinion_market.status`
- `market_position.marketId`, `market_position.userAddress`
- `market_trade.marketId`, `market_trade.createdAt`
- `dividend_epoch.creatorId`, `dividend_epoch.distributed`
- `claimable_dividend.userAddress`, `claimable_dividend.isClaimed`
- `notification.userAddress`, `notification.read`, `notification.createdAt`
- Composite: `notification (userAddress, read)`

### Migrations

Run migrations:
```bash
npm run migration:run
```

Revert last migration:
```bash
npm run migration:revert
```

Generate migration:
```bash
npm run migration:generate -- -n MigrationName
```

---

## Admin Panel Features

### Bull Board Dashboard (`/admin/queues`)

**Access**:
- URL: `http://localhost:3000/admin/queues`
- Auth: Basic Auth (ADMIN_USERNAME / ADMIN_PASSWORD)

**Queue Monitoring**:
1. **Real-time Statistics**:
   - Active jobs count
   - Completed jobs (last 7 days)
   - Failed jobs (last 30 days)
   - Waiting jobs count

2. **Job Management**:
   - View job details and payloads
   - Retry failed jobs individually or in bulk
   - Clean completed jobs
   - View job logs and error stack traces

3. **Queue Controls**:
   - Pause/resume queues
   - Empty queues
   - View rate limiting status

4. **Performance Metrics**:
   - Job processing times
   - Success/failure rates
   - Queue throughput

**Admin Notifications**:

All critical events send webhooks to `ALERT_WEBHOOK_URL`:
- Creator dropped below 1000 followers
- Market overdue >60 minutes (URGENT)
- Suspicious trading activity detected
- Volume spike detected
- Scheduled job failures
- Blockchain sync issues

### Swagger API Documentation (`/api`)

**Access**:
- URL: `http://localhost:3000/api`
- Enabled when `SWAGGER_ENABLED=true`

**Features**:
- Interactive API explorer
- Request/response schemas
- Authentication testing
- Try it out functionality

---

## Application Features

### User Features

1. **Authentication**:
   - Twitter OAuth login
   - JWT-based sessions
   - Token refresh mechanism
   - Wallet connection (MetaMask, etc.)

2. **Profile Management**:
   - View/edit profile
   - Upload profile picture
   - Set notification preferences
   - View activity history

3. **Market Trading**:
   - Browse markets by category, creator, status
   - View market details and current odds
   - Place bets on outcomes
   - Get price quotes before trading
   - View trading history
   - Track positions and P&L
   - Receive notifications when markets resolve

4. **Creator Shares**:
   - Browse creator profiles
   - Buy/sell creator shares
   - View share price charts (1h, 24h, 7d, 30d)
   - Track share holdings and value
   - Receive dividends from trading fees

5. **Dividends**:
   - View claimable dividends by creator
   - Claim dividends (on-chain transaction)
   - View claim history
   - Track dividend epochs

6. **Notifications**:
   - In-app notifications (unread badge)
   - Email notifications (SendGrid)
   - Push notifications (Firebase - optional)
   - Notification preferences
   - Mark as read/unread

### Creator Features

1. **Creator Application**:
   - Apply with Twitter account
   - Eligibility check (1000+ followers)
   - Automatic approval workflow
   - Notification on approval

2. **Market Creation**:
   - Create prediction markets
   - Set duration, category, outcomes
   - Add description and context
   - Set initial liquidity (optional)

3. **Market Management**:
   - View all created markets
   - Resolve markets with winning outcome
   - Add resolution notes
   - Track market volume and trades

4. **Share Unlocking**:
   - Automatic unlock at $30,000 volume
   - Volume tracking dashboard
   - Progress towards unlock
   - Notification on unlock

5. **Dividends**:
   - Automatic epoch finalization (daily)
   - Fee collection:
     - 2.5% from share trading
     - 0.15% from market trading
   - Distribution to shareholders
   - Dividend history

6. **Analytics**:
   - Total market volume
   - Market performance
   - Share price history
   - Shareholder list
   - Engagement metrics

### Trading Features

1. **Market Trading**:
   - Dynamic pricing (bonding curve)
   - Instant liquidity
   - Real-time odds updates
   - Slippage protection
   - Gas estimation

2. **Share Trading**:
   - Bonding curve pricing
   - Buy/sell at market price
   - Price impact calculation
   - Transaction history

3. **Price Discovery**:
   - Get quote before trade
   - View price charts
   - Track historical prices
   - Volume-weighted averages

### Notification Features

1. **Email Notifications**:
   - Market resolved (with winnings)
   - Dividends available
   - Shares unlocked
   - Creator approved
   - Market ending soon
   - Suspicious activity alerts

2. **Push Notifications** (optional):
   - Price alerts
   - Market ending soon
   - Trade confirmations
   - Dividend claims

3. **In-App Notifications**:
   - All notification types
   - Unread badge
   - Action links (deep linking)
   - Mark as read

4. **Quiet Hours**:
   - 22:00 - 08:00 UTC
   - Non-critical notifications skipped
   - Critical always sent

---

## Setup & Deployment

### Prerequisites

- Node.js 18+ (v22.21.1 recommended)
- PostgreSQL 14+
- Redis 6+
- Yarn or npm

### Installation

1. **Clone Repository**:
```bash
git clone <repository-url>
cd guesslyfe/backend
```

2. **Install Dependencies**:
```bash
npm install
```

3. **Configure Environment**:
```bash
cp .env.example .env
# Edit .env with your configuration
```

4. **Setup Database**:
```bash
# Create database
createdb guessly

# Run migrations
npm run migration:run
```

5. **Start Redis**:
```bash
redis-server
```

6. **Build Application**:
```bash
npm run build
```

7. **Start Application**:
```bash
# Development
npm run start:dev

# Production
npm run start:prod
```

### Database Migrations

**Initial Setup**:
```bash
npm run migration:run
```

**Migrations included**:
1. `InitialSchema` - Core tables and relationships
2. `AddMissingOpinionMarketColumns` - Market columns
3. `CreateNotificationsTable` - Notification system

### Background Jobs

**Start Bull queues** (automatic with app start):
- All 6 queues start automatically
- Processors load on startup
- Scheduled jobs begin running

**Verify queues are running**:
- Visit `/admin/queues`
- Check for queue counts

### Testing

**Run tests**:
```bash
# Unit tests
npm run test

# E2E tests
npm run test:e2e

# Test coverage
npm run test:cov
```

**Build test**:
```bash
npm run build
```

### Production Deployment

1. **Environment Variables**:
   - Set all production values
   - Use strong passwords
   - Configure SendGrid API key
   - Set blockchain provider private key
   - Configure alert webhook URL

2. **Database**:
   - Use managed PostgreSQL (AWS RDS, etc.)
   - Enable connection pooling
   - Set `DB_SYNCHRONIZE=false`
   - Run migrations before deploy

3. **Redis**:
   - Use managed Redis (AWS ElastiCache, etc.)
   - Enable persistence
   - Set password

4. **Security**:
   - Enable HTTPS
   - Set secure CORS origins
   - Use environment secrets manager
   - Enable rate limiting
   - Set strong JWT secrets

5. **Monitoring**:
   - Enable application logging
   - Set up error tracking (Sentry, etc.)
   - Monitor queue health
   - Set up alerts for failures

6. **Scaling**:
   - Horizontal scaling for API servers
   - Separate Bull workers if needed
   - Database read replicas
   - Redis clustering

### Docker Deployment (Optional)

**Dockerfile** is included in the project.

Build and run:
```bash
docker build -t guesslyfe-backend .
docker run -p 3000:3000 guesslyfe-backend
```

---

## Testing

### Build Verification
```bash
npm run build
```
Expected: Clean build with 0 TypeScript errors ✅

### API Testing

Use Swagger UI at `/api` or curl:

```bash
# Health check
curl http://localhost:3000/api/v1/health

# Get markets
curl http://localhost:3000/api/v1/markets

# Get creator
curl http://localhost:3000/api/v1/creators/{id}
```

### Queue Testing

**Manual job triggers** (for testing):

```typescript
// In scheduled-tasks.service.ts
await scheduledTasksService.triggerManualFinalization()
await scheduledTasksService.triggerManualVolumeTracking()
await scheduledTasksService.triggerManualTwitterUpdate()
await scheduledTasksService.triggerManualMarketCheck()
```

**Bull Board**:
- Visit `/admin/queues`
- Add test jobs
- Monitor processing

### Notification Testing

**Queue a test notification**:
```typescript
await notificationQueue.add('SEND_EMAIL', {
  recipient: 'test@example.com',
  subject: 'Test Email',
  body: 'This is a test',
  data: { type: 'SYSTEM_ALERT' }
})
```

---

## Summary

### What's Implemented ✅

1. **4 Scheduled Jobs**:
   - Daily epoch finalization (midnight UTC)
   - Hourly volume tracking
   - 6-hour Twitter data sync
   - 15-minute market monitoring

2. **6 Bull Queues**:
   - Epoch finalizer
   - Dividend calculator
   - Twitter scraper
   - Volume tracker
   - Market checker
   - Notification processor

3. **Notification System**:
   - Email (SendGrid)
   - Push (Firebase)
   - In-app (database + WebSocket ready)
   - Webhooks (admin alerts)
   - 10 notification types
   - HTML email templates
   - User preferences
   - Quiet hours

4. **Database**:
   - Complete schema with indexes
   - 3 migrations
   - Notification entity

5. **Admin Panel**:
   - Bull Board dashboard
   - Swagger API docs
   - Basic Auth protection

6. **Features**:
   - Complete REST API
   - Blockchain integration
   - Twitter OAuth
   - JWT authentication
   - Rate limiting
   - Error handling
   - Logging

### Next Steps 🚀

1. **User Preferences Table**: Store notification settings
2. **WebSocket Gateway**: Real-time in-app notifications
3. **Notification API**: Read/unread endpoints
4. **Admin Dashboard**: Custom admin UI
5. **Analytics**: Dashboard and reporting
6. **Mobile App**: React Native with push notifications

---

**Build Status**: ✅ 0 TypeScript errors
**Documentation**: ✅ Complete
**Ready for**: Development, Testing, Production Deployment
