# OpinionMarket Contract Documentation

## Overview

OpinionMarket is a prediction market contract that enables users to bet on binary or multi-outcome markets using an Automated Market Maker (AMM) for pricing. Markets are created by users, run for a specified duration, and are manually resolved by the platform admin.

## Key Features

- ✅ **Binary & Multi-Outcome Markets** - Support for 2-4 outcomes per market
- ✅ **Flexible Duration** - Markets run from 6 hours to 7 days
- ✅ **AMM Pricing** - Simplified automated market maker for share pricing
- ✅ **Fee Distribution** - 1.5% total fees split across platform, creator, and shareholders
- ✅ **USDC Settlement** - All trades in USDC (6 decimals)
- ✅ **Manual Resolution** - Admin-controlled market resolution
- ✅ **Proportional Payouts** - Winners receive payouts based on share ownership
- ✅ **Pause Functionality** - Emergency pause for individual markets
- ✅ **Volume Tracking** - Integration with CreatorShareFactory
- ✅ **Comprehensive Events** - Full audit trail of all market activities

## Contract Information

```solidity
contract OpinionMarket is Ownable, ReentrancyGuard
```

**Constants:**
- `TOTAL_FEE_BPS` = 150 (1.5%)
- `PLATFORM_FEE_BPS` = 75 (0.75%)
- `CREATOR_FEE_BPS` = 60 (0.6%)
- `SHAREHOLDER_FEE_BPS` = 15 (0.15%)
- `BPS_DENOMINATOR` = 10000 (100%)
- `MIN_DURATION` = 6 hours
- `MAX_DURATION` = 7 days
- `MIN_OUTCOMES` = 2
- `MAX_OUTCOMES` = 4
- `INITIAL_LIQUIDITY` = 1000e6 (reserved for future AMM enhancements)

## Deployment

```solidity
constructor(
    address _usdc,
    address _factory,
    address _platformFeeCollector,
    address _owner
)
```

**Parameters:**
- `_usdc` - USDC token address on Base: `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913`
- `_factory` - CreatorShareFactory contract address
- `_platformFeeCollector` - Address to receive platform fees
- `_owner` - Initial owner address

**Example:**
```solidity
OpinionMarket market = new OpinionMarket(
    0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913, // Base USDC
    factoryAddress,
    platformFeeCollectorAddress,
    msg.sender // Owner
);
```

## Core Functions

### 1. Create Market

```solidity
function createMarket(
    string memory title,
    string[] memory outcomes,
    uint256 duration,
    string memory description
) external returns (uint256 marketId)
```

Creates a new prediction market.

**Parameters:**
- `title` - Market title (e.g., "Will ETH reach $5000 by EOY?")
- `outcomes` - Array of outcome strings (2-4 outcomes)
- `duration` - Market duration in seconds (6 hours to 7 days)
- `description` - Detailed market description

**Requirements:**
- 2-4 outcomes
- Duration between 6 hours and 7 days
- No empty strings

**Returns:**
- `marketId` - Unique market identifier

**Example:**
```solidity
string[] memory outcomes = new string[](2);
outcomes[0] = "Yes";
outcomes[1] = "No";

uint256 marketId = market.createMarket(
    "Will Bitcoin reach $100K in 2024?",
    outcomes,
    7 days,
    "Market resolves based on CoinGecko price at end time"
);
```

**Events Emitted:**
```solidity
event MarketCreated(
    uint256 indexed marketId,
    address indexed creator,
    string title,
    string[] outcomes,
    uint256 endTime,
    uint256 timestamp
)
```

---

### 2. Place Bet

```solidity
function placeBet(
    uint256 marketId,
    uint256 outcome,
    uint256 amount
) external nonReentrant
```

Places a bet on a specific outcome in a market.

**Parameters:**
- `marketId` - Market ID to bet on
- `outcome` - Outcome index (0-based)
- `amount` - Amount in USDC (6 decimals)

