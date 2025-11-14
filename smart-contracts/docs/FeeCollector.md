# FeeCollector Contract Documentation

## Overview

FeeCollector is a centralized fee management contract that collects and tracks platform fees from both CreatorShare and OpinionMarket contracts. It provides separate tracking for different fee sources and allows the platform admin to withdraw collected fees to the treasury.

## Key Features

- ✅ **Centralized Fee Collection** - Single contract for all platform fees
- ✅ **Source Tracking** - Separate tracking for share fees vs market fees
- ✅ **Whitelist Security** - Only approved contracts can deposit fees
- ✅ **Owner Withdrawals** - Admin-controlled treasury withdrawals
- ✅ **USDC Only** - All fees in USDC (6 decimals)
- ✅ **Historical Tracking** - Total fees collected over time
- ✅ **Event Logging** - Complete audit trail of deposits and withdrawals

## Contract Information

```solidity
contract FeeCollector is Ownable
```

**Storage:**
- `usdc` - USDC token contract (immutable)
- `totalShareFees` - Cumulative fees from CreatorShare contracts
- `totalMarketFees` - Cumulative fees from OpinionMarket contracts
- `whitelistedDepositors` - Mapping of approved depositor contracts

## Deployment

```solidity
constructor(address _usdc, address _owner)
```

**Parameters:**
- `_usdc` - USDC token address on Base: `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913`
- `_owner` - Initial owner address

**Example:**
```solidity
FeeCollector collector = new FeeCollector(
    0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913, // Base USDC
    msg.sender // Owner
);
```

## Core Functions

### 1. Deposit Share Fees

```solidity
function depositShareFees(uint256 amount) external
```

Deposits fees from CreatorShare contracts.

**Parameters:**
- `amount` - Amount of USDC to deposit (6 decimals)

**Requirements:**
- Caller must be whitelisted
- Amount must be > 0
- Contract must have USDC approval from caller

**Behavior:**
1. Transfers USDC from caller to FeeCollector
2. Adds amount to `totalShareFees`
3. Emits `FeesDeposited` event with source type "share"

**Example:**
```solidity
// From CreatorShare contract
usdc.approve(feeCollectorAddress, platformFees);
feeCollector.depositShareFees(platformFees);
```

**Events Emitted:**
```solidity
event FeesDeposited(
    address indexed source,
    string sourceType, // "share"
    uint256 amount,
    uint256 timestamp
)
```

---

### 2. Deposit Market Fees

```solidity
function depositMarketFees(uint256 amount) external
```

Deposits fees from OpinionMarket contracts.

**Parameters:**
- `amount` - Amount of USDC to deposit (6 decimals)

**Requirements:**
- Caller must be whitelisted
- Amount must be > 0
- Contract must have USDC approval from caller

**Behavior:**
1. Transfers USDC from caller to FeeCollector
2. Adds amount to `totalMarketFees`
3. Emits `FeesDeposited` event with source type "market"

**Example:**
```solidity
// From OpinionMarket contract
usdc.approve(feeCollectorAddress, platformFee);
feeCollector.depositMarketFees(platformFee);
```

**Events Emitted:**
```solidity
event FeesDeposited(
    address indexed source,
    string sourceType, // "market"
    uint256 amount,
    uint256 timestamp
)
```

---

### 3. Withdraw Fees (Owner Only)

```solidity
function withdraw(address recipient, uint256 amount) external onlyOwner
```

Withdraws collected fees to treasury.

**Parameters:**
- `recipient` - Address to receive the fees
- `amount` - Amount of USDC to withdraw

**Requirements:**
- Caller must be owner
- Recipient must not be zero address
- Amount must be > 0
- Amount must not exceed contract balance

**Effects:**
- Transfers USDC to recipient
- Does NOT decrease fee tracking variables (historical record preserved)

**Example:**
```solidity
// Owner withdraws 10,000 USDC to treasury
feeCollector.withdraw(treasuryAddress, 10000e6);
```

**Events Emitted:**
```solidity
event FeesWithdrawn(
    address indexed recipient,
    uint256 amount,
    uint256 timestamp
)
```

---

### 4. Add Depositor (Owner Only)

```solidity
function addDepositor(address depositor) external onlyOwner
```

Adds a contract to the depositor whitelist.

**Parameters:**
- `depositor` - Address to whitelist (CreatorShare or OpinionMarket contract)

**Requirements:**
- Caller must be owner
- Address must not be zero

