import { expect } from "chai";
import { ethers } from "hardhat";
import { Contract, Signer } from "ethers";
import { time } from "@nomicfoundation/hardhat-network-helpers";

describe("OpinionMarket", function () {
  let opinionMarket: Contract;
  let mockUsdc: Contract;
  let factory: Contract;
  let owner: Signer;
  let creator: Signer;
  let user1: Signer;
  let user2: Signer;
  let platformFeeCollector: Signer;
  let marketContract: Signer;
  let ownerAddress: string;
  let creatorAddress: string;
  let user1Address: string;
  let user2Address: string;
  let platformFeeCollectorAddress: string;
  let marketContractAddress: string;

  const USDC_DECIMALS = 6;
  const toUsdc = (amount: number) => BigInt(amount * 10 ** USDC_DECIMALS);

  const SIX_HOURS = 6 * 60 * 60;
  const SEVEN_DAYS = 7 * 24 * 60 * 60;
  const ONE_DAY = 24 * 60 * 60;

  beforeEach(async function () {
    [owner, creator, user1, user2, platformFeeCollector, marketContract] =
      await ethers.getSigners();
    ownerAddress = await owner.getAddress();
    creatorAddress = await creator.getAddress();
    user1Address = await user1.getAddress();
    user2Address = await user2.getAddress();
    platformFeeCollectorAddress = await platformFeeCollector.getAddress();
    marketContractAddress = await marketContract.getAddress();

    // Deploy MockUSDC
    const MockUSDC = await ethers.getContractFactory("MockUSDC");
    mockUsdc = await MockUSDC.deploy();
    await mockUsdc.waitForDeployment();

    // Deploy CreatorShareFactory
    const CreatorShareFactory = await ethers.getContractFactory("CreatorShareFactory");
    factory = await CreatorShareFactory.deploy(await mockUsdc.getAddress(), ownerAddress);
    await factory.waitForDeployment();

    // Whitelist OpinionMarket contract (we'll use marketContract signer for this)
    await factory.connect(owner).addMarketContract(marketContractAddress);

    // Deploy OpinionMarket
    const OpinionMarket = await ethers.getContractFactory("OpinionMarket");
    opinionMarket = await OpinionMarket.deploy(
      await mockUsdc.getAddress(),
      await factory.getAddress(),
      platformFeeCollectorAddress,
      ownerAddress
    );
    await opinionMarket.waitForDeployment();

    // Whitelist OpinionMarket in factory
    await factory.connect(owner).addMarketContract(await opinionMarket.getAddress());

    // Mint USDC to users
    await mockUsdc.mint(user1Address, toUsdc(100000));
    await mockUsdc.mint(user2Address, toUsdc(100000));

    // Approve OpinionMarket to spend USDC
    await mockUsdc
      .connect(user1)
      .approve(await opinionMarket.getAddress(), toUsdc(100000));
    await mockUsdc
      .connect(user2)
      .approve(await opinionMarket.getAddress(), toUsdc(100000));
  });

  describe("Deployment", function () {
    it("Should set correct USDC address", async function () {
      expect(await opinionMarket.usdc()).to.equal(await mockUsdc.getAddress());
    });

    it("Should set correct factory address", async function () {
      expect(await opinionMarket.factory()).to.equal(await factory.getAddress());
    });

    it("Should set correct platform fee collector", async function () {
      expect(await opinionMarket.platformFeeCollector()).to.equal(
        platformFeeCollectorAddress
      );
    });

    it("Should set correct fee constants", async function () {
      expect(await opinionMarket.TOTAL_FEE_BPS()).to.equal(150); // 1.5%
      expect(await opinionMarket.PLATFORM_FEE_BPS()).to.equal(75); // 0.75%
      expect(await opinionMarket.CREATOR_FEE_BPS()).to.equal(60); // 0.6%
      expect(await opinionMarket.SHAREHOLDER_FEE_BPS()).to.equal(15); // 0.15%
    });

    it("Should initialize nextMarketId to 1", async function () {
      expect(await opinionMarket.nextMarketId()).to.equal(1);
    });
  });

  describe("Market Creation", function () {
    it("Should create market with 2 outcomes", async function () {
      const outcomes = ["Yes", "No"];
      await expect(
        opinionMarket
          .connect(creator)
          .createMarket("Test Market", outcomes, ONE_DAY, "Description")
      ).to.emit(opinionMarket, "MarketCreated");

      const market = await opinionMarket.getMarketInfo(1);
      expect(market.id).to.equal(1);
      expect(market.creator).to.equal(creatorAddress);
      expect(market.title).to.equal("Test Market");
    });

    it("Should create market with 4 outcomes", async function () {
      const outcomes = ["Option A", "Option B", "Option C", "Option D"];
      await opinionMarket
        .connect(creator)
        .createMarket("Multi Market", outcomes, ONE_DAY, "Multi-outcome test");

      const market = await opinionMarket.getMarketInfo(1);
      expect(market.outcomes.length).to.equal(4);
    });

    it("Should set correct end time", async function () {
      const outcomes = ["Yes", "No"];
      await opinionMarket
        .connect(creator)
        .createMarket("Test Market", outcomes, ONE_DAY, "Description");

      const market = await opinionMarket.getMarketInfo(1);
      const expectedEndTime = (await time.latest()) + ONE_DAY;
      expect(market.endTime).to.be.closeTo(expectedEndTime, 2);
    });

    it("Should initialize outcome reserves to zero", async function () {
      const outcomes = ["Yes", "No"];
      await opinionMarket
        .connect(creator)
        .createMarket("Test Market", outcomes, ONE_DAY, "Description");

      const reserve0 = await opinionMarket.outcomeReserves(1, 0);
      const reserve1 = await opinionMarket.outcomeReserves(1, 1);

      expect(reserve0).to.equal(0); // Starts at 0
      expect(reserve1).to.equal(0);
    });

    it("Should revert with less than 2 outcomes", async function () {
      const outcomes = ["Only One"];
      await expect(
        opinionMarket
          .connect(creator)
          .createMarket("Bad Market", outcomes, ONE_DAY, "Description")
      ).to.be.revertedWithCustomError(opinionMarket, "InvalidOutcomeCount");
    });

    it("Should revert with more than 4 outcomes", async function () {
      const outcomes = ["A", "B", "C", "D", "E"];
      await expect(
        opinionMarket
          .connect(creator)
          .createMarket("Bad Market", outcomes, ONE_DAY, "Description")
      ).to.be.revertedWithCustomError(opinionMarket, "InvalidOutcomeCount");
    });

    it("Should revert with duration less than 6 hours", async function () {
      const outcomes = ["Yes", "No"];
      await expect(
        opinionMarket
          .connect(creator)
          .createMarket("Bad Market", outcomes, SIX_HOURS - 1, "Description")
      ).to.be.revertedWithCustomError(opinionMarket, "InvalidDuration");
    });

    it("Should revert with duration more than 7 days", async function () {
      const outcomes = ["Yes", "No"];
      await expect(
        opinionMarket
          .connect(creator)
          .createMarket("Bad Market", outcomes, SEVEN_DAYS + 1, "Description")
      ).to.be.revertedWithCustomError(opinionMarket, "InvalidDuration");
    });

    it("Should allow exactly 6 hours duration", async function () {
      const outcomes = ["Yes", "No"];
      await expect(
        opinionMarket
          .connect(creator)
          .createMarket("Min Duration", outcomes, SIX_HOURS, "Description")
      ).to.not.be.reverted;
    });

    it("Should allow exactly 7 days duration", async function () {
      const outcomes = ["Yes", "No"];
      await expect(
        opinionMarket
          .connect(creator)
          .createMarket("Max Duration", outcomes, SEVEN_DAYS, "Description")
      ).to.not.be.reverted;
    });
  });

  describe("Placing Bets", function () {
    beforeEach(async function () {
      const outcomes = ["Yes", "No"];
      await opinionMarket
        .connect(creator)
        .createMarket("Test Market", outcomes, ONE_DAY, "Description");
    });

    it("Should allow placing a bet", async function () {
      await expect(opinionMarket.connect(user1).placeBet(1, 0, toUsdc(100)))
        .to.emit(opinionMarket, "BetPlaced")
        .and.to.emit(opinionMarket, "FeesCollected");
    });

    it("Should update user shares", async function () {
      await opinionMarket.connect(user1).placeBet(1, 0, toUsdc(100));

      const shares = await opinionMarket.userOutcomeShares(1, user1Address, 0);
      // After 1.5% fee: 100 - 1.5 = 98.5
      expect(shares).to.be.gt(0);
    });

    it("Should update outcome reserves", async function () {
      const initialReserve = await opinionMarket.outcomeReserves(1, 0);

      await opinionMarket.connect(user1).placeBet(1, 0, toUsdc(100));

      const finalReserve = await opinionMarket.outcomeReserves(1, 0);
      expect(finalReserve).to.be.gt(initialReserve);
    });

    it("Should distribute fees correctly", async function () {
      const creatorInitial = await mockUsdc.balanceOf(creatorAddress);
      const platformInitial = await mockUsdc.balanceOf(platformFeeCollectorAddress);

      await opinionMarket.connect(user1).placeBet(1, 0, toUsdc(100));

      const creatorFinal = await mockUsdc.balanceOf(creatorAddress);
      const platformFinal = await mockUsdc.balanceOf(platformFeeCollectorAddress);

      // Platform fee: 100 * 0.75% = 0.75 USDC
      expect(platformFinal - platformInitial).to.equal(toUsdc(0.75));

      // Creator fee: 100 * 0.6% = 0.6 USDC
      expect(creatorFinal - creatorInitial).to.equal(toUsdc(0.6));
    });

    it("Should update market total volume", async function () {
      await opinionMarket.connect(user1).placeBet(1, 0, toUsdc(100));

      const market = await opinionMarket.getMarketInfo(1);
      expect(market.totalVolume).to.equal(toUsdc(100));
    });

    it("Should revert when betting on non-existent market", async function () {
      await expect(
        opinionMarket.connect(user1).placeBet(999, 0, toUsdc(100))
      ).to.be.revertedWithCustomError(opinionMarket, "MarketDoesNotExist");
    });

    it("Should revert when betting on invalid outcome", async function () {
      await expect(
        opinionMarket.connect(user1).placeBet(1, 5, toUsdc(100))
      ).to.be.revertedWithCustomError(opinionMarket, "InvalidOutcome");
    });

    it("Should revert when betting zero amount", async function () {
      await expect(
        opinionMarket.connect(user1).placeBet(1, 0, 0)
      ).to.be.revertedWithCustomError(opinionMarket, "AmountCannotBeZero");
    });

    it("Should allow multiple bets from same user", async function () {
      await opinionMarket.connect(user1).placeBet(1, 0, toUsdc(100));
      await opinionMarket.connect(user1).placeBet(1, 0, toUsdc(50));

      const shares = await opinionMarket.userOutcomeShares(1, user1Address, 0);
      expect(shares).to.be.gt(0);
    });

    it("Should allow bets from different users", async function () {
      await opinionMarket.connect(user1).placeBet(1, 0, toUsdc(100));
      await opinionMarket.connect(user2).placeBet(1, 1, toUsdc(150));

      const user1Shares = await opinionMarket.userOutcomeShares(1, user1Address, 0);
      const user2Shares = await opinionMarket.userOutcomeShares(1, user2Address, 1);

      expect(user1Shares).to.be.gt(0);
      expect(user2Shares).to.be.gt(0);
    });

    it("Should revert when market has ended", async function () {
      // Fast forward past end time
      await time.increase(ONE_DAY + 1);

      await expect(
        opinionMarket.connect(user1).placeBet(1, 0, toUsdc(100))
      ).to.be.revertedWithCustomError(opinionMarket, "MarketEnded");
    });

    it("Should revert when market is paused", async function () {
      await opinionMarket.connect(owner).pauseMarket(1);

      await expect(
        opinionMarket.connect(user1).placeBet(1, 0, toUsdc(100))
      ).to.be.revertedWithCustomError(opinionMarket, "MarketIsPaused");
    });
  });

  describe("Market Resolution", function () {
    beforeEach(async function () {
      const outcomes = ["Yes", "No"];
      await opinionMarket
        .connect(creator)
        .createMarket("Test Market", outcomes, ONE_DAY, "Description");

      // Place some bets
      await opinionMarket.connect(user1).placeBet(1, 0, toUsdc(100));
      await opinionMarket.connect(user2).placeBet(1, 1, toUsdc(100));

      // Fast forward past end time
      await time.increase(ONE_DAY + 1);
    });

    it("Should allow owner to resolve market", async function () {
      await expect(opinionMarket.connect(owner).resolveMarket(1, 0))
        .to.emit(opinionMarket, "MarketResolved")
        .withArgs(1, 0, await time.latest() + 1);
    });

    it("Should update market status to Resolved", async function () {
      await opinionMarket.connect(owner).resolveMarket(1, 0);

      const market = await opinionMarket.getMarketInfo(1);
      expect(market.status).to.equal(1); // MarketStatus.Resolved
    });

    it("Should set winning outcome", async function () {
      await opinionMarket.connect(owner).resolveMarket(1, 0);

      const market = await opinionMarket.getMarketInfo(1);
      expect(market.winningOutcome).to.equal(0);
    });

    it("Should revert when resolving non-existent market", async function () {
      await expect(
        opinionMarket.connect(owner).resolveMarket(999, 0)
      ).to.be.revertedWithCustomError(opinionMarket, "MarketDoesNotExist");
    });

    it("Should revert when market not ended", async function () {
      const outcomes = ["Yes", "No"];
      await opinionMarket
        .connect(creator)
        .createMarket("Active Market", outcomes, ONE_DAY, "Description");

      await expect(
        opinionMarket.connect(owner).resolveMarket(2, 0)
      ).to.be.revertedWithCustomError(opinionMarket, "MarketNotEnded");
    });

    it("Should revert when resolving with invalid outcome", async function () {
      await expect(
        opinionMarket.connect(owner).resolveMarket(1, 5)
      ).to.be.revertedWithCustomError(opinionMarket, "InvalidOutcome");
    });

    it("Should revert when non-owner tries to resolve", async function () {
      await expect(
        opinionMarket.connect(user1).resolveMarket(1, 0)
      ).to.be.revertedWithCustomError(opinionMarket, "OwnableUnauthorizedAccount");
    });

    it("Should revert when resolving already resolved market", async function () {
      await opinionMarket.connect(owner).resolveMarket(1, 0);

      await expect(
        opinionMarket.connect(owner).resolveMarket(1, 1)
      ).to.be.revertedWithCustomError(opinionMarket, "MarketAlreadyResolved");
    });
  });

  describe("Claiming Winnings", function () {
    beforeEach(async function () {
      const outcomes = ["Yes", "No"];
      await opinionMarket
        .connect(creator)
        .createMarket("Test Market", outcomes, ONE_DAY, "Description");

      // Place bets
      await opinionMarket.connect(user1).placeBet(1, 0, toUsdc(1000));
      await opinionMarket.connect(user2).placeBet(1, 1, toUsdc(500));

      // Fast forward and resolve
      await time.increase(ONE_DAY + 1);
      await opinionMarket.connect(owner).resolveMarket(1, 0);
    });

    it("Should allow winner to claim", async function () {
      await expect(opinionMarket.connect(user1).claimWinnings(1))
        .to.emit(opinionMarket, "WinningsClaimed");
    });

    it("Should transfer correct payout", async function () {
      const initialBalance = await mockUsdc.balanceOf(user1Address);

      await opinionMarket.connect(user1).claimWinnings(1);

      const finalBalance = await mockUsdc.balanceOf(user1Address);
      expect(finalBalance).to.be.gt(initialBalance);
    });

    it("Should mark as claimed", async function () {
      await opinionMarket.connect(user1).claimWinnings(1);

      const claimed = await opinionMarket.hasClaimed(1, user1Address);
      expect(claimed).to.be.true;
    });

    it("Should revert when claiming from unresolved market", async function () {
      const outcomes = ["Yes", "No"];
      await opinionMarket
        .connect(creator)
        .createMarket("Unresolved", outcomes, ONE_DAY, "Description");

      await opinionMarket.connect(user1).placeBet(2, 0, toUsdc(100));

      await expect(
        opinionMarket.connect(user1).claimWinnings(2)
      ).to.be.revertedWithCustomError(opinionMarket, "MarketNotResolved");
    });

    it("Should revert when user has no winning shares", async function () {
      await expect(
        opinionMarket.connect(user2).claimWinnings(1)
      ).to.be.revertedWithCustomError(opinionMarket, "NoWinningsToClaim");
    });

    it("Should revert when already claimed", async function () {
      await opinionMarket.connect(user1).claimWinnings(1);

      await expect(
        opinionMarket.connect(user1).claimWinnings(1)
      ).to.be.revertedWithCustomError(opinionMarket, "AlreadyClaimed");
    });
  });

  describe("Pause/Unpause", function () {
    beforeEach(async function () {
      const outcomes = ["Yes", "No"];
      await opinionMarket
        .connect(creator)
        .createMarket("Test Market", outcomes, ONE_DAY, "Description");
    });

    it("Should allow owner to pause market", async function () {
      await expect(opinionMarket.connect(owner).pauseMarket(1))
        .to.emit(opinionMarket, "MarketPaused");

      const market = await opinionMarket.getMarketInfo(1);
      expect(market.paused).to.be.true;
    });

    it("Should allow owner to unpause market", async function () {
      await opinionMarket.connect(owner).pauseMarket(1);

      await expect(opinionMarket.connect(owner).unpauseMarket(1))
        .to.emit(opinionMarket, "MarketUnpaused");

      const market = await opinionMarket.getMarketInfo(1);
      expect(market.paused).to.be.false;
    });

    it("Should revert non-owner pause attempts", async function () {
      await expect(
        opinionMarket.connect(user1).pauseMarket(1)
      ).to.be.revertedWithCustomError(opinionMarket, "OwnableUnauthorizedAccount");
    });
  });

  describe("View Functions", function () {
    beforeEach(async function () {
      const outcomes = ["Yes", "No"];
      await opinionMarket
        .connect(creator)
        .createMarket("Test Market", outcomes, ONE_DAY, "Description");

      await opinionMarket.connect(user1).placeBet(1, 0, toUsdc(100));
    });

    it("Should return user position", async function () {
      const position = await opinionMarket.getUserPosition(1, user1Address);
      expect(position.length).to.equal(2);
      expect(position[0]).to.be.gt(0);
    });

    it("Should calculate outcome probability", async function () {
      const probability = await opinionMarket.getOutcomeProbability(1, 0);
      expect(probability).to.be.gt(0);
      expect(probability).to.be.lte(10000); // Max 100%
    });
  });

  describe("Integration with CreatorShareFactory", function () {
    beforeEach(async function () {
      const outcomes = ["Yes", "No"];
      await opinionMarket
        .connect(creator)
        .createMarket("Test Market", outcomes, ONE_DAY, "Description");
    });

    it("Should update creator volume in factory", async function () {
      const initialVolume = await factory.getCreatorVolume(creatorAddress);

      await opinionMarket.connect(user1).placeBet(1, 0, toUsdc(100));

      const finalVolume = await factory.getCreatorVolume(creatorAddress);
      expect(finalVolume - initialVolume).to.equal(toUsdc(100));
    });

    it("Should accumulate volume across multiple bets", async function () {
      await opinionMarket.connect(user1).placeBet(1, 0, toUsdc(100));
      await opinionMarket.connect(user2).placeBet(1, 1, toUsdc(200));

      const volume = await factory.getCreatorVolume(creatorAddress);
      expect(volume).to.equal(toUsdc(300));
    });
  });

  describe("Virtual Liquidity Bootstrapping", function () {
    it("Should have correct virtual liquidity constant", async function () {
      const virtualLiquidity = await opinionMarket.VIRTUAL_LIQUIDITY_PER_OUTCOME();
      expect(virtualLiquidity).to.equal(toUsdc(5000)); // 5000 USDC per outcome
    });

    it("Should start binary market at 50/50 probability", async function () {
      const outcomes = ["Yes", "No"];
      await opinionMarket
        .connect(creator)
        .createMarket("Test Market", outcomes, ONE_DAY, "Description");

      const yesProb = await opinionMarket.getOutcomeProbability(1, 0);
      const noProb = await opinionMarket.getOutcomeProbability(1, 1);

      expect(yesProb).to.equal(5000); // 50%
      expect(noProb).to.equal(5000); // 50%
    });

    it("Should start 3-outcome market at equal probabilities", async function () {
      const outcomes = ["Option A", "Option B", "Option C"];
      await opinionMarket
        .connect(creator)
        .createMarket("Test Market", outcomes, ONE_DAY, "Description");

      const probA = await opinionMarket.getOutcomeProbability(1, 0);
      const probB = await opinionMarket.getOutcomeProbability(1, 1);
      const probC = await opinionMarket.getOutcomeProbability(1, 2);

      // Each should be approximately 33.33% (3333 basis points)
      expect(probA).to.equal(3333);
      expect(probB).to.equal(3333);
      expect(probC).to.equal(3333); // All equal due to integer division
    });

    it("Should prevent extreme price movement on first bet", async function () {
      const outcomes = ["Yes", "No"];
      await opinionMarket
        .connect(creator)
        .createMarket("Test Market", outcomes, ONE_DAY, "Description");

      // Place first bet of $100 on Yes
      await opinionMarket.connect(user1).placeBet(1, 0, toUsdc(100));

      const yesProb = await opinionMarket.getOutcomeProbability(1, 0);
      const noProb = await opinionMarket.getOutcomeProbability(1, 1);

      // Probability should move slightly, not to 100%
      expect(yesProb).to.be.gt(5000); // Greater than 50%
      expect(yesProb).to.be.lt(10000); // Less than 100%
      expect(noProb).to.be.gt(0); // Greater than 0%
      expect(noProb).to.be.lt(5000); // Less than 50%

      // Total probability should be approximately 100% (allow for rounding)
      expect(yesProb + noProb).to.be.closeTo(10000, 1);
    });

    it("Should calculate shares using virtual liquidity", async function () {
      const outcomes = ["Yes", "No"];
      await opinionMarket
        .connect(creator)
        .createMarket("Test Market", outcomes, ONE_DAY, "Description");

      const betAmount = toUsdc(100);
      const totalFee = (betAmount * BigInt(150)) / BigInt(10000); // 1.5%
      const amountAfterFee = betAmount - totalFee;

      // Calculate expected shares using virtual liquidity
      // Virtual liquidity per outcome = 5000 USDC
      // Total effective reserves = 5000 + 5000 = 10000 USDC
      // Outcome effective reserve = 5000 USDC
      // shares = (amountAfterFee * totalEffectiveReserves) / outcomeEffectiveReserve
      const expectedShares = (amountAfterFee * toUsdc(10000)) / toUsdc(5000);

      const shares = await opinionMarket.calculateShares(1, 0, amountAfterFee);
      expect(shares).to.equal(expectedShares);
    });

    it("Should have different share amounts for different probabilities", async function () {
      const outcomes = ["Yes", "No"];
      await opinionMarket
        .connect(creator)
        .createMarket("Test Market", outcomes, ONE_DAY, "Description");

      // First bet on Yes shifts probability
      await opinionMarket.connect(user1).placeBet(1, 0, toUsdc(1000));

      const betAmount = toUsdc(100);
      const totalFee = (betAmount * BigInt(150)) / BigInt(10000); // 1.5%
      const amountAfterFee = betAmount - totalFee;

      // Calculate shares for betting on Yes (higher probability, fewer shares)
      const sharesYes = await opinionMarket.calculateShares(1, 0, amountAfterFee);

      // Calculate shares for betting on No (lower probability, more shares)
      const sharesNo = await opinionMarket.calculateShares(1, 1, amountAfterFee);

      // Betting on underdog (No) should give more shares
      expect(sharesNo).to.be.gt(sharesYes);
    });

    it("Should exclude virtual liquidity from payouts", async function () {
      const outcomes = ["Yes", "No"];
      await opinionMarket
        .connect(creator)
        .createMarket("Test Market", outcomes, ONE_DAY, "Description");

      // Users place bets
      await opinionMarket.connect(user1).placeBet(1, 0, toUsdc(1000)); // Yes
      await opinionMarket.connect(user2).placeBet(1, 1, toUsdc(500));  // No

      // Calculate total fees
      const totalFee1 = (toUsdc(1000) * BigInt(150)) / BigInt(10000);
      const totalFee2 = (toUsdc(500) * BigInt(150)) / BigInt(10000);

      // Expected total payout = sum of bets after fees (no virtual liquidity)
      const expectedTotalPayout = (toUsdc(1000) - totalFee1) + (toUsdc(500) - totalFee2);

      // Fast forward past market end
      await time.increase(ONE_DAY + 1);

      // Resolve market with Yes winning
      await opinionMarket.connect(owner).resolveMarket(1, 0);

      // Get user1's balance before claiming
      const balanceBefore = await mockUsdc.balanceOf(user1Address);

      // User1 claims winnings
      await opinionMarket.connect(user1).claimWinnings(1);

      const balanceAfter = await mockUsdc.balanceOf(user1Address);
      const payout = balanceAfter - balanceBefore;

      // Payout should equal total pool (all bets after fees), not include virtual liquidity
      // User1 had all Yes shares, so gets entire pool
      expect(payout).to.equal(expectedTotalPayout);
      expect(payout).to.be.lt(toUsdc(5000)); // Much less than virtual liquidity
    });

    it("Should maintain stable pricing with sequential small bets", async function () {
      const outcomes = ["Yes", "No"];
      await opinionMarket
        .connect(creator)
        .createMarket("Test Market", outcomes, ONE_DAY, "Description");

      // Place 10 small bets on Yes
      for (let i = 0; i < 10; i++) {
        await opinionMarket.connect(user1).placeBet(1, 0, toUsdc(10));
      }

      const yesProb = await opinionMarket.getOutcomeProbability(1, 0);

      // After $100 total in bets, probability should still be reasonable
      expect(yesProb).to.be.gt(5000); // Greater than 50%
      expect(yesProb).to.be.lt(7000); // Less than 70% (stable movement)
    });

    it("Should converge probabilities with balanced betting", async function () {
      const outcomes = ["Yes", "No"];
      await opinionMarket
        .connect(creator)
        .createMarket("Test Market", outcomes, ONE_DAY, "Description");

      // Place equal bets on both outcomes
      await opinionMarket.connect(user1).placeBet(1, 0, toUsdc(1000)); // Yes
      await opinionMarket.connect(user2).placeBet(1, 1, toUsdc(1000)); // No

      const yesProb = await opinionMarket.getOutcomeProbability(1, 0);
      const noProb = await opinionMarket.getOutcomeProbability(1, 1);

      // With equal bets, probabilities should be approximately equal
      // Allow small deviation due to rounding
      expect(yesProb).to.be.closeTo(5000, 50); // ~50%
      expect(noProb).to.be.closeTo(5000, 50); // ~50%
    });
  });
});