**Requirements:**
- Market must exist and be active
- Market not ended or paused
- Valid outcome index
- Amount > 0
- Sufficient USDC balance and approval

**Fee Breakdown (1.5% total):**
- Platform: 0.75% (75 basis points)
- Creator: 0.6% (60 basis points)
- Shareholders: 0.15% (15 basis points)

**Behavior:**
1. Transfers USDC from user
2. Calculates fees (1.5% total)
3. Calculates shares using AMM formula
4. Updates user position
5. Updates outcome reserves
6. Distributes fees
7. Reports volume to CreatorShareFactory

**Example:**
```solidity
// Approve USDC first
usdc.approve(address(market), 1000e6);

// Bet 1000 USDC on outcome 0
market.placeBet(marketId, 0, 1000e6);
```

**Events Emitted:**
```solidity
event BetPlaced(
    uint256 indexed marketId,
    address indexed user,
    uint256 outcome,
    uint256 amount,
    uint256 shares,
    uint256 timestamp
)

event FeesCollected(
    uint256 indexed marketId,
    uint256 platformFee,
    uint256 creatorFee,
    uint256 shareholderFee,
    uint256 timestamp
)
```

---

### 3. Resolve Market (Owner Only)

```solidity
function resolveMarket(
    uint256 marketId,
    uint256 winningOutcome
) external onlyOwner
```

Resolves a market with the winning outcome.

**Parameters:**
- `marketId` - Market ID to resolve
- `winningOutcome` - Index of the winning outcome

**Requirements:**
- Caller must be owner
- Market must exist
- Market must have ended (current time >= endTime)
- Market not already resolved
- Valid outcome index

**Effects:**
- Sets market status to Resolved
- Records winning outcome
- Enables winners to claim payouts

**Example:**
```solidity
// After market ends, resolve with outcome 0 as winner
market.resolveMarket(marketId, 0);
```

**Events Emitted:**
```solidity
event MarketResolved(
    uint256 indexed marketId,
    uint256 winningOutcome,
    uint256 timestamp
)
```

---

### 4. Claim Winnings

```solidity
function claimWinnings(uint256 marketId) external nonReentrant
```

Allows winners to claim their proportional share of the market pool.

**Parameters:**
- `marketId` - Market ID to claim from

**Requirements:**
- Market must be resolved
- User must have winning shares
- User must not have already claimed

**Payout Calculation:**
```solidity
userPayout = (totalPayout × userShares) / totalWinningShares
```

Where:
- `totalPayout` = sum of all outcome reserves (after fees)
- `userShares` = user's shares in winning outcome
- `totalWinningShares` = total shares in winning outcome

**Example:**
```solidity
// After market is resolved
market.claimWinnings(marketId);
// Receives proportional USDC payout
```

**Events Emitted:**
```solidity
event WinningsClaimed(
    uint256 indexed marketId,
    address indexed user,
    uint256 amount,
    uint256 timestamp
)
```

---

### 5. Pause Market (Owner Only)

```solidity
function pauseMarket(uint256 marketId) external onlyOwner
```

Pauses a market, preventing new bets.

**Parameters:**
- `marketId` - Market ID to pause

**Requirements:**
- Caller must be owner
- Market must exist

**Events Emitted:**
```solidity
event MarketPaused(uint256 indexed marketId, uint256 timestamp)
```

---

### 6. Unpause Market (Owner Only)

```solidity
function unpauseMarket(uint256 marketId) external onlyOwner
```

Unpauses a market, allowing bets again.

**Parameters:**
- `marketId` - Market ID to unpause

**Requirements:**
- Caller must be owner
- Market must exist

**Events Emitted:**
```solidity
event MarketUnpaused(uint256 indexed marketId, uint256 timestamp)
```

---

### 7. Get Market Info

```solidity
function getMarketInfo(uint256 marketId) external view returns (Market memory market)
```

Returns complete market information.

**Parameters:**
- `marketId` - Market ID

