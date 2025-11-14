# CreatorShareFactory Contract Documentation

## Overview

CreatorShareFactory is a factory contract that manages the deployment and lifecycle of CreatorShare contracts. It enforces volume thresholds, ensures one share contract per creator, and integrates with OpinionMarket contracts for volume tracking.

## Key Features

- ✅ **Factory Pattern** - Centralized deployment of CreatorShare contracts
- ✅ **Volume Tracking** - Tracks creator trading volume from whitelisted markets
- ✅ **Threshold Enforcement** - $30,000 USDC volume required before share creation
- ✅ **One Share Per Creator** - Each creator can only have one share contract
- ✅ **Market Whitelist** - Only approved OpinionMarket contracts can update volume
- ✅ **Event Tracking** - Comprehensive event system for monitoring
- ✅ **Access Control** - Owner-only admin functions

## Contract Information

```solidity
contract CreatorShareFactory is Ownable
```

**Constants:**
- `VOLUME_THRESHOLD` = 30,000,000,000 (30K USDC with 6 decimals)

## Deployment

```solidity
constructor(address _usdc, address _owner)
```

**Parameters:**
- `_usdc` - USDC token address on Base: `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913`
- `_owner` - Initial owner address

**Example:**
```solidity
CreatorShareFactory factory = new CreatorShareFactory(
    0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913, // Base USDC
    msg.sender // Owner
);
```

## Core Functions

### 1. Create Creator Shares

```solidity
function createCreatorShares(
    address creator,
    string memory name,
    string memory symbol
) external returns (address shareContract)
```

Deploys a new CreatorShare contract for a creator.

**Requirements:**
- Creator's shares must be unlocked (volume threshold met)
- Creator cannot already have a share contract
- Name and symbol must not be empty
- Creator address must not be zero

**Returns:**
- Address of deployed CreatorShare contract

**Example:**
```solidity
address shareContract = factory.createCreatorShares(
    creatorAddress,
    "Alice Creator Share",
    "ALICE"
);
```

**Events Emitted:**
```solidity
event SharesCreated(
    address indexed creator,
    address indexed shareContract,
    string name,
    string symbol,
    uint256 timestamp
)
```

---

### 2. Update Creator Volume

```solidity
function updateCreatorVolume(
    address creator,
    uint256 additionalVolume
) external
```

Updates creator's trading volume. **Only callable by whitelisted market contracts.**

**Parameters:**
- `creator` - Address of the creator
- `additionalVolume` - Volume to add (in USDC with 6 decimals)

**Requirements:**
- Caller must be whitelisted market contract
- Creator address must not be zero

**Behavior:**
- Accumulates volume to creator's total
- Emits `VolumeUpdated` event
- If threshold reached, unlocks shares and emits `SharesUnlocked`

**Events Emitted:**
```solidity
event VolumeUpdated(
    address indexed creator,
    uint256 additionalVolume,
    uint256 newTotalVolume,
    uint256 timestamp
)

// If threshold reached:
event SharesUnlocked(
    address indexed creator,
    uint256 finalVolume,
    uint256 timestamp
)
```

**Example:**
```solidity
// Called by OpinionMarket contract
factory.updateCreatorVolume(creatorAddress, 5000e6); // Add 5K USDC volume
```

---

### 3. Add Market Contract (Owner Only)

```solidity
function addMarketContract(address market) external onlyOwner
```

Adds an OpinionMarket contract to the whitelist.

**Parameters:**
- `market` - Address of the OpinionMarket contract

**Requirements:**
- Caller must be owner
- Market address must not be zero

**Events Emitted:**
```solidity
event MarketContractAdded(address indexed marketContract, uint256 timestamp)
```

---

### 4. Remove Market Contract (Owner Only)

```solidity
function removeMarketContract(address market) external onlyOwner
```

Removes an OpinionMarket contract from the whitelist.

**Parameters:**
- `market` - Address of the OpinionMarket contract

**Requirements:**
- Caller must be owner
- Market address must not be zero

**Events Emitted:**
```solidity
event MarketContractRemoved(address indexed marketContract, uint256 timestamp)
```

---

### 5. Get Creator Volume

```solidity
function getCreatorVolume(address creator) external view returns (uint256 volume)
```

Returns the total trading volume for a creator.

**Parameters:**
- `creator` - Address of the creator

**Returns:**
- Total volume in USDC (6 decimals)

---

### 6. Is Shares Unlocked

```solidity
function isSharesUnlocked(address creator) external view returns (bool unlocked)
```

Checks if a creator has unlocked share creation.

**Parameters:**
- `creator` - Address of the creator

**Returns:**
- `true` if shares are unlocked, `false` otherwise

