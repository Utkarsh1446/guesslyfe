import fs from "fs";
import path from "path";

/**
 * Export TypeChain generated types for backend integration
 * 
 * This script copies TypeChain generated types and ABIs to the exports directory
 * for easy integration with backend applications.
 */

async function main() {
  console.log("=".repeat(60));
  console.log("EXPORTING TYPESCRIPT TYPES AND ABIS");
  console.log("=".repeat(60));
  console.log();

  const rootDir = path.join(__dirname, "..");
  const typechainDir = path.join(rootDir, "typechain-types");
  const artifactsDir = path.join(rootDir, "artifacts", "contracts");
  const exportsDir = path.join(rootDir, "exports", "types");

  // Create exports/types directory
  if (!fs.existsSync(exportsDir)) {
    fs.mkdirSync(exportsDir, { recursive: true });
  }

  console.log("Source directories:");
  console.log("  TypeChain:", typechainDir);
  console.log("  Artifacts:", artifactsDir);
  console.log();
  console.log("Export directory:", exportsDir);
  console.log();

  // Contracts to export
  const contracts = [
    "BondingCurve",
    "CreatorShare",
    "CreatorShareFactory",
    "OpinionMarket",
    "FeeCollector",
  ];

  // Step 1: Copy TypeChain types
  console.log("-".repeat(60));
  console.log("Step 1: Copying TypeChain types...");
  console.log("-".repeat(60));

  for (const contract of contracts) {
    const sourceFile = path.join(typechainDir, "contracts", `${contract}.ts`);
    const destFile = path.join(exportsDir, `${contract}.ts`);

    if (fs.existsSync(sourceFile)) {
      fs.copyFileSync(sourceFile, destFile);
      console.log(`✅ Copied ${contract}.ts`);
    } else {
      console.log(`⚠️  ${contract}.ts not found`);
    }
  }

  // Copy common types
  const commonFile = path.join(typechainDir, "common.ts");
  if (fs.existsSync(commonFile)) {
    fs.copyFileSync(commonFile, path.join(exportsDir, "common.ts"));
    console.log("✅ Copied common.ts");
  }

  console.log();

  // Step 2: Copy contract ABIs
  console.log("-".repeat(60));
  console.log("Step 2: Copying contract ABIs...");
  console.log("-".repeat(60));

  const abisDir = path.join(exportsDir, "abis");
  if (!fs.existsSync(abisDir)) {
    fs.mkdirSync(abisDir, { recursive: true });
  }

  for (const contract of contracts) {
    const abiSource = path.join(
      artifactsDir,
      `${contract}.sol`,
      `${contract}.json`
    );
    const abiDest = path.join(abisDir, `${contract}.json`);

    if (fs.existsSync(abiSource)) {
      const artifact = JSON.parse(fs.readFileSync(abiSource, "utf-8"));

      // Extract only ABI (smaller file)
      const abiOnly = {
        contractName: artifact.contractName,
        abi: artifact.abi,
        bytecode: artifact.bytecode,
      };

      fs.writeFileSync(abiDest, JSON.stringify(abiOnly, null, 2));
      console.log(`✅ Copied ${contract}.json`);
    } else {
      console.log(`⚠️  ${contract}.json not found`);
    }
  }

  console.log();

  // Step 3: Generate index file
  console.log("-".repeat(60));
  console.log("Step 3: Generating index file...");
  console.log("-".repeat(60));

  const indexContent = `/**
 * Guessly Smart Contract Types
 * 
 * Auto-generated TypeScript types for all Guessly smart contracts.
 * Generated from TypeChain.
 */

// Contract Types
export type { BondingCurve } from "./BondingCurve";
export type { CreatorShare } from "./CreatorShare";
export type { CreatorShareFactory } from "./CreatorShareFactory";
export type { OpinionMarket } from "./OpinionMarket";
export type { FeeCollector } from "./FeeCollector";

// Common Types
export * from "./common";

// ABIs
import BondingCurveABI from "./abis/BondingCurve.json";
import CreatorShareABI from "./abis/CreatorShare.json";
import CreatorShareFactoryABI from "./abis/CreatorShareFactory.json";
import OpinionMarketABI from "./abis/OpinionMarket.json";
import FeeCollectorABI from "./abis/FeeCollector.json";

export const ABIs = {
  BondingCurve: BondingCurveABI,
  CreatorShare: CreatorShareABI,
  CreatorShareFactory: CreatorShareFactoryABI,
  OpinionMarket: OpinionMarketABI,
  FeeCollector: FeeCollectorABI,
};

// Type-safe ABI access
export {
  BondingCurveABI,
  CreatorShareABI,
  CreatorShareFactoryABI,
  OpinionMarketABI,
  FeeCollectorABI,
};
`;

  fs.writeFileSync(path.join(exportsDir, "index.ts"), indexContent);
  console.log("✅ Generated index.ts");
  console.log();

  // Step 4: Generate README
  console.log("-".repeat(60));
  console.log("Step 4: Generating README...");
  console.log("-".repeat(60));

  const readmeContent = `# Guessly Smart Contract Types

TypeScript types and ABIs for Guessly smart contracts.

## Installation

Copy this directory to your backend project:

\`\`\`bash
cp -r exports/types backend/src/types/contracts
\`\`\`

## Usage

### Importing Types

\`\`\`typescript
import {
  OpinionMarket,
  CreatorShare,
  CreatorShareFactory,
  FeeCollector,
  ABIs,
} from "./types/contracts";
\`\`\`

### Using with ethers.js

\`\`\`typescript
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
\`\`\`

### Contract Interfaces

#### OpinionMarket

\`\`\`typescript
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
\`\`\`

#### CreatorShare

\`\`\`typescript
interface CreatorShare extends BaseContract {
  buyShares(amount: BigNumberish): Promise<ContractTransactionResponse>;

  sellShares(amount: BigNumberish): Promise<ContractTransactionResponse>;

  claimDividends(): Promise<ContractTransactionResponse>;

  getPendingDividends(user: AddressLike): Promise<bigint>;

  // ... more methods
}
\`\`\`

#### CreatorShareFactory

\`\`\`typescript
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
\`\`\`

## Files

- \`*.ts\` - TypeChain generated TypeScript types
- \`abis/*.json\` - Contract ABIs with bytecode
- \`index.ts\` - Main export file
- \`common.ts\` - Common types and utilities

## TypeChain Version

Generated with TypeChain v8.3.2 targeting ethers-v6.

## Regeneration

To regenerate types after contract changes:

\`\`\`bash
cd smart-contracts
npm run compile
npm run export-types
\`\`\`

## Documentation

See [Integration Guide](../../docs/contracts/INTEGRATION.md) for detailed integration examples.
`;

  fs.writeFileSync(path.join(exportsDir, "README.md"), readmeContent);
  console.log("✅ Generated README.md");
  console.log();

  // Final summary
  console.log("=".repeat(60));
  console.log("EXPORT COMPLETE");
  console.log("=".repeat(60));
  console.log();
  console.log("Exported files:");
  console.log("  " + path.join(exportsDir));
  console.log();
  console.log("Contents:");
  console.log("  - TypeScript type definitions");
  console.log("  - Contract ABIs");
  console.log("  - index.ts (main export)");
  console.log("  - README.md (usage guide)");
  console.log();
  console.log("To use in backend:");
  console.log("  cp -r exports/types backend/src/types/contracts");
  console.log();
  console.log("=".repeat(60));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ EXPORT FAILED");
    console.error(error);
    process.exit(1);
  });
