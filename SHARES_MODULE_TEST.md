# Shares Module - Testing Guide

## Overview

The Shares module provides endpoints for trading creator shares, viewing price charts, and getting market data. Trading happens on the frontend via wallet signing - the backend generates unsigned transactions that users sign and submit.

## New Endpoints Implemented

### 1. POST /shares/buy
**Purpose**: Generate unsigned transaction for buying creator shares

**Authentication**: Optional

**Request Body**:
```json
{
  "creatorAddress": "0x9F4c1f7EAA0b729b798F81BE84B25fDf9F66A0bf",
  "amount": 10,
  "maxPrice": "105.50"
}
```

**Response**:
```json
{
  "unsignedTx": {
    "to": "0xShareContractAddress...",
    "data": "0x encoded function call...",
    "value": "0",
    "gasLimit": "300000",
    "description": "Buy 10 shares of creator 0x9F4c..."
  },
  "estimatedCost": "102.500000",
  "shares": "10",
  "creatorAddress": "0x9F4c1f7EAA0b729b798F81BE84B25fDf9F66A0bf",
  "shareContractAddress": "0xShareContract..."
}
```

**Validation**:
- Creator must exist and shares must be unlocked ($30K volume threshold met)
- Share contract must be deployed
- Total cost must not exceed `maxPrice` (slippage protection)
- User must have approved USDC to share contract (done on frontend)

**Test Command**:
```bash
curl -X POST http://localhost:3000/shares/buy \
  -H "Content-Type: application/json" \
  -d '{
    "creatorAddress": "0x9F4c1f7EAA0b729b798F81BE84B25fDf9F66A0bf",
    "amount": 1,
    "maxPrice": "100"
  }'
```

---

### 2. POST /shares/sell
**Purpose**: Generate unsigned transaction for selling creator shares

**Authentication**: Optional

**Request Body**:
```json
{
  "creatorAddress": "0x9F4c1f7EAA0b729b798F81BE84B25fDf9F66A0bf",
  "amount": 5,
  "minPrice": "95.00"
}
```

**Response**:
```json
{
  "unsignedTx": {
    "to": "0xShareContractAddress...",
    "data": "0x encoded function call...",
    "value": "0",
    "gasLimit": "300000",
    "description": "Sell 5 shares of creator 0x9F4c..."
  },
  "estimatedProceeds": "97.500000",
  "shares": "5",
  "creatorAddress": "0x9F4c1f7EAA0b729b798F81BE84B25fDf9F66A0bf",
  "shareContractAddress": "0xShareContract..."
}
```

**Validation**:
- Creator must exist and shares must be unlocked
- Share contract must be deployed
- Net proceeds must be >= `minPrice` (slippage protection)
- User must own the shares (validated on-chain when transaction is submitted)

**Test Command**:
```bash
curl -X POST http://localhost:3000/shares/sell \
  -H "Content-Type: application/json" \
  -d '{
    "creatorAddress": "0x9F4c1f7EAA0b729b798F81BE84B25fDf9F66A0bf",
    "amount": 1,
    "minPrice": "50"
  }'
```

---

### 3. GET /shares/:creatorAddress/chart
**Purpose**: Get price chart data with historical trading information

**Authentication**: Optional

**URL Parameters**:
- `creatorAddress`: Creator wallet address

**Query Parameters**:
- `timeframe`: `24h` | `7d` | `30d` | `all` (default: `24h`)

**Response**:
```json
{
  "creatorAddress": "0x9F4c...",
  "timeframe": "24h",
  "data": [
    {
      "timestamp": "2025-11-16T10:00:00.000Z",
      "price": "10.500000",
      "volume": "1500.000000",
      "transactions": 25
    },
    {
      "timestamp": "2025-11-16T11:00:00.000Z",
      "price": "10.750000",
      "volume": "2100.000000",
      "transactions": 32
    }
  ],
  "currentPrice": "10.850000",
  "lowPrice": "10.200000",
  "highPrice": "11.100000",
  "totalVolume": "45000.000000",
  "priceChange": 3.45
}
```

