# Security Guide

Comprehensive security documentation for Guessly smart contracts.

## Table of Contents

- [Security Overview](#security-overview)
- [Access Control](#access-control)
- [Emergency Procedures](#emergency-procedures)
- [Admin Functions](#admin-functions)
- [Security Best Practices](#security-best-practices)
- [Audit Checklist](#audit-checklist)
- [Incident Response](#incident-response)

---

## Security Overview

### Security Layers

```
┌─────────────────────────────────────────────────────┐
│              Security Architecture                   │
├─────────────────────────────────────────────────────┤
│                                                      │
│  Layer 1: Access Control (Ownable)                  │
│  ├─ Owner-only admin functions                      │
│  ├─ Whitelist management                            │
│  └─ Transferable ownership                          │
│                                                      │
│  Layer 2: Reentrancy Protection                     │
│  ├─ ReentrancyGuard on all state-changing functions │
│  ├─ Checks-Effects-Interactions pattern             │
│  └─ No external calls before state updates          │
│                                                      │
│  Layer 3: Emergency Controls                        │
│  ├─ Pausable contracts (CreatorShare)               │
│  ├─ Market-level pause (OpinionMarket)              │
│  └─ Whitelist controls (Factory, FeeCollector)      │
│                                                      │
│  Layer 4: Input Validation                          │
│  ├─ Custom errors for gas efficiency                │
│  ├─ Comprehensive parameter checks                  │
│  └─ Zero address validation                         │
│                                                      │
│  Layer 5: Safe Token Handling                       │
│  ├─ SafeERC20 for USDC transfers                    │
│  ├─ Allowance checks before transfers               │
│  └─ Balance verification                            │
│                                                      │
└─────────────────────────────────────────────────────┘
```

### Key Security Features

- ✅ **No Upgradability** - Immutable contracts (no proxies)
- ✅ **Minimal External Dependencies** - Only OpenZeppelin contracts
- ✅ **No Oracles** - No external data dependencies
- ✅ **No Flash Loan Attack Surface** - All operations in single transaction
- ✅ **Gas Efficient** - Custom errors instead of revert strings
- ✅ **Test Coverage** - 97.41% overall coverage (219 tests)

---

## Access Control

### Owner Roles by Contract

#### CreatorShare

**Owner Powers:**
- `pause()` - Pause all trading
- `unpause()` - Resume trading
- `finalizeEpoch()` - Close epoch and distribute dividends
- `withdrawPlatformFees(address)` - Withdraw accumulated platform fees

**Owner Address:** Set at deployment (typically the creator)

**Risks if Compromised:**
- Can pause trading indefinitely
- Can withdraw all platform fees
- Cannot steal user shares or locked funds

**Mitigation:**
- Use multisig wallet for creator ownership
- Regular fee withdrawals to minimize locked funds

#### CreatorShareFactory

**Owner Powers:**
- `addMarketContract(address)` - Whitelist new market
- `removeMarketContract(address)` - Remove market from whitelist

**Owner Address:** Platform admin wallet

**Risks if Compromised:**
- Can whitelist malicious contracts to manipulate volume
- Can prevent volume updates by removing markets
- Cannot steal funds or manipulate existing shares

**Mitigation:**
- Use multisig wallet for factory ownership
- Monitor whitelist changes with events
- Limit number of whitelisted markets

#### OpinionMarket

**Owner Powers:**
- `resolveMarket(marketId, outcome)` - Resolve market with winning outcome
- `pauseMarket(marketId)` - Pause specific market
- `unpauseMarket(marketId)` - Unpause specific market
- `updatePlatformFeeCollector(address)` - Change fee collector address

**Owner Address:** Platform admin wallet

**Risks if Compromised:**
- Can resolve markets incorrectly
- Can pause markets indefinitely
- Can change fee destination
- Cannot steal funds from market pools

**Mitigation:**
- Use multisig wallet for market ownership
- Implement off-chain verification before resolution
- Monitor resolution events
- Add timelock for fee collector updates

#### FeeCollector

**Owner Powers:**
- `withdraw(recipient, amount)` - Withdraw collected fees
- `addDepositor(address)` - Whitelist fee depositor
- `removeDepositor(address)` - Remove depositor

**Owner Address:** Platform treasury wallet

**Risks if Compromised:**
- Can withdraw all collected fees
- Can whitelist malicious depositors
- Can prevent legitimate fee deposits

**Mitigation:**
- Use multisig wallet for treasury
- Implement withdrawal limits or timelocks
- Regular withdrawals to minimize balance

---

## Emergency Procedures

### Pause CreatorShare Trading

**When to Use:**
- Suspicious trading activity
- Bug discovered in share contract
- Market manipulation detected

**How to Execute:**

```typescript
// Using Hardhat console
npx hardhat console --network baseMainnet

const CreatorShare = await ethers.getContractAt(
  "CreatorShare",
  "0xSHARE_ADDRESS"
);

// Pause
await CreatorShare.pause();

// Verify paused
console.log("Paused:", await CreatorShare.paused());
```

**Effects:**
- ❌ Users cannot buy shares
- ❌ Users cannot sell shares
- ✅ Users can still claim dividends
- ✅ Owner can still withdraw platform fees

**Recovery:**
```typescript
await CreatorShare.unpause();
```

---

### Pause OpinionMarket

**When to Use:**
- Suspicious betting patterns
- Market manipulation
- Bug in market resolution

**How to Execute:**

```typescript
npx hardhat console --network baseMainnet

const OpinionMarket = await ethers.getContractAt(
  "OpinionMarket",
  "0xMARKET_ADDRESS"
);

// Pause specific market
await OpinionMarket.pauseMarket(marketId);

// Verify
const info = await OpinionMarket.getMarketInfo(marketId);
console.log("Market paused:", info.paused);
```

**Effects:**
- ❌ Users cannot place new bets
- ✅ Existing bets remain valid
- ✅ Market can still be resolved
- ✅ Winners can claim after resolution

**Recovery:**
```typescript
await OpinionMarket.unpauseMarket(marketId);
```

---

### Remove Compromised Market

**When to Use:**
- Malicious contract detected
- Whitelisted market is compromised

**How to Execute:**

```typescript
npx hardhat console --network baseMainnet

const Factory = await ethers.getContractAt(
  "CreatorShareFactory",
  "0xFACTORY_ADDRESS"
);

// Remove from whitelist
await Factory.removeMarketContract("0xMALICIOUS_MARKET");

// Verify
const isWhitelisted = await Factory.isMarketWhitelisted("0xMALICIOUS_MARKET");
console.log("Still whitelisted:", isWhitelisted); // Should be false
```

**Effects:**
- ❌ Market can no longer update creator volumes
- ✅ Existing volumes remain valid
- ✅ Shares already unlocked remain unlocked

---

### Withdraw Emergency Funds

**When to Use:**
- Contract vulnerability discovered
- Need to secure funds quickly

**FeeCollector Withdrawal:**

```typescript
npx hardhat console --network baseMainnet

const FeeCollector = await ethers.getContractAt(
  "FeeCollector",
  "0xFEE_COLLECTOR_ADDRESS"
);

// Check balance
const balance = await FeeCollector.getBalance();
console.log("Available:", ethers.formatUnits(balance, 6), "USDC");

// Withdraw all funds
await FeeCollector.withdraw("0xTREASURY_ADDRESS", balance);
```

**CreatorShare Platform Fees:**

```typescript
const CreatorShare = await ethers.getContractAt(
  "CreatorShare",
  "0xSHARE_ADDRESS"
);

// Check platform fees
const fees = await CreatorShare.platformFees();
console.log("Platform fees:", ethers.formatUnits(fees, 6), "USDC");

// Withdraw
await CreatorShare.withdrawPlatformFees("0xTREASURY_ADDRESS");
```

---

## Admin Functions

### CreatorShare Admin Functions

#### pause()

**Purpose:** Stop all share trading

**Access:** Owner only

**Execution:**
```typescript
await creatorShare.pause();
```

**Events:**
```solidity
event Paused(address account)
```

**Effects:**
- Blocks `buyShares()`
- Blocks `sellShares()`
- Allows `claimDividends()`

---

#### unpause()

**Purpose:** Resume share trading

**Access:** Owner only

**Execution:**
```typescript
await creatorShare.unpause();
```

**Events:**
```solidity
event Unpaused(address account)
```

---

#### finalizeEpoch()

**Purpose:** Close current epoch and enable dividend claims

**Access:** Owner only

**Execution:**
```typescript
await creatorShare.finalizeEpoch();
```

**Events:**
```solidity
event EpochFinalized(
  uint256 indexed epoch,
  uint256 rewardPool,
  uint256 totalShares,
  uint256 timestamp
)
```

**State Changes:**
- Increments `currentEpoch`
- Resets `rewardPool` to 0
- Records epoch data for dividend calculations

**Best Practice:** Finalize epochs regularly (weekly/monthly)

---

#### withdrawPlatformFees(address recipient)

**Purpose:** Withdraw accumulated platform fees

**Access:** Owner only

**Parameters:**
- `recipient` - Address to receive fees (usually treasury)

**Execution:**
```typescript
await creatorShare.withdrawPlatformFees("0xTREASURY");
```

**Events:**
```solidity
event PlatformFeesWithdrawn(
  address indexed recipient,
  uint256 amount,
  uint256 timestamp
)
```

**Validation:**
- Reverts if `recipient` is zero address
- Reverts if no fees to withdraw

---

### OpinionMarket Admin Functions

#### resolveMarket(uint256 marketId, uint256 winningOutcome)

**Purpose:** Resolve market with winning outcome

**Access:** Owner only

**Parameters:**
- `marketId` - Market to resolve
- `winningOutcome` - Index of winning outcome

**Execution:**
```typescript
await opinionMarket.resolveMarket(marketId, 0); // Outcome 0 wins
```

**Events:**
```solidity
event MarketResolved(
  uint256 indexed marketId,
  uint256 winningOutcome,
  uint256 timestamp
)
```

**Validation:**
- Market must exist
- Market must have ended (`block.timestamp >= endTime`)
- Market must not be already resolved
- `winningOutcome` must be valid index

**⚠️ Critical:** Cannot be undone. Verify outcome before calling.

---

#### pauseMarket(uint256 marketId)

**Purpose:** Emergency pause for specific market

**Access:** Owner only

**Execution:**
```typescript
await opinionMarket.pauseMarket(marketId);
```

**Events:**
```solidity
event MarketPaused(uint256 indexed marketId, uint256 timestamp)
```

---

#### unpauseMarket(uint256 marketId)

**Purpose:** Resume paused market

**Access:** Owner only

**Execution:**
```typescript
await opinionMarket.unpauseMarket(marketId);
```

**Events:**
```solidity
event MarketUnpaused(uint256 indexed marketId, uint256 timestamp)
```

---

#### updatePlatformFeeCollector(address newCollector)

**Purpose:** Change fee destination

**Access:** Owner only

**Execution:**
```typescript
await opinionMarket.updatePlatformFeeCollector("0xNEW_FEE_COLLECTOR");
```

**⚠️ Warning:** Use with extreme caution. Consider implementing timelock.

---

### CreatorShareFactory Admin Functions

#### addMarketContract(address market)

**Purpose:** Whitelist new opinion market

**Access:** Owner only

**Execution:**
```typescript
await factory.addMarketContract("0xNEW_MARKET");
```

**Events:**
```solidity
event MarketContractAdded(address indexed marketContract, uint256 timestamp)
```

**Security:** Verify market contract before whitelisting

---

#### removeMarketContract(address market)

**Purpose:** Remove market from whitelist

**Access:** Owner only

**Execution:**
```typescript
await factory.removeMarketContract("0xOLD_MARKET");
```

**Events:**
```solidity
event MarketContractRemoved(address indexed marketContract, uint256 timestamp)
```

---

### FeeCollector Admin Functions

#### withdraw(address recipient, uint256 amount)

**Purpose:** Withdraw collected fees to treasury

**Access:** Owner only

**Execution:**
```typescript
await feeCollector.withdraw("0xTREASURY", ethers.parseUnits("1000", 6));
```

**Events:**
```solidity
event FeesWithdrawn(address indexed recipient, uint256 amount, uint256 timestamp)
```

**Validation:**
- `recipient` cannot be zero address
- `amount` must be > 0
- `amount` cannot exceed balance

---

#### addDepositor(address depositor) / removeDepositor(address depositor)

**Purpose:** Manage fee depositor whitelist

**Access:** Owner only

**Execution:**
```typescript
// Add
await feeCollector.addDepositor("0xNEW_SHARE_CONTRACT");

// Remove
await feeCollector.removeDepositor("0xOLD_SHARE_CONTRACT");
```

**Events:**
```solidity
event DepositorWhitelisted(address indexed depositor, uint256 timestamp)
event DepositorRemoved(address indexed depositor, uint256 timestamp)
```

---

## Security Best Practices

### 1. Multisig Ownership

**Recommendation:** Use Gnosis Safe multisig for all owner addresses

**Setup:**
```
┌──────────────────────────┐
│  Gnosis Safe (3-of-5)    │
│                          │
│  Signers:                │
│  - Admin 1               │
│  - Admin 2               │
│  - Admin 3               │
│  - Admin 4               │
│  - Admin 5               │
└──────────────────────────┘
         │
         ├─ Owns: CreatorShareFactory
         ├─ Owns: OpinionMarket
         └─ Owns: FeeCollector
```

**Benefits:**
- No single point of failure
- Requires multiple approvals
- Transaction visibility
- Audit trail

---

### 2. Timelocks for Critical Operations

**High-Risk Operations:**
- Resolving markets
- Changing fee collector
- Withdrawing large amounts

**Implementation:**
```solidity
// Pseudo-code for timelock
mapping(bytes32 => uint256) public timelocks;

function scheduleResolveMarket(uint256 marketId, uint256 outcome) external onlyOwner {
  bytes32 txHash = keccak256(abi.encode(marketId, outcome));
  timelocks[txHash] = block.timestamp + 24 hours;
}

function executeResolveMarket(uint256 marketId, uint256 outcome) external onlyOwner {
  bytes32 txHash = keccak256(abi.encode(marketId, outcome));
  require(block.timestamp >= timelocks[txHash], "Timelock not expired");
  _resolveMarket(marketId, outcome);
}
```

---

### 3. Event Monitoring

**Critical Events to Monitor:**

```typescript
// OpinionMarket
- MarketCreated (track all new markets)
- BetPlaced (monitor large bets)
- MarketResolved (verify outcomes)
- MarketPaused (alert on emergency pauses)

// CreatorShareFactory
- SharesUnlocked (track volume milestones)
- SharesCreated (track new deployments)
- MarketContractAdded (alert on whitelist changes)

// FeeCollector
- FeesWithdrawn (monitor treasury withdrawals)
- DepositorWhitelisted (alert on whitelist changes)

// CreatorShare
- SharesBought (monitor large purchases)
- SharesSold (monitor dumps)
- EpochFinalized (track dividend distributions)
```

**Alerting Setup:**
```typescript
// Example with Discord webhook
function sendAlert(event: string, data: any) {
  const webhook = new Discord.WebhookClient({ url: WEBHOOK_URL });
  webhook.send({
    content: `🚨 Alert: ${event}`,
    embeds: [
      {
        title: event,
        description: JSON.stringify(data, null, 2),
        color: 0xff0000,
      },
    ],
  });
}

// Listen for large bets
opinionMarket.on("BetPlaced", (marketId, user, outcome, amount) => {
  if (amount > ethers.parseUnits("10000", 6)) {
    // Alert if bet > $10K
    sendAlert("Large Bet Detected", {
      marketId,
      user,
      outcome,
      amount: ethers.formatUnits(amount, 6),
    });
  }
});
```

---

### 4. Regular Security Audits

**Audit Schedule:**
- Before mainnet launch
- After any contract modifications
- Annually for ongoing operations

**Audit Checklist:**
- [ ] Reentrancy protection
- [ ] Access control
- [ ] Input validation
- [ ] Integer overflow/underflow
- [ ] Front-running risks
- [ ] Gas optimization
- [ ] Event emission
- [ ] Emergency procedures

---

### 5. Bug Bounty Program

**Recommended Bounties:**
- Critical (loss of funds): $50,000 - $100,000
- High (contract lockup): $10,000 - $50,000
- Medium (logic errors): $1,000 - $10,000
- Low (optimization): $100 - $1,000

**Platforms:**
- Immunefi
- Code4rena
- HackerOne

---

## Audit Checklist

### Pre-Deployment

- [ ] All tests passing (100% pass rate)
- [ ] Coverage > 90% on all contracts
- [ ] No compiler warnings
- [ ] Gas optimization reviewed
- [ ] Owner addresses confirmed
- [ ] Contract addresses documented
- [ ] Multisig setup completed
- [ ] Event monitoring configured
- [ ] Emergency procedures documented
- [ ] Team trained on admin functions

### Post-Deployment

- [ ] Contracts verified on BaseScan
- [ ] Ownership transferred to multisig
- [ ] Initial whitelisting completed
- [ ] Test transactions executed
- [ ] Event monitoring active
- [ ] Alert system operational
- [ ] Documentation published
- [ ] Bug bounty program launched

---

## Incident Response

### Incident Severity Levels

**Critical (P0):**
- Loss of user funds
- Contract completely compromised
- Immediate action required

**High (P1):**
- Partial loss of funds
- Major functionality broken
- Action required within 1 hour

**Medium (P2):**
- Minor loss of funds
- Some features unavailable
- Action required within 24 hours

**Low (P3):**
- No loss of funds
- Cosmetic issues
- Action required within 1 week

---

### Response Procedures

#### P0 - Critical Incident

1. **Immediate Actions (0-5 minutes):**
   - Pause all affected contracts
   - Alert all team members
   - Assess extent of damage

2. **Emergency Procedures (5-30 minutes):**
   - Withdraw funds to safety if possible
   - Remove compromised contracts from whitelists
   - Document all actions taken

3. **Communication (30-60 minutes):**
   - Public announcement on all channels
   - Email to affected users
   - Status page update

4. **Recovery (1-24 hours):**
   - Deploy fixes if needed
   - Compensate affected users
   - Post-mortem analysis

---

#### P1 - High Severity

1. **Assessment (0-15 minutes):**
   - Verify issue
   - Determine impact
   - Alert core team

2. **Mitigation (15-60 minutes):**
   - Pause affected markets/shares
   - Prevent further damage
   - Prepare fix

3. **Resolution (1-6 hours):**
   - Deploy fix or workaround
   - Test thoroughly
   - Resume operations

4. **Communication:**
   - Update users on status
   - Explain issue and resolution

---

## Contact Information

**Security Issues:**
- Email: security@guessly.com
- Emergency: [Discord Admin Channel]

**Bug Bounty:**
- Platform: [Immunefi/Code4rena]
- Scope: All smart contracts
- Max Bounty: $100,000

---

**Previous:** [Integration Guide](./INTEGRATION.md)

---

**Created for Guessly Prediction Market Platform**
