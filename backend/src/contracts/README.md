# Guessly Smart Contract Types

TypeScript types and ABIs for Guessly smart contracts.

## Installation

Copy this directory to your backend project:

```bash
cp -r exports/types backend/src/types/contracts
```

## Usage

### Importing Types

```typescript
import {
  OpinionMarket,
  CreatorShare,
  CreatorShareFactory,
  FeeCollector,
  ABIs,
} from "./types/contracts";
```

### Using with ethers.js

```typescript
import { ethers } from "ethers";
import { OpinionMarket, OpinionMarketABI } from "./types/contracts";

const provider = new ethers.JsonRpcProvider("https://mainnet.base.org");

const marketContract = new ethers.Contract(
  "0xMARKET_ADDRESS",
  OpinionMarketABI.abi,
  provider
) as unknown as OpinionMarket;

// Type-safe method calls
const marketInfo = await marketContract.getMarketInfo(1);
console.log(marketInfo.title); // TypeScript knows this is a string
```

### Contract Interfaces

#### OpinionMarket

```typescript
interface OpinionMarket extends BaseContract {
  createMarket(
    title: string,
    outcomes: string[],
    duration: BigNumberish,
    description: string
  ): Promise<ContractTransactionResponse>;

  placeBet(
    marketId: BigNumberish,
    outcome: BigNumberish,
    amount: BigNumberish
  ): Promise<ContractTransactionResponse>;

  getMarketInfo(marketId: BigNumberish): Promise<MarketStructOutput>;

  // ... more methods
}
```

#### CreatorShare

```typescript
interface CreatorShare extends BaseContract {
  buyShares(amount: BigNumberish): Promise<ContractTransactionResponse>;

  sellShares(amount: BigNumberish): Promise<ContractTransactionResponse>;

  claimDividends(): Promise<ContractTransactionResponse>;

  getPendingDividends(user: AddressLike): Promise<bigint>;

  // ... more methods
}
```

#### CreatorShareFactory

```typescript
interface CreatorShareFactory extends BaseContract {
  createCreatorShares(
    creator: AddressLike,
    name: string,
    symbol: string
  ): Promise<ContractTransactionResponse>;

  getCreatorVolume(creator: AddressLike): Promise<bigint>;

  isSharesUnlocked(creator: AddressLike): Promise<boolean>;

  // ... more methods
}
```

## Files

- `*.ts` - TypeChain generated TypeScript types
- `abis/*.json` - Contract ABIs with bytecode
- `index.ts` - Main export file
- `common.ts` - Common types and utilities

## TypeChain Version

Generated with TypeChain v8.3.2 targeting ethers-v6.

## Regeneration

To regenerate types after contract changes:

```bash
cd smart-contracts
npm run compile
npm run export-types
```

## Documentation

See [Integration Guide](../../docs/contracts/INTEGRATION.md) for detailed integration examples.