**Returns:**
```solidity
struct Market {
    uint256 id;
    address creator;
    string title;
    string description;
    string[] outcomes;
    uint256 endTime;
    MarketStatus status; // Active, Resolved, Disputed, Cancelled
    uint256 totalVolume;
    uint256 winningOutcome;
    bool paused;
    uint256 createdAt;
}
```

---

### 8. Get User Position

```solidity
function getUserPosition(
    uint256 marketId,
    address user
) external view returns (uint256[] memory shares)
```

Returns user's shares across all outcomes.

**Parameters:**
- `marketId` - Market ID
- `user` - User address

**Returns:**
- Array of shares per outcome (length = number of outcomes)

**Example:**
```solidity
uint256[] memory position = market.getUserPosition(marketId, userAddress);
// position[0] = shares in outcome 0
// position[1] = shares in outcome 1
// ...
```

---

### 9. Get Outcome Probability

```solidity
function getOutcomeProbability(
    uint256 marketId,
    uint256 outcome
) external view returns (uint256 probability)
```

Returns implied probability for an outcome based on reserves.

**Parameters:**
- `marketId` - Market ID
- `outcome` - Outcome index

**Returns:**
- Probability in basis points (10000 = 100%)

**Formula:**
```
probability = (outcomeReserve / totalReserves) × 10000
```

**Example:**
```solidity
uint256 prob = market.getOutcomeProbability(marketId, 0);
// prob = 6500 means 65% implied probability
```

---

### 10. Calculate Shares

```solidity
function calculateShares(
    uint256 marketId,
    uint256 outcome,
    uint256 amount
) public view returns (uint256 shares)
```

Calculates shares received for a bet amount (after fees).

**Parameters:**
- `marketId` - Market ID
- `outcome` - Outcome index
- `amount` - Amount after fees

**Returns:**
- Number of shares

**Current Implementation:**
- Simplified 1:1 ratio (shares = amount)
- Future: Can be upgraded to LMSR or constant product formula

---

### 11. Update Platform Fee Collector (Owner Only)

```solidity
function updatePlatformFeeCollector(address newCollector) external onlyOwner
```

Updates the platform fee collector address.

**Parameters:**
- `newCollector` - New collector address

**Requirements:**
- Caller must be owner
- Address must not be zero

---

## State Variables

| Variable | Type | Access | Description |
|----------|------|--------|-------------|
| `usdc` | `IERC20` | Public | USDC token contract |
| `factory` | `CreatorShareFactory` | Public | Factory contract |
| `platformFeeCollector` | `address` | Public | Platform fee recipient |
| `nextMarketId` | `uint256` | Public | Next market ID counter |
| `markets` | `mapping(uint256 => Market)` | Public | Market data |
| `outcomeReserves` | `mapping(uint256 => mapping(uint256 => uint256))` | Public | Reserves per outcome |
| `userOutcomeShares` | `mapping(uint256 => mapping(address => mapping(uint256 => uint256)))` | Public | User shares |
| `totalOutcomeShares` | `mapping(uint256 => mapping(uint256 => uint256))` | Public | Total shares per outcome |
| `hasClaimed` | `mapping(uint256 => mapping(address => bool))` | Public | Claim tracking |

## Enums

```solidity
enum MarketStatus {
    Active,      // Market is accepting bets
    Resolved,    // Market has been resolved
    Disputed,    // Market is under dispute (future)
    Cancelled    // Market was cancelled (future)
}
```

## Events

```solidity
event MarketCreated(
    uint256 indexed marketId,
    address indexed creator,
    string title,
    string[] outcomes,
    uint256 endTime,
    uint256 timestamp
);

event BetPlaced(
    uint256 indexed marketId,
    address indexed user,
    uint256 outcome,
    uint256 amount,
    uint256 shares,
    uint256 timestamp
);

event MarketResolved(
    uint256 indexed marketId,
    uint256 winningOutcome,
    uint256 timestamp
);

event WinningsClaimed(
    uint256 indexed marketId,
    address indexed user,
    uint256 amount,
    uint256 timestamp
);

event FeesCollected(
    uint256 indexed marketId,
    uint256 platformFee,
    uint256 creatorFee,
    uint256 shareholderFee,
    uint256 timestamp
);

event MarketPaused(uint256 indexed marketId, uint256 timestamp);

event MarketUnpaused(uint256 indexed marketId, uint256 timestamp);
```

