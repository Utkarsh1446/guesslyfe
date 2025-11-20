# Guessly Backend API Documentation

**Version:** 1.0
**Production URL:** `https://guessly-backend-738787111842.us-central1.run.app/api/v1`
**Domain URL (Pending):** `https://api.guessly.fun`

**Description:** Guessly Prediction Market Platform API

**Swagger Documentation:** https://guessly-backend-738787111842.us-central1.run.app/docs

---

## Overview

Guessly is a decentralized prediction market platform built on Base blockchain. This backend provides:
- RESTful API for prediction markets and creator shares
- Smart contract integration with Base Sepolia
- Real-time blockchain event listening
- User authentication via Twitter OAuth 2.0
- Admin dashboard and analytics

---

## Authentication

Most endpoints require authentication using Bearer tokens obtained through Twitter OAuth 2.0.

To authenticate:
1. Redirect users to `/auth/twitter/login`
2. Handle callback at `/auth/twitter/callback`
3. Include the JWT token in the `Authorization` header: `Bearer <token>`

---

## Table of Contents

- [Admin](#admin)
- [Analytics](#analytics)
- [App](#app)
- [Auth](#auth)
- [Creators](#creators)
- [Dividends](#dividends)
- [Markets](#markets)
- [Notifications](#notifications)
- [Shares](#shares)
- [System](#system)
- [Users](#users)

---

## Admin

### GET `/api/v1/admin/markets/pending`

**Get markets awaiting resolution (admin only)**

Returns list of markets that have ended and are awaiting resolution

🔒 **Authentication Required:** Bearer Token

**Parameters:**

| Name | Location | Required | Description |
|------|----------|----------|-------------|
| `overdue` | query |  | Filter overdue markets (>60 min past end) |
| `page` | query |  | Page number |
| `limit` | query |  | Items per page |

**Response Codes:** 200, 401, 403

---

### POST `/api/v1/admin/markets/{id}/resolve`

**Manually resolve a market (admin only)**

Sets the winning outcome and triggers payout distribution

🔒 **Authentication Required:** Bearer Token

**Parameters:**

| Name | Location | Required | Description |
|------|----------|----------|-------------|
| `id` | path | ✓ | Market ID |

**Request Body:** See Swagger docs

**Response Codes:** 200, 400, 401, 403, 404

---

### POST `/api/v1/admin/markets/{id}/dispute`

**Mark market as disputed (admin only)**

Flags market for manual review due to resolution issues

🔒 **Authentication Required:** Bearer Token

**Parameters:**

| Name | Location | Required | Description |
|------|----------|----------|-------------|
| `id` | path | ✓ | Market ID |

**Request Body:** See Swagger docs

**Response Codes:** 200, 400, 401, 403, 404

---

### PUT `/api/v1/admin/markets/{id}/extend`

**Extend market end time (admin only)**

Adds additional hours to market duration

🔒 **Authentication Required:** Bearer Token

**Parameters:**

| Name | Location | Required | Description |
|------|----------|----------|-------------|
| `id` | path | ✓ | Market ID |

**Request Body:** See Swagger docs

**Response Codes:** 200, 400, 401, 403, 404

---

### DELETE `/api/v1/admin/markets/{id}/cancel`

**Cancel market and optionally refund users (admin only)**

Cancels market and processes refunds if requested

🔒 **Authentication Required:** Bearer Token

**Parameters:**

| Name | Location | Required | Description |
|------|----------|----------|-------------|
| `id` | path | ✓ | Market ID |

**Request Body:** See Swagger docs

**Response Codes:** 200, 400, 401, 403, 404

---

### GET `/api/v1/admin/creators/pending`

**Get pending creator applications (admin only)**

Returns list of creators awaiting approval

🔒 **Authentication Required:** Bearer Token

**Parameters:**

| Name | Location | Required | Description |
|------|----------|----------|-------------|
| `page` | query | ✓ | - |
| `limit` | query | ✓ | - |

**Response Codes:** 200, 401, 403

---

### POST `/api/v1/admin/creators/{id}/suspend`

**Suspend a creator account (admin only)**

Suspends creator account for violations or other reasons

🔒 **Authentication Required:** Bearer Token

**Parameters:**

| Name | Location | Required | Description |
|------|----------|----------|-------------|
| `id` | path | ✓ | Creator ID |

**Request Body:** See Swagger docs

**Response Codes:** 200, 401, 403, 404

---

### PUT `/api/v1/admin/creators/{id}/override-unlock`

**Manually unlock creator shares (admin only)**

Override automatic unlock requirements (special cases, partnerships)

🔒 **Authentication Required:** Bearer Token

**Parameters:**

| Name | Location | Required | Description |
|------|----------|----------|-------------|
| `id` | path | ✓ | Creator ID |

**Request Body:** See Swagger docs

**Response Codes:** 200, 400, 401, 403, 404

---

### POST `/api/v1/admin/creators/{id}/refund-stake`

**Refund creator stake (admin only)**

Refund $100 stake after reaching $10K volume milestone

🔒 **Authentication Required:** Bearer Token

**Parameters:**

| Name | Location | Required | Description |
|------|----------|----------|-------------|
| `id` | path | ✓ | Creator ID |

**Request Body:** See Swagger docs

**Response Codes:** 200, 400, 401, 403, 404

---

### GET `/api/v1/admin/users/search`

**Search users with admin filters (admin only)**

Search users by handle, display name, or wallet address with detailed info

🔒 **Authentication Required:** Bearer Token

**Parameters:**

| Name | Location | Required | Description |
|------|----------|----------|-------------|
| `query` | query | ✓ | - |
| `page` | query | ✓ | - |
| `limit` | query | ✓ | - |

**Response Codes:** 200, 401, 403

---

### POST `/api/v1/admin/users/{id}/ban`

**Ban a user account (admin only)**

Bans user account for violations

🔒 **Authentication Required:** Bearer Token

**Parameters:**

| Name | Location | Required | Description |
|------|----------|----------|-------------|
| `id` | path | ✓ | User ID |

**Request Body:** See Swagger docs

**Response Codes:** 200, 401, 403, 404

---

### POST `/api/v1/admin/users/{id}/refund`

**Process manual refund for user (admin only)**

Manually refund user for platform errors or special cases

🔒 **Authentication Required:** Bearer Token

**Parameters:**

| Name | Location | Required | Description |
|------|----------|----------|-------------|
| `id` | path | ✓ | User ID |

**Request Body:** See Swagger docs

**Response Codes:** 200, 401, 403, 404

---

### GET `/api/v1/admin/system/health`

**Get system health status (admin only)**

Returns detailed health check of all services and systems

🔒 **Authentication Required:** Bearer Token

**Response Codes:** 200, 401, 403

---

### GET `/api/v1/admin/system/stats`

**Get platform statistics (admin only)**

Returns comprehensive platform metrics (users, creators, markets, volume, revenue)

🔒 **Authentication Required:** Bearer Token

**Response Codes:** 200, 401, 403

---

### POST `/api/v1/admin/jobs/{name}/trigger`

**Manually trigger background job (admin only)**

Triggers specified background job (epochFinalizer, volumeTracker, etc.)

🔒 **Authentication Required:** Bearer Token

**Parameters:**

| Name | Location | Required | Description |
|------|----------|----------|-------------|
| `name` | path | ✓ | Job name |

**Response Codes:** 200, 400, 401, 403

---

### GET `/api/v1/admin/logs/errors`

**Get error logs (admin only)**

Returns recent error logs from all services

🔒 **Authentication Required:** Bearer Token

**Parameters:**

| Name | Location | Required | Description |
|------|----------|----------|-------------|
| `limit` | query | ✓ | - |
| `level` | query | ✓ | - |

**Response Codes:** 200, 401, 403

---

### POST `/api/v1/admin/contracts/pause`

**Emergency pause contracts (admin only)**

Pauses specified smart contracts in case of security issues (EMERGENCY USE ONLY)

🔒 **Authentication Required:** Bearer Token

**Request Body:** See Swagger docs

**Response Codes:** 200, 401, 403

---

### GET `/api/v1/admin/analytics/platform`

**Get platform analytics (admin only)**

Returns platform analytics (market creation, user growth, engagement)

🔒 **Authentication Required:** Bearer Token

**Parameters:**

| Name | Location | Required | Description |
|------|----------|----------|-------------|
| `timeframe` | query | ✓ | - |

**Response Codes:** 200, 401, 403

---

### GET `/api/v1/admin/analytics/revenue`

**Get revenue metrics (admin only)**

Returns detailed revenue analytics and breakdown

🔒 **Authentication Required:** Bearer Token

**Parameters:**

| Name | Location | Required | Description |
|------|----------|----------|-------------|
| `timeframe` | query | ✓ | - |

**Response Codes:** 200, 401, 403

---

## Analytics

### GET `/api/v1/analytics/leaderboard`

**Get platform leaderboards**

🔓 **Authentication:** Not required

**Parameters:**

| Name | Location | Required | Description |
|------|----------|----------|-------------|
| `type` | query | ✓ | - |
| `timeframe` | query |  | - |
| `limit` | query |  | - |

**Response Codes:** 200

---

### GET `/api/v1/analytics/trending`

**Get trending markets**

🔓 **Authentication:** Not required

**Parameters:**

| Name | Location | Required | Description |
|------|----------|----------|-------------|
| `timeframe` | query |  | - |
| `limit` | query |  | - |

**Response Codes:** 200

---

### GET `/api/v1/analytics/metrics`

**Get real-time platform metrics**

🔓 **Authentication:** Not required

**Response Codes:** 200

---

### GET `/api/v1/analytics/categories`

**Get statistics by category**

🔓 **Authentication:** Not required

**Response Codes:** 200

---

### GET `/api/v1/analytics/volume`

**Get historical volume data**

🔓 **Authentication:** Not required

**Parameters:**

| Name | Location | Required | Description |
|------|----------|----------|-------------|
| `timeframe` | query |  | - |
| `interval` | query |  | - |

**Response Codes:** 200

---

### GET `/api/v1/analytics/users`

**Get user statistics**

🔓 **Authentication:** Not required

**Response Codes:** 200

---

## App

### GET `/api/v1`

🔓 **Authentication:** Not required

**Response Codes:** 200

---

## Auth

### GET `/api/v1/auth/twitter/login`

🔓 **Authentication:** Not required

**Response Codes:** 200

---

### GET `/api/v1/auth/twitter/callback`

🔓 **Authentication:** Not required

**Parameters:**

| Name | Location | Required | Description |
|------|----------|----------|-------------|
| `code` | query | ✓ | - |
| `state` | query | ✓ | - |

**Response Codes:** 200

---

### POST `/api/v1/auth/logout`

🔓 **Authentication:** Not required

**Response Codes:** 201

---

### GET `/api/v1/auth/me`

🔓 **Authentication:** Not required

**Response Codes:** 200

---

### POST `/api/v1/auth/link-wallet`

🔓 **Authentication:** Not required

**Request Body:** See Swagger docs

**Response Codes:** 201

---

## Creators

### POST `/api/v1/creators/apply`

**Apply to become a creator**

🔒 **Authentication Required:** Bearer Token

**Request Body:** See Swagger docs

**Response Codes:** 201, 400, 401

---

### GET `/api/v1/creators`

**List all creators**

🔓 **Authentication:** Not required

**Parameters:**

| Name | Location | Required | Description |
|------|----------|----------|-------------|
| `status` | query |  | - |

**Response Codes:** 200

---

### GET `/api/v1/creators/me`

**Get current user's creator profile**

🔒 **Authentication Required:** Bearer Token

**Response Codes:** 200, 404

---

### GET `/api/v1/creators/address/{address}`

**Get creator by share contract address**

🔓 **Authentication:** Not required

**Parameters:**

| Name | Location | Required | Description |
|------|----------|----------|-------------|
| `address` | path | ✓ | - |

**Response Codes:** 200, 404

---

### POST `/api/v1/creators/{id}/approve`

**Approve creator (admin only)**

🔒 **Authentication Required:** Bearer Token

**Parameters:**

| Name | Location | Required | Description |
|------|----------|----------|-------------|
| `id` | path | ✓ | - |

**Response Codes:** 200, 403, 404

---

### POST `/api/v1/creators/{id}/reject`

**Reject creator (admin only)**

🔒 **Authentication Required:** Bearer Token

**Parameters:**

| Name | Location | Required | Description |
|------|----------|----------|-------------|
| `id` | path | ✓ | - |

**Response Codes:** 200, 403, 404

---

### POST `/api/v1/creators/check-eligibility`

**Check if user meets creator requirements**

Returns eligibility status, tier, and requirement breakdown

🔒 **Authentication Required:** Bearer Token

**Response Codes:** 200, 401, 404

---

### GET `/api/v1/creators/{id}/volume-progress`

**Get progress toward $30K volume threshold**

Returns volume progress and contributing markets

🔓 **Authentication:** Not required

**Parameters:**

| Name | Location | Required | Description |
|------|----------|----------|-------------|
| `id` | path | ✓ | Creator ID |

**Response Codes:** 200, 404

---

### GET `/api/v1/creators/{id}/shareholders`

**Get list of shareholders for creator**

Returns paginated list of shareholders with holdings

🔓 **Authentication:** Not required

**Parameters:**

| Name | Location | Required | Description |
|------|----------|----------|-------------|
| `id` | path | ✓ | Creator ID |
| `page` | query |  | - |
| `limit` | query |  | - |
| `sort` | query |  | - |

**Response Codes:** 200, 404

---

### GET `/api/v1/creators/{id}/performance`

**Get creator performance metrics**

Returns comprehensive performance data including revenue and share metrics

🔓 **Authentication:** Not required

**Parameters:**

| Name | Location | Required | Description |
|------|----------|----------|-------------|
| `id` | path | ✓ | Creator ID |
| `timeframe` | query |  | - |

**Response Codes:** 200, 404

---

## Dividends

### GET `/api/v1/dividends/claimable/{address}`

**Get claimable dividends for a user**

Returns all claimable dividends across creators where user owns shares

🔓 **Authentication:** Not required

**Parameters:**

| Name | Location | Required | Description |
|------|----------|----------|-------------|
| `address` | path | ✓ | User wallet address |

**Response Codes:** 200, 404

---

### POST `/api/v1/dividends/initiate-claim`

**Initiate dividend claim**

Starts the claim process and returns required tweet text for verification

🔒 **Authentication Required:** Bearer Token

**Request Body:** See Swagger docs

**Response Codes:** 200, 400, 401

---

### POST `/api/v1/dividends/complete-claim`

**Complete dividend claim**

Verifies tweet and processes dividend payout to user wallet

🔒 **Authentication Required:** Bearer Token

**Request Body:** See Swagger docs

**Response Codes:** 200, 400, 401, 404

---

### GET `/api/v1/dividends/history/{address}`

**Get dividend claim history**

Returns paginated history of all dividend claims for a user

🔓 **Authentication:** Not required

**Parameters:**

| Name | Location | Required | Description |
|------|----------|----------|-------------|
| `address` | path | ✓ | User wallet address |
| `page` | query |  | - |
| `limit` | query |  | - |

**Response Codes:** 200

---

## Markets

### POST `/api/v1/markets/create`

**Create a new prediction market (creators only)**

🔒 **Authentication Required:** Bearer Token

**Request Body:** See Swagger docs

**Response Codes:** 201, 400, 401, 403

---

### GET `/api/v1/markets`

**List all markets with optional filters**

🔓 **Authentication:** Not required

**Parameters:**

| Name | Location | Required | Description |
|------|----------|----------|-------------|
| `status` | query |  | Filter by status |
| `category` | query |  | Filter by category |
| `creatorId` | query |  | Filter by creator ID |
| `search` | query |  | Search in title and description |
| `sort` | query |  | Sort by field |
| `order` | query |  | Sort order (ASC or DESC) |
| `page` | query |  | Page number |
| `limit` | query |  | Items per page |

**Response Codes:** 200

---

### GET `/api/v1/markets/{id}`

**Get market details by ID**

🔓 **Authentication:** Not required

**Parameters:**

| Name | Location | Required | Description |
|------|----------|----------|-------------|
| `id` | path | ✓ | - |

**Response Codes:** 200, 404

---

### GET `/api/v1/markets/{id}/positions/{address}`

**Get user position in a market**

🔓 **Authentication:** Not required

**Parameters:**

| Name | Location | Required | Description |
|------|----------|----------|-------------|
| `id` | path | ✓ | - |
| `address` | path | ✓ | - |

**Response Codes:** 200, 404

---

### POST `/api/v1/markets/{id}/trade`

**Prepare trade transaction (returns unsigned transaction)**

🔒 **Authentication Required:** Bearer Token

**Parameters:**

| Name | Location | Required | Description |
|------|----------|----------|-------------|
| `id` | path | ✓ | - |

**Request Body:** See Swagger docs

**Response Codes:** 200, 400, 401, 404

---

### POST `/api/v1/markets/{id}/claim`

**Prepare claim transaction for resolved market**

🔒 **Authentication Required:** Bearer Token

**Parameters:**

| Name | Location | Required | Description |
|------|----------|----------|-------------|
| `id` | path | ✓ | - |

**Response Codes:** 200, 400, 401, 404

---

### GET `/api/v1/markets/{id}/trades`

**Get trade history for a market**

🔓 **Authentication:** Not required

**Parameters:**

| Name | Location | Required | Description |
|------|----------|----------|-------------|
| `id` | path | ✓ | - |
| `page` | query |  | - |
| `limit` | query |  | - |

**Response Codes:** 200, 404

---

### GET `/api/v1/markets/{id}/activity`

**Get all activity for a market (trades, comments, etc.)**

🔓 **Authentication:** Not required

**Parameters:**

| Name | Location | Required | Description |
|------|----------|----------|-------------|
| `id` | path | ✓ | - |

**Response Codes:** 200, 404

---

### GET `/api/v1/markets/{id}/chart`

**Get probability history for chart**

Returns time-series data of outcome probabilities and volume

🔓 **Authentication:** Not required

**Parameters:**

| Name | Location | Required | Description |
|------|----------|----------|-------------|
| `id` | path | ✓ | - |
| `timeframe` | query |  | - |
| `interval` | query |  | - |

**Response Codes:** 200, 404

---

### GET `/api/v1/markets/{id}/comments`

**Get comments for a market**

Returns paginated list of user comments and discussion on the market

🔓 **Authentication:** Not required

**Parameters:**

| Name | Location | Required | Description |
|------|----------|----------|-------------|
| `id` | path | ✓ | - |
| `page` | query |  | - |
| `limit` | query |  | - |
| `sort` | query |  | - |

**Response Codes:** 200, 404

---

## Notifications

### GET `/api/v1/notifications`

**Get user notifications**

Returns paginated list of notifications

🔒 **Authentication Required:** Bearer Token

**Parameters:**

| Name | Location | Required | Description |
|------|----------|----------|-------------|
| `unreadOnly` | query |  | - |
| `page` | query |  | - |
| `limit` | query |  | - |

**Response Codes:** 200, 401

---

### PATCH `/api/v1/notifications/{id}/read`

**Mark notification as read**

Marks a single notification as read

🔒 **Authentication Required:** Bearer Token

**Parameters:**

| Name | Location | Required | Description |
|------|----------|----------|-------------|
| `id` | path | ✓ | Notification ID |

**Response Codes:** 200, 401, 404

---

### POST `/api/v1/notifications/read-all`

**Mark all notifications as read**

Marks all user notifications as read

🔒 **Authentication Required:** Bearer Token

**Response Codes:** 200, 401

---

### DELETE `/api/v1/notifications/{id}`

**Delete notification**

Deletes a notification

🔒 **Authentication Required:** Bearer Token

**Parameters:**

| Name | Location | Required | Description |
|------|----------|----------|-------------|
| `id` | path | ✓ | Notification ID |

**Response Codes:** 200, 401, 404

---

## Shares

### GET `/api/v1/shares/price/{creatorId}`

**Get buy/sell price for creator shares**

Returns price quote for buying or selling a specific amount of shares

🔓 **Authentication:** Not required

**Parameters:**

| Name | Location | Required | Description |
|------|----------|----------|-------------|
| `creatorId` | path | ✓ | Creator UUID |
| `action` | query | ✓ | Trade action |
| `amount` | query | ✓ | Number of shares |

**Response Codes:** 200, 400, 404

---

### POST `/api/v1/shares/buy`

**Generate transaction to buy shares**

Returns unsigned transaction data for buying creator shares. User must sign and submit transaction.

🔒 **Authentication Required:** Bearer Token

**Request Body:** See Swagger docs

**Response Codes:** 200, 400, 401, 404

---

### POST `/api/v1/shares/sell`

**Generate transaction to sell shares**

Returns unsigned transaction data for selling creator shares. User must sign and submit transaction.

🔒 **Authentication Required:** Bearer Token

**Request Body:** See Swagger docs

**Response Codes:** 200, 400, 401, 404

---

### GET `/api/v1/shares/portfolio/{address}`

**Get all share holdings for an address**

Returns portfolio of all creator shares held by a wallet address

🔓 **Authentication:** Not required

**Parameters:**

| Name | Location | Required | Description |
|------|----------|----------|-------------|
| `address` | path | ✓ | Wallet address |

**Response Codes:** 200, 404

---

### GET `/api/v1/shares/transactions/{creatorId}`

**Get transaction history for creator shares**

Returns paginated list of buy/sell transactions

🔓 **Authentication:** Not required

**Parameters:**

| Name | Location | Required | Description |
|------|----------|----------|-------------|
| `creatorId` | path | ✓ | Creator UUID |
| `type` | query |  | Filter by transaction type |
| `address` | query |  | Filter by user address |
| `page` | query |  | Page number |
| `limit` | query |  | Items per page |

**Response Codes:** 200, 404

---

### GET `/api/v1/shares/{creatorId}/chart`

**Get historical price data for charts**

Returns time-series data of share price and volume

🔓 **Authentication:** Not required

**Parameters:**

| Name | Location | Required | Description |
|------|----------|----------|-------------|
| `creatorId` | path | ✓ | Creator UUID |
| `timeframe` | query |  | Time range for chart data |
| `interval` | query |  | Data aggregation interval |

**Response Codes:** 200, 404

---

## System

### GET `/api/v1/health`

**Health check**

🔓 **Authentication:** Not required

**Response Codes:** 200, 503

---

### GET `/api/v1/version`

**Get API version and environment info**

Returns version, environment, and contract addresses

🔓 **Authentication:** Not required

**Response Codes:** 200

---

### GET `/api/v1/stats`

**Get public platform statistics**

Returns high-level platform metrics

🔓 **Authentication:** Not required

**Response Codes:** 200

---

### GET `/api/v1/gas-prices`

**Get current Base network gas prices**

Returns gas price estimates for transactions

🔓 **Authentication:** Not required

**Response Codes:** 200

---

## Users

### GET `/api/v1/users/me`

**Get current user profile**

🔒 **Authentication Required:** Bearer Token

**Response Codes:** 200, 401

---

### PATCH `/api/v1/users/me`

**Update current user profile**

🔒 **Authentication Required:** Bearer Token

**Request Body:** See Swagger docs

**Response Codes:** 200, 401

---

### GET `/api/v1/users/id/{id}`

**Get user by ID**

🔓 **Authentication:** Not required

**Parameters:**

| Name | Location | Required | Description |
|------|----------|----------|-------------|
| `id` | path | ✓ | - |

**Response Codes:** 200, 404

---

### GET `/api/v1/users/handle/{handle}`

**Get user by Twitter handle**

🔓 **Authentication:** Not required

**Parameters:**

| Name | Location | Required | Description |
|------|----------|----------|-------------|
| `handle` | path | ✓ | - |

**Response Codes:** 200, 404

---

### GET `/api/v1/users/wallet/{address}`

**Get user by wallet address**

🔓 **Authentication:** Not required

**Parameters:**

| Name | Location | Required | Description |
|------|----------|----------|-------------|
| `address` | path | ✓ | - |

**Response Codes:** 200, 404

---

### GET `/api/v1/users/{address}/portfolio`

**Get user's portfolio (shares + market positions)**

Returns aggregated portfolio with shares and market positions

🔓 **Authentication:** Not required

**Parameters:**

| Name | Location | Required | Description |
|------|----------|----------|-------------|
| `address` | path | ✓ | - |
| `page` | query |  | - |
| `limit` | query |  | - |

**Response Codes:** 200

---

### GET `/api/v1/users/{address}/activity`

**Get user activity feed**

Returns paginated list of user activities (trades, shares, etc.)

🔓 **Authentication:** Not required

**Parameters:**

| Name | Location | Required | Description |
|------|----------|----------|-------------|
| `address` | path | ✓ | - |
| `page` | query |  | - |
| `limit` | query |  | - |
| `type` | query |  | Filter by activity type |

**Response Codes:** 200

---

### GET `/api/v1/users/search`

**Search users by handle or name**

Returns paginated search results

🔓 **Authentication:** Not required

**Parameters:**

| Name | Location | Required | Description |
|------|----------|----------|-------------|
| `q` | query | ✓ | Search query |
| `page` | query |  | - |
| `limit` | query |  | - |

**Response Codes:** 200

---


## Smart Contracts

### Base Sepolia Testnet

- **USDC Token:** `0x036CbD53842c5426634e7929541eC2318f3dCF7e`
- **Creator Share Factory:** `0xe941e7fC3aaFecb944E70FCe236BD638ACCbDD53`
- **Opinion Market:** `0x60a308C4e4d653F5BA6c5EFf412C9cDc3FAEEc72`
- **Fee Collector:** `0x86d036b59d23e0BF6e7A43d8e625c005Aa8bd7B4`

---

## Rate Limiting

- Default: 100 requests per 60 seconds
- Auth endpoints: 5 requests per 60 seconds

---

## Error Responses

All errors follow this format:

```json
{
  "statusCode": 400,
  "message": "Error description",
  "error": "Bad Request"
}
```

---

## Support

For issues or questions, please contact the Guessly team or refer to the Swagger documentation at `/docs`.