**Events Emitted:**
```solidity
event DepositorWhitelisted(address indexed depositor, uint256 timestamp)
```

---

### 5. Remove Depositor (Owner Only)

```solidity
function removeDepositor(address depositor) external onlyOwner
```

Removes a contract from the depositor whitelist.

**Parameters:**
- `depositor` - Address to remove

**Requirements:**
- Caller must be owner
- Address must not be zero

**Effects:**
- Previous deposits remain tracked
- Contract can no longer make new deposits

**Events Emitted:**
```solidity
event DepositorRemoved(address indexed depositor, uint256 timestamp)
```

---

### 6. Get Total Fees

```solidity
function getTotalFees() external view returns (uint256 total)
```

Returns total fees collected from all sources.

**Returns:**
- Sum of `totalShareFees` and `totalMarketFees`

**Example:**
```solidity
uint256 allFees = feeCollector.getTotalFees();
// Returns: totalShareFees + totalMarketFees
```

---

### 7. Get Share Fees

```solidity
function getShareFees() external view returns (uint256 fees)
```

Returns total fees collected from CreatorShare contracts.

**Returns:**
- `totalShareFees`

---

### 8. Get Market Fees

```solidity
function getMarketFees() external view returns (uint256 fees)
```

Returns total fees collected from OpinionMarket contracts.

**Returns:**
- `totalMarketFees`

---

### 9. Get Balance

```solidity
function getBalance() external view returns (uint256 balance)
```

Returns current USDC balance in the contract.

**Returns:**
- Current USDC balance (can be less than total fees after withdrawals)

**Example:**
```solidity
uint256 available = feeCollector.getBalance();
// Available for withdrawal
```

---

### 10. Is Whitelisted

```solidity
function isWhitelisted(address depositor) external view returns (bool whitelisted)
```

Checks if an address is whitelisted to deposit fees.

**Parameters:**
- `depositor` - Address to check

**Returns:**
- `true` if whitelisted, `false` otherwise

---

## State Variables

| Variable | Type | Access | Description |
|----------|------|--------|-------------|
| `usdc` | `IERC20` | Public | USDC token contract |
| `totalShareFees` | `uint256` | Public | Cumulative share fees |
| `totalMarketFees` | `uint256` | Public | Cumulative market fees |
| `whitelistedDepositors` | `mapping(address => bool)` | Public | Depositor whitelist |

## Events

```solidity
event FeesDeposited(
    address indexed source,
    string sourceType,  // "share" or "market"
    uint256 amount,
    uint256 timestamp
);

event FeesWithdrawn(
    address indexed recipient,
    uint256 amount,
    uint256 timestamp
);

event DepositorWhitelisted(
    address indexed depositor,
    uint256 timestamp
);

event DepositorRemoved(
    address indexed depositor,
    uint256 timestamp
);
```

## Custom Errors

```solidity
error NotWhitelisted();        // Caller not in whitelist
error AmountCannotBeZero();    // Amount parameter is 0
error InvalidAddress();        // Address parameter is zero address
error InsufficientBalance();   // Withdrawal exceeds balance
```

## Usage Flow

### 1. Initial Setup (Owner)

```solidity
// 1. Deploy FeeCollector
FeeCollector collector = new FeeCollector(usdcAddress, owner);

// 2. Whitelist CreatorShare contracts
collector.addDepositor(creatorShare1);
collector.addDepositor(creatorShare2);

// 3. Whitelist OpinionMarket contracts
collector.addDepositor(opinionMarket1);
collector.addDepositor(opinionMarket2);
```

---

### 2. CreatorShare Integration

```solidity
// In CreatorShare contract
function collectPlatformFees() external onlyOwner {
    uint256 fees = platformFees;
    platformFees = 0;

    // Approve and deposit to FeeCollector
    usdc.approve(feeCollectorAddress, fees);
    IFeeCollector(feeCollectorAddress).depositShareFees(fees);
}
```

---

### 3. OpinionMarket Integration

```solidity
// In OpinionMarket _distributeFees()
function _distributeFees(
    address creator,
    uint256 platformFee,
    uint256 creatorFee,
    uint256 shareholderFee,
    uint256 totalAmount
) internal {
    // Transfer fees to FeeCollector
    usdc.approve(feeCollectorAddress, platformFee);
    IFeeCollector(feeCollectorAddress).depositMarketFees(platformFee);

    // Transfer creator fee directly
    usdc.safeTransfer(creator, creatorFee);

    // Report volume to factory
    factory.updateCreatorVolume(creator, totalAmount);
}
```

