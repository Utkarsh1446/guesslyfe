# Deployment Guide

Complete guide for deploying Guessly smart contracts to Base Sepolia (testnet) and Base Mainnet.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Environment Setup](#environment-setup)
- [Testnet Deployment](#testnet-deployment)
- [Mainnet Deployment](#mainnet-deployment)
- [Verification](#verification)
- [Backend Integration](#backend-integration)
- [Post-Deployment](#post-deployment)
- [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Required Software

- Node.js >= 18.0.0
- npm or yarn
- Git

### Required Accounts

1. **Wallet with ETH**
   - Testnet: Get ETH from [Base Sepolia Faucet](https://faucet.quicknode.com/base/sepolia)
   - Mainnet: Real ETH required (minimum 0.01 ETH recommended)

2. **BaseScan API Key**
   - Create account at [BaseScan](https://basescan.org/)
   - Generate API key in account settings

### Required Information

- Private key of deployer wallet
- Base Sepolia RPC URL (or use public: `https://sepolia.base.org`)
- Base Mainnet RPC URL (or use public: `https://mainnet.base.org`)

---

## Environment Setup

### 1. Install Dependencies

```bash
cd smart-contracts
npm install
```

### 2. Create .env File

Create a `.env` file in the `smart-contracts` directory:

```env
# Private Key (DO NOT COMMIT THIS FILE)
PRIVATE_KEY=your_private_key_here

# RPC URLs
BASE_SEPOLIA_RPC_URL=https://sepolia.base.org
BASE_MAINNET_RPC_URL=https://mainnet.base.org

# BaseScan API Key (for verification)
BASESCAN_API_KEY=your_basescan_api_key_here
```

**⚠️ SECURITY WARNING:**
- NEVER commit your private key or .env file to git
- Use a dedicated deployment wallet
- For mainnet, consider using a hardware wallet or multisig

### 3. Verify Environment

```bash
# Check that Hardhat can connect to networks
npx hardhat console --network baseSepolia
# In console, type: await ethers.provider.getBlockNumber()
# Should return a block number, then exit with .exit
```

---

## Testnet Deployment

### Step 1: Ensure Sufficient Balance

Check your testnet ETH balance:

```bash
npx hardhat run scripts/check-balance.ts --network baseSepolia
```

If low, get testnet ETH from:
- [Base Sepolia Faucet](https://faucet.quicknode.com/base/sepolia)
- [Coinbase Wallet Faucet](https://portal.cdp.coinbase.com/products/faucet)

### Step 2: Deploy Contracts

```bash
npx hardhat run scripts/deploy-testnet.ts --network baseSepolia
```

This script will:
1. ✅ Verify network (Base Sepolia, chainId: 84532)
2. ✅ Deploy FeeCollector contract
3. ✅ Deploy CreatorShareFactory contract
4. ✅ Deploy OpinionMarket contract
5. ✅ Link contracts together (whitelist OpinionMarket)
6. ✅ Verify all linkages
7. ✅ Save addresses to `deployments/testnet.json`

**Expected Output:**

```
============================================================
DEPLOYING TO BASE SEPOLIA TESTNET
============================================================

Deploying contracts with account: 0x...
Account balance: 0.05 ETH

Network: baseSepolia
Chain ID: 84532
✅ Confirmed: Base Sepolia network

------------------------------------------------------------
Step 1: Deploying FeeCollector...
------------------------------------------------------------
✅ FeeCollector deployed to: 0x...

------------------------------------------------------------
Step 2: Deploying CreatorShareFactory...
------------------------------------------------------------
✅ CreatorShareFactory deployed to: 0x...

------------------------------------------------------------
Step 3: Deploying OpinionMarket...
------------------------------------------------------------
✅ OpinionMarket deployed to: 0x...

------------------------------------------------------------
Step 4: Linking contracts...
------------------------------------------------------------
✅ OpinionMarket whitelisted in Factory
✅ OpinionMarket whitelisted in FeeCollector

============================================================
DEPLOYMENT SUMMARY
============================================================

Deployed Contracts:
  FeeCollector:       0x...
  Factory:            0x...
  OpinionMarket:      0x...

Next Steps:
  1. Verify contracts on BaseScan:
     npx hardhat run scripts/verify-contracts.ts --network baseSepolia
```

### Step 3: Verify Contracts on BaseScan

```bash
npx hardhat run scripts/verify-contracts.ts --network baseSepolia
```

This will verify all three contracts on BaseScan, making their source code publicly viewable.

### Step 4: Export Addresses for Backend

```bash
npx hardhat run scripts/export-addresses.ts testnet
```

This generates:
- `exports/testnet.env` - Environment variables
- `exports/testnet.config.js` - JavaScript config
- `exports/testnet.config.ts` - TypeScript config

---

## Mainnet Deployment

**⚠️ IMPORTANT MAINNET WARNINGS:**

1. **Use Real ETH** - Mainnet deployment costs real money
2. **Test First** - Always deploy and test on testnet first
3. **Double Check** - Review all addresses and parameters
4. **Security** - Consider using a multisig for ownership
5. **Audit** - Get contracts audited before mainnet deployment

### Step 1: Pre-Deployment Checklist

- [ ] All contracts thoroughly tested on testnet
- [ ] Sufficient ETH in deployer wallet (0.01+ ETH)
- [ ] .env configured with mainnet RPC and private key
- [ ] BaseScan API key configured
- [ ] Multisig wallet address ready (optional but recommended)

### Step 2: Deploy to Mainnet

```bash
npx hardhat run scripts/deploy-mainnet.ts --network baseMainnet
```

The mainnet script includes **interactive confirmations** at each step:

```
⚠️  DEPLOYING TO BASE MAINNET ⚠️
⚠️  WARNING: You are about to deploy to MAINNET
   This will use real ETH and deploy to production

⚠️  Are you sure you want to deploy to MAINNET?
   Type 'yes' to continue: yes

Deployer account: 0x...
Account balance: 0.05 ETH

✅ Confirmed: Base Mainnet

------------------------------------------------------------
Step 1: Deploying FeeCollector
------------------------------------------------------------
Parameters:
  USDC: 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913
  Owner: 0x...

⚠️  Deploy FeeCollector with these parameters?
   Type 'yes' to continue: yes

✅ FeeCollector deployed to: 0x...

[... similar confirmations for each step ...]
```

You must type `'yes'` at each step to proceed.

### Step 3: Verify on BaseScan

```bash
npx hardhat run scripts/verify-contracts.ts --network baseMainnet
```

### Step 4: Transfer Ownership to Multisig (Recommended)

After deployment, transfer ownership to a multisig for security:

```bash
# Open Hardhat console
npx hardhat console --network baseMainnet

# In console:
const [deployer] = await ethers.getSigners();
const multisig = "0x..."; // Your multisig address

// Transfer FeeCollector ownership
const feeCollector = await ethers.getContractAt("FeeCollector", "0x...");
await feeCollector.transferOwnership(multisig);

// Transfer Factory ownership
const factory = await ethers.getContractAt("CreatorShareFactory", "0x...");
await factory.transferOwnership(multisig);

// Transfer OpinionMarket ownership
const market = await ethers.getContractAt("OpinionMarket", "0x...");
await market.transferOwnership(multisig);
```

### Step 5: Export Addresses

```bash
npx hardhat run scripts/export-addresses.ts mainnet
```

---

## Verification

### Manual Verification (if auto-verify fails)

If automatic verification fails, verify manually:

```bash
# FeeCollector
npx hardhat verify --network baseSepolia 0xFEE_COLLECTOR_ADDRESS \
  "0x036CbD53842c5426634e7929541eC2318f3dCF7e" \
  "0xDEPLOYER_ADDRESS"

# CreatorShareFactory
npx hardhat verify --network baseSepolia 0xFACTORY_ADDRESS \
  "0x036CbD53842c5426634e7929541eC2318f3dCF7e" \
  "0xDEPLOYER_ADDRESS"

# OpinionMarket
npx hardhat verify --network baseSepolia 0xMARKET_ADDRESS \
  "0x036CbD53842c5426634e7929541eC2318f3dCF7e" \
  "0xFACTORY_ADDRESS" \
  "0xFEE_COLLECTOR_ADDRESS" \
  "0xDEPLOYER_ADDRESS"
```

Replace addresses accordingly for mainnet.

---

## Backend Integration

### Using Environment Variables

Copy `exports/testnet.env` (or `mainnet.env`) to your backend project:

```bash
# Backend .env
NEXT_PUBLIC_NETWORK=baseSepolia
NEXT_PUBLIC_CHAIN_ID=84532
NEXT_PUBLIC_USDC_ADDRESS=0x036CbD53842c5426634e7929541eC2318f3dCF7e
NEXT_PUBLIC_FEE_COLLECTOR_ADDRESS=0x...
NEXT_PUBLIC_CREATOR_SHARE_FACTORY_ADDRESS=0x...
NEXT_PUBLIC_OPINION_MARKET_ADDRESS=0x...
```

### Using JavaScript/TypeScript Config

```typescript
// Import the config
import { contractAddresses, networkConfig } from './config/testnet.config';

// Use in your code
const opinionMarketAddress = contractAddresses.opinionMarket;
const factoryAddress = contractAddresses.creatorShareFactory;
```

### Updating Frontend

1. Copy contract ABIs from `artifacts/contracts/` to your frontend
2. Update contract addresses in frontend config
3. Ensure correct network (chainId: 84532 for testnet, 8453 for mainnet)

---

## Post-Deployment

### 1. Test Basic Functionality

Create a test script to verify contracts work:

```javascript
// test-deployment.js
const { ethers } = require("hardhat");

async function main() {
  const [user] = await ethers.getSigners();
  
  // Load deployed contracts
  const factory = await ethers.getContractAt("CreatorShareFactory", "0x...");
  const market = await ethers.getContractAt("OpinionMarket", "0x...");
  
  // Check configuration
  const volumeThreshold = await factory.VOLUME_THRESHOLD();
  console.log("Volume Threshold:", ethers.formatUnits(volumeThreshold, 6), "USDC");
  
  const isWhitelisted = await factory.isMarketWhitelisted(await market.getAddress());
  console.log("Market Whitelisted:", isWhitelisted);
}

main();
```

### 2. Monitor Contracts

- Set up event monitoring for:
  - Market creation
  - Bet placement
  - Fee collection
  - Share creation

### 3. Set Up Subgraph (Optional)

For efficient data querying, consider deploying a subgraph:
- Index market events
- Track volume and fees
- Monitor share creation

### 4. Documentation

Update your documentation with:
- Contract addresses
- Network details
- ABI locations
- Integration examples

---

## Troubleshooting

### Common Issues

#### 1. "Insufficient Funds" Error

**Problem:** Not enough ETH for gas

**Solution:**
```bash
# Check balance
npx hardhat run scripts/check-balance.ts --network baseSepolia

# Get testnet ETH from faucet
# For mainnet, send more ETH to deployer wallet
```

#### 2. "Nonce Too Low" Error

**Problem:** Transaction nonce mismatch

**Solution:**
```bash
# Reset nonce in Hardhat
npx hardhat clean
# Or manually specify nonce in deployment script
```

#### 3. "Contract Already Deployed" Error

**Problem:** Trying to deploy to same address

**Solution:**
- Use a different deployer address
- Or deploy with different salt (if using CREATE2)

#### 4. Verification Fails

**Problem:** BaseScan verification not working

**Solution:**
```bash
# Wait 1-2 minutes after deployment
# Check BaseScan API key is correct
# Try manual verification (see Verification section)
```

#### 5. Wrong Network

**Problem:** Deployed to wrong network

**Solution:**
- Check `--network` flag matches desired network
- Verify chainId in deployment output
- Check RPC URL in .env

#### 6. Gas Price Too High

**Problem:** Transaction stuck due to low gas price

**Solution:**
```javascript
// In deployment script, specify gas price
const tx = await contract.deploy(..., {
  maxFeePerGas: ethers.parseUnits("50", "gwei"),
  maxPriorityFeePerGas: ethers.parseUnits("2", "gwei"),
});
```

### Getting Help

If you encounter issues:

1. Check Hardhat console for error details
2. View transaction on BaseScan
3. Verify contract addresses in deployment JSON
4. Check contract verification status
5. Review deployment logs

---

## Script Reference

| Script | Purpose | Command |
|--------|---------|---------|
| `deploy-testnet.ts` | Deploy to Base Sepolia | `npx hardhat run scripts/deploy-testnet.ts --network baseSepolia` |
| `deploy-mainnet.ts` | Deploy to Base Mainnet | `npx hardhat run scripts/deploy-mainnet.ts --network baseMainnet` |
| `verify-contracts.ts` | Verify on BaseScan | `npx hardhat run scripts/verify-contracts.ts --network baseSepolia` |
| `export-addresses.ts` | Export config files | `npx hardhat run scripts/export-addresses.ts testnet` |

---

## Network Details

### Base Sepolia (Testnet)

- **Chain ID:** 84532
- **RPC URL:** https://sepolia.base.org
- **Block Explorer:** https://sepolia.basescan.org
- **USDC Address:** 0x036CbD53842c5426634e7929541eC2318f3dCF7e
- **Faucet:** https://faucet.quicknode.com/base/sepolia

### Base Mainnet

- **Chain ID:** 8453
- **RPC URL:** https://mainnet.base.org
- **Block Explorer:** https://basescan.org
- **USDC Address:** 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913

---

## Security Best Practices

1. **Never commit private keys** - Use .gitignore for .env
2. **Use hardware wallets** - For mainnet deployments
3. **Verify contracts** - Always verify source code
4. **Test thoroughly** - Deploy to testnet first
5. **Audit contracts** - Get professional audit before mainnet
6. **Multisig ownership** - Use multisig for production
7. **Monitor contracts** - Set up alerts for unusual activity
8. **Gradual rollout** - Start with limited features

---

## License

MIT

---

**Created for Guessly Prediction Market Platform**