---

### 7. Get Creator Share Contract

```solidity
function getCreatorShareContract(
    address creator
) external view returns (address shareContract)
```

Returns the share contract address for a creator.

**Parameters:**
- `creator` - Address of the creator

**Returns:**
- Share contract address (or zero address if none exists)

---

### 8. Is Market Whitelisted

```solidity
function isMarketWhitelisted(address market) external view returns (bool isWhitelisted)
```

Checks if a market contract is whitelisted.

**Parameters:**
- `market` - Address to check

**Returns:**
- `true` if whitelisted, `false` otherwise

---

### 9. Get Remaining Volume To Unlock

```solidity
function getRemainingVolumeToUnlock(
    address creator
) external view returns (uint256 remaining)
```

Calculates remaining volume needed to unlock shares.

**Parameters:**
- `creator` - Address of the creator

**Returns:**
- Remaining volume in USDC (0 if already unlocked)

**Example:**
```solidity
uint256 remaining = factory.getRemainingVolumeToUnlock(creatorAddress);
// Returns: 15000000000 (15K USDC with 6 decimals)
```

---

### 10. Can Create Shares

```solidity
function canCreateShares(
    address creator
) external view returns (bool canCreate, string memory reason)
```

Checks if creator can create shares and provides reason if not.

**Parameters:**
- `creator` - Address of the creator

**Returns:**
- `canCreate` - Whether creator can create shares
- `reason` - Explanation if they cannot (empty string if they can)

**Example:**
```solidity
(bool canCreate, string memory reason) = factory.canCreateShares(creatorAddress);

if (!canCreate) {
    console.log("Cannot create:", reason);
    // "Shares not unlocked - volume threshold not met"
}
```

---

### 11. Get Total Creator Shares

```solidity
function getTotalCreatorShares() external view returns (uint256 count)
```

Returns total number of deployed creator share contracts.

---

### 12. Get All Creator Shares

```solidity
function getAllCreatorShares() external view returns (address[] memory shares)
```

Returns array of all deployed share contract addresses.

---

### 13. Get Creator Share At Index

```solidity
function getCreatorShareAtIndex(uint256 index) external view returns (address shareContract)
```

Returns share contract at specific index.

**Parameters:**
- `index` - Index in allCreatorShares array

**Returns:**
- Share contract address

**Reverts:**
- If index out of bounds

## State Variables

| Variable | Type | Access | Description |
|----------|------|--------|-------------|
| `usdc` | `address` | Public | USDC token address |
| `VOLUME_THRESHOLD` | `uint256` | Public | 30K USDC threshold |
| `creatorTotalVolume` | `mapping(address => uint256)` | Public | Creator volumes |
| `sharesUnlocked` | `mapping(address => bool)` | Public | Unlock status |
| `creatorShareContract` | `mapping(address => address)` | Public | Share contracts |
| `whitelistedMarkets` | `mapping(address => bool)` | Public | Market whitelist |
| `allCreatorShares` | `address[]` | Public | All share contracts |

## Events

```solidity
event SharesCreated(
    address indexed creator,
    address indexed shareContract,
    string name,
    string symbol,
    uint256 timestamp
);

event VolumeUpdated(
    address indexed creator,
    uint256 additionalVolume,
    uint256 newTotalVolume,
    uint256 timestamp
);

event SharesUnlocked(
    address indexed creator,
    uint256 finalVolume,
    uint256 timestamp
);

event MarketContractAdded(
    address indexed marketContract,
    uint256 timestamp
);

event MarketContractRemoved(
    address indexed marketContract,
    uint256 timestamp
);
```

## Custom Errors

```solidity
error NotWhitelistedMarket();        // Caller not whitelisted
error SharesNotUnlocked();           // Volume threshold not met
error ShareContractAlreadyExists();  // Creator already has shares
error InvalidMarketContract();       // Invalid market address
error InvalidCreatorAddress();       // Invalid creator address
error InvalidTokenParams();          // Empty name or symbol
```

## Usage Flow

### 1. Initial Setup (Owner)

```solidity
// 1. Deploy factory
CreatorShareFactory factory = new CreatorShareFactory(usdcAddress, owner);

// 2. Whitelist OpinionMarket contracts
factory.addMarketContract(opinionMarket1);
factory.addMarketContract(opinionMarket2);
```

### 2. Volume Tracking (OpinionMarket)

```solidity
// When creator participates in markets
function _processCreatorVolume(address creator, uint256 volume) internal {
    factory.updateCreatorVolume(creator, volume);
}
```

### 3. Check Status (Anyone)

