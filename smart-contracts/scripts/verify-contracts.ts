import { run } from "hardhat";
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

async function main() {
  // Get network from Hardhat config
  const networkName = (await run("network:get")).name;
  
  console.log("=".repeat(60));
  console.log("VERIFYING CONTRACTS ON BASESCAN");
  console.log("=".repeat(60));
  console.log();
  console.log("Network:", networkName);
  console.log();

  // Load deployment addresses
  const deploymentFile = networkName === "baseMainnet" ? "mainnet.json" : "testnet.json";
  const deploymentPath = path.join(__dirname, "..", "deployments", deploymentFile);

  if (!fs.existsSync(deploymentPath)) {
    console.error("❌ ERROR: Deployment file not found:", deploymentPath);
    console.error("   Please run the deployment script first");
    process.exit(1);
  }

  const deployment: DeploymentAddresses = JSON.parse(
    fs.readFileSync(deploymentPath, "utf-8")
  );

  console.log("Loaded deployment addresses:");
  console.log("  FeeCollector:      ", deployment.feeCollector);
  console.log("  Factory:           ", deployment.creatorShareFactory);
  console.log("  OpinionMarket:     ", deployment.opinionMarket);
  console.log();

  // Verify FeeCollector
  console.log("-".repeat(60));
  console.log("Verifying FeeCollector...");
  console.log("-".repeat(60));
  
  try {
    await run("verify:verify", {
      address: deployment.feeCollector,
      constructorArguments: [
        deployment.usdc,
        deployment.deployer,
      ],
    });
    console.log("✅ FeeCollector verified");
  } catch (error: any) {
    if (error.message.includes("Already Verified")) {
      console.log("✅ FeeCollector already verified");
    } else {
      console.error("❌ FeeCollector verification failed:");
      console.error(error.message);
    }
  }
  console.log();

  // Wait 3 seconds
  await new Promise((resolve) => setTimeout(resolve, 3000));

  // Verify CreatorShareFactory
  console.log("-".repeat(60));
  console.log("Verifying CreatorShareFactory...");
  console.log("-".repeat(60));
  
  try {
    await run("verify:verify", {
      address: deployment.creatorShareFactory,
      constructorArguments: [
        deployment.usdc,
        deployment.deployer,
      ],
    });
    console.log("✅ CreatorShareFactory verified");
  } catch (error: any) {
    if (error.message.includes("Already Verified")) {
      console.log("✅ CreatorShareFactory already verified");
    } else {
      console.error("❌ CreatorShareFactory verification failed:");
      console.error(error.message);
    }
  }
  console.log();

  // Wait 3 seconds
  await new Promise((resolve) => setTimeout(resolve, 3000));

  // Verify OpinionMarket
  console.log("-".repeat(60));
  console.log("Verifying OpinionMarket...");
  console.log("-".repeat(60));
  
  try {
    await run("verify:verify", {
      address: deployment.opinionMarket,
      constructorArguments: [
        deployment.usdc,
        deployment.creatorShareFactory,
        deployment.feeCollector,
        deployment.deployer,
      ],
    });
    console.log("✅ OpinionMarket verified");
  } catch (error: any) {
    if (error.message.includes("Already Verified")) {
      console.log("✅ OpinionMarket already verified");
    } else {
      console.error("❌ OpinionMarket verification failed:");
      console.error(error.message);
    }
  }
  console.log();

  // Final Summary
  console.log("=".repeat(60));
  console.log("VERIFICATION COMPLETE");
  console.log("=".repeat(60));
  console.log();
  
  const baseUrl = networkName === "baseMainnet" 
    ? "https://basescan.org" 
    : "https://sepolia.basescan.org";

  console.log("View verified contracts:");
  console.log("  FeeCollector:       " + baseUrl + "/address/" + deployment.feeCollector);
  console.log("  Factory:            " + baseUrl + "/address/" + deployment.creatorShareFactory);
  console.log("  OpinionMarket:      " + baseUrl + "/address/" + deployment.opinionMarket);
  console.log();
  console.log("=".repeat(60));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ VERIFICATION FAILED");
    console.error(error);
    process.exit(1);
  });
