import fs from "fs";
import path from "path";

interface DeploymentAddresses {
  network: string;
  timestamp: string;
  usdc: string;
  feeCollector: string;
  creatorShareFactory: string;
  opinionMarket: string;
  deployer: string;
}

interface BackendConfig {
  USDC_ADDRESS: string;
  FEE_COLLECTOR_ADDRESS: string;
  CREATOR_SHARE_FACTORY_ADDRESS: string;
  OPINION_MARKET_ADDRESS: string;
  NETWORK: string;
  CHAIN_ID: number;
}

function generateEnvFile(deployment: DeploymentAddresses, network: string): string {
  const chainId = network === "baseMainnet" ? 8453 : 84532;
  
  return `# Guessly Smart Contract Addresses
# Network: ${deployment.network}
# Deployed: ${deployment.timestamp}
# Deployer: ${deployment.deployer}

# Network Configuration
NEXT_PUBLIC_NETWORK=${network}
NEXT_PUBLIC_CHAIN_ID=${chainId}

# Token Addresses
NEXT_PUBLIC_USDC_ADDRESS=${deployment.usdc}

# Contract Addresses
NEXT_PUBLIC_FEE_COLLECTOR_ADDRESS=${deployment.feeCollector}
NEXT_PUBLIC_CREATOR_SHARE_FACTORY_ADDRESS=${deployment.creatorShareFactory}
NEXT_PUBLIC_OPINION_MARKET_ADDRESS=${deployment.opinionMarket}

# BaseScan URLs
NEXT_PUBLIC_BASESCAN_URL=${network === "baseMainnet" ? "https://basescan.org" : "https://sepolia.basescan.org"}
`;
}

function generateJavaScriptConfig(deployment: DeploymentAddresses, network: string): string {
  const chainId = network === "baseMainnet" ? 8453 : 84532;
  
  return `// Guessly Smart Contract Configuration
// Network: ${deployment.network}
// Deployed: ${deployment.timestamp}
// Deployer: ${deployment.deployer}

export const contractAddresses = {
  network: "${network}",
  chainId: ${chainId},
  usdc: "${deployment.usdc}",
  feeCollector: "${deployment.feeCollector}",
  creatorShareFactory: "${deployment.creatorShareFactory}",
  opinionMarket: "${deployment.opinionMarket}",
};

export const networkConfig = {
  chainId: ${chainId},
  chainName: "${network === "baseMainnet" ? "Base Mainnet" : "Base Sepolia"}",
  nativeCurrency: {
    name: "Ethereum",
    symbol: "ETH",
    decimals: 18,
  },
  rpcUrls: ["${network === "baseMainnet" ? "https://mainnet.base.org" : "https://sepolia.base.org"}"],
  blockExplorerUrls: ["${network === "baseMainnet" ? "https://basescan.org" : "https://sepolia.basescan.org"}"],
};
`;
}

function generateTypeScriptConfig(deployment: DeploymentAddresses, network: string): string {
  const chainId = network === "baseMainnet" ? 8453 : 84532;
  
  return `// Guessly Smart Contract Configuration
// Network: ${deployment.network}
// Deployed: ${deployment.timestamp}
// Deployer: ${deployment.deployer}

export interface ContractAddresses {
  network: string;
  chainId: number;
  usdc: string;
  feeCollector: string;
  creatorShareFactory: string;
  opinionMarket: string;
}

export const contractAddresses: ContractAddresses = {
  network: "${network}",
  chainId: ${chainId},
  usdc: "${deployment.usdc}",
  feeCollector: "${deployment.feeCollector}",
  creatorShareFactory: "${deployment.creatorShareFactory}",
  opinionMarket: "${deployment.opinionMarket}",
};

export interface NetworkConfig {
  chainId: number;
  chainName: string;
  nativeCurrency: {
    name: string;
    symbol: string;
    decimals: number;
  };
  rpcUrls: string[];
  blockExplorerUrls: string[];
}

export const networkConfig: NetworkConfig = {
  chainId: ${chainId},
  chainName: "${network === "baseMainnet" ? "Base Mainnet" : "Base Sepolia"}",
  nativeCurrency: {
    name: "Ethereum",
    symbol: "ETH",
    decimals: 18,
  },
  rpcUrls: ["${network === "baseMainnet" ? "https://mainnet.base.org" : "https://sepolia.base.org"}"],
  blockExplorerUrls: ["${network === "baseMainnet" ? "https://basescan.org" : "https://sepolia.basescan.org"}"],
};
`;
}

async function main() {
  const network = process.argv[2] || "testnet";
  
  if (!["testnet", "mainnet"].includes(network)) {
    console.error("❌ Invalid network. Use 'testnet' or 'mainnet'");
    process.exit(1);
  }

  console.log("=".repeat(60));
  console.log("EXPORTING CONTRACT ADDRESSES");
  console.log("=".repeat(60));
  console.log();
  console.log("Network:", network);
  console.log();

  // Load deployment file
  const deploymentFile = network === "mainnet" ? "mainnet.json" : "testnet.json";
  const deploymentPath = path.join(__dirname, "..", "deployments", deploymentFile);

  if (!fs.existsSync(deploymentPath)) {
    console.error("❌ ERROR: Deployment file not found:", deploymentPath);
    console.error("   Please run the deployment script first");
    process.exit(1);
  }

  const deployment: DeploymentAddresses = JSON.parse(
    fs.readFileSync(deploymentPath, "utf-8")
  );

  console.log("Loaded deployment:");
  console.log("  Network:           ", deployment.network);
  console.log("  Deployed:          ", deployment.timestamp);
  console.log("  FeeCollector:      ", deployment.feeCollector);
  console.log("  Factory:           ", deployment.creatorShareFactory);
  console.log("  OpinionMarket:     ", deployment.opinionMarket);
  console.log();

  // Create exports directory
  const exportsDir = path.join(__dirname, "..", "exports");
  if (!fs.existsSync(exportsDir)) {
    fs.mkdirSync(exportsDir, { recursive: true });
  }

  // Generate .env file
  console.log("Generating .env file...");
  const envContent = generateEnvFile(deployment, network === "mainnet" ? "baseMainnet" : "baseSepolia");
  const envPath = path.join(exportsDir, network + ".env");
  fs.writeFileSync(envPath, envContent);
  console.log("✅ Created:", envPath);

  // Generate JavaScript config
  console.log("Generating JavaScript config...");
  const jsContent = generateJavaScriptConfig(deployment, network === "mainnet" ? "baseMainnet" : "baseSepolia");
  const jsPath = path.join(exportsDir, network + ".config.js");
  fs.writeFileSync(jsPath, jsContent);
  console.log("✅ Created:", jsPath);

  // Generate TypeScript config
  console.log("Generating TypeScript config...");
  const tsContent = generateTypeScriptConfig(deployment, network === "mainnet" ? "baseMainnet" : "baseSepolia");
  const tsPath = path.join(exportsDir, network + ".config.ts");
  fs.writeFileSync(tsPath, tsContent);
  console.log("✅ Created:", tsPath);

  console.log();
  console.log("=".repeat(60));
  console.log("EXPORT COMPLETE");
  console.log("=".repeat(60));
  console.log();
  console.log("Generated files:");
  console.log("  " + envPath);
  console.log("  " + jsPath);
  console.log("  " + tsPath);
  console.log();
  console.log("Usage:");
  console.log("  1. Copy .env file to your backend/frontend project");
  console.log("  2. Import JavaScript/TypeScript config in your code:");
  console.log("     import { contractAddresses } from './config'");
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
