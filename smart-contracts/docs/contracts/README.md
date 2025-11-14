# Guessly Smart Contracts - Architecture & Overview

Complete technical documentation for the Guessly prediction market platform smart contracts on Base Chain.

## Table of Contents

- [System Overview](#system-overview)
- [Contract Architecture](#contract-architecture)
- [Contract Addresses](#contract-addresses)
- [Core Contracts](#core-contracts)
- [Contract Interactions](#contract-interactions)
- [Data Flow](#data-flow)
- [Gas Estimates](#gas-estimates)

---

## System Overview

Guessly is a prediction market platform with creator monetization through tradeable shares. The system consists of 5 core smart contracts:

1. **BondingCurve** - Library for quadratic pricing
2. **CreatorShare** - ERC20 tokens with bonding curve pricing
3. **CreatorShareFactory** - Factory for deploying creator shares
4. **OpinionMarket** - Prediction market with AMM
5. **FeeCollector** - Centralized fee management

**Key Features:**
- 💰 Quadratic bonding curve for fair share pricing
- 🎯 Binary and multi-outcome prediction markets
- 💎 Creator shares with dividend distribution
- 📊 Volume-based unlock mechanism ($30K threshold)
- 🔒 Multiple security layers (ReentrancyGuard, Ownable, Pausable)

---

## Contract Architecture

### Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                         Guessly Platform                             │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
         ┌────────────────────────────────────────────┐
         │           Users (Traders/Creators)          │
         └────────────────────────────────────────────┘
                   │                       │
                   │                       │
        ┌──────────▼─────────┐   ┌───────▼──────────┐
        │  OpinionMarket     │   │  CreatorShare    │
        │  (Predictions)     │   │  (Trading)       │
        └─────────┬──────────┘   └────────┬─────────┘
                  │                       │
                  │         ┌─────────────┴──────────┐
                  │         │                        │
        ┌─────────▼─────────▼────────┐    ┌─────────▼─────────┐
        │  CreatorShareFactory        │    │  BondingCurve     │
        │  (Volume Tracking)          │    │  (Library)        │
        └─────────┬───────────────────┘    └───────────────────┘
                  │
        ┌─────────▼─────────┐
        │  FeeCollector      │
        │  (Fees)            │
        └────────────────────┘
                  │
        ┌─────────▼─────────┐
        │  USDC Token        │
        │  (Base Chain)      │
        └────────────────────┘
```

### Component Relationships

```
┌──────────────────────────────────────────────────────────────┐
│                      Smart Contract Ecosystem                 │
├──────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌────────────────┐         ┌────────────────┐              │
│  │ OpinionMarket  │────────▶│ FeeCollector   │              │
│  │                │ Platform │                │              │
│  │  - Markets     │  Fees   │  - Share Fees  │              │
│  │  - Betting     │────────▶│  - Market Fees │              │
│  │  - Resolution  │         │  - Withdrawals │              │
│  └────────┬───────┘         └────────────────┘              │
│           │                                                   │
│           │ Volume                                            │
│           │ Updates                                           │
│           ▼                                                   │
│  ┌────────────────────┐    ┌────────────────┐               │
│  │ CreatorShareFactory│───▶│  CreatorShare  │               │
│  │                    │    │                │               │
│  │  - Volume Tracking │New │  - Buy/Sell    │               │
│  │  - Threshold Check │───▶│  - Dividends   │               │
│  │  - Deploy Shares   │    │  - Epochs      │               │
│  └────────────────────┘    └───────┬────────┘               │
│                                     │                         │
│                                     │ Uses                    │
│                                     ▼                         │
│                            ┌────────────────┐                │
│                            │ BondingCurve   │                │
│                            │   (Library)    │                │
│                            │                │                │
│                            │  - Price Calc  │                │
│                            │  - Buy/Sell    │                │
│                            └────────────────┘                │
│                                                               │
└──────────────────────────────────────────────────────────────┘
```

---

## Contract Addresses

### Base Sepolia Testnet (Chain ID: 84532)

| Contract | Address | Verified |
|----------|---------|----------|
| USDC (Mock) | `0x036CbD53842c5426634e7929541eC2318f3dCF7e` | ✅ |
| FeeCollector | *Deploy first* | - |
| CreatorShareFactory | *Deploy second* | - |
| OpinionMarket | *Deploy third* | - |

**Explorer:** https://sepolia.basescan.org

### Base Mainnet (Chain ID: 8453)

| Contract | Address | Verified |
|----------|---------|----------|
| USDC | `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913` | ✅ |
| FeeCollector | *To be deployed* | - |
| CreatorShareFactory | *To be deployed* | - |
| OpinionMarket | *To be deployed* | - |

**Explorer:** https://basescan.org

**Note:** Addresses are saved in `deployments/testnet.json` and `deployments/mainnet.json` after deployment.

---

## Core Contracts

### 1. BondingCurve.sol (Library)

**Purpose:** Calculates share prices using quadratic bonding curve formula.

**Key Functions:**
- `calculatePrice(supply)` - Price for single share
- `calculateBuyPrice(supply, amount)` - Total cost to buy
- `calculateSellPrice(supply, amount)` - Total proceeds from sell
- `getAverageBuyPrice(supply, amount)` - Average buy price
- `getAverageSellPrice(supply, amount)` - Average sell price

**Formula:**
```
Price = Supply² / 1400
Integration: Total Cost = (Supply₂³ - Supply₁³) / 4200
```

**Constants:**
- `MAX_SUPPLY`: 1000 shares
- `PRICE_DIVISOR`: 1400
- `PRECISION`: 1e18

**Test Coverage:** 100%

---

### 2. CreatorShare.sol (ERC20)

**Purpose:** Tradeable creator shares with bonding curve pricing and dividend distribution.

**Inheritance:** `ERC20, Ownable, ReentrancyGuard, Pausable`

**Key Features:**
- Quadratic bonding curve pricing via BondingCurve library
- 5% sell fee (2.5% platform, 2.5% reward pool)
- Epoch-based dividend distribution
- Max supply: 1000 shares
- Pausable for emergencies

**Key Functions:**
```solidity
buyShares(uint256 amount) external payable
sellShares(uint256 amount) external
claimDividends() external
finalizeEpoch() external (owner only)
withdrawPlatformFees(address recipient) external (owner only)
getPendingDividends(address user) external view returns (uint256)
```

**State Variables:**
- `currentSupply` - Current circulating supply
- `currentEpoch` - Current epoch number
- `rewardPool` - Accumulated rewards for current epoch
- `platformFees` - Accumulated platform fees

**Events:**
```solidity
event SharesBought(address indexed buyer, uint256 amount, uint256 cost)
event SharesSold(address indexed seller, uint256 amount, uint256 proceeds, uint256 fee)
event DividendsClaimed(address indexed user, uint256 amount)
event EpochFinalized(uint256 indexed epoch, uint256 rewardPool, uint256 totalShares)
```

**Test Coverage:** 100%

---

### 3. CreatorShareFactory.sol

**Purpose:** Factory contract for deploying and managing creator share contracts.

**Inheritance:** `Ownable`

**Key Features:**
- $30,000 USDC volume threshold for unlock
- One share contract per creator (enforced)
- Whitelisted market contracts for volume updates
- Tracks all deployed shares

**Key Functions:**
```solidity
createCreatorShares(address creator, string name, string symbol) external returns (address)
updateCreatorVolume(address creator, uint256 volume) external (markets only)
addMarketContract(address market) external (owner only)
removeMarketContract(address market) external (owner only)
getCreatorVolume(address creator) external view returns (uint256)
isSharesUnlocked(address creator) external view returns (bool)
canCreateShares(address creator) external view returns (bool, string)
```

**Constants:**
- `VOLUME_THRESHOLD`: 30,000,000,000 (30K USDC with 6 decimals)

**State Variables:**
- `creatorTotalVolume` - Accumulated volume per creator
- `sharesUnlocked` - Unlock status per creator
- `creatorShareContract` - Share contract address per creator
- `whitelistedMarkets` - Approved market contracts
- `allCreatorShares` - Array of all deployed shares

**Events:**
```solidity
event SharesCreated(address indexed creator, address indexed shareContract)
event VolumeUpdated(address indexed creator, uint256 volume, uint256 newTotal)
event SharesUnlocked(address indexed creator, uint256 finalVolume)
event MarketContractAdded(address indexed market)
event MarketContractRemoved(address indexed market)
```

**Test Coverage:** 97.5%

---

### 4. OpinionMarket.sol

**Purpose:** Prediction market with AMM pricing for binary and multi-outcome markets.

**Inheritance:** `Ownable, ReentrancyGuard`

**Key Features:**
- 2-4 outcomes per market
- 6 hours to 7 days duration
- 1.5% trading fees (0.75% platform, 0.6% creator, 0.15% shareholders)
- AMM-based share pricing
- Manual admin resolution
- Proportional payouts to winners

**Key Functions:**
```solidity
createMarket(string title, string[] outcomes, uint256 duration, string description) external returns (uint256)
placeBet(uint256 marketId, uint256 outcome, uint256 amount) external
resolveMarket(uint256 marketId, uint256 winningOutcome) external (owner only)
claimWinnings(uint256 marketId) external
pauseMarket(uint256 marketId) external (owner only)
unpauseMarket(uint256 marketId) external (owner only)
getMarketInfo(uint256 marketId) external view returns (Market)
getUserPosition(uint256 marketId, address user) external view returns (uint256[])
getOutcomeProbability(uint256 marketId, uint256 outcome) external view returns (uint256)
```

**Market Struct:**
```solidity
struct Market {
    uint256 id;
    address creator;
    string title;
    string description;
    string[] outcomes;
    uint256 endTime;
    MarketStatus status;
    uint256 totalVolume;
    uint256 winningOutcome;
    bool paused;
    uint256 createdAt;
}
```

**Fee Breakdown:**
- Total: 1.5% (150 bps)
- Platform: 0.75% (75 bps) → FeeCollector
- Creator: 0.6% (60 bps) → Creator directly
- Shareholders: 0.15% (15 bps) → Tracked in Factory

**Events:**
```solidity
event MarketCreated(uint256 indexed marketId, address indexed creator)
event BetPlaced(uint256 indexed marketId, address indexed user, uint256 outcome, uint256 amount, uint256 shares)
event MarketResolved(uint256 indexed marketId, uint256 winningOutcome)
event WinningsClaimed(uint256 indexed marketId, address indexed user, uint256 amount)
event FeesCollected(uint256 indexed marketId, uint256 platform, uint256 creator, uint256 shareholder)
```

**Test Coverage:** 96.88%

---

### 5. FeeCollector.sol

**Purpose:** Centralized fee collection and treasury management.

**Inheritance:** `Ownable`

**Key Features:**
- Collects fees from CreatorShare and OpinionMarket
- Separate tracking by source
- Owner-controlled withdrawals
- Whitelist security

**Key Functions:**
```solidity
depositShareFees(uint256 amount) external (whitelisted only)
depositMarketFees(uint256 amount) external (whitelisted only)
withdraw(address recipient, uint256 amount) external (owner only)
addDepositor(address depositor) external (owner only)
removeDepositor(address depositor) external (owner only)
getTotalFees() external view returns (uint256)
getShareFees() external view returns (uint256)
getMarketFees() external view returns (uint256)
getBalance() external view returns (uint256)
```

**State Variables:**
- `totalShareFees` - Cumulative fees from CreatorShare
- `totalMarketFees` - Cumulative fees from OpinionMarket
- `whitelistedDepositors` - Approved depositor contracts

**Events:**
```solidity
event FeesDeposited(address indexed source, string sourceType, uint256 amount)
event FeesWithdrawn(address indexed recipient, uint256 amount)
event DepositorWhitelisted(address indexed depositor)
event DepositorRemoved(address indexed depositor)
```

**Test Coverage:** 100%

---

## Contract Interactions

### User Flow: Creating and Trading Shares

```
1. Creator participates in markets
   ↓
2. OpinionMarket calls factory.updateCreatorVolume()
   ↓
3. Factory tracks volume and unlocks at $30K
   ↓
4. Anyone can call factory.createCreatorShares()
   ↓
5. CreatorShare contract deployed
   ↓
6. Users buy/sell shares via bonding curve
   ↓
7. Fees collected → FeeCollector
   ↓
8. Creator finalizes epochs → dividends distributed
```

### User Flow: Prediction Market

```
1. Creator calls opinionMarket.createMarket()
   ↓
2. Users call opinionMarket.placeBet()
   ↓
3. Fees distributed:
   - Platform fee → FeeCollector
   - Creator fee → Creator wallet
   - Shareholder fee → Tracked in Factory
   ↓
4. Market ends (time-based)
   ↓
5. Admin calls opinionMarket.resolveMarket()
   ↓
6. Winners call opinionMarket.claimWinnings()
   ↓
7. Proportional USDC payouts
```

### Volume Tracking Flow

```
┌─────────────────┐
│  OpinionMarket  │
│  placeBet()     │
└────────┬────────┘
         │
         │ 1. Reports total bet amount
         ▼
┌─────────────────────────┐
│ CreatorShareFactory     │
│ updateCreatorVolume()   │
└────────┬────────────────┘
         │
         │ 2. Accumulates volume
         │ 3. Checks threshold
         ▼
    ┌────────┐
    │Unlocked│ (at $30K)
    └────┬───┘
         │
         │ 4. Enables share creation
         ▼
┌─────────────────┐
│  CreatorShare   │
│  Deploy         │
└─────────────────┘
```

---

## Data Flow

### Fee Flow Diagram

```
User Bet (1000 USDC)
         │
         ├─ 1.5% Fee (15 USDC)
         │  ├─ 0.75% → FeeCollector (7.5 USDC)
         │  ├─ 0.6%  → Creator Wallet (6 USDC)
         │  └─ 0.15% → Factory Tracking (1.5 USDC)
         │
         └─ 98.5% → Market Pool (985 USDC)


Share Sale (1000 USDC proceeds)
         │
         ├─ 5% Fee (50 USDC)
         │  ├─ 2.5% → FeeCollector (25 USDC)
         │  └─ 2.5% → Reward Pool (25 USDC)
         │
         └─ 95% → User (950 USDC)
```

### State Update Flow

```
Transaction: placeBet(marketId, outcome, amount)
         │
         ├─ 1. USDC Transfer (User → Contract)
         │
         ├─ 2. Calculate Shares & Fees
         │
         ├─ 3. Update State:
         │     ├─ userOutcomeShares[marketId][user][outcome] += shares
         │     ├─ totalOutcomeShares[marketId][outcome] += shares
         │     ├─ outcomeReserves[marketId][outcome] += amountAfterFee
         │     └─ market.totalVolume += amount
         │
         ├─ 4. Distribute Fees:
         │     ├─ USDC Transfer → FeeCollector
         │     ├─ USDC Transfer → Creator
         │     └─ factory.updateCreatorVolume()
         │
         └─ 5. Emit Events
```

---

## Gas Estimates

### Typical Transaction Costs (Base Chain)

| Operation | Estimated Gas | Est. Cost (@ 0.1 gwei) |
|-----------|---------------|------------------------|
| **CreatorShare** | | |
| `buyShares(100)` | ~150,000 | ~$0.015 |
| `sellShares(100)` | ~130,000 | ~$0.013 |
| `claimDividends()` | ~80,000 | ~$0.008 |
| `finalizeEpoch()` | ~100,000 | ~$0.010 |
| **OpinionMarket** | | |
| `createMarket()` | ~300,000 | ~$0.030 |
| `placeBet()` | ~200,000 | ~$0.020 |
| `resolveMarket()` | ~80,000 | ~$0.008 |
| `claimWinnings()` | ~120,000 | ~$0.012 |
| **CreatorShareFactory** | | |
| `createCreatorShares()` | ~2,500,000 | ~$0.250 |
| `updateCreatorVolume()` | ~60,000 | ~$0.006 |
| **FeeCollector** | | |
| `depositShareFees()` | ~70,000 | ~$0.007 |
| `depositMarketFees()` | ~70,000 | ~$0.007 |
| `withdraw()` | ~80,000 | ~$0.008 |

**Note:** Gas costs on Base are typically very low. Estimates may vary based on network congestion.

---

## Testing Coverage

### Overall Coverage

```
File                      | Statements | Functions | Lines  |
--------------------------|------------|-----------|--------|
BondingCurve.sol          | 100%       | 100%      | 100%   |
CreatorShare.sol          | 100%       | 100%      | 100%   |
CreatorShareFactory.sol   | 97.5%      | 100%      | 97.96% |
OpinionMarket.sol         | 96.88%     | 92.86%    | 97.89% |
FeeCollector.sol          | 100%       | 100%      | 100%   |
--------------------------|------------|-----------|--------|
Overall                   | 97.41%     | 94.29%    | 97.98% |
```

**Total Tests:** 219 passing (100% pass rate)

---

## Contract Dependencies

```
External Dependencies:
├─ @openzeppelin/contracts@5.x
│  ├─ token/ERC20 (CreatorShare)
│  ├─ access/Ownable (All except BondingCurve)
│  ├─ utils/ReentrancyGuard (CreatorShare, OpinionMarket)
│  └─ utils/Pausable (CreatorShare)
└─ No external oracles or dependencies

Internal Dependencies:
├─ CreatorShare → BondingCurve (library)
├─ OpinionMarket → CreatorShareFactory (volume tracking)
├─ OpinionMarket → FeeCollector (fee deposits)
└─ CreatorShare → FeeCollector (fee deposits)
```

---

## Security Features

### Access Control

| Contract | Owner Functions | Whitelist Functions |
|----------|----------------|---------------------|
| CreatorShare | `finalizeEpoch`, `withdrawPlatformFees`, `pause`, `unpause` | None |
| CreatorShareFactory | `addMarketContract`, `removeMarketContract` | `updateCreatorVolume` (markets) |
| OpinionMarket | `resolveMarket`, `pauseMarket`, `unpauseMarket` | None |
| FeeCollector | `withdraw`, `addDepositor`, `removeDepositor` | `depositShareFees`, `depositMarketFees` |

### Protection Mechanisms

- ✅ **ReentrancyGuard** - Prevents reentrancy attacks
- ✅ **Ownable** - Access control for admin functions
- ✅ **Pausable** - Emergency stop mechanism
- ✅ **SafeERC20** - Safe token transfers
- ✅ **Custom Errors** - Gas-efficient error handling
- ✅ **Checks-Effects-Interactions** - State updates before external calls

---

## Additional Resources

- [Integration Guide](./INTEGRATION.md) - Backend integration documentation
- [Security Guide](./SECURITY.md) - Security considerations and procedures
- [Deployment Guide](../DEPLOYMENT.md) - Deployment instructions
- [Individual Contract Docs](../) - Detailed documentation per contract

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2024-01 | Initial deployment |

---

**Created for Guessly Prediction Market Platform**
