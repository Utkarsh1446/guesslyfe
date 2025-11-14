# CreatorShare Contract Documentation

## Overview

CreatorShare is an ERC20 token with bonding curve pricing and dividend distribution for the Guessly prediction market platform. It enables creators to tokenize their influence and allows shareholders to earn dividends from trading fees.

## Key Features

- ✅ **ERC20 Token** - Fully compliant ERC20 implementation
- ✅ **Bonding Curve Pricing** - Dynamic pricing based on supply (Price = Supply² / 1400)
- ✅ **USDC Payment** - All transactions use USDC (6 decimals)
- ✅ **Sell Fee** - 5% fee on sells only (no buy fees)
- ✅ **Fee Distribution** - 50% to reward pool, 50% to platform
- ✅ **Dividend System** - Epoch-based dividend distribution to shareholders
- ✅ **Security** - ReentrancyGuard, Pausable, Ownable
- ✅ **Emergency Controls** - Pause/unpause functionality

## Contract Information

```solidity
contract CreatorShare is ERC20, Ownable, ReentrancyGuard, Pausable
```

**Inheritance:**
- `ERC20` - Standard token functionality
- `Ownable` - Access control for admin functions
- `ReentrancyGuard` - Protection against reentrancy attacks
- `Pausable` - Emergency pause functionality

**Constants:**
- `MAX_SUPPLY` = 1000 shares
- `SELL_FEE_PERCENT` = 5%
- `FEE_DENOMINATOR` = 100

## Deployment

```solidity
constructor(
    string memory _name,        // Token name (e.g., "Alice Creator Share")
    string memory _symbol,      // Token symbol (e.g., "ALICE")
    address _usdc,              // USDC address: 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913 (Base)
    address _owner              // Initial owner address
)
```

**Base USDC Address:** `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913`

## Core Functions

### 1. Buy Shares

```solidity
function buyShares(uint256 amount) external nonReentrant whenNotPaused
```

Purchase shares using USDC with bonding curve pricing.

**Parameters:**
- `amount` - Number of shares to buy

**Requirements:**
- Amount must be > 0
- Purchase must not exceed MAX_SUPPLY (1000)
- Caller must have approved sufficient USDC
- Contract must not be paused

**Events:**
```solidity
event SharesPurchased(
    address indexed buyer,
    uint256 amount,
    uint256 cost,
    uint256 timestamp
)
```

**Example:**
```solidity
// Approve USDC first
usdc.approve(creatorShareAddress, 1000e6); // Approve 1000 USDC

// Buy 10 shares
creatorShare.buyShares(10);
```

---

### 2. Sell Shares

```solidity
function sellShares(uint256 amount) external nonReentrant whenNotPaused
```

Sell shares for USDC with 5% fee deducted.

**Parameters:**
- `amount` - Number of shares to sell

**Requirements:**
- Amount must be > 0
- Caller must own sufficient shares
- Contract must not be paused

**Fee Distribution:**
- 5% total fee
- 2.5% → Reward pool (for shareholders)
- 2.5% → Platform fees

**Events:**
```solidity
event SharesSold(
    address indexed seller,
    uint256 amount,
    uint256 proceeds,  // Net proceeds after fee
    uint256 fee,
    uint256 timestamp
)
```

---

### 3. Get Buy Price

```solidity
function getBuyPrice(uint256 amount) external view returns (uint256 cost)
```

Calculate the cost to buy a specific number of shares.

**Parameters:**
- `amount` - Number of shares

**Returns:**
- `cost` - Total cost in USDC (6 decimals)

**Example:**
```solidity
uint256 cost = creatorShare.getBuyPrice(10);
// Returns cost in USDC (e.g., 238095 = 0.238095 USDC)
```

---

### 4. Get Sell Price

```solidity
function getSellPrice(uint256 amount) external view returns (uint256 proceeds)
```

Calculate net proceeds from selling shares (after 5% fee).

**Parameters:**
- `amount` - Number of shares

**Returns:**
- `proceeds` - Net proceeds in USDC (6 decimals) after fee

---

### 5. Finalize Epoch

```solidity
function finalizeEpoch() external onlyOwner
```

Finalize the current dividend epoch and start a new one.

**Only Owner** - This function can only be called by the contract owner.

**What it does:**
1. Snapshots current reward pool
2. Snapshots total shares
3. Resets reward pool to 0
4. Increments epoch number

**Events:**
```solidity
event EpochFinalized(
    uint256 indexed epochNumber,
    uint256 rewardPool,
    uint256 totalShares,
    uint256 timestamp
)
```

**Usage:**
```solidity
// Owner finalizes epoch (e.g., weekly/monthly)
creatorShare.finalizeEpoch();
```

---

### 6. Claim Dividends

```solidity
function claimDividends() external nonReentrant
```

Claim accumulated dividends from all unclaimed epochs.

**Requirements:**
- User must have held shares in past epochs
- Must have unclaimed dividends

**How it works:**
1. Calculates dividends from all unclaimed epochs
2. Transfers USDC to caller
3. Updates last claimed epoch

**Events:**
```solidity
event DividendsClaimed(
    address indexed user,
    uint256 amount,
    uint256 fromEpoch,
    uint256 toEpoch,
    uint256 timestamp
)
```

**Formula:**
```
User Dividend = (Reward Pool × User Shares) / Total Shares
```

---

### 7. Get Pending Dividends

