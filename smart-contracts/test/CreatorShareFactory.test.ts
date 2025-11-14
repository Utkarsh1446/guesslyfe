import { expect } from "chai";
import { ethers } from "hardhat";
import { Contract, Signer } from "ethers";

describe("CreatorShareFactory", function () {
  let factory: Contract;
  let mockUsdc: Contract;
  let owner: Signer;
  let creator1: Signer;
  let creator2: Signer;
  let market1: Signer;
  let market2: Signer;
  let user1: Signer;
  let ownerAddress: string;
  let creator1Address: string;
  let creator2Address: string;
  let market1Address: string;
  let market2Address: string;

  const VOLUME_THRESHOLD = 30000n * 10n ** 6n; // 30K USDC with 6 decimals
  const USDC_DECIMALS = 6;
  const toUsdc = (amount: number) => BigInt(amount * 10 ** USDC_DECIMALS);

  beforeEach(async function () {
    [owner, creator1, creator2, market1, market2, user1] = await ethers.getSigners();
    ownerAddress = await owner.getAddress();
    creator1Address = await creator1.getAddress();
    creator2Address = await creator2.getAddress();
    market1Address = await market1.getAddress();
    market2Address = await market2.getAddress();

    // Deploy MockUSDC
    const MockUSDC = await ethers.getContractFactory("MockUSDC");
    mockUsdc = await MockUSDC.deploy();
    await mockUsdc.waitForDeployment();

    // Deploy CreatorShareFactory
    const CreatorShareFactory = await ethers.getContractFactory("CreatorShareFactory");
    factory = await CreatorShareFactory.deploy(await mockUsdc.getAddress(), ownerAddress);
    await factory.waitForDeployment();
  });

  describe("Deployment", function () {
    it("Should set the correct USDC address", async function () {
      expect(await factory.usdc()).to.equal(await mockUsdc.getAddress());
    });

    it("Should set the correct owner", async function () {
      expect(await factory.owner()).to.equal(ownerAddress);
    });

    it("Should set the correct volume threshold", async function () {
      expect(await factory.VOLUME_THRESHOLD()).to.equal(VOLUME_THRESHOLD);
    });

    it("Should initialize with zero creator shares", async function () {
      expect(await factory.getTotalCreatorShares()).to.equal(0);
    });
  });

  describe("Market Whitelist Management", function () {
    it("Should allow owner to add market contract", async function () {
      await expect(factory.connect(owner).addMarketContract(market1Address))
        .to.emit(factory, "MarketContractAdded");

      expect(await factory.isMarketWhitelisted(market1Address)).to.be.true;
    });

    it("Should allow owner to remove market contract", async function () {
      await factory.connect(owner).addMarketContract(market1Address);

      await expect(factory.connect(owner).removeMarketContract(market1Address))
        .to.emit(factory, "MarketContractRemoved");

      expect(await factory.isMarketWhitelisted(market1Address)).to.be.false;
    });

    it("Should revert when non-owner tries to add market", async function () {
      await expect(
        factory.connect(user1).addMarketContract(market1Address)
      ).to.be.revertedWithCustomError(factory, "OwnableUnauthorizedAccount");
    });

    it("Should revert when non-owner tries to remove market", async function () {
      await factory.connect(owner).addMarketContract(market1Address);

      await expect(
        factory.connect(user1).removeMarketContract(market1Address)
      ).to.be.revertedWithCustomError(factory, "OwnableUnauthorizedAccount");
    });

    it("Should revert when adding zero address", async function () {
      await expect(
        factory.connect(owner).addMarketContract(ethers.ZeroAddress)
      ).to.be.revertedWithCustomError(factory, "InvalidMarketContract");
    });

    it("Should allow adding multiple market contracts", async function () {
      await factory.connect(owner).addMarketContract(market1Address);
      await factory.connect(owner).addMarketContract(market2Address);

      expect(await factory.isMarketWhitelisted(market1Address)).to.be.true;
      expect(await factory.isMarketWhitelisted(market2Address)).to.be.true;
    });
  });

  describe("Volume Tracking", function () {
    beforeEach(async function () {
      // Whitelist market1
      await factory.connect(owner).addMarketContract(market1Address);
    });

    it("Should allow whitelisted market to update volume", async function () {
      const volume = toUsdc(5000);

      await expect(factory.connect(market1).updateCreatorVolume(creator1Address, volume))
        .to.emit(factory, "VolumeUpdated");

      expect(await factory.getCreatorVolume(creator1Address)).to.equal(volume);
    });

    it("Should revert when non-whitelisted market tries to update volume", async function () {
      await expect(
        factory.connect(market2).updateCreatorVolume(creator1Address, toUsdc(5000))
      ).to.be.revertedWithCustomError(factory, "NotWhitelistedMarket");
    });

    it("Should accumulate volume from multiple updates", async function () {
      await factory.connect(market1).updateCreatorVolume(creator1Address, toUsdc(5000));
      await factory.connect(market1).updateCreatorVolume(creator1Address, toUsdc(10000));
      await factory.connect(market1).updateCreatorVolume(creator1Address, toUsdc(8000));

      expect(await factory.getCreatorVolume(creator1Address)).to.equal(toUsdc(23000));
    });

    it("Should track volume separately for different creators", async function () {
      await factory.connect(market1).updateCreatorVolume(creator1Address, toUsdc(10000));
      await factory.connect(market1).updateCreatorVolume(creator2Address, toUsdc(15000));

      expect(await factory.getCreatorVolume(creator1Address)).to.equal(toUsdc(10000));
      expect(await factory.getCreatorVolume(creator2Address)).to.equal(toUsdc(15000));
    });

    it("Should revert when updating volume for zero address", async function () {
      await expect(
        factory.connect(market1).updateCreatorVolume(ethers.ZeroAddress, toUsdc(5000))
      ).to.be.revertedWithCustomError(factory, "InvalidCreatorAddress");
    });
  });

  describe("Shares Unlock Threshold", function () {
    beforeEach(async function () {
      await factory.connect(owner).addMarketContract(market1Address);
    });

    it("Should not unlock shares before threshold", async function () {
      await factory.connect(market1).updateCreatorVolume(creator1Address, toUsdc(20000));

      expect(await factory.isSharesUnlocked(creator1Address)).to.be.false;
    });

    it("Should unlock shares when threshold is exactly met", async function () {
      await expect(
        factory.connect(market1).updateCreatorVolume(creator1Address, toUsdc(30000))
      ).to.emit(factory, "SharesUnlocked");

      expect(await factory.isSharesUnlocked(creator1Address)).to.be.true;
    });

    it("Should unlock shares when threshold is exceeded", async function () {
      await factory.connect(market1).updateCreatorVolume(creator1Address, toUsdc(35000));

      expect(await factory.isSharesUnlocked(creator1Address)).to.be.true;
    });

    it("Should unlock shares when accumulated volume reaches threshold", async function () {
      await factory.connect(market1).updateCreatorVolume(creator1Address, toUsdc(20000));
      expect(await factory.isSharesUnlocked(creator1Address)).to.be.false;

      await expect(
        factory.connect(market1).updateCreatorVolume(creator1Address, toUsdc(10000))
      ).to.emit(factory, "SharesUnlocked");

      expect(await factory.isSharesUnlocked(creator1Address)).to.be.true;
    });

    it("Should only emit SharesUnlocked once", async function () {
      await factory.connect(market1).updateCreatorVolume(creator1Address, toUsdc(30000));
      expect(await factory.isSharesUnlocked(creator1Address)).to.be.true;

      // Further updates should not emit SharesUnlocked again
      await expect(
        factory.connect(market1).updateCreatorVolume(creator1Address, toUsdc(5000))
      ).to.not.emit(factory, "SharesUnlocked");
    });

    it("Should calculate remaining volume correctly", async function () {
      await factory.connect(market1).updateCreatorVolume(creator1Address, toUsdc(20000));

      const remaining = await factory.getRemainingVolumeToUnlock(creator1Address);
      expect(remaining).to.equal(toUsdc(10000));
    });

    it("Should return zero remaining when unlocked", async function () {
      await factory.connect(market1).updateCreatorVolume(creator1Address, toUsdc(30000));

      const remaining = await factory.getRemainingVolumeToUnlock(creator1Address);
      expect(remaining).to.equal(0);
    });
  });

  describe("Create Creator Shares", function () {
    beforeEach(async function () {
      // Setup: Whitelist market and unlock shares for creator1
      await factory.connect(owner).addMarketContract(market1Address);
      await factory.connect(market1).updateCreatorVolume(creator1Address, toUsdc(30000));
    });

    it("Should allow creating shares when unlocked", async function () {
      await expect(
        factory.createCreatorShares(creator1Address, "Creator1 Share", "C1")
      ).to.emit(factory, "SharesCreated");

      const shareAddress = await factory.getCreatorShareContract(creator1Address);
      expect(shareAddress).to.not.equal(ethers.ZeroAddress);
    });

    it("Should set creator as owner of deployed share contract", async function () {
      await factory.createCreatorShares(creator1Address, "Creator1 Share", "C1");

      const shareAddress = await factory.getCreatorShareContract(creator1Address);
      const CreatorShare = await ethers.getContractFactory("CreatorShare");
      const shareContract = CreatorShare.attach(shareAddress);

      expect(await shareContract.owner()).to.equal(creator1Address);
    });

    it("Should increment total creator shares count", async function () {
      expect(await factory.getTotalCreatorShares()).to.equal(0);

      await factory.createCreatorShares(creator1Address, "Creator1 Share", "C1");

      expect(await factory.getTotalCreatorShares()).to.equal(1);
    });

    it("Should add share to allCreatorShares array", async function () {
      await factory.createCreatorShares(creator1Address, "Creator1 Share", "C1");

      const shareAddress = await factory.getCreatorShareAtIndex(0);
      expect(shareAddress).to.equal(await factory.getCreatorShareContract(creator1Address));
    });

    it("Should revert when shares not unlocked", async function () {
      // creator2 has no volume, shares not unlocked
      await expect(
        factory.createCreatorShares(creator2Address, "Creator2 Share", "C2")
      ).to.be.revertedWithCustomError(factory, "SharesNotUnlocked");
    });

    it("Should revert when creator already has shares", async function () {
      await factory.createCreatorShares(creator1Address, "Creator1 Share", "C1");

      await expect(
        factory.createCreatorShares(creator1Address, "Creator1 Share V2", "C1V2")
      ).to.be.revertedWithCustomError(factory, "ShareContractAlreadyExists");
    });

    it("Should revert when creator address is zero", async function () {
      await expect(
        factory.createCreatorShares(ethers.ZeroAddress, "Zero Share", "ZERO")
      ).to.be.revertedWithCustomError(factory, "InvalidCreatorAddress");
    });

    it("Should revert when token name is empty", async function () {
      await expect(
        factory.createCreatorShares(creator1Address, "", "C1")
      ).to.be.revertedWithCustomError(factory, "InvalidTokenParams");
    });

    it("Should revert when token symbol is empty", async function () {
      await expect(
        factory.createCreatorShares(creator1Address, "Creator1 Share", "")
      ).to.be.revertedWithCustomError(factory, "InvalidTokenParams");
    });

    it("Should allow multiple creators to create shares", async function () {
      // Unlock shares for creator2
      await factory.connect(market1).updateCreatorVolume(creator2Address, toUsdc(30000));

      await factory.createCreatorShares(creator1Address, "Creator1 Share", "C1");
      await factory.createCreatorShares(creator2Address, "Creator2 Share", "C2");

      expect(await factory.getTotalCreatorShares()).to.equal(2);

      const share1 = await factory.getCreatorShareContract(creator1Address);
      const share2 = await factory.getCreatorShareContract(creator2Address);

      expect(share1).to.not.equal(ethers.ZeroAddress);
      expect(share2).to.not.equal(ethers.ZeroAddress);
      expect(share1).to.not.equal(share2);
    });
  });

  describe("View Functions", function () {
    beforeEach(async function () {
      await factory.connect(owner).addMarketContract(market1Address);
    });

    it("Should return correct creator volume", async function () {
      await factory.connect(market1).updateCreatorVolume(creator1Address, toUsdc(15000));

      expect(await factory.getCreatorVolume(creator1Address)).to.equal(toUsdc(15000));
    });

    it("Should return correct unlock status", async function () {
      expect(await factory.isSharesUnlocked(creator1Address)).to.be.false;

      await factory.connect(market1).updateCreatorVolume(creator1Address, toUsdc(30000));

      expect(await factory.isSharesUnlocked(creator1Address)).to.be.true;
    });

    it("Should return zero address when no share contract exists", async function () {
      expect(await factory.getCreatorShareContract(creator1Address)).to.equal(
        ethers.ZeroAddress
      );
    });

    it("Should return share contract address after creation", async function () {
      await factory.connect(market1).updateCreatorVolume(creator1Address, toUsdc(30000));
      await factory.createCreatorShares(creator1Address, "Creator1 Share", "C1");

      const shareAddress = await factory.getCreatorShareContract(creator1Address);
      expect(shareAddress).to.not.equal(ethers.ZeroAddress);
    });

    it("Should return all creator shares", async function () {
      await factory.connect(market1).updateCreatorVolume(creator1Address, toUsdc(30000));
      await factory.connect(market1).updateCreatorVolume(creator2Address, toUsdc(30000));

      await factory.createCreatorShares(creator1Address, "Creator1 Share", "C1");
      await factory.createCreatorShares(creator2Address, "Creator2 Share", "C2");

      const allShares = await factory.getAllCreatorShares();
      expect(allShares.length).to.equal(2);
    });

    it("Should revert when getting share at invalid index", async function () {
      await expect(factory.getCreatorShareAtIndex(0)).to.be.revertedWith(
        "Index out of bounds"
      );
    });
  });

  describe("canCreateShares Helper", function () {
    beforeEach(async function () {
      await factory.connect(owner).addMarketContract(market1Address);
    });

    it("Should return false when creator is zero address", async function () {
      const [canCreate, reason] = await factory.canCreateShares(ethers.ZeroAddress);

      expect(canCreate).to.be.false;
      expect(reason).to.equal("Invalid creator address");
    });

    it("Should return false when shares not unlocked", async function () {
      const [canCreate, reason] = await factory.canCreateShares(creator1Address);

      expect(canCreate).to.be.false;
      expect(reason).to.equal("Shares not unlocked - volume threshold not met");
    });

    it("Should return false when creator already has shares", async function () {
      await factory.connect(market1).updateCreatorVolume(creator1Address, toUsdc(30000));
      await factory.createCreatorShares(creator1Address, "Creator1 Share", "C1");

      const [canCreate, reason] = await factory.canCreateShares(creator1Address);

      expect(canCreate).to.be.false;
      expect(reason).to.equal("Creator already has a share contract");
    });

    it("Should return true when creator can create shares", async function () {
      await factory.connect(market1).updateCreatorVolume(creator1Address, toUsdc(30000));

      const [canCreate, reason] = await factory.canCreateShares(creator1Address);

      expect(canCreate).to.be.true;
      expect(reason).to.equal("");
    });
  });

  describe("Complex Scenarios", function () {
    beforeEach(async function () {
      await factory.connect(owner).addMarketContract(market1Address);
      await factory.connect(owner).addMarketContract(market2Address);
    });

    it("Should handle volume updates from multiple markets", async function () {
      await factory.connect(market1).updateCreatorVolume(creator1Address, toUsdc(15000));
      await factory.connect(market2).updateCreatorVolume(creator1Address, toUsdc(15000));

      expect(await factory.getCreatorVolume(creator1Address)).to.equal(toUsdc(30000));
      expect(await factory.isSharesUnlocked(creator1Address)).to.be.true;
    });

    it("Should handle removing market from whitelist", async function () {
      await factory.connect(market1).updateCreatorVolume(creator1Address, toUsdc(10000));

      // Remove market1 from whitelist
      await factory.connect(owner).removeMarketContract(market1Address);

      // market1 can no longer update volume
      await expect(
        factory.connect(market1).updateCreatorVolume(creator1Address, toUsdc(5000))
      ).to.be.revertedWithCustomError(factory, "NotWhitelistedMarket");

      // But market2 still can
      await factory.connect(market2).updateCreatorVolume(creator1Address, toUsdc(20000));
      expect(await factory.getCreatorVolume(creator1Address)).to.equal(toUsdc(30000));
    });

    it("Should handle multiple creators with different volumes", async function () {
      await factory.connect(market1).updateCreatorVolume(creator1Address, toUsdc(30000));
      await factory.connect(market1).updateCreatorVolume(creator2Address, toUsdc(15000));

      expect(await factory.isSharesUnlocked(creator1Address)).to.be.true;
      expect(await factory.isSharesUnlocked(creator2Address)).to.be.false;

      // creator1 can create shares
      await expect(
        factory.createCreatorShares(creator1Address, "Creator1 Share", "C1")
      ).to.not.be.reverted;

      // creator2 cannot
      await expect(
        factory.createCreatorShares(creator2Address, "Creator2 Share", "C2")
      ).to.be.revertedWithCustomError(factory, "SharesNotUnlocked");
    });

    it("Should track shares correctly across multiple deployments", async function () {
      await factory.connect(market1).updateCreatorVolume(creator1Address, toUsdc(30000));
      await factory.connect(market1).updateCreatorVolume(creator2Address, toUsdc(35000));

      await factory.createCreatorShares(creator1Address, "Creator1 Share", "C1");
      await factory.createCreatorShares(creator2Address, "Creator2 Share", "C2");

      expect(await factory.getTotalCreatorShares()).to.equal(2);

      const allShares = await factory.getAllCreatorShares();
      expect(allShares.length).to.equal(2);
      expect(allShares[0]).to.equal(await factory.getCreatorShareContract(creator1Address));
      expect(allShares[1]).to.equal(await factory.getCreatorShareContract(creator2Address));
    });
  });

  describe("Integration with CreatorShare", function () {
    beforeEach(async function () {
      await factory.connect(owner).addMarketContract(market1Address);
      await factory.connect(market1).updateCreatorVolume(creator1Address, toUsdc(30000));
    });

    it("Should deploy functional CreatorShare contract", async function () {
      await factory.createCreatorShares(creator1Address, "Creator1 Share", "C1");

      const shareAddress = await factory.getCreatorShareContract(creator1Address);
      const CreatorShare = await ethers.getContractFactory("CreatorShare");
      const shareContract = CreatorShare.attach(shareAddress);

      // Verify it's a proper ERC20
      expect(await shareContract.name()).to.equal("Creator1 Share");
      expect(await shareContract.symbol()).to.equal("C1");
      expect(await shareContract.totalSupply()).to.equal(0);
    });

    it("Should set correct USDC address in CreatorShare", async function () {
      await factory.createCreatorShares(creator1Address, "Creator1 Share", "C1");

      const shareAddress = await factory.getCreatorShareContract(creator1Address);
      const CreatorShare = await ethers.getContractFactory("CreatorShare");
      const shareContract = CreatorShare.attach(shareAddress);

      expect(await shareContract.usdc()).to.equal(await mockUsdc.getAddress());
    });
  });
});