**Chart Bucket Sizes**:
- `24h`: 1 hour buckets (24 data points max)
- `7d`: 6 hour buckets (28 data points max)
- `30d`: 24 hour buckets (30 data points max)
- `all`: 7 day buckets (varies)

**Test Command**:
```bash
curl -X GET "http://localhost:3000/shares/0x9F4c1f7EAA0b729b798F81BE84B25fDf9F66A0bf/chart?timeframe=24h"
```

---

## Existing Endpoints (Already Implemented)

### 4. GET /shares/:creatorAddress/price/buy
**Purpose**: Get buy price quote for specified amount

**Response**: Price breakdown including fees and total cost

**Location**: shares.controller.ts:34

---

### 5. GET /shares/:creatorAddress/price/sell
**Purpose**: Get sell price quote for specified amount

**Response**: Price breakdown including fees and net proceeds

**Location**: shares.controller.ts:58

---

### 6. GET /shares/:creatorAddress/history
**Purpose**: Get trading history for creator's shares

**Response**: List of all trades with trader info, prices, fees, timestamps

**Location**: shares.controller.ts:81

---

### 7. GET /shares/trending
**Purpose**: Get trending shares by 24h volume

**Response**: Top creators by trading volume with price change percentages

**Location**: shares.controller.ts:100

---

## Service Methods Implemented

### 1. prepareBuyTransaction(buyDto: BuySharesDto)
**Location**: shares.service.ts:268

**Logic**:
1. Validates creator exists and shares unlocked
2. Gets share contract address from factory
3. Gets current price quote
4. Validates total cost <= maxPrice (slippage protection)
5. Encodes `buyShares(uint256 amount)` function call
6. Returns unsigned transaction with encoded data

**Gas Estimate**: 300,000 (conservative estimate for buy operation)

---

### 2. prepareSellTransaction(sellDto: SellSharesDto)
**Location**: shares.service.ts:333

**Logic**:
1. Validates creator exists and shares unlocked
2. Gets share contract address from factory
3. Gets current price quote
4. Validates net proceeds >= minPrice (slippage protection)
5. Encodes `sellShares(uint256 amount)` function call
6. Returns unsigned transaction with encoded data

**Gas Estimate**: 300,000 (conservative estimate for sell operation)

---

### 3. getChartData(creatorAddress: string, timeframe: string)
**Location**: shares.service.ts:396

**Logic**:
1. Validates creator and checks shares unlocked
2. Calculates time range based on timeframe
3. Fetches all transactions in time range from database
4. Groups transactions into time buckets
5. Calculates:
   - Average price per bucket
   - Total volume per bucket
   - Transaction count per bucket
6. Computes statistics:
   - Low/high prices in timeframe
   - Total volume
   - Price change percentage
7. Gets current price from smart contract
8. Returns formatted chart data

**Performance**: O(n) where n = number of transactions in timeframe

---

## DTOs Created

### 1. unsigned-transaction.dto.ts
**Exports**:
- `UnsignedTransactionDto`: Transaction data for frontend to sign
  - `to`: Target contract address
  - `data`: Encoded function call
  - `value`: ETH value (usually "0" for share trades)
  - `gasLimit`: Estimated gas limit
  - `description`: Human-readable description

- `BuySharesResponseDto`: Response for buy request
  - `unsignedTx`: Transaction to sign
  - `estimatedCost`: Total cost in USDC
  - `shares`: Number of shares
  - `creatorAddress`: Creator address
  - `shareContractAddress`: Share contract address

- `SellSharesResponseDto`: Response for sell request
  - `unsignedTx`: Transaction to sign
  - `estimatedProceeds`: Net proceeds after fees
  - `shares`: Number of shares
  - `creatorAddress`: Creator address
  - `shareContractAddress`: Share contract address

### 2. chart-data.dto.ts
**Exports**:
- `ChartDataPointDto`: Single data point
  - `timestamp`: Time of data point
  - `price`: Average price in period
  - `volume`: Trading volume in period
  - `transactions`: Transaction count in period

