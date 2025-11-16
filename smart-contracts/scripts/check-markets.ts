import { ethers } from "hardhat";

async function main() {
  const opinionMarketAddress = "0x9cC5bBBceb80bE28f9be3F7dd69dC815Ba64099C";
  const opinionMarket = await ethers.getContractAt("OpinionMarket", opinionMarketAddress);

  console.log("Checking markets...\n");

  const nextMarketId = await opinionMarket.nextMarketId();
  console.log("Next Market ID:", nextMarketId.toString());

  if (nextMarketId > 1n) {
    for (let i = 1n; i < nextMarketId; i++) {
      try {
        const market = await opinionMarket.getMarketInfo(i);
        console.log(`\nMarket ${i}:`);
        console.log("  Title:", market.title);
        console.log("  Creator:", market.creator);
        console.log("  Status:", market.status);
        console.log("  Outcomes:", market.outcomes);
      } catch (error) {
        console.log(`Market ${i} does not exist or error reading it`);
      }
    }
  } else {
    console.log("No markets created yet");
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
