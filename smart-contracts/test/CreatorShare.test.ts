import { expect } from "chai";
import { ethers } from "hardhat";
import { Contract, Signer } from "ethers";
import { time } from "@nomicfoundation/hardhat-network-helpers";

describe("CreatorShare", function () {
  let creatorShare: Contract;
  let mockUsdc: Contract;
  let owner: Signer;
  let user1: Signer;
  let user2: Signer;
  let user3: Signer;
  let ownerAddress: string;
  let user1Address: string;
  let user2Address: string;
  let user3Address: string;

  const USDC_DECIMALS = 6;
  const toUsdc = (amount: number) => BigInt(amount * 10 ** USDC_DECIMALS);
  const fromUsdc = (amount: bigint): number => {
    return Number(amount) / 10 ** USDC_DECIMALS;
  };

  beforeEach(async function () {
    [owner, user1, user2, user3] = await ethers.getSigners();
    ownerAddress = await owner.getAddress();
    user1Address = await user1.getAddress();
    user2Address = await user2.getAddress();
    user3Address = await user3.getAddress();

    // Deploy MockUSDC
    const MockUSDC = await ethers.getContractFactory("MockUSDC");
    mockUsdc = await MockUSDC.deploy();
    await mockUsdc.waitForDeployment();

    // Deploy CreatorShare
    const CreatorShare = await ethers.getContractFactory("CreatorShare");
    creatorShare = await CreatorShare.deploy(
      "Creator Share",
      "CSHARE",
      await mockUsdc.getAddress(),
      ownerAddress
    );
    await creatorShare.waitForDeployment();

    // Mint USDC to users for testing
    await mockUsdc.mint(user1Address, toUsdc(1000000)); // 1M USDC
    await mockUsdc.mint(user2Address, toUsdc(1000000));
    await mockUsdc.mint(user3Address, toUsdc(1000000));

    // Approve CreatorShare to spend USDC
    await mockUsdc.connect(user1).approve(await creatorShare.getAddress(), toUsdc(1000000));
    await mockUsdc.connect(user2).approve(await creatorShare.getAddress(), toUsdc(1000000));
    await mockUsdc.connect(user3).approve(await creatorShare.getAddress(), toUsdc(1000000));
  });

  describe("Deployment", function () {
    it("Should set the correct token name and symbol", async function () {
      expect(await creatorShare.name()).to.equal("Creator Share");
      expect(await creatorShare.symbol()).to.equal("CSHARE");
    });

    it("Should set the correct owner", async function () {
      expect(await creatorShare.owner()).to.equal(ownerAddress);
    });

    it("Should set the correct USDC address", async function () {
      expect(await creatorShare.usdc()).to.equal(await mockUsdc.getAddress());
    });

    it("Should initialize with epoch 1", async function () {
      expect(await creatorShare.epochNumber()).to.equal(1);
    });

    it("Should initialize with zero supply", async function () {
      expect(await creatorShare.currentSupply()).to.equal(0);
      expect(await creatorShare.totalSupply()).to.equal(0);
    });
  });

  describe("Buy Shares", function () {
    it("Should allow buying shares", async function () {
      const amount = 10;
      const price = await creatorShare.getBuyPrice(amount);

      await expect(creatorShare.connect(user1).buyShares(amount))
        .to.emit(creatorShare, "SharesPurchased");

      expect(await creatorShare.balanceOf(user1Address)).to.equal(amount);
      expect(await creatorShare.currentSupply()).to.equal(amount);
    });

    it("Should calculate correct buy price for first share", async function () {
      const price = await creatorShare.getBuyPrice(1);
      const priceInUsdc = fromUsdc(price);

      // First share should cost ~0.000238 ETH = 0.238 USDC (at ETH price)
      // But with our formula and USDC conversion: 1/4200 * 1e18 / 1e12 = ~238095 (in USDC terms)
      expect(priceInUsdc).to.be.closeTo(0.000238, 0.000001);
    });

    it("Should calculate correct buy price for 100 shares", async function () {
      const price = await creatorShare.getBuyPrice(100);
      const priceInUsdc = fromUsdc(price);

      // 100 shares should cost ~238 in our 18-decimal system
      // Converted to 6-decimal USDC: ~238 USDC
      expect(priceInUsdc).to.be.closeTo(238.095, 1);
    });

    it("Should revert when buying 0 shares", async function () {
      await expect(
        creatorShare.connect(user1).buyShares(0)
      ).to.be.revertedWithCustomError(creatorShare, "AmountCannotBeZero");
    });

    it("Should revert when exceeding max supply", async function () {
      await expect(
        creatorShare.connect(user1).buyShares(1001)
      ).to.be.revertedWithCustomError(creatorShare, "MaxSupplyExceeded");
    });

    it("Should revert when buying would exceed max supply", async function () {
      await creatorShare.connect(user1).buyShares(999);

      await expect(
        creatorShare.connect(user2).buyShares(2)
      ).to.be.revertedWithCustomError(creatorShare, "MaxSupplyExceeded");
    });

    it("Should transfer correct USDC amount from buyer", async function () {
      const initialBalance = await mockUsdc.balanceOf(user1Address);
      const price = await creatorShare.getBuyPrice(10);

      await creatorShare.connect(user1).buyShares(10);

      const finalBalance = await mockUsdc.balanceOf(user1Address);
      expect(initialBalance - finalBalance).to.equal(price);
    });

    it("Should allow multiple users to buy shares", async function () {
      await creatorShare.connect(user1).buyShares(50);
      await creatorShare.connect(user2).buyShares(30);
      await creatorShare.connect(user3).buyShares(20);

      expect(await creatorShare.balanceOf(user1Address)).to.equal(50);
      expect(await creatorShare.balanceOf(user2Address)).to.equal(30);
      expect(await creatorShare.balanceOf(user3Address)).to.equal(20);
      expect(await creatorShare.currentSupply()).to.equal(100);
    });
  });

  describe("Sell Shares", function () {
    beforeEach(async function () {
      // User1 buys 100 shares
      await creatorShare.connect(user1).buyShares(100);
    });

    it("Should allow selling shares with 5% fee", async function () {
      const amount = 10;
      const sellPrice = await creatorShare.getSellPrice(amount);

      await expect(creatorShare.connect(user1).sellShares(amount))
        .to.emit(creatorShare, "SharesSold");

      expect(await creatorShare.balanceOf(user1Address)).to.equal(90);
      expect(await creatorShare.currentSupply()).to.equal(90);
    });

    it("Should apply 5% fee on sells", async function () {
      const initialBalance = await mockUsdc.balanceOf(user1Address);

      // Sell 10 shares
      await creatorShare.connect(user1).sellShares(10);

      const finalBalance = await mockUsdc.balanceOf(user1Address);
      const received = finalBalance - initialBalance;

      // Calculate expected: proceeds with bonding curve, minus 5% fee
      const grossProceeds = await creatorShare.connect(user1).getBuyPrice.staticCall(10);
      const fee = (grossProceeds * 5n) / 100n;
      const netProceeds = grossProceeds - fee;

      // Allow for small rounding difference
      const difference = received > netProceeds ? received - netProceeds : netProceeds - received;
      expect(difference).to.be.lte(toUsdc(0.01));
    });

    it("Should split fee 50/50 between reward pool and platform", async function () {
      const initialRewardPool = await creatorShare.rewardPool();
      const initialPlatformFees = await creatorShare.platformFees();

      await creatorShare.connect(user1).sellShares(10);

      const rewardPoolIncrease = (await creatorShare.rewardPool()) - initialRewardPool;
      const platformFeesIncrease = (await creatorShare.platformFees()) - initialPlatformFees;

      // They should be equal (50/50 split)
      expect(rewardPoolIncrease).to.equal(platformFeesIncrease);
    });

    it("Should revert when selling 0 shares", async function () {
      await expect(
        creatorShare.connect(user1).sellShares(0)
      ).to.be.revertedWithCustomError(creatorShare, "AmountCannotBeZero");
    });

    it("Should revert when selling more shares than owned", async function () {
      await expect(
        creatorShare.connect(user1).sellShares(101)
      ).to.be.revertedWithCustomError(creatorShare, "InsufficientShares");
    });

    it("Should allow selling all shares", async function () {
      await creatorShare.connect(user1).sellShares(100);

      expect(await creatorShare.balanceOf(user1Address)).to.equal(0);
      expect(await creatorShare.currentSupply()).to.equal(0);
    });
  });

  describe("Price Calculations", function () {
    it("Should return 0 for getBuyPrice(0)", async function () {
      expect(await creatorShare.getBuyPrice(0)).to.equal(0);
    });

    it("Should return 0 for getSellPrice(0)", async function () {
      expect(await creatorShare.getSellPrice(0)).to.equal(0);
    });

    it("Should have consistent pricing for buy then sell", async function () {
      // Start at supply 0, buy 10 shares
      const buyPrice = await creatorShare.getBuyPrice(10);

      // After buying, supply is 10. Selling 10 shares goes from 10 to 0
      // This should return the same as buying from 0 to 10, minus 5% fee
      await creatorShare.connect(user1).buyShares(10);

      const sellPrice = await creatorShare.getSellPrice(10);

      // Sell price should be approximately buy price minus 5% fee
      const expectedSellPrice = (buyPrice * 95n) / 100n;

      // Allow for small rounding differences
      const difference =
        sellPrice > expectedSellPrice
          ? sellPrice - expectedSellPrice
          : expectedSellPrice - sellPrice;
      expect(difference).to.be.lte(toUsdc(1)); // Allow up to 1 USDC difference for rounding
    });
  });

  describe("Epoch Finalization", function () {
    beforeEach(async function () {
      // Setup: Multiple users buy shares and some selling happens
      await creatorShare.connect(user1).buyShares(100);
      await creatorShare.connect(user2).buyShares(50);
      await creatorShare.connect(user1).sellShares(10); // This generates fees
    });

    it("Should allow owner to finalize epoch", async function () {
      const rewardPool = await creatorShare.rewardPool();
      const totalSupply = await creatorShare.totalSupply();

      await expect(creatorShare.connect(owner).finalizeEpoch())
        .to.emit(creatorShare, "EpochFinalized");

      expect(await creatorShare.epochNumber()).to.equal(2);
    });

    it("Should reset reward pool after finalization", async function () {
      const rewardPoolBefore = await creatorShare.rewardPool();
      expect(rewardPoolBefore).to.be.gt(0);

      await creatorShare.connect(owner).finalizeEpoch();

      expect(await creatorShare.rewardPool()).to.equal(0);
    });

    it("Should not reset platform fees after finalization", async function () {
      const platformFeesBefore = await creatorShare.platformFees();
      expect(platformFeesBefore).to.be.gt(0);

      await creatorShare.connect(owner).finalizeEpoch();

      expect(await creatorShare.platformFees()).to.equal(platformFeesBefore);
    });

    it("Should revert if non-owner tries to finalize", async function () {
      await expect(
        creatorShare.connect(user1).finalizeEpoch()
      ).to.be.revertedWithCustomError(creatorShare, "OwnableUnauthorizedAccount");
    });

    it("Should store epoch data correctly", async function () {
      const rewardPool = await creatorShare.rewardPool();
      const totalSupply = await creatorShare.totalSupply();

      await creatorShare.connect(owner).finalizeEpoch();

      expect(await creatorShare.getEpochRewardPool(1)).to.equal(rewardPool);
      expect(await creatorShare.getEpochTotalShares(1)).to.equal(totalSupply);
    });
  });

  describe("Dividend Claims", function () {
    beforeEach(async function () {
      // Epoch 1: Users buy shares
      await creatorShare.connect(user1).buyShares(60); // 60% of shares
      await creatorShare.connect(user2).buyShares(40); // 40% of shares

      // Generate some fees
      await creatorShare.connect(user1).sellShares(10);
      await creatorShare.connect(user2).sellShares(10);

      // Finalize epoch 1
      await creatorShare.connect(owner).finalizeEpoch();
    });

    it("Should allow users to claim dividends", async function () {
      const pendingDividends = await creatorShare.getPendingDividends(user1Address);
      expect(pendingDividends).to.be.gt(0);

      const initialBalance = await mockUsdc.balanceOf(user1Address);

      await expect(creatorShare.connect(user1).claimDividends())
        .to.emit(creatorShare, "DividendsClaimed");

      const finalBalance = await mockUsdc.balanceOf(user1Address);
      expect(finalBalance - initialBalance).to.equal(pendingDividends);
    });

    it("Should distribute dividends proportionally to shares", async function () {
      const user1Dividends = await creatorShare.getPendingDividends(user1Address);
      const user2Dividends = await creatorShare.getPendingDividends(user2Address);

      // User1 has 50 shares (62.5%), User2 has 30 shares (37.5%)
      // So user1 should get ~62.5% of rewards, user2 ~37.5%
      const ratio = Number(user1Dividends) / Number(user2Dividends);

      // User1 has 50/80 shares, User2 has 30/80 shares
      // Ratio should be 50/30 = 1.666...
      expect(ratio).to.be.closeTo(1.666, 0.1);
    });

    it("Should revert when no dividends are available", async function () {
      // User3 never bought shares
      await expect(
        creatorShare.connect(user3).claimDividends()
      ).to.be.revertedWithCustomError(creatorShare, "NoDividendsAvailable");
    });

    it("Should revert when trying to claim again without new epochs", async function () {
      await creatorShare.connect(user1).claimDividends();

      await expect(
        creatorShare.connect(user1).claimDividends()
      ).to.be.revertedWithCustomError(creatorShare, "NoDividendsAvailable");
    });

    it("Should accumulate dividends across multiple epochs", async function () {
      // Claim epoch 1
      await creatorShare.connect(user1).claimDividends();

      // Epoch 2: Generate more fees
      await creatorShare.connect(user1).sellShares(10);
      await creatorShare.connect(owner).finalizeEpoch();

      // Should be able to claim epoch 2
      const pendingDividends = await creatorShare.getPendingDividends(user1Address);
      expect(pendingDividends).to.be.gt(0);

      await expect(creatorShare.connect(user1).claimDividends()).to.not.be.reverted;
    });

    it("Should return 0 pending dividends for current epoch", async function () {
      // Claim all past epochs
      await creatorShare.connect(user1).claimDividends();

      // Generate fees in current epoch (not yet finalized)
      await creatorShare.connect(user1).sellShares(5);

      // Pending should still be 0 (current epoch not finalized)
      const pending = await creatorShare.getPendingDividends(user1Address);
      expect(pending).to.equal(0);
    });
  });

  describe("Platform Fees", function () {
    beforeEach(async function () {
      await creatorShare.connect(user1).buyShares(100);
      await creatorShare.connect(user1).sellShares(50); // Generate platform fees
    });

    it("Should allow owner to withdraw platform fees", async function () {
      const platformFees = await creatorShare.platformFees();
      expect(platformFees).to.be.gt(0);

      const recipientAddress = user3Address;
      const initialBalance = await mockUsdc.balanceOf(recipientAddress);

      await expect(creatorShare.connect(owner).withdrawPlatformFees(recipientAddress))
        .to.emit(creatorShare, "PlatformFeesWithdrawn")
        .withArgs(recipientAddress, platformFees);

      const finalBalance = await mockUsdc.balanceOf(recipientAddress);
      expect(finalBalance - initialBalance).to.equal(platformFees);
      expect(await creatorShare.platformFees()).to.equal(0);
    });

    it("Should revert when non-owner tries to withdraw", async function () {
      await expect(
        creatorShare.connect(user1).withdrawPlatformFees(user1Address)
      ).to.be.revertedWithCustomError(creatorShare, "OwnableUnauthorizedAccount");
    });

    it("Should revert when withdrawing to zero address", async function () {
      await expect(
        creatorShare.connect(owner).withdrawPlatformFees(ethers.ZeroAddress)
      ).to.be.revertedWith("Invalid recipient");
    });

    it("Should revert when no fees to withdraw", async function () {
      // Withdraw once
      await creatorShare.connect(owner).withdrawPlatformFees(user3Address);

      // Try to withdraw again
      await expect(
        creatorShare.connect(owner).withdrawPlatformFees(user3Address)
      ).to.be.revertedWith("No fees to withdraw");
    });
  });

  describe("Pause/Unpause", function () {
    it("Should allow owner to pause", async function () {
      await creatorShare.connect(owner).pause();
      expect(await creatorShare.paused()).to.be.true;
    });

    it("Should allow owner to unpause", async function () {
      await creatorShare.connect(owner).pause();
      await creatorShare.connect(owner).unpause();
      expect(await creatorShare.paused()).to.be.false;
    });

    it("Should revert non-owner pause attempts", async function () {
      await expect(
        creatorShare.connect(user1).pause()
      ).to.be.revertedWithCustomError(creatorShare, "OwnableUnauthorizedAccount");
    });

    it("Should prevent buying when paused", async function () {
      await creatorShare.connect(owner).pause();

      await expect(
        creatorShare.connect(user1).buyShares(10)
      ).to.be.revertedWithCustomError(creatorShare, "EnforcedPause");
    });

    it("Should prevent selling when paused", async function () {
      await creatorShare.connect(user1).buyShares(10);
      await creatorShare.connect(owner).pause();

      await expect(
        creatorShare.connect(user1).sellShares(5)
      ).to.be.revertedWithCustomError(creatorShare, "EnforcedPause");
    });

    it("Should allow operations after unpause", async function () {
      await creatorShare.connect(owner).pause();
      await creatorShare.connect(owner).unpause();

      await expect(creatorShare.connect(user1).buyShares(10)).to.not.be.reverted;
    });
  });

  describe("Edge Cases and Complex Scenarios", function () {
    it("Should handle buying max supply", async function () {
      await creatorShare.connect(user1).buyShares(1000);
      expect(await creatorShare.currentSupply()).to.equal(1000);
    });

    it("Should handle multiple buys and sells", async function () {
      await creatorShare.connect(user1).buyShares(100);
      await creatorShare.connect(user1).sellShares(50);
      await creatorShare.connect(user1).buyShares(30);
      await creatorShare.connect(user1).sellShares(20);

      expect(await creatorShare.balanceOf(user1Address)).to.equal(60);
      expect(await creatorShare.currentSupply()).to.equal(60);
    });

    it("Should handle transfers between users", async function () {
      await creatorShare.connect(user1).buyShares(100);

      await creatorShare.connect(user1).transfer(user2Address, 30);

      expect(await creatorShare.balanceOf(user1Address)).to.equal(70);
      expect(await creatorShare.balanceOf(user2Address)).to.equal(30);
    });

    it("Should track shares correctly after transfers for dividends", async function () {
      // User1 buys shares
      await creatorShare.connect(user1).buyShares(100);

      // Transfer to user2
      await creatorShare.connect(user1).transfer(user2Address, 50);

      // Generate fees
      await creatorShare.connect(user1).sellShares(10);

      // Finalize
      await creatorShare.connect(owner).finalizeEpoch();

      // Both should have dividends based on their holdings
      const user1Dividends = await creatorShare.getPendingDividends(user1Address);
      const user2Dividends = await creatorShare.getPendingDividends(user2Address);

      expect(user1Dividends).to.be.gt(0);
      expect(user2Dividends).to.be.gt(0);
    });

    it("Should handle user with no shares claiming", async function () {
      await creatorShare.connect(user1).buyShares(100);
      await creatorShare.connect(user1).sellShares(10);
      await creatorShare.connect(owner).finalizeEpoch();

      // User2 never bought shares
      await expect(
        creatorShare.connect(user2).claimDividends()
      ).to.be.revertedWithCustomError(creatorShare, "NoDividendsAvailable");
    });
  });

  describe("View Functions", function () {
    beforeEach(async function () {
      await creatorShare.connect(user1).buyShares(100);
      await creatorShare.connect(user2).buyShares(50);
      await creatorShare.connect(user1).sellShares(10);
      await creatorShare.connect(owner).finalizeEpoch();
    });

    it("Should return correct user epoch shares", async function () {
      const shares = await creatorShare.getUserEpochShares(user1Address, 1);
      expect(shares).to.be.gt(0);
    });

    it("Should return correct epoch total shares", async function () {
      const totalShares = await creatorShare.getEpochTotalShares(1);
      expect(totalShares).to.equal(140); // 90 + 50
    });

    it("Should return correct epoch reward pool", async function () {
      const rewardPool = await creatorShare.getEpochRewardPool(1);
      expect(rewardPool).to.be.gt(0);
    });

    it("Should return correct pending dividends", async function () {
      const pending = await creatorShare.getPendingDividends(user1Address);
      expect(pending).to.be.gt(0);
    });
  });
});
