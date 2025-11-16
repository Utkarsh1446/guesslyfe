# Admin API Documentation

Comprehensive guide for GuessLyfe administrative endpoints and operations.

## Table of Contents

- [Overview](#overview)
- [Authentication](#authentication)
- [Setup](#setup)
- [Endpoints](#endpoints)
  - [Market Management](#market-management)
  - [Creator Management](#creator-management)
  - [User Management](#user-management)
  - [System Operations](#system-operations)
  - [Analytics](#analytics)
- [Audit Logging](#audit-logging)
- [Security](#security)
- [Examples](#examples)

## Overview

The Admin API provides privileged endpoints for platform management and operations. All endpoints require wallet-based authentication and are fully audited.

### Features

- **Market Management**: Resolve, dispute, extend, or cancel markets
- **Creator Management**: Approve/reject applications, suspend creators
- **User Management**: Search, ban, refund users
- **System Operations**: Monitor health, trigger jobs, emergency pause
- **Analytics**: Platform metrics, creator stats, revenue tracking
- **Audit Trail**: Complete logging of all admin actions

### Base URL

```
Production: https://api.guesslyfe.com/api/v1/admin
Development: http://localhost:3000/api/v1/admin
```

## Authentication

All admin endpoints require wallet signature authentication using three headers:

### Required Headers

```http
x-admin-address: 0x1234567890123456789012345678901234567890
x-admin-signature: 0xabcdef...
x-admin-timestamp: 1705420800000
```

### Authentication Flow

1. **Generate Timestamp**: Current time in Unix milliseconds
2. **Create Message**: Format: `"GuessLyfe Admin Action: {METHOD} {PATH} at {TIMESTAMP}"`
3. **Sign Message**: Sign with your admin wallet (EIP-191)
4. **Include Headers**: Add all three headers to request

### Message Format

```
GuessLyfe Admin Action: GET /api/v1/admin/markets/pending at 1705420800000
```

### Signature Validity

- Signatures are valid for **5 minutes** from timestamp
- Prevents replay attacks
- Each request requires a fresh signature

### Admin Addresses

Authorized admin addresses are configured in the environment:

```bash
# .env
ADMIN_ADDRESSES=0x1234...,0x5678...,0xabcd...
```

## Setup

### 1. Configure Admin Addresses

Add admin wallet addresses to environment variables:

```bash
# Single admin
ADMIN_ADDRESSES=0x1234567890123456789012345678901234567890

# Multiple admins (comma-separated)
ADMIN_ADDRESSES=0x1234...,0x5678...,0xabcd...
```

### 2. Generate Admin Signature

Using ethers.js:

```typescript
import { ethers } from 'ethers';

const wallet = new ethers.Wallet(ADMIN_PRIVATE_KEY);
const timestamp = Date.now();
const method = 'GET';
const path = '/api/v1/admin/markets/pending';
const message = `GuessLyfe Admin Action: ${method} ${path} at ${timestamp}`;

const signature = await wallet.signMessage(message);

console.log('Address:', wallet.address);
console.log('Signature:', signature);
console.log('Timestamp:', timestamp);
```

### 3. Make Admin Request

```bash
curl -X GET \
  https://api.guesslyfe.com/api/v1/admin/markets/pending \
  -H "x-admin-address: 0x1234..." \
  -H "x-admin-signature: 0xabcdef..." \
  -H "x-admin-timestamp: 1705420800000"
```

## Endpoints

### Market Management

#### 1. Get Pending Markets

Returns markets that have ended but not yet resolved.

```http
GET /admin/markets/pending
```

**Response:**
```json
{
  "markets": [
    {
      "id": "market1",
      "question": "Will BTC reach $100k by end of 2025?",
      "endDate": "2025-01-15T00:00:00Z",
      "creator": "0x1234...",
      "totalVolume": "10000000000000000000",
      "participants": 42
    }
  ],
  "total": 1
}
```

#### 2. Resolve Market

Manually resolve a market with specified outcome.

```http
POST /admin/markets/:id/resolve
```

**Body:**
```json
{
  "outcome": 1,
  "reason": "Event occurred as predicted",
  "evidenceUrl": "https://twitter.com/example/status/123456789"
}
```

**Parameters:**
- `outcome`: 0 for NO, 1 for YES
- `reason`: Optional resolution explanation
- `evidenceUrl`: Optional proof/evidence URL

**Response:**
```json
{
  "success": true,
  "marketId": "market1",
  "outcome": 1,
  "message": "Market resolved successfully"
}
```

#### 3. Dispute Market

Flag a market as disputed for manual review.

```http
POST /admin/markets/:id/dispute
```

**Body:**
```json
{
  "reason": "Ambiguous outcome criteria",
  "suggestedResolution": "Refund all participants"
}
```

**Response:**
```json
{
  "success": true,
  "marketId": "market1",
  "message": "Market marked as disputed"
}
```

#### 4. Extend Market Duration

Extend the end date of an active market.

```http
PUT /admin/markets/:id/extend
```

**Body:**
```json
{
  "hours": 24,
  "reason": "Event postponed"
}
```

**Parameters:**
- `hours`: Additional hours (1-720, max 30 days)
- `reason`: Optional explanation

**Response:**
```json
{
  "success": true,
  "marketId": "market1",
  "newEndDate": "2025-01-16T00:00:00Z",
  "message": "Market extended by 24 hours"
}
```

#### 5. Cancel Market

Cancel a market and optionally refund participants.

```http
DELETE /admin/markets/:id/cancel
```

**Body:**
```json
{
  "reason": "Event cancelled permanently",
  "refundParticipants": true
}
```

**Response:**
```json
{
  "success": true,
  "marketId": "market1",
  "refundProcessed": true,
  "message": "Market cancelled successfully"
}
```

### Creator Management

#### 6. Get Pending Creator Applications

Returns users awaiting creator approval.

```http
GET /admin/creators/pending
```

**Response:**
```json
{
  "creators": [
    {
      "id": "user1",
      "walletAddress": "0x5678...",
      "twitterHandle": "@crypto_trader",
      "stakeAmount": "100000000000000000000",
      "appliedAt": "2025-01-10T12:00:00Z",
      "reputation": 85
    }
  ],
  "total": 1
}
```

#### 7. Approve Creator

Approve a user to become a market creator.

```http
POST /admin/creators/:id/approve
```

**Body:**
```json
{
  "notes": "Verified Twitter account with good reputation",
  "permissions": ["featured_markets", "higher_limits"]
}
```

**Response:**
```json
{
  "success": true,
  "userId": "user1",
  "message": "Creator approved successfully"
}
```

#### 8. Reject Creator

Reject a creator application.

```http
POST /admin/creators/:id/reject
```

**Body:**
```json
{
  "reason": "Insufficient social media presence",
  "canReapplyAfterDays": 30
}
```

**Response:**
```json
{
  "success": true,
  "userId": "user1",
  "message": "Creator application rejected"
}
```

#### 9. Suspend Creator

Temporarily or permanently suspend a creator.

```http
PUT /admin/creators/:id/suspend
```

**Body:**
```json
{
  "reason": "Violation of community guidelines",
  "durationDays": 7,
  "suspendExistingMarkets": false
}
```

**Parameters:**
- `durationDays`: 0 for permanent suspension
- `suspendExistingMarkets`: Optional, suspend active markets

**Response:**
```json
{
  "success": true,
  "userId": "user1",
  "suspendedUntil": "2025-01-17T00:00:00Z",
  "message": "Creator suspended for 7 days"
}
```

#### 10. Refund Creator Stake

Process refund for creator stake amount.

```http
POST /admin/creators/:id/refund-stake
```

**Body:**
```json
{
  "amount": 0,
  "reason": "Platform error"
}
```

**Parameters:**
- `amount`: Amount in wei (0 for full stake)

**Response:**
```json
{
  "success": true,
  "userId": "user1",
  "amount": "100000000000000000000",
  "message": "Stake refunded successfully"
}
```

### User Management

#### 11. Search Users

Search and filter platform users.

```http
GET /admin/users/search?query=0x1234...&role=creator&status=active&page=1&limit=20
```

**Query Parameters:**
- `query`: Wallet address or Twitter handle
- `role`: Filter by role (user, creator, admin)
- `status`: Filter by status (active, suspended, banned)
- `page`: Page number (default: 1)
- `limit`: Items per page (1-100, default: 20)

**Response:**
```json
{
  "users": [
    {
      "id": "user1",
      "walletAddress": "0x1234...",
      "twitterHandle": "@example",
      "role": "user",
      "status": "active",
      "createdAt": "2025-01-01T00:00:00Z",
      "totalTrades": 15,
      "totalVolume": "5000000000000000000"
    }
  ],
  "total": 1,
  "page": 1,
  "limit": 20
}
```

#### 12. Ban User

Ban a user from the platform.

```http
POST /admin/users/:id/ban
```

**Body:**
```json
{
  "reason": "Fraudulent activity detected",
  "durationDays": 0,
  "freezeFunds": true
}
```

**Parameters:**
- `durationDays`: 0 for permanent ban
- `freezeFunds`: Optional, freeze user's funds

**Response:**
```json
{
  "success": true,
  "userId": "user1",
  "bannedUntil": null,
  "fundsFrozen": true,
  "message": "User permanently banned"
}
```

#### 13. Process User Refund

Process a refund for a user.

```http
POST /admin/users/:id/refund
```

**Body:**
```json
{
  "amount": "1000000000000000000",
  "reason": "Market cancelled due to platform error",
  "marketId": "market123"
}
```

**Response:**
```json
{
  "success": true,
  "userId": "user1",
  "amount": "1000000000000000000",
  "reason": "Market cancelled due to platform error",
  "message": "Refund processed successfully"
}
```

### System Operations

#### 14. Get System Health

Returns comprehensive system health metrics.

```http
GET /admin/system/health
```

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2025-01-16T10:00:00Z",
  "uptime": 86400,
  "components": {
    "database": {
      "status": "healthy",
      "responseTime": "5ms"
    },
    "redis": {
      "status": "healthy",
      "responseTime": "2ms"
    },
    "blockchain": {
      "status": "healthy",
      "responseTime": "120ms",
      "latestBlock": 1234567
    },
    "queue": {
      "status": "healthy",
      "pending": 5,
      "processing": 2
    }
  },
  "resources": {
    "memory": {
      "used": 256000000,
      "total": 512000000,
      "percentage": 50
    }
  }
}
```

#### 15. Get Platform Statistics

Returns platform-wide statistics.

```http
GET /admin/system/stats
```

**Response:**
```json
{
  "markets": {
    "total": 150,
    "active": 42,
    "resolved": 98,
    "disputed": 5,
    "cancelled": 5
  },
  "users": {
    "total": 1250,
    "creators": 87,
    "banned": 12,
    "active24h": 340
  },
  "volume": {
    "total": "50000000000000000000000",
    "last24h": "2500000000000000000000",
    "last7d": "15000000000000000000000"
  },
  "fees": {
    "collected": "1250000000000000000000",
    "pending": "50000000000000000000"
  }
}
```

#### 16. Trigger Background Job

Manually trigger a background job.

```http
POST /admin/jobs/:name/trigger
```

**Body:**
```json
{
  "params": {
    "marketId": "market123"
  },
  "force": false
}
```

**Response:**
```json
{
  "success": true,
  "jobName": "resolve-markets",
  "message": "Job 'resolve-markets' triggered successfully",
  "jobId": "job-1705420800000"
}
```

#### 17. Get Error Logs

Retrieve recent error logs.

```http
GET /admin/logs/errors?level=error&startDate=2025-01-01&endDate=2025-01-31&limit=100
```

**Query Parameters:**
- `level`: Log level (error, warn, info)
- `startDate`: Start date (ISO 8601)
- `endDate`: End date (ISO 8601)
- `limit`: Max results (1-1000, default: 100)

**Response:**
```json
{
  "logs": [
    {
      "id": "log1",
      "level": "error",
      "message": "Database connection timeout",
      "timestamp": "2025-01-16T10:00:00Z",
      "context": "DatabaseService",
      "stack": "Error: Connection timeout..."
    }
  ],
  "total": 1
}
```

#### 18. Emergency Pause Contracts

Pause smart contracts in case of emergency.

```http
POST /admin/contracts/pause
```

**Body:**
```json
{
  "reason": "Critical security vulnerability detected",
  "contract": "OpinionMarket",
  "notifyUsers": true
}
```

**Parameters:**
- `contract`: OpinionMarket, CreatorShareFactory, FeeCollector, or All
- `notifyUsers`: Send notifications to users

**Response:**
```json
{
  "success": true,
  "contract": "OpinionMarket",
  "pausedAt": "2025-01-16T10:00:00Z",
  "message": "Contract(s) paused: OpinionMarket",
  "reason": "Critical security vulnerability detected"
}
```

### Analytics

#### 19. Get Platform Analytics

Returns platform-wide analytics and metrics.

```http
GET /admin/analytics/platform?startDate=2025-01-01&endDate=2025-01-31&granularity=day
```

**Query Parameters:**
- `startDate`: Start date (ISO 8601)
- `endDate`: End date (ISO 8601)
- `granularity`: hour, day, week, or month

**Response:**
```json
{
  "period": {
    "start": "2025-01-01T00:00:00Z",
    "end": "2025-01-31T23:59:59Z"
  },
  "metrics": {
    "newUsers": 125,
    "newCreators": 12,
    "marketsCreated": 35,
    "tradesExecuted": 842,
    "volumeTraded": "15000000000000000000000",
    "feesCollected": "375000000000000000000",
    "activeUsers": 340,
    "avgTradeSize": "17825000000000000000"
  },
  "growth": {
    "users": 15.2,
    "creators": 8.5,
    "volume": 22.3
  }
}
```

#### 20. Get Creator Analytics

Returns analytics about creators and their markets.

```http
GET /admin/analytics/creators?startDate=2025-01-01&endDate=2025-01-31
```

**Response:**
```json
{
  "topCreators": [
    {
      "address": "0x1234...",
      "handle": "@top_creator",
      "marketsCreated": 15,
      "totalVolume": "5000000000000000000000",
      "avgParticipants": 28,
      "successRate": 92.5
    }
  ],
  "metrics": {
    "totalCreators": 87,
    "activeCreators": 42,
    "avgMarketsPerCreator": 3.2,
    "topCategories": ["crypto", "sports", "politics"]
  }
}
```

#### 21. Get Revenue Analytics

Returns revenue metrics and projections.

```http
GET /admin/analytics/revenue?startDate=2025-01-01&endDate=2025-01-31
```

**Response:**
```json
{
  "period": {
    "start": "2025-01-01T00:00:00Z",
    "end": "2025-01-31T23:59:59Z"
  },
  "revenue": {
    "total": "1250000000000000000000",
    "platformFees": "1000000000000000000000",
    "creatorStakes": "250000000000000000000"
  },
  "breakdown": {
    "byMarketType": [
      {
        "type": "crypto",
        "revenue": "500000000000000000000"
      }
    ],
    "byCreator": [
      {
        "creator": "0x1234...",
        "revenue": "150000000000000000000"
      }
    ]
  },
  "projections": {
    "monthly": "1500000000000000000000",
    "annual": "18000000000000000000000"
  }
}
```

## Audit Logging

All admin actions are automatically logged for compliance and security auditing.

### Log Structure

```json
{
  "id": 123,
  "adminAddress": "0x1234...",
  "action": "RESOLVE_MARKET",
  "method": "POST",
  "path": "/api/v1/admin/markets/market1/resolve",
  "body": {
    "outcome": 1,
    "reason": "Event occurred"
  },
  "params": {
    "marketId": "market1"
  },
  "query": {},
  "ipAddress": "203.0.113.42",
  "userAgent": "Mozilla/5.0...",
  "timestamp": "2025-01-16T10:00:00Z",
  "success": true,
  "errorMessage": null,
  "metadata": {
    "marketId": "market1",
    "outcome": 1
  }
}
```

### Audit Trail Access

Audit logs can be:
- Queried from database
- Exported for compliance
- Reviewed during incidents
- Used for forensic analysis

## Security

### Best Practices

1. **Protect Private Keys**
   - Never commit admin private keys
   - Use hardware wallets for production
   - Rotate keys periodically

2. **Limit Admin Access**
   - Minimal number of admin addresses
   - Regular access reviews
   - Remove unused admins

3. **Monitor Admin Activity**
   - Review audit logs regularly
   - Set up alerts for critical actions
   - Investigate anomalies

4. **Use Fresh Signatures**
   - Generate new signature for each request
   - Don't reuse signatures
   - Respect 5-minute validity window

5. **Secure Communication**
   - Always use HTTPS in production
   - Verify SSL certificates
   - Use VPN for sensitive operations

## Examples

### Complete Admin Request (JavaScript)

```javascript
import { ethers } from 'ethers';
import axios from 'axios';

// Configuration
const API_URL = 'https://api.guesslyfe.com/api/v1/admin';
const ADMIN_PRIVATE_KEY = process.env.ADMIN_PRIVATE_KEY;

// Create wallet
const wallet = new ethers.Wallet(ADMIN_PRIVATE_KEY);

// Helper function to make admin requests
async function makeAdminRequest(method, path, data = null) {
  const timestamp = Date.now();
  const message = `GuessLyfe Admin Action: ${method} ${path} at ${timestamp}`;
  const signature = await wallet.signMessage(message);

  const config = {
    method,
    url: `${API_URL}${path}`,
    headers: {
      'x-admin-address': wallet.address,
      'x-admin-signature': signature,
      'x-admin-timestamp': timestamp.toString(),
      'Content-Type': 'application/json',
    },
  };

  if (data) {
    config.data = data;
  }

  try {
    const response = await axios(config);
    return response.data;
  } catch (error) {
    console.error('Admin request failed:', error.response?.data || error.message);
    throw error;
  }
}

// Example: Get pending markets
async function getPendingMarkets() {
  return makeAdminRequest('GET', '/markets/pending');
}

// Example: Resolve market
async function resolveMarket(marketId, outcome, reason) {
  return makeAdminRequest('POST', `/markets/${marketId}/resolve`, {
    outcome,
    reason,
  });
}

// Example: Ban user
async function banUser(userId, reason, durationDays) {
  return makeAdminRequest('POST', `/users/${userId}/ban`, {
    reason,
    durationDays,
    freezeFunds: true,
  });
}

// Usage
(async () => {
  try {
    // Get pending markets
    const pending = await getPendingMarkets();
    console.log('Pending markets:', pending);

    // Resolve first market
    if (pending.markets.length > 0) {
      const marketId = pending.markets[0].id;
      const result = await resolveMarket(marketId, 1, 'Event occurred');
      console.log('Resolution result:', result);
    }
  } catch (error) {
    console.error('Error:', error);
  }
})();
```

### Emergency Pause Script

```javascript
// emergency-pause.js
import { ethers } from 'ethers';
import axios from 'axios';

const API_URL = 'https://api.guesslyfe.com/api/v1/admin';
const ADMIN_PRIVATE_KEY = process.env.ADMIN_PRIVATE_KEY;

async function emergencyPause(reason) {
  const wallet = new ethers.Wallet(ADMIN_PRIVATE_KEY);
  const timestamp = Date.now();
  const path = '/contracts/pause';
  const method = 'POST';
  const message = `GuessLyfe Admin Action: ${method} ${path} at ${timestamp}`;
  const signature = await wallet.signMessage(message);

  const response = await axios.post(`${API_URL}${path}`, {
    reason,
    contract: 'All',
    notifyUsers: true,
  }, {
    headers: {
      'x-admin-address': wallet.address,
      'x-admin-signature': signature,
      'x-admin-timestamp': timestamp.toString(),
    },
  });

  console.log('Emergency pause successful:', response.data);
  return response.data;
}

// Usage
const reason = process.argv[2] || 'Emergency pause initiated by admin';
emergencyPause(reason)
  .then(() => console.log('Done'))
  .catch(console.error);
```

**Run:**
```bash
node emergency-pause.js "Critical vulnerability detected"
```

## Support

For admin API issues:
- Check audit logs for failed requests
- Verify admin address is configured
- Ensure signature is fresh (<5 minutes)
- Review error messages for details
- Contact DevOps team for access issues

---

**Last Updated**: 2025-01-16
**API Version**: 1.0
**Maintained By**: DevOps Team
