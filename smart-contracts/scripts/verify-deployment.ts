import { ethers } from "hardhat";

async function main() {
  const opinionMarketAddress = "0x9cC5bBBceb80bE28f9be3F7dd69dC815Ba64099C";
  const factoryAddress = "0xaE86eC369E33A74769Ef7A1609b76E84B417c5Db";
  const feeCollectorAddress = "0x9E0e83E0569d42a3A0420F68fe4D967F4C10F423";

  console.log("Verifying deployed contracts...\n");

  // Verify OpinionMarket
  const opinionMarket = await ethers.getContractAt("OpinionMarket", opinionMarketAddress);
  const virtualLiquidity = await opinionMarket.VIRTUAL_LIQUIDITY_PER_OUTCOME();
  const totalFeeBps = await opinionMarket.TOTAL_FEE_BPS();
  const usdc = await opinionMarket.usdc();
  const factory = await opinionMarket.factory();

  console.log("OpinionMarket:", opinionMarketAddress);
  console.log("  Virtual Liquidity:", ethers.formatUnits(virtualLiquidity, 6), "USDC");
  console.log("  Total Fee:", totalFeeBps.toString(), "bps (1.5%)");
  console.log("  USDC:", usdc);
  console.log("  Factory:", factory);
  console.log("  ✅ OpinionMarket verified");
  console.log();

  // Verify CreatorShareFactory
  const creatorShareFactory = await ethers.getContractAt("CreatorShareFactory", factoryAddress);
  const volumeThreshold = await creatorShareFactory.VOLUME_THRESHOLD();

  console.log("CreatorShareFactory:", factoryAddress);
  console.log("  Volume Threshold:", ethers.formatUnits(volumeThreshold, 6), "USDC");
  console.log("  ✅ CreatorShareFactory verified");
  console.log();

  // Verify FeeCollector
  const feeCollector = await ethers.getContractAt("FeeCollector", feeCollectorAddress);
  const feeCollectorUsdc = await feeCollector.usdc();

  console.log("FeeCollector:", feeCollectorAddress);
  console.log("  USDC:", feeCollectorUsdc);
  console.log("  ✅ FeeCollector verified");
  console.log();

  console.log("=".repeat(60));
  console.log("All contracts successfully verified on Base Sepolia!");
  console.log("=".repeat(60));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