## Custom Errors

```solidity
error MarketDoesNotExist();      // Market ID not found
error MarketNotActive();          // Market not in Active status
error MarketEnded();              // Current time >= endTime
error MarketIsPaused();           // Market is paused
error InvalidOutcomeCount();      // Outcomes not in range [2, 4]
error InvalidDuration();          // Duration not in range [6h, 7d]
error InvalidOutcome();           // Outcome index out of bounds
error AmountCannotBeZero();       // Bet amount is 0
error MarketNotResolved();        // Market not yet resolved
error MarketAlreadyResolved();    // Market already resolved
error NoWinningsToClaim();        // User has no winning shares
error AlreadyClaimed();           // User already claimed
error MarketNotEnded();           // Market endTime not reached
```

## Usage Flow

### 1. Create Market

```solidity
// Anyone can create a market
string[] memory outcomes = new string[](2);
outcomes[0] = "Yes";
outcomes[1] = "No";

uint256 marketId = market.createMarket(
    "Will Bitcoin reach $100K in 2024?",
    outcomes,
    7 days,
    "Market resolves based on CoinGecko BTC/USD price at end time"
);
```

### 2. Users Place Bets

```solidity
// User 1 bets 1000 USDC on "Yes" (outcome 0)
usdc.approve(address(market), 1000e6);
market.placeBet(marketId, 0, 1000e6);

// User 2 bets 500 USDC on "No" (outcome 1)
usdc.approve(address(market), 500e6);
market.placeBet(marketId, 1, 500e6);
```

### 3. Check Market Status

```solidity
// View market info
Market memory info = market.getMarketInfo(marketId);
console.log("Total Volume:", info.totalVolume);
console.log("Ends at:", info.endTime);

// Check outcome probabilities
uint256 prob0 = market.getOutcomeProbability(marketId, 0);
uint256 prob1 = market.getOutcomeProbability(marketId, 1);
console.log("Outcome 0 probability:", prob0 / 100, "%");
console.log("Outcome 1 probability:", prob1 / 100, "%");

// Check user position
uint256[] memory position = market.getUserPosition(marketId, user1);
console.log("User1 shares in outcome 0:", position[0]);
console.log("User1 shares in outcome 1:", position[1]);
```

### 4. Resolve Market (Owner)

```solidity
// After market ends
// Wait until block.timestamp >= market.endTime

// Owner resolves with winning outcome
market.resolveMarket(marketId, 0); // "Yes" wins
```

### 5. Claim Winnings

```solidity
// Winners claim their payouts
market.claimWinnings(marketId);
// Receives proportional share of the pool
```

## Integration Example

### With CreatorShareFactory

```solidity
// OpinionMarket automatically reports volume to factory
function placeBet(uint256 marketId, uint256 outcome, uint256 amount) external {
    // ... place bet logic ...

    // Report volume to factory (includes shareholder fee)
    factory.updateCreatorVolume(market.creator, amount);

    // This helps creators reach the $30K threshold to unlock shares
}
```

### Multi-Market Ecosystem

```solidity
// Deploy factory
CreatorShareFactory factory = new CreatorShareFactory(usdc, owner);

// Deploy opinion market
OpinionMarket market1 = new OpinionMarket(usdc, factory, feeCollector, owner);
OpinionMarket market2 = new OpinionMarket(usdc, factory, feeCollector, owner);

// Whitelist markets in factory
factory.addMarketContract(address(market1));
factory.addMarketContract(address(market2));

// Now both markets report volume to factory
// Creators accumulate volume across all markets
```

## Fee Distribution Breakdown

**Example: 1000 USDC bet**

