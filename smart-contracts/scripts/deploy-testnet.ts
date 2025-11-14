import { ethers } from "hardhat";
import fs from "fs";
import path from "path";

// Base Sepolia USDC address
const BASE_SEPOLIA_USDC = "0x036CbD53842c5426634e7929541eC2318f3dCF7e";

interface DeploymentAddresses {
  network: string;
  timestamp: string;
  usdc: string;
  feeCollector: string;
  creatorShareFactory: string;
  opinionMarket: string;
  deployer: string;
}

async function main() {
  console.log("=".repeat(60));
  console.log("DEPLOYING TO BASE SEPOLIA TESTNET");
  console.log("=".repeat(60));
  console.log();

  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with account:", deployer.address);
  console.log("Account balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "ETH");
  console.log();

  // Verify we're on the correct network
  const network = await ethers.provider.getNetwork();
  console.log("Network:", network.name);
  console.log("Chain ID:", network.chainId);

  if (network.chainId !== 84532n) {
    console.error("❌ ERROR: Not connected to Base Sepolia (chainId: 84532)");
    console.error(`   Current chainId: ${network.chainId}`);
    process.exit(1);
  }
  console.log("✅ Confirmed: Base Sepolia network");
  console.log();

  const deploymentAddresses: DeploymentAddresses = {
    network: "baseSepolia",
    timestamp: new Date().toISOString(),
    usdc: BASE_SEPOLIA_USDC,
    feeCollector: "",
    creatorShareFactory: "",
    opinionMarket: "",
    deployer: deployer.address,
  };

  // Step 1: Deploy FeeCollector
  console.log("-".repeat(60));
  console.log("Step 1: Deploying FeeCollector...");
  console.log("-".repeat(60));

  const FeeCollector = await ethers.getContractFactory("FeeCollector");
  const feeCollector = await FeeCollector.deploy(
    BASE_SEPOLIA_USDC,
    deployer.address
  );
  await feeCollector.waitForDeployment();
  const feeCollectorAddress = await feeCollector.getAddress();
  deploymentAddresses.feeCollector = feeCollectorAddress;

  console.log("✅ FeeCollector deployed to:", feeCollectorAddress);
  console.log("   - USDC:", BASE_SEPOLIA_USDC);
  console.log("   - Owner:", deployer.address);
  console.log();

  // Step 2: Deploy CreatorShareFactory
  console.log("-".repeat(60));
  console.log("Step 2: Deploying CreatorShareFactory...");
  console.log("-".repeat(60));

  const CreatorShareFactory = await ethers.getContractFactory("CreatorShareFactory");
  const factory = await CreatorShareFactory.deploy(
    BASE_SEPOLIA_USDC,
    deployer.address
  );
  await factory.waitForDeployment();
  const factoryAddress = await factory.getAddress();
  deploymentAddresses.creatorShareFactory = factoryAddress;

  console.log("✅ CreatorShareFactory deployed to:", factoryAddress);
  console.log("   - USDC:", BASE_SEPOLIA_USDC);
  console.log("   - Owner:", deployer.address);
  console.log("   - Volume Threshold: 30,000 USDC");
  console.log();

  // Step 3: Deploy OpinionMarket
  console.log("-".repeat(60));
  console.log("Step 3: Deploying OpinionMarket...");
  console.log("-".repeat(60));

  const OpinionMarket = await ethers.getContractFactory("OpinionMarket");
  const opinionMarket = await OpinionMarket.deploy(
    BASE_SEPOLIA_USDC,
    factoryAddress,
    feeCollectorAddress,
    deployer.address
  );
  await opinionMarket.waitForDeployment();
  const opinionMarketAddress = await opinionMarket.getAddress();
  deploymentAddresses.opinionMarket = opinionMarketAddress;

  console.log("✅ OpinionMarket deployed to:", opinionMarketAddress);
  console.log("   - USDC:", BASE_SEPOLIA_USDC);
  console.log("   - Factory:", factoryAddress);
  console.log("   - Fee Collector:", feeCollectorAddress);
  console.log("   - Owner:", deployer.address);
  console.log();

  // Step 4: Link contracts together
  console.log("-".repeat(60));
  console.log("Step 4: Linking contracts...");
  console.log("-".repeat(60));

  // Whitelist OpinionMarket in CreatorShareFactory
  console.log("Whitelisting OpinionMarket in CreatorShareFactory...");
  const addMarketTx = await factory.addMarketContract(opinionMarketAddress);
  await addMarketTx.wait();
  console.log("✅ OpinionMarket whitelisted in Factory");

  // Whitelist OpinionMarket in FeeCollector
  console.log("Whitelisting OpinionMarket in FeeCollector...");
  const addDepositorTx = await feeCollector.addDepositor(opinionMarketAddress);
  await addDepositorTx.wait();
  console.log("✅ OpinionMarket whitelisted in FeeCollector");
  console.log();

  // Step 5: Verify contract linkages
  console.log("-".repeat(60));
  console.log("Step 5: Verifying contract linkages...");
  console.log("-".repeat(60));

  const isMarketWhitelisted = await factory.isMarketWhitelisted(opinionMarketAddress);
  const isFeeDepositorWhitelisted = await feeCollector.isWhitelisted(opinionMarketAddress);

  console.log("Factory whitelist check:", isMarketWhitelisted ? "✅ Verified" : "❌ Failed");
  console.log("FeeCollector whitelist check:", isFeeDepositorWhitelisted ? "✅ Verified" : "❌ Failed");
  console.log();

  // Step 6: Save deployment addresses
  console.log("-".repeat(60));
  console.log("Step 6: Saving deployment addresses...");
  console.log("-".repeat(60));

  const deploymentsDir = path.join(__dirname, "..", "deployments");
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir, { recursive: true });
  }

  const outputPath = path.join(deploymentsDir, "testnet.json");
  fs.writeFileSync(
    outputPath,
    JSON.stringify(deploymentAddresses, null, 2)
  );

  console.log("✅ Deployment addresses saved to:", outputPath);
  console.log();

  // Final Summary
  console.log("=".repeat(60));
  console.log("DEPLOYMENT SUMMARY");
  console.log("=".repeat(60));
  console.log();
  console.log("Network:              Base Sepolia (84532)");
  console.log("Deployer:            ", deployer.address);
  console.log("USDC:                ", BASE_SEPOLIA_USDC);
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
  console.log("Next Steps:");
  console.log("  1. Verify contracts on BaseScan:");
  console.log("     npx hardhat run scripts/verify-contracts.ts --network baseSepolia");
  console.log();
  console.log("  2. View contracts on BaseScan:");
  console.log(`     https://sepolia.basescan.org/address/${feeCollectorAddress}`);
  console.log(`     https://sepolia.basescan.org/address/${factoryAddress}`);
  console.log(`     https://sepolia.basescan.org/address/${opinionMarketAddress}`);
  console.log();
  console.log("=".repeat(60));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
