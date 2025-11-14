# Backend Integration Guide

Complete guide for integrating Guessly smart contracts with your backend application.

## Table of Contents

- [Setup](#setup)
- [Contract ABIs](#contract-abis)
- [Initialization](#initialization)
- [Reading Data](#reading-data)
- [Writing Transactions](#writing-transactions)
- [Event Listening](#event-listening)
- [Gas Estimation](#gas-estimation)
- [Error Handling](#error-handling)
- [Best Practices](#best-practices)

---

## Setup

### Install Dependencies

```bash
npm install ethers@6 @types/node
```

### Environment Configuration

```typescript
// config/contracts.ts
export const CONTRACT_ADDRESSES = {
  baseSepolia: {
    usdc: "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
    feeCollector: "0x...",
    creatorShareFactory: "0x...",
    opinionMarket: "0x...",
  },
  baseMainnet: {
    usdc: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
    feeCollector: "0x...",
    creatorShareFactory: "0x...",
    opinionMarket: "0x...",
  },
};

export const NETWORK_CONFIG = {
  baseSepolia: {
    chainId: 84532,
    rpcUrl: "https://sepolia.base.org",
    explorer: "https://sepolia.basescan.org",
  },
  baseMainnet: {
    chainId: 8453,
    rpcUrl: "https://mainnet.base.org",
    explorer: "https://basescan.org",
  },
};
```

---

## Contract ABIs

### Required ABIs

Copy ABIs from compiled contracts:

```bash
# After compiling contracts
cp artifacts/contracts/FeeCollector.sol/FeeCollector.json backend/src/abis/
cp artifacts/contracts/CreatorShareFactory.sol/CreatorShareFactory.json backend/src/abis/
cp artifacts/contracts/OpinionMarket.sol/OpinionMarket.json backend/src/abis/
cp artifacts/contracts/CreatorShare.sol/CreatorShare.json backend/src/abis/
```

### Loading ABIs

```typescript
// lib/abis.ts
import FeeCollectorABI from "../abis/FeeCollector.json";
import CreatorShareFactoryABI from "../abis/CreatorShareFactory.json";
import OpinionMarketABI from "../abis/OpinionMarket.json";
import CreatorShareABI from "../abis/CreatorShare.json";
import USDCABI from "../abis/USDC.json";

export {
  FeeCollectorABI,
  CreatorShareFactoryABI,
  OpinionMarketABI,
  CreatorShareABI,
  USDCABI,
};
```

---

## Initialization

### Provider Setup

```typescript
// lib/provider.ts
import { ethers } from "ethers";
import { NETWORK_CONFIG } from "../config/contracts";

export function getProvider(network: "baseSepolia" | "baseMainnet") {
  const config = NETWORK_CONFIG[network];
  return new ethers.JsonRpcProvider(config.rpcUrl);
}

export function getSigner(
  privateKey: string,
  network: "baseSepolia" | "baseMainnet"
) {
  const provider = getProvider(network);
  return new ethers.Wallet(privateKey, provider);
}
```

### Contract Instances

```typescript
// lib/contracts.ts
import { ethers } from "ethers";
import { CONTRACT_ADDRESSES } from "../config/contracts";
import {
  FeeCollectorABI,
  CreatorShareFactoryABI,
  OpinionMarketABI,
  CreatorShareABI,
} from "./abis";

export function getOpinionMarket(
  signerOrProvider: ethers.Signer | ethers.Provider,
  network: "baseSepolia" | "baseMainnet"
) {
  const address = CONTRACT_ADDRESSES[network].opinionMarket;
  return new ethers.Contract(address, OpinionMarketABI.abi, signerOrProvider);
}

export function getCreatorShareFactory(
  signerOrProvider: ethers.Signer | ethers.Provider,
  network: "baseSepolia" | "baseMainnet"
) {
  const address = CONTRACT_ADDRESSES[network].creatorShareFactory;
  return new ethers.Contract(
    address,
    CreatorShareFactoryABI.abi,
    signerOrProvider
  );
}

export function getFeeCollector(
  signerOrProvider: ethers.Signer | ethers.Provider,
  network: "baseSepolia" | "baseMainnet"
) {
  const address = CONTRACT_ADDRESSES[network].feeCollector;
  return new ethers.Contract(address, FeeCollectorABI.abi, signerOrProvider);
}

export function getCreatorShare(
  address: string,
  signerOrProvider: ethers.Signer | ethers.Provider
) {
  return new ethers.Contract(address, CreatorShareABI.abi, signerOrProvider);
}
```

---

## Reading Data

### OpinionMarket - Read Operations

```typescript
// services/opinionMarket.ts
import { getOpinionMarket, getProvider } from "../lib/contracts";

// Get market information
export async function getMarketInfo(marketId: number, network: string) {
  const provider = getProvider(network);
  const market = getOpinionMarket(provider, network);

  const info = await market.getMarketInfo(marketId);

  return {
    id: Number(info.id),
    creator: info.creator,
    title: info.title,
    description: info.description,
    outcomes: info.outcomes,
    endTime: Number(info.endTime),
    status: Number(info.status), // 0=Active, 1=Resolved, 2=Disputed, 3=Cancelled
    totalVolume: ethers.formatUnits(info.totalVolume, 6), // USDC has 6 decimals
    winningOutcome: Number(info.winningOutcome),
    paused: info.paused,
    createdAt: Number(info.createdAt),
  };
}

// Get user position in a market
export async function getUserPosition(
  marketId: number,
  userAddress: string,
  network: string
) {
  const provider = getProvider(network);
  const market = getOpinionMarket(provider, network);

  const shares = await market.getUserPosition(marketId, userAddress);

  return shares.map((s: bigint) => ethers.formatUnits(s, 6));
}

// Get outcome probability
export async function getOutcomeProbability(
  marketId: number,
  outcome: number,
  network: string
) {
  const provider = getProvider(network);
  const market = getOpinionMarket(provider, network);

  const probability = await market.getOutcomeProbability(marketId, outcome);

  // Probability is in basis points (10000 = 100%)
  return Number(probability) / 100; // Convert to percentage
}

// Get all active markets
export async function getActiveMarkets(network: string) {
  const provider = getProvider(network);
  const market = getOpinionMarket(provider, network);

  const nextMarketId = await market.nextMarketId();
  const markets = [];

  for (let i = 1; i < nextMarketId; i++) {
    const info = await getMarketInfo(i, network);
    if (info.status === 0 && !info.paused) {
      // Active and not paused
      markets.push(info);
    }
  }

  return markets;
}
```

### CreatorShareFactory - Read Operations

```typescript
// services/creatorShareFactory.ts
import { getCreatorShareFactory, getProvider } from "../lib/contracts";

// Check if creator has unlocked shares
export async function isSharesUnlocked(
  creatorAddress: string,
  network: string
) {
  const provider = getProvider(network);
  const factory = getCreatorShareFactory(provider, network);

  return await factory.isSharesUnlocked(creatorAddress);
}

// Get creator's volume
export async function getCreatorVolume(
  creatorAddress: string,
  network: string
) {
  const provider = getProvider(network);
  const factory = getCreatorShareFactory(provider, network);

  const volume = await factory.getCreatorVolume(creatorAddress);
  return ethers.formatUnits(volume, 6); // USDC decimals
}

// Get remaining volume to unlock
export async function getRemainingVolumeToUnlock(
  creatorAddress: string,
  network: string
) {
  const provider = getProvider(network);
  const factory = getCreatorShareFactory(provider, network);

  const remaining = await factory.getRemainingVolumeToUnlock(creatorAddress);
  return ethers.formatUnits(remaining, 6);
}

// Get creator's share contract
export async function getCreatorShareContract(
  creatorAddress: string,
  network: string
) {
  const provider = getProvider(network);
  const factory = getCreatorShareFactory(provider, network);

  return await factory.getCreatorShareContract(creatorAddress);
}

// Get all creator shares
export async function getAllCreatorShares(network: string) {
  const provider = getProvider(network);
  const factory = getCreatorShareFactory(provider, network);

  return await factory.getAllCreatorShares();
}
```

### CreatorShare - Read Operations

```typescript
// services/creatorShare.ts
import { getCreatorShare, getProvider } from "../lib/contracts";

// Get buy price for shares
export async function getBuyPrice(
  shareAddress: string,
  amount: number,
  network: string
) {
  const provider = getProvider(network);
  const share = getCreatorShare(shareAddress, provider);

  const price = await share.getBuyPrice(ethers.parseUnits(amount.toString(), 18));
  return ethers.formatUnits(price, 6); // USDC
}

// Get sell price for shares
export async function getSellPrice(
  shareAddress: string,
  amount: number,
  network: string
) {
  const provider = getProvider(network);
  const share = getCreatorShare(shareAddress, provider);

  const price = await share.getSellPrice(ethers.parseUnits(amount.toString(), 18));
  return ethers.formatUnits(price, 6); // USDC
}

// Get pending dividends for user
export async function getPendingDividends(
  shareAddress: string,
  userAddress: string,
  network: string
) {
  const provider = getProvider(network);
  const share = getCreatorShare(shareAddress, provider);

  const dividends = await share.getPendingDividends(userAddress);
  return ethers.formatUnits(dividends, 6); // USDC
}

// Get current supply
export async function getCurrentSupply(shareAddress: string, network: string) {
  const provider = getProvider(network);
  const share = getCreatorShare(shareAddress, provider);

  const supply = await share.currentSupply();
  return ethers.formatUnits(supply, 18); // ERC20 decimals
}
```

---

## Writing Transactions

### OpinionMarket - Write Operations

```typescript
// services/opinionMarket.ts (continued)

// Create a new market
export async function createMarket(
  title: string,
  outcomes: string[],
  durationInHours: number,
  description: string,
  signer: ethers.Signer,
  network: string
) {
  const market = getOpinionMarket(signer, network);

  const durationInSeconds = durationInHours * 3600;

  const tx = await market.createMarket(
    title,
    outcomes,
    durationInSeconds,
    description
  );

  const receipt = await tx.wait();

  // Extract marketId from event
  const event = receipt.logs.find(
    (log: any) => log.fragment && log.fragment.name === "MarketCreated"
  );

  return {
    marketId: Number(event.args.marketId),
    txHash: receipt.hash,
  };
}

// Place a bet on a market
export async function placeBet(
  marketId: number,
  outcome: number,
  amountInUsdc: number,
  signer: ethers.Signer,
  network: string
) {
  const market = getOpinionMarket(signer, network);
  const usdc = getUSDC(signer, network);

  const amount = ethers.parseUnits(amountInUsdc.toString(), 6);

  // Approve USDC first
  const approveTx = await usdc.approve(await market.getAddress(), amount);
  await approveTx.wait();

  // Place bet
  const tx = await market.placeBet(marketId, outcome, amount);
  const receipt = await tx.wait();

  return {
    txHash: receipt.hash,
    shares: extractSharesFromReceipt(receipt),
  };
}

// Claim winnings
export async function claimWinnings(
  marketId: number,
  signer: ethers.Signer,
  network: string
) {
  const market = getOpinionMarket(signer, network);

  const tx = await market.claimWinnings(marketId);
  const receipt = await tx.wait();

  return {
    txHash: receipt.hash,
    amount: extractAmountFromReceipt(receipt),
  };
}

// Resolve market (admin only)
export async function resolveMarket(
  marketId: number,
  winningOutcome: number,
  adminSigner: ethers.Signer,
  network: string
) {
  const market = getOpinionMarket(adminSigner, network);

  const tx = await market.resolveMarket(marketId, winningOutcome);
  const receipt = await tx.wait();

  return { txHash: receipt.hash };
}
```

### CreatorShare - Write Operations

```typescript
// services/creatorShare.ts (continued)

// Buy creator shares
export async function buyShares(
  shareAddress: string,
  amount: number,
  signer: ethers.Signer,
  network: string
) {
  const share = getCreatorShare(shareAddress, signer);
  const usdc = getUSDC(signer, network);

  const shareAmount = ethers.parseUnits(amount.toString(), 18);

  // Get buy price
  const price = await share.getBuyPrice(shareAmount);

  // Approve USDC
  const approveTx = await usdc.approve(await share.getAddress(), price);
  await approveTx.wait();

  // Buy shares
  const tx = await share.buyShares(shareAmount);
  const receipt = await tx.wait();

  return {
    txHash: receipt.hash,
    cost: ethers.formatUnits(price, 6),
  };
}

// Sell creator shares
export async function sellShares(
  shareAddress: string,
  amount: number,
  signer: ethers.Signer
) {
  const share = getCreatorShare(shareAddress, signer);

  const shareAmount = ethers.parseUnits(amount.toString(), 18);

  const tx = await share.sellShares(shareAmount);
  const receipt = await tx.wait();

  return { txHash: receipt.hash };
}

// Claim dividends
export async function claimDividends(shareAddress: string, signer: ethers.Signer) {
  const share = getCreatorShare(shareAddress, signer);

  const tx = await share.claimDividends();
  const receipt = await tx.wait();

  return { txHash: receipt.hash };
}
```

### CreatorShareFactory - Write Operations

```typescript
// services/creatorShareFactory.ts (continued)

// Create creator shares (anyone can call if unlocked)
export async function createCreatorShares(
  creatorAddress: string,
  name: string,
  symbol: string,
  signer: ethers.Signer,
  network: string
) {
  const factory = getCreatorShareFactory(signer, network);

  const tx = await factory.createCreatorShares(creatorAddress, name, symbol);
  const receipt = await tx.wait();

  // Extract share contract address from event
  const event = receipt.logs.find(
    (log: any) => log.fragment && log.fragment.name === "SharesCreated"
  );

  return {
    shareContract: event.args.shareContract,
    txHash: receipt.hash,
  };
}
```

---

## Event Listening

### Setup Event Listeners

```typescript
// services/eventListeners.ts
import { getOpinionMarket, getCreatorShareFactory } from "../lib/contracts";

// Listen for new markets
export function listenForNewMarkets(
  network: string,
  callback: (event: any) => void
) {
  const provider = getProvider(network);
  const market = getOpinionMarket(provider, network);

  market.on("MarketCreated", (marketId, creator, title, outcomes, endTime) => {
    callback({
      marketId: Number(marketId),
      creator,
      title,
      outcomes,
      endTime: Number(endTime),
    });
  });
}

// Listen for bets placed
export function listenForBets(network: string, callback: (event: any) => void) {
  const provider = getProvider(network);
  const market = getOpinionMarket(provider, network);

  market.on("BetPlaced", (marketId, user, outcome, amount, shares, timestamp) => {
    callback({
      marketId: Number(marketId),
      user,
      outcome: Number(outcome),
      amount: ethers.formatUnits(amount, 6),
      shares: ethers.formatUnits(shares, 6),
      timestamp: Number(timestamp),
    });
  });
}

// Listen for market resolution
export function listenForResolutions(
  network: string,
  callback: (event: any) => void
) {
  const provider = getProvider(network);
  const market = getOpinionMarket(provider, network);

  market.on("MarketResolved", (marketId, winningOutcome, timestamp) => {
    callback({
      marketId: Number(marketId),
      winningOutcome: Number(winningOutcome),
      timestamp: Number(timestamp),
    });
  });
}

// Listen for shares unlocked
export function listenForSharesUnlocked(
  network: string,
  callback: (event: any) => void
) {
  const provider = getProvider(network);
  const factory = getCreatorShareFactory(provider, network);

  factory.on("SharesUnlocked", (creator, finalVolume, timestamp) => {
    callback({
      creator,
      finalVolume: ethers.formatUnits(finalVolume, 6),
      timestamp: Number(timestamp),
    });
  });
}

// Listen for shares created
export function listenForSharesCreated(
  network: string,
  callback: (event: any) => void
) {
  const provider = getProvider(network);
  const factory = getCreatorShareFactory(provider, network);

  factory.on("SharesCreated", (creator, shareContract, name, symbol, timestamp) => {
    callback({
      creator,
      shareContract,
      name,
      symbol,
      timestamp: Number(timestamp),
    });
  });
}
```

### Query Historical Events

```typescript
// services/eventQueries.ts

// Get all markets created by a user
export async function getMarketsByCreator(
  creatorAddress: string,
  network: string
) {
  const provider = getProvider(network);
  const market = getOpinionMarket(provider, network);

  const filter = market.filters.MarketCreated(null, creatorAddress);
  const events = await market.queryFilter(filter);

  return events.map((event: any) => ({
    marketId: Number(event.args.marketId),
    title: event.args.title,
    outcomes: event.args.outcomes,
    endTime: Number(event.args.endTime),
    blockNumber: event.blockNumber,
    txHash: event.transactionHash,
  }));
}

// Get all bets by a user
export async function getBetsByUser(userAddress: string, network: string) {
  const provider = getProvider(network);
  const market = getOpinionMarket(provider, network);

  const filter = market.filters.BetPlaced(null, userAddress);
  const events = await market.queryFilter(filter);

  return events.map((event: any) => ({
    marketId: Number(event.args.marketId),
    outcome: Number(event.args.outcome),
    amount: ethers.formatUnits(event.args.amount, 6),
    shares: ethers.formatUnits(event.args.shares, 6),
    timestamp: Number(event.args.timestamp),
    blockNumber: event.blockNumber,
    txHash: event.transactionHash,
  }));
}
```

---

## Gas Estimation

### Estimate Gas Before Transaction

```typescript
// utils/gasEstimation.ts

export async function estimateCreateMarketGas(
  title: string,
  outcomes: string[],
  duration: number,
  description: string,
  signer: ethers.Signer,
  network: string
) {
  const market = getOpinionMarket(signer, network);

  const gasEstimate = await market.createMarket.estimateGas(
    title,
    outcomes,
    duration,
    description
  );

  return {
    gasLimit: gasEstimate,
    estimatedCost: await estimateCost(gasEstimate, network),
  };
}

export async function estimatePlaceBetGas(
  marketId: number,
  outcome: number,
  amount: bigint,
  signer: ethers.Signer,
  network: string
) {
  const market = getOpinionMarket(signer, network);

  const gasEstimate = await market.placeBet.estimateGas(marketId, outcome, amount);

  return {
    gasLimit: gasEstimate,
    estimatedCost: await estimateCost(gasEstimate, network),
  };
}

async function estimateCost(gasLimit: bigint, network: string) {
  const provider = getProvider(network);
  const feeData = await provider.getFeeData();

  const maxFeePerGas = feeData.maxFeePerGas || ethers.parseUnits("0.1", "gwei");

  const cost = gasLimit * maxFeePerGas;
  return ethers.formatEther(cost);
}
```

---

## Error Handling

### Contract Error Handling

```typescript
// utils/errorHandler.ts

export function handleContractError(error: any) {
  // Custom error handling
  if (error.message.includes("MarketDoesNotExist")) {
    return {
      code: "MARKET_NOT_FOUND",
      message: "The market you're trying to access does not exist",
    };
  }

  if (error.message.includes("MarketEnded")) {
    return {
      code: "MARKET_ENDED",
      message: "This market has already ended",
    };
  }

  if (error.message.includes("InsufficientBalance")) {
    return {
      code: "INSUFFICIENT_BALANCE",
      message: "Insufficient USDC balance",
    };
  }

  if (error.message.includes("SharesNotUnlocked")) {
    return {
      code: "SHARES_NOT_UNLOCKED",
      message: "Creator has not reached $30K volume threshold yet",
    };
  }

  // Generic error
  return {
    code: "CONTRACT_ERROR",
    message: error.message || "An error occurred with the smart contract",
  };
}

// Usage
try {
  await placeBet(marketId, outcome, amount, signer, network);
} catch (error) {
  const handledError = handleContractError(error);
  console.error(handledError);
  // Return error to user
}
```

---

## Best Practices

### 1. Always Check Allowances

```typescript
async function ensureAllowance(
  tokenAddress: string,
  spenderAddress: string,
  amount: bigint,
  signer: ethers.Signer
) {
  const token = new ethers.Contract(
    tokenAddress,
    ["function allowance(address,address) view returns (uint256)"],
    signer
  );

  const currentAllowance = await token.allowance(
    await signer.getAddress(),
    spenderAddress
  );

  if (currentAllowance < amount) {
    const approveTx = await token.approve(spenderAddress, amount);
    await approveTx.wait();
  }
}
```

### 2. Use Multicall for Batch Reads

```typescript
import { ethers } from "ethers";

async function batchReadMarkets(marketIds: number[], network: string) {
  const provider = getProvider(network);
  const market = getOpinionMarket(provider, network);

  const promises = marketIds.map((id) => market.getMarketInfo(id));
  return await Promise.all(promises);
}
```

### 3. Cache Contract Instances

```typescript
const contractCache = new Map();

function getCachedContract(address: string, abi: any, provider: any) {
  if (!contractCache.has(address)) {
    contractCache.set(address, new ethers.Contract(address, abi, provider));
  }
  return contractCache.get(address);
}
```

### 4. Handle Transaction Confirmations

```typescript
async function waitForConfirmations(
  tx: any,
  confirmations: number = 2
): Promise<any> {
  const receipt = await tx.wait(confirmations);

  if (receipt.status === 0) {
    throw new Error("Transaction failed");
  }

  return receipt;
}
```

### 5. Implement Retry Logic

```typescript
async function retryTransaction<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3
): Promise<T> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await new Promise((resolve) => setTimeout(resolve, 1000 * (i + 1)));
    }
  }
  throw new Error("Max retries reached");
}
```

---

## Complete Integration Example

```typescript
// app/services/guessly.ts
import { ethers } from "ethers";
import {
  getOpinionMarket,
  getCreatorShareFactory,
  getUSDC,
} from "../lib/contracts";

class GuesslyService {
  private provider: ethers.Provider;
  private network: string;

  constructor(network: "baseSepolia" | "baseMainnet") {
    this.network = network;
    this.provider = getProvider(network);
  }

  // Create and place bet in one flow
  async createBet(
    marketId: number,
    outcome: number,
    amountInUsdc: number,
    userSigner: ethers.Signer
  ) {
    // 1. Check market is active
    const market = getOpinionMarket(this.provider, this.network);
    const info = await market.getMarketInfo(marketId);

    if (info.status !== 0) {
      throw new Error("Market is not active");
    }

    if (info.paused) {
      throw new Error("Market is paused");
    }

    // 2. Prepare amount
    const amount = ethers.parseUnits(amountInUsdc.toString(), 6);

    // 3. Approve USDC
    const usdc = getUSDC(userSigner, this.network);
    const marketAddress = await market.getAddress();
    const approveTx = await usdc.approve(marketAddress, amount);
    await approveTx.wait();

    // 4. Place bet
    const marketWithSigner = getOpinionMarket(userSigner, this.network);
    const tx = await marketWithSigner.placeBet(marketId, outcome, amount);
    const receipt = await tx.wait();

    return {
      success: true,
      txHash: receipt.hash,
    };
  }
}

export default GuesslyService;
```

---

**Next:** [Security Guide](./SECURITY.md)

---

**Created for Guessly Prediction Market Platform**
