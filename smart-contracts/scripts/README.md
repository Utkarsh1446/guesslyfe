# Deployment Scripts

This directory contains deployment and verification scripts for Guessly smart contracts.

## Scripts Overview

### Deployment Scripts

| Script | Description | Network |
|--------|-------------|---------|
| `deploy-testnet.ts` | Deploy contracts to Base Sepolia | Testnet |
| `deploy-mainnet.ts` | Deploy contracts to Base Mainnet (with confirmations) | Mainnet |

### Utility Scripts

| Script | Description |
|--------|-------------|
| `verify-contracts.ts` | Verify contracts on BaseScan |
| `export-addresses.ts` | Export deployment addresses to various formats |

## Quick Start

### 1. Testnet Deployment

```bash
# Deploy to Base Sepolia
npx hardhat run scripts/deploy-testnet.ts --network baseSepolia

# Verify contracts
npx hardhat run scripts/verify-contracts.ts --network baseSepolia

# Export addresses
npx hardhat run scripts/export-addresses.ts testnet
```

### 2. Mainnet Deployment

```bash
# Deploy to Base Mainnet (with confirmations)
npx hardhat run scripts/deploy-mainnet.ts --network baseMainnet

# Verify contracts
npx hardhat run scripts/verify-contracts.ts --network baseMainnet

# Export addresses
npx hardhat run scripts/export-addresses.ts mainnet
```

## Output Files

### Deployment Addresses

- `../deployments/testnet.json` - Testnet deployment addresses
- `../deployments/mainnet.json` - Mainnet deployment addresses

### Exported Configs

- `../exports/testnet.env` - Environment variables for testnet
- `../exports/testnet.config.js` - JavaScript config for testnet
- `../exports/testnet.config.ts` - TypeScript config for testnet
- `../exports/mainnet.env` - Environment variables for mainnet
- `../exports/mainnet.config.js` - JavaScript config for mainnet
- `../exports/mainnet.config.ts` - TypeScript config for mainnet

## Script Details

### deploy-testnet.ts

Deploys all contracts to Base Sepolia testnet:

1. Verifies network (chainId: 84532)
2. Deploys FeeCollector
3. Deploys CreatorShareFactory
4. Deploys OpinionMarket
5. Links contracts (whitelisting)
6. Verifies linkages
7. Saves addresses to `deployments/testnet.json`

**Usage:**
```bash
npx hardhat run scripts/deploy-testnet.ts --network baseSepolia
```

### deploy-mainnet.ts

Deploys all contracts to Base Mainnet with safety checks:

1. Confirms mainnet deployment
2. Checks minimum balance (0.01 ETH)
3. Verifies network (chainId: 8453)
4. Requires confirmation for each step
5. Deploys FeeCollector (with confirmation)
6. Deploys CreatorShareFactory (with confirmation)
7. Deploys OpinionMarket (with confirmation)
8. Links contracts (with confirmation)
9. Verifies linkages
10. Saves addresses to `deployments/mainnet.json`

**Usage:**
```bash
npx hardhat run scripts/deploy-mainnet.ts --network baseMainnet
```

**Safety Features:**
- Interactive confirmations at each step
- Network verification
- Balance checks
- 5-second delays between deployments
- Option to cancel linking if needed

### verify-contracts.ts

Verifies deployed contracts on BaseScan:

1. Loads deployment addresses
2. Verifies FeeCollector
3. Verifies CreatorShareFactory
4. Verifies OpinionMarket
5. Provides BaseScan URLs

**Usage:**
```bash
# Testnet
npx hardhat run scripts/verify-contracts.ts --network baseSepolia

# Mainnet
npx hardhat run scripts/verify-contracts.ts --network baseMainnet
```

### export-addresses.ts

Exports deployment addresses to various formats for backend integration:

Generates:
- `.env` file with environment variables
- `.config.js` file with JavaScript config
- `.config.ts` file with TypeScript config

**Usage:**
```bash
# Export testnet addresses
npx hardhat run scripts/export-addresses.ts testnet

# Export mainnet addresses
npx hardhat run scripts/export-addresses.ts mainnet
```

## Environment Variables Required

Create a `.env` file in the `smart-contracts` directory:

```env
PRIVATE_KEY=your_private_key_here
BASE_SEPOLIA_RPC_URL=https://sepolia.base.org
BASE_MAINNET_RPC_URL=https://mainnet.base.org
BASESCAN_API_KEY=your_basescan_api_key_here
```

## Network Configuration

### Base Sepolia (Testnet)
- Chain ID: 84532
- USDC: 0x036CbD53842c5426634e7929541eC2318f3dCF7e
- Block Explorer: https://sepolia.basescan.org
- Faucet: https://faucet.quicknode.com/base/sepolia

### Base Mainnet
- Chain ID: 8453
- USDC: 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913
- Block Explorer: https://basescan.org

## Complete Documentation

See `../docs/DEPLOYMENT.md` for detailed deployment guide and troubleshooting.

---

**Created for Guessly Prediction Market Platform**
