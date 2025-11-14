import { expect } from "chai";
import { ethers } from "hardhat";
import { FeeCollector, MockUSDC } from "../typechain-types";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";

describe("FeeCollector", function () {
  let feeCollector: FeeCollector;
  let usdc: MockUSDC;
  let owner: HardhatEthersSigner;
  let treasury: HardhatEthersSigner;
  let shareContract: HardhatEthersSigner;
  let marketContract: HardhatEthersSigner;
  let user: HardhatEthersSigner;

  const toUsdc = (amount: number) => ethers.parseUnits(amount.toString(), 6);

  beforeEach(async function () {
    [owner, treasury, shareContract, marketContract, user] = await ethers.getSigners();

    // Deploy MockUSDC
    const MockUSDCFactory = await ethers.getContractFactory("MockUSDC");
    usdc = await MockUSDCFactory.deploy();
    await usdc.waitForDeployment();

    // Deploy FeeCollector
    const FeeCollectorFactory = await ethers.getContractFactory("FeeCollector");
    feeCollector = await FeeCollectorFactory.deploy(
      await usdc.getAddress(),
      owner.address
    );
    await feeCollector.waitForDeployment();

    // Mint USDC to share and market contracts for testing
    await usdc.mint(shareContract.address, toUsdc(10000));
    await usdc.mint(marketContract.address, toUsdc(10000));
  });

  describe("Deployment", function () {
    it("Should set correct USDC address", async function () {
      expect(await feeCollector.usdc()).to.equal(await usdc.getAddress());
    });

    it("Should set correct owner", async function () {
      expect(await feeCollector.owner()).to.equal(owner.address);
    });

    it("Should initialize fees to zero", async function () {
      expect(await feeCollector.totalShareFees()).to.equal(0);
      expect(await feeCollector.totalMarketFees()).to.equal(0);
      expect(await feeCollector.getTotalFees()).to.equal(0);
    });

    it("Should revert with invalid USDC address", async function () {
      const FeeCollectorFactory = await ethers.getContractFactory("FeeCollector");
      await expect(
        FeeCollectorFactory.deploy(ethers.ZeroAddress, owner.address)
      ).to.be.revertedWith("Invalid USDC address");
    });
  });

  describe("Depositor Whitelist Management", function () {
    it("Should allow owner to add depositor", async function () {
      await expect(feeCollector.addDepositor(shareContract.address))
        .to.emit(feeCollector, "DepositorWhitelisted");

      expect(await feeCollector.isWhitelisted(shareContract.address)).to.be.true;
    });

    it("Should allow owner to remove depositor", async function () {
      await feeCollector.addDepositor(shareContract.address);

      await expect(feeCollector.removeDepositor(shareContract.address))
        .to.emit(feeCollector, "DepositorRemoved");

      expect(await feeCollector.isWhitelisted(shareContract.address)).to.be.false;
    });

    it("Should revert when non-owner tries to add depositor", async function () {
      await expect(
        feeCollector.connect(user).addDepositor(shareContract.address)
      ).to.be.revertedWithCustomError(feeCollector, "OwnableUnauthorizedAccount");
    });

    it("Should revert when non-owner tries to remove depositor", async function () {
      await feeCollector.addDepositor(shareContract.address);

      await expect(
        feeCollector.connect(user).removeDepositor(shareContract.address)
      ).to.be.revertedWithCustomError(feeCollector, "OwnableUnauthorizedAccount");
    });

    it("Should revert when adding zero address", async function () {
      await expect(
        feeCollector.addDepositor(ethers.ZeroAddress)
      ).to.be.revertedWithCustomError(feeCollector, "InvalidAddress");
    });

    it("Should revert when removing zero address", async function () {
      await expect(
        feeCollector.removeDepositor(ethers.ZeroAddress)
      ).to.be.revertedWithCustomError(feeCollector, "InvalidAddress");
    });

    it("Should handle multiple depositors", async function () {
      await feeCollector.addDepositor(shareContract.address);
      await feeCollector.addDepositor(marketContract.address);

      expect(await feeCollector.isWhitelisted(shareContract.address)).to.be.true;
      expect(await feeCollector.isWhitelisted(marketContract.address)).to.be.true;
    });
  });

  describe("Share Fee Deposits", function () {
    beforeEach(async function () {
      await feeCollector.addDepositor(shareContract.address);
      await usdc.connect(shareContract).approve(await feeCollector.getAddress(), toUsdc(10000));
    });

    it("Should allow whitelisted contract to deposit share fees", async function () {
      const amount = toUsdc(100);

      await expect(feeCollector.connect(shareContract).depositShareFees(amount))
        .to.emit(feeCollector, "FeesDeposited");

      expect(await feeCollector.totalShareFees()).to.equal(amount);
      expect(await feeCollector.getShareFees()).to.equal(amount);
      expect(await feeCollector.getBalance()).to.equal(amount);
    });

    it("Should revert when non-whitelisted contract tries to deposit", async function () {
      await expect(
        feeCollector.connect(user).depositShareFees(toUsdc(100))
      ).to.be.revertedWithCustomError(feeCollector, "NotWhitelisted");
    });

    it("Should revert when depositing zero amount", async function () {
      await expect(
        feeCollector.connect(shareContract).depositShareFees(0)
      ).to.be.revertedWithCustomError(feeCollector, "AmountCannotBeZero");
    });

    it("Should accumulate multiple share fee deposits", async function () {
      await feeCollector.connect(shareContract).depositShareFees(toUsdc(100));
      await feeCollector.connect(shareContract).depositShareFees(toUsdc(50));
      await feeCollector.connect(shareContract).depositShareFees(toUsdc(25));

      expect(await feeCollector.totalShareFees()).to.equal(toUsdc(175));
    });

    it("Should transfer USDC from depositor to collector", async function () {
      const amount = toUsdc(100);
      const initialBalance = await usdc.balanceOf(shareContract.address);

      await feeCollector.connect(shareContract).depositShareFees(amount);

      expect(await usdc.balanceOf(shareContract.address)).to.equal(initialBalance - amount);
      expect(await usdc.balanceOf(await feeCollector.getAddress())).to.equal(amount);
    });
  });

  describe("Market Fee Deposits", function () {
    beforeEach(async function () {
      await feeCollector.addDepositor(marketContract.address);
      await usdc.connect(marketContract).approve(await feeCollector.getAddress(), toUsdc(10000));
    });

    it("Should allow whitelisted contract to deposit market fees", async function () {
      const amount = toUsdc(200);

      await expect(feeCollector.connect(marketContract).depositMarketFees(amount))
        .to.emit(feeCollector, "FeesDeposited");

      expect(await feeCollector.totalMarketFees()).to.equal(amount);
      expect(await feeCollector.getMarketFees()).to.equal(amount);
      expect(await feeCollector.getBalance()).to.equal(amount);
    });

    it("Should revert when non-whitelisted contract tries to deposit", async function () {
      await expect(
        feeCollector.connect(user).depositMarketFees(toUsdc(100))
      ).to.be.revertedWithCustomError(feeCollector, "NotWhitelisted");
    });

    it("Should revert when depositing zero amount", async function () {
      await expect(
        feeCollector.connect(marketContract).depositMarketFees(0)
      ).to.be.revertedWithCustomError(feeCollector, "AmountCannotBeZero");
    });

    it("Should accumulate multiple market fee deposits", async function () {
      await feeCollector.connect(marketContract).depositMarketFees(toUsdc(200));
      await feeCollector.connect(marketContract).depositMarketFees(toUsdc(150));
      await feeCollector.connect(marketContract).depositMarketFees(toUsdc(50));

      expect(await feeCollector.totalMarketFees()).to.equal(toUsdc(400));
    });

    it("Should transfer USDC from depositor to collector", async function () {
      const amount = toUsdc(200);
      const initialBalance = await usdc.balanceOf(marketContract.address);

      await feeCollector.connect(marketContract).depositMarketFees(amount);

      expect(await usdc.balanceOf(marketContract.address)).to.equal(initialBalance - amount);
      expect(await usdc.balanceOf(await feeCollector.getAddress())).to.equal(amount);
    });
  });

  describe("Mixed Fee Deposits", function () {
    beforeEach(async function () {
      await feeCollector.addDepositor(shareContract.address);
      await feeCollector.addDepositor(marketContract.address);
      await usdc.connect(shareContract).approve(await feeCollector.getAddress(), toUsdc(10000));
      await usdc.connect(marketContract).approve(await feeCollector.getAddress(), toUsdc(10000));
    });

    it("Should track share and market fees separately", async function () {
      await feeCollector.connect(shareContract).depositShareFees(toUsdc(100));
      await feeCollector.connect(marketContract).depositMarketFees(toUsdc(200));

      expect(await feeCollector.totalShareFees()).to.equal(toUsdc(100));
      expect(await feeCollector.totalMarketFees()).to.equal(toUsdc(200));
      expect(await feeCollector.getTotalFees()).to.equal(toUsdc(300));
    });

    it("Should handle multiple deposits from both sources", async function () {
      await feeCollector.connect(shareContract).depositShareFees(toUsdc(50));
      await feeCollector.connect(marketContract).depositMarketFees(toUsdc(100));
      await feeCollector.connect(shareContract).depositShareFees(toUsdc(75));
      await feeCollector.connect(marketContract).depositMarketFees(toUsdc(150));

      expect(await feeCollector.totalShareFees()).to.equal(toUsdc(125));
      expect(await feeCollector.totalMarketFees()).to.equal(toUsdc(250));
      expect(await feeCollector.getTotalFees()).to.equal(toUsdc(375));
    });
  });

  describe("Withdrawals", function () {
    beforeEach(async function () {
      await feeCollector.addDepositor(shareContract.address);
      await feeCollector.addDepositor(marketContract.address);
      await usdc.connect(shareContract).approve(await feeCollector.getAddress(), toUsdc(10000));
      await usdc.connect(marketContract).approve(await feeCollector.getAddress(), toUsdc(10000));

      // Deposit some fees
      await feeCollector.connect(shareContract).depositShareFees(toUsdc(500));
      await feeCollector.connect(marketContract).depositMarketFees(toUsdc(300));
    });

    it("Should allow owner to withdraw fees", async function () {
      const amount = toUsdc(200);

      await expect(feeCollector.withdraw(treasury.address, amount))
        .to.emit(feeCollector, "FeesWithdrawn");

      expect(await usdc.balanceOf(treasury.address)).to.equal(amount);
    });

    it("Should update balance after withdrawal", async function () {
      const initialBalance = await feeCollector.getBalance();
      const withdrawAmount = toUsdc(200);

      await feeCollector.withdraw(treasury.address, withdrawAmount);

      expect(await feeCollector.getBalance()).to.equal(initialBalance - withdrawAmount);
    });

    it("Should allow withdrawing entire balance", async function () {
      const totalBalance = await feeCollector.getBalance();

      await feeCollector.withdraw(treasury.address, totalBalance);

      expect(await feeCollector.getBalance()).to.equal(0);
      expect(await usdc.balanceOf(treasury.address)).to.equal(totalBalance);
    });

    it("Should revert when non-owner tries to withdraw", async function () {
      await expect(
        feeCollector.connect(user).withdraw(treasury.address, toUsdc(100))
      ).to.be.revertedWithCustomError(feeCollector, "OwnableUnauthorizedAccount");
    });

    it("Should revert when withdrawing to zero address", async function () {
      await expect(
        feeCollector.withdraw(ethers.ZeroAddress, toUsdc(100))
      ).to.be.revertedWithCustomError(feeCollector, "InvalidAddress");
    });

    it("Should revert when withdrawing zero amount", async function () {
      await expect(
        feeCollector.withdraw(treasury.address, 0)
      ).to.be.revertedWithCustomError(feeCollector, "AmountCannotBeZero");
    });

    it("Should revert when withdrawing more than balance", async function () {
      const balance = await feeCollector.getBalance();

      await expect(
        feeCollector.withdraw(treasury.address, balance + toUsdc(1))
      ).to.be.revertedWithCustomError(feeCollector, "InsufficientBalance");
    });

    it("Should allow multiple withdrawals", async function () {
      await feeCollector.withdraw(treasury.address, toUsdc(100));
      await feeCollector.withdraw(treasury.address, toUsdc(50));
      await feeCollector.withdraw(treasury.address, toUsdc(75));

      expect(await usdc.balanceOf(treasury.address)).to.equal(toUsdc(225));
    });

    it("Should not affect fee tracking on withdrawal", async function () {
      const shareFeesBeforeWithdraw = await feeCollector.totalShareFees();
      const marketFeesBeforeWithdraw = await feeCollector.totalMarketFees();

      await feeCollector.withdraw(treasury.address, toUsdc(200));

      expect(await feeCollector.totalShareFees()).to.equal(shareFeesBeforeWithdraw);
      expect(await feeCollector.totalMarketFees()).to.equal(marketFeesBeforeWithdraw);
    });
  });

  describe("View Functions", function () {
    beforeEach(async function () {
      await feeCollector.addDepositor(shareContract.address);
      await feeCollector.addDepositor(marketContract.address);
      await usdc.connect(shareContract).approve(await feeCollector.getAddress(), toUsdc(10000));
      await usdc.connect(marketContract).approve(await feeCollector.getAddress(), toUsdc(10000));
    });

    it("Should return correct total fees", async function () {
      await feeCollector.connect(shareContract).depositShareFees(toUsdc(300));
      await feeCollector.connect(marketContract).depositMarketFees(toUsdc(450));

      expect(await feeCollector.getTotalFees()).to.equal(toUsdc(750));
    });

    it("Should return correct share fees", async function () {
      await feeCollector.connect(shareContract).depositShareFees(toUsdc(200));
      await feeCollector.connect(shareContract).depositShareFees(toUsdc(100));

      expect(await feeCollector.getShareFees()).to.equal(toUsdc(300));
    });

    it("Should return correct market fees", async function () {
      await feeCollector.connect(marketContract).depositMarketFees(toUsdc(400));
      await feeCollector.connect(marketContract).depositMarketFees(toUsdc(100));

      expect(await feeCollector.getMarketFees()).to.equal(toUsdc(500));
    });

    it("Should return correct balance", async function () {
      await feeCollector.connect(shareContract).depositShareFees(toUsdc(250));
      await feeCollector.connect(marketContract).depositMarketFees(toUsdc(150));

      expect(await feeCollector.getBalance()).to.equal(toUsdc(400));
    });

    it("Should return correct whitelist status", async function () {
      expect(await feeCollector.isWhitelisted(shareContract.address)).to.be.true;
      expect(await feeCollector.isWhitelisted(user.address)).to.be.false;

      await feeCollector.removeDepositor(shareContract.address);
      expect(await feeCollector.isWhitelisted(shareContract.address)).to.be.false;
    });
  });

  describe("Complex Scenarios", function () {
    beforeEach(async function () {
      await feeCollector.addDepositor(shareContract.address);
      await feeCollector.addDepositor(marketContract.address);
      await usdc.connect(shareContract).approve(await feeCollector.getAddress(), toUsdc(10000));
      await usdc.connect(marketContract).approve(await feeCollector.getAddress(), toUsdc(10000));
    });

    it("Should handle deposit-withdraw-deposit cycle", async function () {
      // Deposit
      await feeCollector.connect(shareContract).depositShareFees(toUsdc(500));
      expect(await feeCollector.getBalance()).to.equal(toUsdc(500));

      // Withdraw
      await feeCollector.withdraw(treasury.address, toUsdc(300));
      expect(await feeCollector.getBalance()).to.equal(toUsdc(200));

      // Deposit again
      await feeCollector.connect(marketContract).depositMarketFees(toUsdc(400));
      expect(await feeCollector.getBalance()).to.equal(toUsdc(600));

      // Verify fee tracking
      expect(await feeCollector.totalShareFees()).to.equal(toUsdc(500));
      expect(await feeCollector.totalMarketFees()).to.equal(toUsdc(400));
    });

    it("Should handle depositor removal mid-operation", async function () {
      await feeCollector.connect(shareContract).depositShareFees(toUsdc(100));

      await feeCollector.removeDepositor(shareContract.address);

      await expect(
        feeCollector.connect(shareContract).depositShareFees(toUsdc(50))
      ).to.be.revertedWithCustomError(feeCollector, "NotWhitelisted");

      // Previous deposits should still be tracked
      expect(await feeCollector.totalShareFees()).to.equal(toUsdc(100));
    });

    it("Should handle large fee volumes", async function () {
      const largeAmount = toUsdc(1000000); // 1M USDC

      // Mint enough USDC
      await usdc.mint(shareContract.address, largeAmount);
      await usdc.connect(shareContract).approve(await feeCollector.getAddress(), largeAmount);

      await feeCollector.connect(shareContract).depositShareFees(largeAmount);

      expect(await feeCollector.totalShareFees()).to.equal(largeAmount);
      expect(await feeCollector.getBalance()).to.equal(largeAmount);
    });

    it("Should maintain accuracy across many deposits", async function () {
      let expectedShareFees = BigInt(0);
      let expectedMarketFees = BigInt(0);

      for (let i = 0; i < 10; i++) {
        const shareAmount = toUsdc(10 + i);
        const marketAmount = toUsdc(20 + i);

        await feeCollector.connect(shareContract).depositShareFees(shareAmount);
        await feeCollector.connect(marketContract).depositMarketFees(marketAmount);

        expectedShareFees += shareAmount;
        expectedMarketFees += marketAmount;
      }

      expect(await feeCollector.totalShareFees()).to.equal(expectedShareFees);
      expect(await feeCollector.totalMarketFees()).to.equal(expectedMarketFees);
      expect(await feeCollector.getTotalFees()).to.equal(expectedShareFees + expectedMarketFees);
    });
  });

  describe("Edge Cases", function () {
    it("Should handle zero balance withdrawals correctly", async function () {
      expect(await feeCollector.getBalance()).to.equal(0);

      await expect(
        feeCollector.withdraw(treasury.address, toUsdc(1))
      ).to.be.revertedWithCustomError(feeCollector, "InsufficientBalance");
    });

    it("Should allow re-adding removed depositor", async function () {
      await feeCollector.addDepositor(shareContract.address);
      await feeCollector.removeDepositor(shareContract.address);
      await feeCollector.addDepositor(shareContract.address);

      expect(await feeCollector.isWhitelisted(shareContract.address)).to.be.true;
    });

    it("Should handle approval edge case", async function () {
      await feeCollector.addDepositor(shareContract.address);

      // Approve less than deposit amount
      await usdc.connect(shareContract).approve(await feeCollector.getAddress(), toUsdc(50));

      await expect(
        feeCollector.connect(shareContract).depositShareFees(toUsdc(100))
      ).to.be.revertedWithCustomError(usdc, "ERC20InsufficientAllowance");
    });
  });
});