- `ShareChartDataDto`: Complete chart response
  - `creatorAddress`: Creator address
  - `timeframe`: Requested timeframe
  - `data`: Array of data points
  - `currentPrice`: Latest price
  - `lowPrice`: Lowest price in timeframe
  - `highPrice`: Highest price in timeframe
  - `totalVolume`: Total volume in timeframe
  - `priceChange`: Price change percentage

---

## Integration with Smart Contracts

### CreatorShare Contract
**Functions Called**:
- `buyShares(uint256 amount)`: Purchase shares (via unsigned transaction)
- `sellShares(uint256 amount)`: Sell shares (via unsigned transaction)
- `getBuyPrice(uint256 amount)`: Get buy price quote
- `getSellPrice(uint256 amount)`: Get sell price quote
- `getCurrentSupply()`: Get total shares issued

**Fee Structure**:
- Protocol fee: 2.5% (250 basis points)
- Creator fee: 2.5% (250 basis points)
- Total fee: 5% on all trades

### CreatorShareFactory Contract
**Functions Called**:
- `getShareContract(address creator)`: Get share contract address
- `getVolumeInfo(address creator)`: Check if shares unlocked

**Volume Threshold**: $30,000 USDC to unlock share trading

---

## Trading Workflow

### Buy Shares Flow:
1. **Frontend**: User selects amount to buy
2. **GET /shares/:address/price/buy**: Get current price quote
3. **Frontend**: User confirms and sets slippage tolerance (maxPrice)
4. **POST /shares/buy**: Backend generates unsigned transaction
5. **Frontend**: User signs transaction with wallet
6. **Frontend**: Submit signed transaction to blockchain
7. **On-Chain**: Share contract validates and executes trade
8. **Event**: `SharesPurchased` event emitted
9. **Backend**: Event listener updates database with transaction

### Sell Shares Flow:
1. **Frontend**: User selects amount to sell
2. **GET /shares/:address/price/sell**: Get current price quote
3. **Frontend**: User confirms and sets slippage tolerance (minPrice)
4. **POST /shares/sell**: Backend generates unsigned transaction
5. **Frontend**: User signs transaction with wallet
6. **Frontend**: Submit signed transaction to blockchain
7. **On-Chain**: Share contract validates user balance and executes trade
8. **Event**: `SharesSold` event emitted
9. **Backend**: Event listener updates database with transaction

---

## Testing Checklist

### Prerequisites
- [ ] Backend server running
- [ ] Database populated with test creators
- [ ] At least one creator with shares unlocked ($30K volume)
- [ ] Share contract deployed for test creator
- [ ] Test wallet with USDC balance
- [ ] USDC approved to share contract

### Test Scenarios

#### POST /shares/buy
- [ ] Buy 1 share with maxPrice sufficient (should return unsigned tx)
- [ ] Buy 10 shares with maxPrice sufficient
- [ ] Buy shares with maxPrice too low (should return 400 error)
- [ ] Buy shares for creator without share contract (should return 404)
- [ ] Buy shares for creator with shares locked (should return 400)
- [ ] Verify unsigned transaction contains correct:
  - [ ] Contract address (to)
  - [ ] Encoded function data (data)
  - [ ] Gas limit estimate
  - [ ] Description

#### POST /shares/sell
- [ ] Sell 1 share with minPrice acceptable (should return unsigned tx)
- [ ] Sell 5 shares with minPrice acceptable
- [ ] Sell shares with minPrice too high (should return 400 error)
- [ ] Sell shares for creator without share contract (should return 404)
- [ ] Sell shares for creator with shares locked (should return 400)
- [ ] Verify unsigned transaction contains correct data

#### GET /shares/:address/chart
- [ ] Get 24h chart data (should return hourly buckets)
- [ ] Get 7d chart data (should return 6-hour buckets)
- [ ] Get 30d chart data (should return daily buckets)
- [ ] Get all-time chart data (should return weekly buckets)
- [ ] Verify chart statistics:
  - [ ] currentPrice matches latest buy price
  - [ ] lowPrice <= highPrice
  - [ ] priceChange calculation is correct
  - [ ] totalVolume sums all bucket volumes
