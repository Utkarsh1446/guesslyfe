import { ethers } from "hardhat";
import fs from "fs";
import path from "path";
import readline from "readline";

// Base Mainnet USDC address
const BASE_MAINNET_USDC = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";

interface DeploymentAddresses {
  network: string;
  timestamp: string;
  usdc: string;
  feeCollector: string;
  creatorShareFactory: string;
  opinionMarket: string;
  deployer: string;
}

// Confirmation helper
function askQuestion(query: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) =>
    rl.question(query, (ans) => {
      rl.close();
      resolve(ans);
    })
  );
}

async function confirmStep(message: string): Promise<boolean> {
  console.log();
  console.log("⚠️  " + message);
  const answer = await askQuestion("   Type 'yes' to continue: ");
  return answer.toLowerCase() === "yes";
}

async function main() {
  console.log("=".repeat(60));
  console.log("⚠️  DEPLOYING TO BASE MAINNET ⚠️");
  console.log("=".repeat(60));
  console.log();
  console.log("⚠️  WARNING: You are about to deploy to MAINNET");
  console.log("   This will use real ETH and deploy to production");
  console.log();

  const proceed = await confirmStep("Are you sure you want to deploy to MAINNET?");
  if (!proceed) {
    console.log("❌ Deployment cancelled");
    process.exit(0);
  }

  const [deployer] = await ethers.getSigners();
  const balance = await ethers.provider.getBalance(deployer.address);
  
  console.log();
  console.log("Deployer account:", deployer.address);
  console.log("Account balance:", ethers.formatEther(balance), "ETH");
  console.log();

  // Check minimum balance (0.01 ETH recommended)
  if (balance < ethers.parseEther("0.01")) {
    console.error("❌ ERROR: Insufficient balance for deployment");
    console.error("   Minimum recommended: 0.01 ETH");
    console.error("   Current balance: " + ethers.formatEther(balance) + " ETH");
    process.exit(1);
  }

  // Verify network
  const network = await ethers.provider.getNetwork();
  console.log("Network:", network.name);
  console.log("Chain ID:", network.chainId);

  if (network.chainId !== 8453n) {
    console.error("❌ ERROR: Not connected to Base Mainnet (chainId: 8453)");
    console.error("   Current chainId:", network.chainId);
    process.exit(1);
  }
  console.log("✅ Confirmed: Base Mainnet");
  console.log();

  const deploymentAddresses: DeploymentAddresses = {
    network: "baseMainnet",
    timestamp: new Date().toISOString(),
    usdc: BASE_MAINNET_USDC,
    feeCollector: "",
    creatorShareFactory: "",
    opinionMarket: "",
    deployer: deployer.address,
  };

  // Step 1: Deploy FeeCollector
  console.log("-".repeat(60));
  console.log("Step 1: Deploying FeeCollector");
  console.log("-".repeat(60));
  console.log("Parameters:");
  console.log("  USDC:", BASE_MAINNET_USDC);
  console.log("  Owner:", deployer.address);

  const confirmFeeCollector = await confirmStep("Deploy FeeCollector with these parameters?");
  if (!confirmFeeCollector) {
    console.log("❌ Deployment cancelled");
    process.exit(0);
  }

  const FeeCollector = await ethers.getContractFactory("FeeCollector");
  console.log("Deploying FeeCollector...");
  const feeCollector = await FeeCollector.deploy(
    BASE_MAINNET_USDC,
    deployer.address
  );
  await feeCollector.waitForDeployment();
  const feeCollectorAddress = await feeCollector.getAddress();
  deploymentAddresses.feeCollector = feeCollectorAddress;

  console.log("✅ FeeCollector deployed to:", feeCollectorAddress);
  console.log();

  // Wait 5 seconds between deployments
  console.log("Waiting 5 seconds before next deployment...");
  await new Promise((resolve) => setTimeout(resolve, 5000));

  // Step 2: Deploy CreatorShareFactory
  console.log("-".repeat(60));
  console.log("Step 2: Deploying CreatorShareFactory");
  console.log("-".repeat(60));
  console.log("Parameters:");
  console.log("  USDC:", BASE_MAINNET_USDC);
  console.log("  Owner:", deployer.address);
  console.log("  Volume Threshold: 30,000 USDC");

  const confirmFactory = await confirmStep("Deploy CreatorShareFactory with these parameters?");
  if (!confirmFactory) {
    console.log("❌ Deployment cancelled");
    process.exit(0);
  }

  const CreatorShareFactory = await ethers.getContractFactory("CreatorShareFactory");
  console.log("Deploying CreatorShareFactory...");
  const factory = await CreatorShareFactory.deploy(
    BASE_MAINNET_USDC,
    deployer.address
  );
  await factory.waitForDeployment();
  const factoryAddress = await factory.getAddress();
  deploymentAddresses.creatorShareFactory = factoryAddress;

  console.log("✅ CreatorShareFactory deployed to:", factoryAddress);
  console.log();

  // Wait 5 seconds
  console.log("Waiting 5 seconds before next deployment...");
  await new Promise((resolve) => setTimeout(resolve, 5000));

  // Step 3: Deploy OpinionMarket
  console.log("-".repeat(60));
  console.log("Step 3: Deploying OpinionMarket");
  console.log("-".repeat(60));
  console.log("Parameters:");
  console.log("  USDC:", BASE_MAINNET_USDC);
  console.log("  Factory:", factoryAddress);
  console.log("  Fee Collector:", feeCollectorAddress);
  console.log("  Owner:", deployer.address);

  const confirmMarket = await confirmStep("Deploy OpinionMarket with these parameters?");
  if (!confirmMarket) {
    console.log("❌ Deployment cancelled");
    process.exit(0);
  }

  const OpinionMarket = await ethers.getContractFactory("OpinionMarket");
  console.log("Deploying OpinionMarket...");
  const opinionMarket = await OpinionMarket.deploy(
    BASE_MAINNET_USDC,
    factoryAddress,
    feeCollectorAddress,
    deployer.address
  );
  await opinionMarket.waitForDeployment();
  const opinionMarketAddress = await opinionMarket.getAddress();
  deploymentAddresses.opinionMarket = opinionMarketAddress;

  console.log("✅ OpinionMarket deployed to:", opinionMarketAddress);
  console.log();

  // Step 4: Link contracts
  console.log("-".repeat(60));
  console.log("Step 4: Linking Contracts");
  console.log("-".repeat(60));
  console.log("This will:");
  console.log("  1. Whitelist OpinionMarket in CreatorShareFactory");
  console.log("  2. Whitelist OpinionMarket in FeeCollector");

  const confirmLink = await confirmStep("Proceed with linking contracts?");
  if (!confirmLink) {
    console.log("⚠️  Contracts deployed but not linked");
    console.log("   You will need to manually link them later");
    saveDeploymentFile(deploymentAddresses);
    process.exit(0);
  }

  console.log("Whitelisting OpinionMarket in CreatorShareFactory...");
  const addMarketTx = await factory.addMarketContract(opinionMarketAddress);
  await addMarketTx.wait();
  console.log("✅ OpinionMarket whitelisted in Factory");

  console.log("Whitelisting OpinionMarket in FeeCollector...");
  const addDepositorTx = await feeCollector.addDepositor(opinionMarketAddress);
  await addDepositorTx.wait();
  console.log("✅ OpinionMarket whitelisted in FeeCollector");
  console.log();

  // Step 5: Verify linkages
  console.log("-".repeat(60));
  console.log("Step 5: Verifying Contract Linkages");
  console.log("-".repeat(60));

  const isMarketWhitelisted = await factory.isMarketWhitelisted(opinionMarketAddress);
  const isFeeDepositorWhitelisted = await feeCollector.isWhitelisted(opinionMarketAddress);

  console.log("Factory whitelist:", isMarketWhitelisted ? "✅ Verified" : "❌ Failed");
  console.log("FeeCollector whitelist:", isFeeDepositorWhitelisted ? "✅ Verified" : "❌ Failed");

  if (!isMarketWhitelisted || !isFeeDepositorWhitelisted) {
    console.error("❌ ERROR: Contract linkages failed verification");
    process.exit(1);
  }
  console.log();

  // Step 6: Save deployment addresses
  saveDeploymentFile(deploymentAddresses);

  // Final Summary
  console.log("=".repeat(60));
  console.log("✅ MAINNET DEPLOYMENT SUCCESSFUL");
  console.log("=".repeat(60));
  console.log();
  console.log("Network:              Base Mainnet (8453)");
  console.log("Deployer:            ", deployer.address);
  console.log("USDC:                ", BASE_MAINNET_USDC);
  console.log();
  console.log("Deployed Contracts:");
  console.log("  FeeCollector:      ", feeCollectorAddress);
  console.log("  Factory:           ", factoryAddress);
  console.log("  OpinionMarket:     ", opinionMarketAddress);
  console.log();
  console.log("Contract Linkages:");
  console.log("  ✅ OpinionMarket → Factory (whitelisted)");
  console.log("  ✅ OpinionMarket → FeeCollector (whitelisted)");
  console.log();
  console.log("⚠️  IMPORTANT NEXT STEPS:");
  console.log("  1. Verify contracts on BaseScan:");
  console.log("     npx hardhat run scripts/verify-contracts.ts --network baseMainnet");
  console.log();
  console.log("  2. Test contracts thoroughly on mainnet with small amounts");
  console.log();
  console.log("  3. Transfer ownership to multisig (recommended):");
  console.log("     - FeeCollector.transferOwnership(multisig)");
  console.log("     - CreatorShareFactory.transferOwnership(multisig)");
  console.log("     - OpinionMarket.transferOwnership(multisig)");
  console.log();
  console.log("  4. View contracts on BaseScan:");
  console.log("     https://basescan.org/address/" + feeCollectorAddress);
  console.log("     https://basescan.org/address/" + factoryAddress);
  console.log("     https://basescan.org/address/" + opinionMarketAddress);
  console.log();
  console.log("=".repeat(60));
}

function saveDeploymentFile(deploymentAddresses: DeploymentAddresses) {
  console.log("-".repeat(60));
  console.log("Saving Deployment Addresses");
  console.log("-".repeat(60));

  const deploymentsDir = path.join(__dirname, "..", "deployments");
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir, { recursive: true });
  }

  const outputPath = path.join(deploymentsDir, "mainnet.json");
  fs.writeFileSync(
    outputPath,
    JSON.stringify(deploymentAddresses, null, 2)
  );

  console.log("✅ Deployment addresses saved to:", outputPath);
  console.log();
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ DEPLOYMENT FAILED");
    console.error(error);
    process.exit(1);
  });
