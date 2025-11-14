# Guessly Smart Contracts

Prediction market platform smart contracts deployed on Base Chain.

## Setup

1. **Install Dependencies**
```bash
npm install
```

2. **Configure Environment Variables**
```bash
cp .env.example .env
```

Edit `.env` and add your:
- `PRIVATE_KEY`: Your wallet private key (without 0x prefix)
- `ALCHEMY_API_KEY`: Your Alchemy API key (optional)
- `BASESCAN_API_KEY`: Your Basescan API key (for contract verification)

## Project Structure

```
smart-contracts/
├── contracts/              # Solidity smart contracts
│   ├── BondingCurve.sol        # Quadratic bonding curve library
│   ├── CreatorShare.sol        # ERC20 creator shares with dividends
│   ├── CreatorShareFactory.sol # Factory for deploying creator shares
│   ├── OpinionMarket.sol       # Prediction market with AMM
│   └── FeeCollector.sol        # Centralized fee collection
├── scripts/                # Deployment scripts
│   ├── deploy-testnet.ts       # Testnet deployment
│   ├── deploy-mainnet.ts       # Mainnet deployment
│   ├── verify-contracts.ts     # Contract verification
│   └── export-addresses.ts     # Export addresses
├── test/                   # Comprehensive test suite (219 tests)
├── docs/                   # Contract documentation
│   ├── BondingCurve.md
│   ├── CreatorShare.md
│   ├── CreatorShareFactory.md
│   ├── OpinionMarket.md
│   ├── FeeCollector.md
│   └── DEPLOYMENT.md           # Deployment guide
├── deployments/            # Deployment addresses (gitignored)
├── exports/                # Exported configs (gitignored)
├── hardhat.config.ts       # Hardhat configuration
└── .env                    # Environment variables (gitignored)
```

## Smart Contracts

### BondingCurve.sol
Quadratic bonding curve library for share pricing.
- **Formula**: Price = Supply² / 1400
- **Max Supply**: 1000 shares
- **Coverage**: 100%

### CreatorShare.sol
ERC20 token with bonding curve pricing and dividend distribution.
- **Max Supply**: 1000 shares
- **Sell Fee**: 5% (2.5% platform, 2.5% reward pool)
- **Epochs**: Dividend distribution system
- **Coverage**: 100%

### CreatorShareFactory.sol
Factory for deploying and managing creator share contracts.
- **Volume Threshold**: $30,000 USDC
- **One Share Per Creator**: Enforced
- **Whitelist**: Only approved markets can update volume
- **Coverage**: 97.5%

### OpinionMarket.sol
Prediction market with AMM pricing.
- **Outcomes**: 2-4 per market
- **Duration**: 6 hours to 7 days
- **Trading Fee**: 1.5% (0.75% platform, 0.6% creator, 0.15% shareholders)
- **Resolution**: Manual by admin
- **Coverage**: 96.88%

### FeeCollector.sol
Centralized fee collection and management.
- **Sources**: CreatorShare + OpinionMarket
- **Tracking**: Separate tracking by source
- **Withdrawals**: Owner-controlled
- **Coverage**: 100%

**Total Test Coverage**: 97.41% statements, 94.29% functions, 97.98% lines

## Development

### Compile Contracts
```bash
npm run compile
```

### Run Tests
```bash
npm run test
```

### Test Coverage
```bash
npm run coverage
```

### Run Local Hardhat Node
```bash
npm run node
```

## Deployment

### Quick Start - Testnet Deployment

```bash
# 1. Deploy to Base Sepolia
npx hardhat run scripts/deploy-testnet.ts --network baseSepolia

# 2. Verify contracts on BaseScan
npx hardhat run scripts/verify-contracts.ts --network baseSepolia

# 3. Export addresses for backend
npx hardhat run scripts/export-addresses.ts testnet
```

### Quick Start - Mainnet Deployment

```bash
# 1. Deploy to Base Mainnet (with confirmations)
npx hardhat run scripts/deploy-mainnet.ts --network baseMainnet

# 2. Verify contracts on BaseScan
npx hardhat run scripts/verify-contracts.ts --network baseMainnet

# 3. Export addresses for backend
npx hardhat run scripts/export-addresses.ts mainnet
```

### Deployment Scripts

- **`deploy-testnet.ts`** - Automated testnet deployment
- **`deploy-mainnet.ts`** - Mainnet deployment with safety checks and confirmations
- **`verify-contracts.ts`** - Verify all contracts on BaseScan
- **`export-addresses.ts`** - Export deployment addresses to .env, .js, and .ts formats

See `docs/DEPLOYMENT.md` for detailed deployment guide.

### Deployed Contracts

After deployment, addresses are saved to:
- `deployments/testnet.json` - Testnet addresses
- `deployments/mainnet.json` - Mainnet addresses

Exported configs are saved to:
- `exports/testnet.env` - Environment variables
- `exports/testnet.config.js` - JavaScript config
- `exports/testnet.config.ts` - TypeScript config

## Networks

### Base Sepolia Testnet
- **RPC URL**: https://sepolia.base.org
- **Chain ID**: 84532
- **Block Explorer**: https://sepolia.basescan.org
- **Faucet**: https://www.coinbase.com/faucets/base-ethereum-goerli-faucet

### Base Mainnet
- **RPC URL**: https://mainnet.base.org
- **Chain ID**: 8453
- **Block Explorer**: https://basescan.org

## Security

- Never commit your `.env` file
- Never share your private keys
- Always test on testnet before mainnet deployment
- Consider using a hardware wallet for mainnet deployments
- Run security audits before mainnet deployment

## Available Scripts

- `npm run compile` - Compile smart contracts
- `npm run test` - Run tests
- `npm run coverage` - Generate test coverage report
- `npm run deploy:testnet` - Deploy to Base Sepolia testnet
- `npm run deploy:mainnet` - Deploy to Base Mainnet
- `npm run verify:testnet` - Verify contract on testnet
- `npm run verify:mainnet` - Verify contract on mainnet
- `npm run node` - Start local Hardhat node
- `npm run clean` - Clean artifacts and cache

## Documentation

### Contract Documentation

- **[Architecture Overview](docs/contracts/README.md)** - System architecture, contract interactions, gas estimates
- **[Integration Guide](docs/contracts/INTEGRATION.md)** - Backend integration with code examples
- **[Security Guide](docs/contracts/SECURITY.md)** - Security procedures and admin functions

### Individual Contract Docs

- [BondingCurve.md](docs/BondingCurve.md) - Quadratic bonding curve library
- [CreatorShare.md](docs/CreatorShare.md) - ERC20 shares with dividends
- [CreatorShareFactory.md](docs/CreatorShareFactory.md) - Factory deployment system
- [OpinionMarket.md](docs/OpinionMarket.md) - Prediction market implementation
- [FeeCollector.md](docs/FeeCollector.md) - Fee management system
- [DEPLOYMENT.md](docs/DEPLOYMENT.md) - Deployment guide

### TypeScript Types

TypeChain-generated types are available in `exports/types/`:

```typescript
import { OpinionMarket, CreatorShare } from "./types/contracts";
```

Generate types:
```bash
npx hardhat compile
npx ts-node scripts/export-types.ts
```

## Resources

- [Hardhat Documentation](https://hardhat.org/docs)
- [Base Chain Documentation](https://docs.base.org)
- [OpenZeppelin Contracts](https://docs.openzeppelin.com/contracts)
- [TypeChain Documentation](https://github.com/dethcrypto/TypeChain)

## License

ISC
