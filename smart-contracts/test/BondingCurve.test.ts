import { expect } from "chai";
import { ethers } from "hardhat";
import { Contract } from "ethers";

describe("BondingCurve", function () {
  let bondingCurveTest: Contract;

  // Helper function to convert from wei to a more readable format
  const fromWei = (value: bigint): string => {
    return ethers.formatEther(value);
  };

  // Helper function to convert to wei
  const toWei = (value: string): bigint => {
    return ethers.parseEther(value);
  };

  before(async function () {
    // Deploy a test contract that uses the BondingCurve library
    const BondingCurveTest = await ethers.getContractFactory("BondingCurveTest");
    bondingCurveTest = await BondingCurveTest.deploy();
    await bondingCurveTest.waitForDeployment();
  });

  describe("calculatePrice", function () {
    it("Should return 0 for supply of 0", async function () {
      const price = await bondingCurveTest.calculatePrice(0);
      expect(price).to.equal(0);
    });

    it("Should calculate correct price for supply of 1", async function () {
      // Price = 1² / 1400 = 0.000714... ETH
      const price = await bondingCurveTest.calculatePrice(1);
      const priceInEth = parseFloat(fromWei(price));

      // Expected: 1/1400 ≈ 0.000714
      expect(priceInEth).to.be.closeTo(0.000714, 0.000001);
    });

    it("Should calculate correct price for supply of 10", async function () {
      // Price = 10² / 1400 = 100 / 1400 = 0.0714... ETH
      const price = await bondingCurveTest.calculatePrice(10);
      const priceInEth = parseFloat(fromWei(price));

      expect(priceInEth).to.be.closeTo(0.0714, 0.0001);
    });

    it("Should calculate correct price for supply of 100", async function () {
      // Price = 100² / 1400 = 10000 / 1400 = 7.142... ETH
      const price = await bondingCurveTest.calculatePrice(100);
      const priceInEth = parseFloat(fromWei(price));

      expect(priceInEth).to.be.closeTo(7.142857, 0.001);
    });

    it("Should calculate correct price for supply of 1000", async function () {
      // Price = 1000² / 1400 = 1000000 / 1400 = 714.285... ETH
      const price = await bondingCurveTest.calculatePrice(1000);
      const priceInEth = parseFloat(fromWei(price));

      expect(priceInEth).to.be.closeTo(714.2857, 0.01);
    });
  });

  describe("calculateBuyPrice", function () {
    it("Should revert when amount is 0", async function () {
      await expect(
        bondingCurveTest.calculateBuyPrice(0, 0)
      ).to.be.revertedWithCustomError(bondingCurveTest, "AmountCannotBeZero");
    });

    it("Should revert when exceeding max supply", async function () {
      await expect(
        bondingCurveTest.calculateBuyPrice(0, 1001)
      ).to.be.revertedWithCustomError(bondingCurveTest, "SupplyExceedsMaximum");

      await expect(
        bondingCurveTest.calculateBuyPrice(999, 2)
      ).to.be.revertedWithCustomError(bondingCurveTest, "SupplyExceedsMaximum");
    });

    it("First share should cost ~$0.0007 (or 0.000238 ETH)", async function () {
      // Cost = (1³ - 0³) / 4200 = 1/4200 ≈ 0.000238 ETH
      const cost = await bondingCurveTest.calculateBuyPrice(0, 1);
      const costInEth = parseFloat(fromWei(cost));

      // Expected: 1/4200 ≈ 0.000238
      expect(costInEth).to.be.closeTo(0.000238, 0.000001);
    });

    it("100 shares from 0 should cost ~238 ETH", async function () {
      // Cost = (100³ - 0³) / 4200 = 1,000,000 / 4200 ≈ 238.095 ETH
      const cost = await bondingCurveTest.calculateBuyPrice(0, 100);
      const costInEth = parseFloat(fromWei(cost));

      expect(costInEth).to.be.closeTo(238.095, 0.01);
    });

    it("1000 shares from 0 should cost ~238,095 ETH", async function () {
      // Cost = (1000³ - 0³) / 4200 = 1,000,000,000 / 4200 ≈ 238,095.238 ETH
      const cost = await bondingCurveTest.calculateBuyPrice(0, 1000);
      const costInEth = parseFloat(fromWei(cost));

      expect(costInEth).to.be.closeTo(238095.238, 1);
    });

    it("Should calculate correct cost for buying 10 shares from supply of 50", async function () {
      // Cost = (60³ - 50³) / 4200 = (216,000 - 125,000) / 4200 = 91,000 / 4200 ≈ 21.666 ETH
      const cost = await bondingCurveTest.calculateBuyPrice(50, 10);
      const costInEth = parseFloat(fromWei(cost));

      expect(costInEth).to.be.closeTo(21.666, 0.01);
    });

    it("Should calculate incrementally correct costs", async function () {
      // Buying 50 shares, then another 50 shares should equal buying 100 shares
      const cost1 = await bondingCurveTest.calculateBuyPrice(0, 50);
      const cost2 = await bondingCurveTest.calculateBuyPrice(50, 50);
      const totalCost = cost1 + cost2;

      const directCost = await bondingCurveTest.calculateBuyPrice(0, 100);

      // Allow for 1 wei rounding error due to integer division
      const difference = totalCost > directCost ? totalCost - directCost : directCost - totalCost;
      expect(difference).to.be.lte(1);
    });
  });

  describe("calculateSellPrice", function () {
    it("Should revert when amount is 0", async function () {
      await expect(
        bondingCurveTest.calculateSellPrice(100, 0)
      ).to.be.revertedWithCustomError(bondingCurveTest, "AmountCannotBeZero");
    });

    it("Should revert when selling more than supply", async function () {
      await expect(
        bondingCurveTest.calculateSellPrice(50, 51)
      ).to.be.revertedWithCustomError(bondingCurveTest, "InsufficientSupply");
    });

    it("Should calculate correct proceeds for selling 1 share from supply of 1", async function () {
      // Proceeds = (1³ - 0³) / 4200 = 1/4200 ≈ 0.000238 ETH
      const proceeds = await bondingCurveTest.calculateSellPrice(1, 1);
      const proceedsInEth = parseFloat(fromWei(proceeds));

      expect(proceedsInEth).to.be.closeTo(0.000238, 0.000001);
    });

    it("Should calculate correct proceeds for selling all 100 shares", async function () {
      // Proceeds = (100³ - 0³) / 4200 = 1,000,000 / 4200 ≈ 238.095 ETH
      const proceeds = await bondingCurveTest.calculateSellPrice(100, 100);
      const proceedsInEth = parseFloat(fromWei(proceeds));

      expect(proceedsInEth).to.be.closeTo(238.095, 0.01);
    });

    it("Should calculate correct proceeds for selling 10 shares from supply of 60", async function () {
      // Proceeds = (60³ - 50³) / 4200 = (216,000 - 125,000) / 4200 = 91,000 / 4200 ≈ 21.666 ETH
      const proceeds = await bondingCurveTest.calculateSellPrice(60, 10);
      const proceedsInEth = parseFloat(fromWei(proceeds));

      expect(proceedsInEth).to.be.closeTo(21.666, 0.01);
    });
  });

  describe("Buy and Sell Price Consistency", function () {
    it("Buying and then selling the same amount should return the same value", async function () {
      const initialSupply = 50;
      const amount = 10;

      // Cost to buy 10 shares at supply 50
      const buyCost = await bondingCurveTest.calculateBuyPrice(initialSupply, amount);

      // Proceeds from selling 10 shares at supply 60 (after buying)
      const sellProceeds = await bondingCurveTest.calculateSellPrice(
        initialSupply + amount,
        amount
      );

      // They should be equal (bonding curve symmetry)
      expect(buyCost).to.equal(sellProceeds);
    });

    it("Buy price at supply X equals sell price at supply X+amount", async function () {
      // Buy 5 shares at supply 20
      const buyPrice = await bondingCurveTest.calculateBuyPrice(20, 5);

      // Sell 5 shares at supply 25
      const sellPrice = await bondingCurveTest.calculateSellPrice(25, 5);

      expect(buyPrice).to.equal(sellPrice);
    });

    it("Multiple buys and sells should be reversible", async function () {
      // Buy 30 shares from 0 to 30
      const buy1 = await bondingCurveTest.calculateBuyPrice(0, 30);

      // Buy another 20 shares from 30 to 50
      const buy2 = await bondingCurveTest.calculateBuyPrice(30, 20);

      // Total cost
      const totalBuyCost = buy1 + buy2;

      // Now sell all 50 shares back to 0
      const totalSellProceeds = await bondingCurveTest.calculateSellPrice(50, 50);

      // They should be equal
      expect(totalBuyCost).to.equal(totalSellProceeds);
    });
  });

  describe("Average Price Functions", function () {
    it("Should calculate correct average buy price", async function () {
      const totalCost = await bondingCurveTest.calculateBuyPrice(0, 100);
      const avgPrice = await bondingCurveTest.calculateAverageBuyPrice(0, 100);

      expect(avgPrice).to.equal(totalCost / 100n);
    });

    it("Should calculate correct average sell price", async function () {
      const totalProceeds = await bondingCurveTest.calculateSellPrice(100, 100);
      const avgPrice = await bondingCurveTest.calculateAverageSellPrice(100, 100);

      expect(avgPrice).to.equal(totalProceeds / 100n);
    });
  });

  describe("Edge Cases", function () {
    it("Should handle buying exactly max supply", async function () {
      const cost = await bondingCurveTest.calculateBuyPrice(0, 1000);
      expect(cost).to.be.gt(0);
    });

    it("Should handle selling entire supply to zero", async function () {
      const proceeds = await bondingCurveTest.calculateSellPrice(1000, 1000);
      expect(proceeds).to.be.gt(0);
    });

    it("Should handle buying 1 share at max supply - 1", async function () {
      const cost = await bondingCurveTest.calculateBuyPrice(999, 1);
      expect(cost).to.be.gt(0);
    });

    it("Should handle very small purchases", async function () {
      const cost = await bondingCurveTest.calculateBuyPrice(500, 1);
      expect(cost).to.be.gt(0);
    });

    it("Should maintain precision for large numbers", async function () {
      // Buying 500 shares in two batches vs all at once
      const batch1 = await bondingCurveTest.calculateBuyPrice(0, 250);
      const batch2 = await bondingCurveTest.calculateBuyPrice(250, 250);
      const batchTotal = batch1 + batch2;

      const directTotal = await bondingCurveTest.calculateBuyPrice(0, 500);

      expect(batchTotal).to.equal(directTotal);
    });
  });
});