```solidity
function getPendingDividends(address user) external view returns (uint256)
```

View function to check unclaimed dividends for a user.

**Parameters:**
- `user` - Address to check

**Returns:**
- Total pending dividend amount in USDC

---

### 8. Withdraw Platform Fees

```solidity
function withdrawPlatformFees(address recipient) external onlyOwner
```

Withdraw accumulated platform fees (owner only).

**Parameters:**
- `recipient` - Address to receive the fees

**Requirements:**
- Only owner can call
- Platform fees must be > 0
- Recipient cannot be zero address

---

### 9. Pause / Unpause

```solidity
function pause() external onlyOwner
function unpause() external onlyOwner
```

Emergency pause/unpause controls.

**When Paused:**
- ❌ Cannot buy shares
- ❌ Cannot sell shares
- ✅ Can still claim dividends
- ✅ Can still check prices

## Pricing Model

### Bonding Curve Formula

**Individual Share Price:**
```
Price(supply) = supply² / 1400
```

**Total Cost (Integration):**
```
Cost = (supply_end³ - supply_start³) / 4200
```

### Pricing Examples

| Shares | From Supply | Buy Cost (USDC) | Sell Proceeds (USDC)* |
|--------|-------------|-----------------|----------------------|
| 1 | 0 | 0.000238 | 0.000226 |
| 10 | 0 | 0.238 | 0.226 |
| 100 | 0 | 238.095 | 226.190 |
| 1000 | 0 | 238,095.238 | 226,190.476 |

*After 5% sell fee

## Dividend Distribution

### How Epochs Work

1. **Accumulation Phase**
   - Users buy/sell shares
   - 5% sell fees are collected
   - 50% goes to reward pool
   - 50% goes to platform

2. **Epoch Finalization**
   - Owner calls `finalizeEpoch()`
   - Reward pool snapshot taken
   - Total shares snapshot taken
   - Epoch increments

3. **Claiming Phase**
   - Users call `claimDividends()`
   - Receive proportional share of reward pool
   - Based on shares held at epoch finalization

### Example Scenario

```
Epoch 1:
- User A: 60 shares (60%)
- User B: 40 shares (40%)
- Reward Pool: 100 USDC

Owner finalizes epoch.

User A can claim: 60 USDC (60%)
User B can claim: 40 USDC (40%)
```

## State Variables

| Variable | Type | Description |
|----------|------|-------------|
| `usdc` | `IERC20` | USDC token contract |
| `currentSupply` | `uint256` | Current circulating supply |
| `rewardPool` | `uint256` | Current epoch reward pool |
| `platformFees` | `uint256` | Accumulated platform fees |
| `epochNumber` | `uint256` | Current epoch number |

## Events

```solidity
event SharesPurchased(address indexed buyer, uint256 amount, uint256 cost, uint256 timestamp);
event SharesSold(address indexed seller, uint256 amount, uint256 proceeds, uint256 fee, uint256 timestamp);
event EpochFinalized(uint256 indexed epochNumber, uint256 rewardPool, uint256 totalShares, uint256 timestamp);
event DividendsClaimed(address indexed user, uint256 amount, uint256 fromEpoch, uint256 toEpoch, uint256 timestamp);
event PlatformFeesWithdrawn(address indexed recipient, uint256 amount);
```

## Security Features

### 1. ReentrancyGuard
All state-changing functions protected against reentrancy attacks.

### 2. Pausable
Emergency pause mechanism to stop trading in case of issues.

### 3. Access Control
- `onlyOwner` modifier for sensitive functions
- OpenZeppelin Ownable pattern

### 4. SafeERC20
Uses SafeERC20 for USDC transfers to handle non-standard tokens.

### 5. Input Validation
- Zero amount checks
- Balance checks
- Supply limit checks

## Integration Example

```solidity
// Deploy contract
CreatorShare share = new CreatorShare(
    "Alice Creator Share",
    "ALICE",
    0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913, // Base USDC
    msg.sender
);

// User buys shares
usdc.approve(address(share), 1000e6);
share.buyShares(10);

// Check balance
uint256 balance = share.balanceOf(msg.sender);

// Sell shares
share.sellShares(5);

// Owner finalizes epoch
share.finalizeEpoch();

// User claims dividends
share.claimDividends();

// Owner withdraws platform fees
share.withdrawPlatformFees(treasury);
```

## Testing

Run comprehensive test suite:
```bash
npm run test -- --grep "CreatorShare"
```

**Test Coverage:**
- ✅ Deployment & initialization
- ✅ Buying shares (12 tests)
- ✅ Selling shares (6 tests)
- ✅ Price calculations (3 tests)
- ✅ Epoch finalization (5 tests)
- ✅ Dividend claims (6 tests)
- ✅ Platform fees (4 tests)
- ✅ Pause/unpause (6 tests)
- ✅ Edge cases (5 tests)
- ✅ View functions (4 tests)

**Total: 52 tests - All passing ✓**

## Gas Optimization

- Pure functions for price calculations (no storage reads)
- Batch dividend claims across multiple epochs
- Efficient storage layouts
- SafeERC20 for optimized transfers

## Future Enhancements

Potential improvements:
- [ ] Multiple epoch claims with gas limits
- [ ] Automatic dividend compounding
- [ ] Tiered fee structures
- [ ] Governance voting with shares
- [ ] NFT integration for special shareholders

## License

MIT

---

**Created for Guessly Prediction Market Platform**