```solidity
// Check creator's progress
uint256 volume = factory.getCreatorVolume(creatorAddress);
bool unlocked = factory.isSharesUnlocked(creatorAddress);
uint256 remaining = factory.getRemainingVolumeToUnlock(creatorAddress);

console.log("Volume:", volume);
console.log("Unlocked:", unlocked);
console.log("Remaining:", remaining);
```

### 4. Create Shares (Anyone, if unlocked)

```solidity
// Once threshold met
if (factory.isSharesUnlocked(creatorAddress)) {
    address shareContract = factory.createCreatorShares(
        creatorAddress,
        "Alice Creator Share",
        "ALICE"
    );

    console.log("Share contract deployed:", shareContract);
}
```

## Integration Example

```solidity
// OpinionMarket contract integration
contract OpinionMarket {
    CreatorShareFactory public factory;

    constructor(address _factory) {
        factory = CreatorShareFactory(_factory);
    }

    function settleMarket(address creator, uint256 volume) external {
        // Update creator's volume
        factory.updateCreatorVolume(creator, volume);

        // Check if shares now unlocked
        if (factory.isSharesUnlocked(creator)) {
            // Emit notification or trigger UI update
            emit CreatorSharesUnlocked(creator);
        }
    }
}
```

## Testing

Run comprehensive test suite:
```bash
npm run test -- --grep "CreatorShareFactory"
```

**Test Coverage - 48 tests passing:**

```
CreatorShareFactory
  Deployment (4 tests)
    ✔ USDC address
    ✔ Owner
    ✔ Volume threshold
    ✔ Initial state

  Market Whitelist Management (6 tests)
    ✔ Add market
    ✔ Remove market
    ✔ Access control
    ✔ Input validation
    ✔ Multiple markets

  Volume Tracking (5 tests)
    ✔ Update volume
    ✔ Whitelist enforcement
    ✔ Accumulation
    ✔ Multiple creators
    ✔ Input validation

  Shares Unlock Threshold (7 tests)
    ✔ Before threshold
    ✔ Exactly at threshold
    ✔ Above threshold
    ✔ Accumulated unlock
    ✔ Single unlock event
    ✔ Remaining calculation

  Create Creator Shares (10 tests)
    ✔ Success case
    ✔ Owner assignment
    ✔ Count increment
    ✔ Array tracking
    ✔ Various reverts
    ✔ Multiple creators

  View Functions (6 tests)
    ✔ Volume queries
    ✔ Unlock status
    ✔ Contract addresses
    ✔ Array access

  canCreateShares Helper (4 tests)
    ✔ All failure cases
    ✔ Success case

  Complex Scenarios (4 tests)
    ✔ Multiple markets
    ✔ Market removal
    ✔ Mixed volumes
    ✔ Deployment tracking

  Integration (2 tests)
    ✔ CreatorShare deployment
    ✔ Contract configuration

Total: 48 passing (836ms)
```

## Security Considerations

### 1. Access Control
- ✅ Owner-only functions for whitelist management
- ✅ Whitelist-only volume updates
- ✅ Anyone can create shares (if unlocked)

### 2. One Share Per Creator
- ✅ Enforced at contract level
- ✅ Cannot bypass or override
- ✅ Permanent after creation

### 3. Volume Threshold
- ✅ Cannot be changed after deployment
- ✅ Accumulates from multiple markets
- ✅ Cannot be decreased

### 4. Whitelist Management
- ✅ Owner can add/remove markets
- ✅ Immediate effect on new updates
- ✅ Previous volumes remain valid

### 5. Input Validation
- ✅ Zero address checks
- ✅ Empty string checks
- ✅ Comprehensive validation

## Gas Optimization

- Immutable USDC address
- View functions for queries
- Minimal storage writes
- Efficient array management

## Common Patterns

### Check Before Create
```solidity
(bool canCreate, string memory reason) = factory.canCreateShares(creator);
require(canCreate, reason);
factory.createCreatorShares(creator, "Name", "SYM");
```

### Track Progress
```solidity
uint256 progress = (factory.getCreatorVolume(creator) * 100) / factory.VOLUME_THRESHOLD();
console.log("Progress:", progress, "%");
```

### List All Shares
```solidity
address[] memory allShares = factory.getAllCreatorShares();
for (uint i = 0; i < allShares.length; i++) {
    console.log("Share", i, ":", allShares[i]);
}
```

## Future Enhancements

Potential improvements:
- [ ] Variable thresholds per creator tier
- [ ] Volume decay mechanism
- [ ] Multi-token support beyond USDC
- [ ] Batch share creation
- [ ] Pausable deployment
- [ ] Upgradeable via proxy

## License

MIT

---

**Created for Guessly Prediction Market Platform**