```
Total Bet: 1000 USDC
├─ Total Fee (1.5%): 15 USDC
│  ├─ Platform Fee (0.75%): 7.5 USDC → platformFeeCollector
│  ├─ Creator Fee (0.6%): 6 USDC → market creator
│  └─ Shareholder Fee (0.15%): 1.5 USDC → stays in contract*
└─ To Market Pool (98.5%): 985 USDC

* Shareholder fee is tracked via factory for future CreatorShare dividends
```

**Code Implementation:**
```solidity
uint256 platformFee = (amount * 75) / 10000;      // 0.75%
uint256 creatorFee = (amount * 60) / 10000;       // 0.6%
uint256 shareholderFee = (amount * 15) / 10000;   // 0.15%

// Platform and creator fees paid immediately
usdc.safeTransfer(platformFeeCollector, platformFee);
usdc.safeTransfer(market.creator, creatorFee);

// Shareholder fee reported to factory
factory.updateCreatorVolume(market.creator, amount);
```

## Payout Calculation Example

**Scenario:**
- Market has 2 outcomes: Yes / No
- Yes wins
- Total bets: 1500 USDC (after 1.5% fees = ~1477.5 USDC in pool)

**Bettors:**
- User A: Bet 1000 USDC on Yes → 985 shares
- User B: Bet 500 USDC on Yes → 492.5 shares
- User C: Bet 1000 USDC on No → 0 payout

**Total winning shares:** 1477.5

**Payouts:**
```solidity
User A payout = (1477.5 × 985) / 1477.5 = 985 USDC
User B payout = (1477.5 × 492.5) / 1477.5 = 492.5 USDC
User C payout = 0 USDC (lost)
```

## Testing

Run comprehensive test suite:
```bash
npm run test -- --grep "OpinionMarket"
```

**Test Coverage - 48 tests passing:**

```
OpinionMarket
  Deployment (5 tests)
    ✔ USDC address
    ✔ Factory address
    ✔ Platform fee collector
    ✔ Fee constants
    ✔ Market ID initialization

  Market Creation (10 tests)
    ✔ Binary markets (2 outcomes)
    ✔ Multi-outcome markets (4 outcomes)
    ✔ End time calculation
    ✔ Reserve initialization
    ✔ Outcome count validation
    ✔ Duration validation
    ✔ Edge cases (6h, 7d)

  Placing Bets (10 tests)
    ✔ Successful bets
    ✔ Share calculation
    ✔ Reserve updates
    ✔ Fee distribution
    ✔ Volume tracking
    ✔ Multiple bets
    ✔ Validation checks
    ✔ Pause functionality

  Market Resolution (7 tests)
    ✔ Owner resolution
    ✔ Status updates
    ✔ Winning outcome
    ✔ Access control
    ✔ Time validation
    ✔ Double resolution prevention

  Claiming Winnings (6 tests)
    ✔ Successful claims
    ✔ Payout calculations
    ✔ Claim tracking
    ✔ Validation checks
    ✔ Multiple winners

  Pause/Unpause (3 tests)
    ✔ Owner controls
    ✔ Access control

  View Functions (2 tests)
    ✔ User positions
    ✔ Probability calculations

  Integration (5 tests)
    ✔ Factory volume updates
    ✔ Volume accumulation

Total: 48 passing (1s)
```

## Security Considerations

### 1. Access Control
- ✅ Owner-only market resolution
- ✅ Owner-only pause/unpause
- ✅ Anyone can create markets
- ✅ Anyone can place bets (if not paused)

### 2. Reentrancy Protection
- ✅ `nonReentrant` on `placeBet()`
- ✅ `nonReentrant` on `claimWinnings()`
- ✅ Checks-Effects-Interactions pattern
- ✅ State updates before external calls

### 3. Market Integrity
- ✅ Markets cannot be resolved before endTime
- ✅ Markets cannot be resolved twice
- ✅ Invalid outcomes rejected
- ✅ Paused markets block new bets

### 4. Payout Security
- ✅ Proportional payouts only
- ✅ One claim per user per market
- ✅ Only winners can claim
- ✅ Sufficient balance checks via SafeERC20