- [ ] Chart with no trading history (should return empty data array)
- [ ] Chart for creator without shares (should return 400)

#### Integration Tests
- [ ] Full buy flow: Get quote → Prepare tx → Sign → Submit → Verify DB update
- [ ] Full sell flow: Get quote → Prepare tx → Sign → Submit → Verify DB update
- [ ] Price impact: Buy large amount → Verify price increases
- [ ] Chart updates: Execute trades → Wait → Verify chart reflects new data
- [ ] Slippage protection: Price changes between quote and buy → Verify rejection

---

## Known Limitations

1. **Gas Estimates**: Currently hardcoded to 300,000. Could be improved with actual gas estimation from contract.

2. **Price Staleness**: Price quote and transaction preparation are separate calls. Price could change between them. Slippage protection (maxPrice/minPrice) mitigates this.

3. **Chart Performance**: For creators with thousands of transactions, chart generation could be slow. Consider caching or pre-aggregating data.

4. **Event Processing**: Not yet implemented. Need to add event listeners for `SharesPurchased` and `SharesSold` to automatically update database.

5. **Portfolio Endpoint**: User portfolio is in Users module at `/users/:id/portfolio`. Not duplicated in Shares module to avoid redundancy.

---

## Files Modified/Created

**Created**:
1. `/backend/src/modules/shares/dto/unsigned-transaction.dto.ts` - NEW
2. `/backend/src/modules/shares/dto/chart-data.dto.ts` - NEW

**Modified**:
3. `/backend/src/modules/shares/shares.controller.ts` - Added 3 endpoints
4. `/backend/src/modules/shares/shares.service.ts` - Added 3 service methods

**Existing** (No changes):
5. `/backend/src/modules/shares/dto/buy-shares.dto.ts`
6. `/backend/src/modules/shares/dto/sell-shares.dto.ts`
7. `/backend/src/modules/shares/dto/share-response.dto.ts`
8. `/backend/src/modules/shares/shares.module.ts`

---

## API Endpoints Summary

| Method | Endpoint | Purpose | New/Existing |
|--------|----------|---------|--------------|
| GET | `/shares/:address/price/buy` | Get buy price quote | Existing |
| GET | `/shares/:address/price/sell` | Get sell price quote | Existing |
| POST | `/shares/buy` | Prepare buy transaction | ✨ NEW |
| POST | `/shares/sell` | Prepare sell transaction | ✨ NEW |
| GET | `/shares/:address/chart` | Get price chart data | ✨ NEW |
| GET | `/shares/:address/history` | Get trading history | Existing |
| GET | `/shares/trending` | Get trending shares | Existing |

---

## Next Steps for Production

1. **Add Event Listeners**: Implement blockchain event processing
   - Listen for `SharesPurchased` events
   - Listen for `SharesSold` events
   - Update database automatically

2. **Improve Gas Estimation**: Use contract's `estimateGas` for accurate estimates

3. **Add Caching**: Cache chart data to improve performance
   - Redis cache for 1-minute TTL
   - Invalidate on new transactions

4. **Add Rate Limiting**: Especially for chart endpoint which is query-heavy

5. **Add Monitoring**: Track endpoint usage and performance

6. **Add WebSocket**: Real-time price updates for active traders

7. **Add Tests**: Unit tests and integration tests

8. **Fix Compilation Errors**: Resolve pre-existing TypeScript errors

---

## Swagger Documentation

All endpoints are documented with Swagger decorators:
- Full API documentation available at: `http://localhost:3000/api`
- All request/response types defined with `@ApiProperty`
- Example values provided where applicable
- Error responses documented with status codes

---

## Security Considerations

1. **Slippage Protection**: maxPrice/minPrice parameters protect against front-running

2. **Validation**: All inputs validated with class-validator decorators

3. **Read-Only Backend**: Backend NEVER executes trades, only generates unsigned transactions

4. **User Signing**: All transactions require user wallet signature

5. **On-Chain Validation**: Smart contracts validate all trade parameters

6. **No Private Keys**: Backend never handles private keys or executes transactions