---

### 4. Monitor Fees (Anyone)

```solidity
// Check total fees collected
uint256 totalFees = collector.getTotalFees();
console.log("Total fees:", totalFees / 1e6, "USDC");

// Check breakdown
uint256 shareFees = collector.getShareFees();
uint256 marketFees = collector.getMarketFees();
console.log("Share fees:", shareFees / 1e6, "USDC");
console.log("Market fees:", marketFees / 1e6, "USDC");

// Check available balance
uint256 balance = collector.getBalance();
console.log("Available:", balance / 1e6, "USDC");
```

---

### 5. Withdraw to Treasury (Owner)

```solidity
// Withdraw all available fees
uint256 balance = collector.getBalance();
collector.withdraw(treasuryAddress, balance);

// Or withdraw specific amount
collector.withdraw(treasuryAddress, 50000e6); // 50K USDC
```

---

## Integration Examples

### CreatorShare Fee Flow

```solidity
// CreatorShare.sol
contract CreatorShare is ERC20, Ownable {
    FeeCollector public feeCollector;
    uint256 public platformFees;

    function sellShares(uint256 amount) external {
        // ... sell logic ...

        // Accumulate platform fees
        platformFees += platformShare;
    }

    function collectPlatformFees() external onlyOwner {
        uint256 fees = platformFees;
        platformFees = 0;

        usdc.approve(address(feeCollector), fees);
        feeCollector.depositShareFees(fees);
    }
}
```

### OpinionMarket Fee Flow

```solidity
// OpinionMarket.sol
contract OpinionMarket is Ownable {
    FeeCollector public feeCollector;

    function placeBet(uint256 marketId, uint256 outcome, uint256 amount) external {
        // ... bet logic ...

        uint256 platformFee = (amount * 75) / 10000; // 0.75%

        // Send platform fee to collector
        usdc.approve(address(feeCollector), platformFee);
        feeCollector.depositMarketFees(platformFee);
    }
}
```

---

## Fee Tracking Example

**Scenario:**
- 3 CreatorShare contracts deposit fees
- 2 OpinionMarket contracts deposit fees
- Owner withdraws to treasury

```solidity
// Share contracts deposit
creatorShare1.collectPlatformFees(); // 100 USDC
creatorShare2.collectPlatformFees(); // 150 USDC
creatorShare3.collectPlatformFees(); // 200 USDC
// totalShareFees = 450 USDC

// Market contracts deposit (during placeBet)
// market1 generates 300 USDC in platform fees
// market2 generates 400 USDC in platform fees
// totalMarketFees = 700 USDC

// Check status
feeCollector.getTotalFees();      // Returns: 1150 USDC
feeCollector.getShareFees();      // Returns: 450 USDC
feeCollector.getMarketFees();     // Returns: 700 USDC
feeCollector.getBalance();        // Returns: 1150 USDC

// Owner withdraws
feeCollector.withdraw(treasury, 500e6); // Withdraw 500 USDC

// After withdrawal
feeCollector.getTotalFees();      // Returns: 1150 USDC (unchanged)
feeCollector.getBalance();        // Returns: 650 USDC (available)

// Historical tracking preserved even after withdrawals!
```

---

## Testing

Run comprehensive test suite:
```bash
npm run test -- --grep "FeeCollector"
```

**Test Coverage - 44 tests passing:**

```
FeeCollector
  Deployment (4 tests)
    ✔ USDC address
    ✔ Owner
    ✔ Initial state
    ✔ Invalid address validation

  Depositor Whitelist Management (7 tests)
    ✔ Add depositor
    ✔ Remove depositor
    ✔ Access control
    ✔ Input validation
    ✔ Multiple depositors

  Share Fee Deposits (5 tests)
    ✔ Successful deposits
    ✔ Whitelist enforcement
    ✔ Amount validation
    ✔ Accumulation
    ✔ USDC transfers

  Market Fee Deposits (5 tests)
    ✔ Successful deposits
    ✔ Whitelist enforcement
    ✔ Amount validation
    ✔ Accumulation
    ✔ USDC transfers

  Mixed Fee Deposits (2 tests)
    ✔ Separate tracking
    ✔ Multiple deposits

  Withdrawals (8 tests)
    ✔ Owner withdrawals
    ✔ Balance updates
    ✔ Full balance withdrawal
    ✔ Access control
    ✔ Input validation
    ✔ Insufficient balance check
    ✔ Multiple withdrawals
    ✔ Fee tracking preservation

  View Functions (5 tests)
    ✔ Total fees
    ✔ Share fees
    ✔ Market fees
    ✔ Balance
    ✔ Whitelist status

  Complex Scenarios (4 tests)
    ✔ Deposit-withdraw cycles
    ✔ Depositor removal
    ✔ Large volumes
    ✔ Many deposits

  Edge Cases (4 tests)
    ✔ Zero balance
    ✔ Re-adding depositors
    ✔ Approval edge cases

Total: 44 passing (844ms)
```