### 5. Fee Distribution
- ✅ Fees calculated before market pool
- ✅ Immediate platform/creator payments
- ✅ Factory integration for shareholder tracking
- ✅ No fee manipulation possible

### 6. Input Validation
- ✅ Zero address checks
- ✅ Zero amount checks
- ✅ Outcome count bounds [2, 4]
- ✅ Duration bounds [6h, 7d]
- ✅ Market existence checks

## Gas Optimization

- Immutable USDC and factory addresses
- Custom errors instead of revert strings
- View functions for queries
- Minimal storage writes
- Efficient mappings
- No unnecessary loops in critical paths

## AMM Implementation

### Current (Simplified)

The current implementation uses a 1:1 share allocation:
```solidity
shares = amount (after fees)
```

**Probability Calculation:**
```solidity
probability = (outcomeReserve / totalReserves) × 10000
```

### Future Enhancements

For more sophisticated pricing, consider:

**1. Constant Product (Uniswap-style):**
```solidity
k = reserve0 × reserve1 × ... × reserveN
```

**2. LMSR (Logarithmic Market Scoring Rule):**
```solidity
price_i = exp(q_i / b) / Σ(exp(q_j / b))
```

**3. Dynamic Liquidity:**
```solidity
// Use INITIAL_LIQUIDITY constant for bootstrapping
outcomeReserves[marketId][i] = INITIAL_LIQUIDITY;
```

## Common Patterns

### Check Market Before Betting
```solidity
Market memory info = market.getMarketInfo(marketId);
require(info.status == MarketStatus.Active, "Market not active");
require(block.timestamp < info.endTime, "Market ended");
require(!info.paused, "Market paused");
```

### Calculate Expected Payout
```solidity
function estimatePayout(
    uint256 marketId,
    address user,
    uint256 winningOutcome
) external view returns (uint256) {
    uint256 userShares = userOutcomeShares[marketId][user][winningOutcome];
    if (userShares == 0) return 0;

    uint256 totalWinningShares = totalOutcomeShares[marketId][winningOutcome];
    uint256 totalPayout = _calculateTotalPayout(marketId);

    return (totalPayout * userShares) / totalWinningShares;
}
```

### Monitor Creator Volume
```solidity
// Check if creator has reached threshold after market activity
uint256 creatorVolume = factory.getCreatorVolume(creator);
bool unlocked = factory.isSharesUnlocked(creator);

if (unlocked) {
    // Creator can now deploy CreatorShare contract
    factory.createCreatorShares(creator, "Name", "SYMBOL");
}
```

## Deployment Checklist

- [ ] Deploy CreatorShareFactory first
- [ ] Deploy OpinionMarket with factory address
- [ ] Whitelist OpinionMarket in factory
- [ ] Set platform fee collector
- [ ] Transfer ownership if needed
- [ ] Verify contracts on BaseScan
- [ ] Test market creation
- [ ] Test betting flow
- [ ] Test resolution and claims

## Future Enhancements

Potential improvements:
- [ ] Advanced AMM formulas (LMSR, constant product)
- [ ] Dynamic liquidity bootstrapping
- [ ] Dispute resolution mechanism
- [ ] Market cancellation with refunds
- [ ] Time-weighted probabilities
- [ ] Market categories and tags
- [ ] Oracle integration for auto-resolution
- [ ] Multi-token support (ETH, other stables)
- [ ] LP token system for liquidity providers
- [ ] Cross-market arbitrage detection

## Known Limitations

1. **Manual Resolution**: Requires owner intervention (could be automated with Chainlink)
2. **Simple AMM**: 1:1 share allocation (could use LMSR for better pricing)
3. **No Market Cancellation**: Once created, markets cannot be cancelled with refunds
4. **No Partial Claims**: Users must claim entire winnings at once
5. **No Selling Shares**: Users cannot sell shares before resolution

## License

MIT

---

**Created for Guessly Prediction Market Platform**
