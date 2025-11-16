# Contract Update - November 16, 2025

## 🔄 Contract Redeployment Notice

**Date:** November 16, 2025
**Reason:** Virtual Liquidity Bootstrapping Implementation

---

## 📍 New Contract Addresses (Base Sepolia)

| Contract | Old Address | New Address |
|----------|-------------|-------------|
| **FeeCollector** | `0x86d036b59d23e0BF6e7A43d8e625c005Aa8bd7B4` | **`0x9E0e83E0569d42a3A0420F68fe4D967F4C10F423`** |
| **CreatorShareFactory** | `0xe941e7fC3aaFecb944E70FCe236BD638ACCbDD53` | **`0xaE86eC369E33A74769Ef7A1609b76E84B417c5Db`** |
| **OpinionMarket** | `0x60a308C4e4d653F5BA6c5EFf412C9cDc3FAEEc72` | **`0x9cC5bBBceb80bE28f9be3F7dd69dC815Ba64099C`** |
| **USDC** | `0x036CbD53842c5426634e7929541eC2318f3dCF7e` | `0x036CbD53842c5426634e7929541eC2318f3dCF7e` (unchanged) |

---

## ✨ What's New

### Virtual Liquidity Bootstrapping

The OpinionMarket contract now includes Virtual Liquidity Bootstrapping:

- **5,000 USDC virtual reserve per outcome**
- **Fair initial pricing** - markets start at 50/50
- **Prevents extreme price movements** on first trades
- **No capital required** to launch markets
- **Smooth price discovery** with lower slippage

### Technical Details

```solidity
uint256 public constant VIRTUAL_LIQUIDITY_PER_OUTCOME = 5000e6; // 5000 USDC
```

**AMM Formula:**
```
shares = (amount × totalEffectiveReserves) / outcomeEffectiveReserve
```

Where:
- `effectiveReserve = realReserve + VIRTUAL_LIQUIDITY_PER_OUTCOME`

**Important:** Virtual liquidity is used for **price calculation only** and is **not withdrawable**.

---

## 📦 Files Updated

### Backend
- ✅ `/backend/src/contracts/addresses.json`
- ✅ `/backend/.env.example`

### Documentation
- ✅ `/QUICK_REFERENCE.md`
- ✅ `/smart-contracts/DEPLOYMENT.md`

### Smart Contracts
- ✅ `/smart-contracts/contracts/OpinionMarket.sol`
- ✅ Comprehensive test suite (228 tests passing)

---

## 🧪 Testing Results

All tests passing:
- ✅ Virtual Liquidity: 5000 USDC per outcome
- ✅ Initial probabilities: 50/50
- ✅ Share calculation: Working correctly
- ✅ Price stability: Confirmed (no 100% jumps on first bet)
- ✅ Reserve separation: Virtual liquidity excluded from payouts

---

## 🌐 View Contracts on BaseScan

- [FeeCollector](https://sepolia.basescan.org/address/0x9E0e83E0569d42a3A0420F68fe4D967F4C10F423)
- [CreatorShareFactory](https://sepolia.basescan.org/address/0xaE86eC369E33A74769Ef7A1609b76E84B417c5Db)
- [OpinionMarket](https://sepolia.basescan.org/address/0x9cC5bBBceb80bE28f9be3F7dd69dC815Ba64099C)

---

## ⚙️ Action Required

If you have local development environment:

1. **Update environment variables:**
   ```bash
   # In backend/.env
   CONTRACT_FEE_COLLECTOR=0x9E0e83E0569d42a3A0420F68fe4D967F4C10F423
   CONTRACT_CREATOR_SHARE_FACTORY=0xaE86eC369E33A74769Ef7A1609b76E84B417c5Db
   CONTRACT_OPINION_MARKET=0x9cC5bBBceb80bE28f9be3F7dd69dC815Ba64099C
   ```

2. **Restart services:**
   ```bash
   # Restart backend
   cd backend && npm run start:dev
   ```

3. **Clear any cached contract addresses** in your application

---

## 📊 Benefits

| Benefit | Description |
|---------|-------------|
| **Fair Launch** | All markets start at equal probability |
| **No Initial Capital** | Deploy markets without funding |
| **Better UX** | Meaningful prices from day one |
| **Anti-Manipulation** | First trade can't push probability to extremes |
| **Smooth Trading** | Lower slippage for early traders |

---

## 📝 Previous Contract Deprecation

The old contracts deployed on November 14, 2025 are now deprecated:
- ❌ FeeCollector: `0x86d036b59d23e0BF6e7A43d8e625c005Aa8bd7B4`
- ❌ CreatorShareFactory: `0xe941e7fC3aaFecb944E70FCe236BD638ACCbDD53`
- ❌ OpinionMarket: `0x60a308C4e4d653F5BA6c5EFf412C9cDc3FAEEc72`

**Note:** Since this is testnet, no migration is needed. Simply update to the new addresses.

---

## ❓ Questions?

See `/smart-contracts/DEPLOYMENT.md` for full deployment details and test results.