---

## Security Considerations

### 1. Access Control
- ✅ Owner-only withdrawals
- ✅ Owner-only whitelist management
- ✅ Whitelist-only deposits
- ✅ No public functions that modify state

### 2. Whitelist Security
- ✅ Only approved contracts can deposit
- ✅ Prevents malicious deposits
- ✅ Owner can add/remove depositors
- ✅ Historical tracking unaffected by removal

### 3. Fee Tracking Integrity
- ✅ Cumulative tracking never decreases
- ✅ Withdrawals don't affect historical records
- ✅ Separate tracking prevents mixing sources
- ✅ Transparent audit trail via events

### 4. Withdrawal Security
- ✅ Owner-only control
- ✅ Balance checks prevent overdrafts
- ✅ Zero address validation
- ✅ SafeERC20 for transfers

### 5. Input Validation
- ✅ Zero address checks
- ✅ Zero amount checks
- ✅ Balance sufficiency checks
- ✅ Comprehensive error messages

---

## Gas Optimization

- Immutable USDC address
- View functions for queries
- Minimal storage writes
- Efficient whitelist mapping
- No unnecessary loops
- Custom errors for gas savings

---

## Deployment Checklist

- [ ] Deploy FeeCollector with Base USDC address
- [ ] Transfer ownership to multisig (optional)
- [ ] Whitelist all CreatorShare contracts
- [ ] Whitelist all OpinionMarket contracts
- [ ] Verify contract on BaseScan
- [ ] Test deposits from share contracts
- [ ] Test deposits from market contracts
- [ ] Test withdrawal to treasury
- [ ] Set up monitoring for fee collection
- [ ] Document treasury withdrawal schedule

---

## Future Enhancements

Potential improvements:
- [ ] Multi-token support (ETH, DAI, etc.)
- [ ] Automatic withdrawal schedules
- [ ] Fee distribution to multiple recipients
- [ ] Pausable deposits for emergencies
- [ ] Analytics dashboard integration
- [ ] Batch withdrawal support
- [ ] Fee reinvestment mechanisms
- [ ] Time-locked withdrawals
- [ ] Governance-controlled withdrawals
- [ ] Fee burning mechanisms

---

## Common Patterns

### Check Whitelist Before Deposit
```solidity
require(feeCollector.isWhitelisted(address(this)), "Not whitelisted");
feeCollector.depositShareFees(amount);
```

### Batch Deposit Pattern
```solidity
// Accumulate fees over time, deposit periodically
uint256 accumulatedFees;

function _accumulateFees(uint256 fee) internal {
    accumulatedFees += fee;
}

function depositAccumulatedFees() external {
    uint256 fees = accumulatedFees;
    accumulatedFees = 0;

    usdc.approve(feeCollectorAddress, fees);
    feeCollector.depositShareFees(fees);
}
```

### Withdrawal with Safety Check
```solidity
uint256 balance = feeCollector.getBalance();
require(balance >= minWithdrawalAmount, "Insufficient fees");
feeCollector.withdraw(treasury, balance);
```

---

## FAQ

**Q: Can fees be withdrawn partially?**
A: Yes, owner can withdraw any amount up to the current balance.

**Q: What happens to fee tracking when a depositor is removed?**
A: Historical fees remain tracked. Only new deposits are blocked.

**Q: Can non-whitelisted contracts deposit fees?**
A: No, only whitelisted contracts can call deposit functions.

**Q: Does withdrawal affect totalShareFees or totalMarketFees?**
A: No, these track historical cumulative fees and never decrease.

**Q: Can multiple contracts deposit simultaneously?**
A: Yes, the contract handles concurrent deposits safely.

**Q: What happens if USDC approval is insufficient?**
A: Transaction reverts with `ERC20InsufficientAllowance` error.

**Q: Can the owner withdraw more than the balance?**
A: No, the contract checks balance and reverts with `InsufficientBalance`.

---

## License

MIT

---

**Created for Guessly Prediction Market Platform**
