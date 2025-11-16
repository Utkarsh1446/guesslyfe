import { ethers } from "hardhat";

async function main() {
  const opinionMarketAddress = "0x9cC5bBBceb80bE28f9be3F7dd69dC815Ba64099C";
  const opinionMarket = await ethers.getContractAt("OpinionMarket", opinionMarketAddress);

  console.log("Testing OpinionMarket Virtual Liquidity on Base Sepolia");
  console.log("=".repeat(60));
  console.log();

  // Test reading constants
  console.log("Contract Constants:");
  const virtualLiquidity = await opinionMarket.VIRTUAL_LIQUIDITY_PER_OUTCOME();
  const totalFeeBps = await opinionMarket.TOTAL_FEE_BPS();
  console.log("  Virtual Liquidity:", ethers.formatUnits(virtualLiquidity, 6), "USDC");
  console.log("  Total Fee:", totalFeeBps.toString(), "bps");
  console.log("  ✅ Constants readable");
  console.log();

  // Check market
  const marketId = 1n;
  const market = await opinionMarket.getMarketInfo(marketId);
  console.log("Market 1 Info:");
  console.log("  Title:", market.title);
  console.log("  Outcomes:", market.outcomes);
  console.log("  Status:", market.status === 0n ? "Active" : "Other");
  console.log("  ✅ Market readable");
  console.log();

  // Try to get probability
  console.log("Attempting to read probabilities...");
  try {
    const prob = await opinionMarket.getOutcomeProbability(marketId, 0);
    console.log("  Yes probability:", (Number(prob) / 100).toFixed(2) + "%");
    console.log("  ✅ Probability readable");
  } catch (error: any) {
    console.log("  ❌ Error reading probability:", error.message);
    console.log();
    console.log("This might be a contract issue. Let me check the reserves...");

    // Try to read reserves directly
    try {
      const reserve0 = await opinionMarket.outcomeReserves(marketId, 0);
      const reserve1 = await opinionMarket.outcomeReserves(marketId, 1);
      console.log("  Reserve 0:", ethers.formatUnits(reserve0, 6), "USDC");
      console.log("  Reserve 1:", ethers.formatUnits(reserve1, 6), "USDC");
      console.log("  ✅ Reserves readable");
    } catch (e: any) {
      console.log("  ❌ Error reading reserves:", e.message);
    }
  }

  // Try calculateShares
  console.log();
  console.log("Testing share calculation...");
  try {
    const amount = ethers.parseUnits("100", 6);
    const shares = await opinionMarket.calculateShares(marketId, 0, amount);
    console.log("  Shares for 100 USDC bet:", ethers.formatUnits(shares, 6));
    console.log("  ✅ Share calculation working");
  } catch (error: any) {
    console.log("  ❌ Error calculating shares:", error.message);
  }

  console.log();
  console.log("=".repeat(60));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
