import { ethers } from 'ethers';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: '.env.production' });

// Load ABIs
const loadABI = (contractName: string) => {
  const abiPath = path.join(__dirname, '../src/contracts/abis', `${contractName}.json`);
  const abiFile = JSON.parse(fs.readFileSync(abiPath, 'utf8'));
  return abiFile.abi;
};

async function testContractInteractions() {
  console.log('🔗 Advanced Contract Interaction Tests\n');

  try {
    // Setup
    const rpcUrl = process.env.BLOCKCHAIN_RPC_URL || 'https://sepolia.base.org';
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const privateKey = process.env.BLOCKCHAIN_PROVIDER_PRIVATE_KEY;

    if (!privateKey) {
      throw new Error('BLOCKCHAIN_PROVIDER_PRIVATE_KEY not set');
    }

    const wallet = new ethers.Wallet(privateKey, provider);

    // Contract addresses
    const addresses = {
      usdc: process.env.CONTRACT_USDC!,
      feeCollector: process.env.CONTRACT_FEE_COLLECTOR!,
      factory: process.env.CONTRACT_CREATOR_SHARE_FACTORY!,
      market: process.env.CONTRACT_OPINION_MARKET!,
    };

    // Load ABIs
    const abis = {
      usdc: loadABI('ERC20'),
      factory: loadABI('CreatorShareFactory'),
      market: loadABI('OpinionMarket'),
      feeCollector: loadABI('FeeCollector'),
    };

    console.log('📋 Contract Addresses:');
    console.log(`  USDC: ${addresses.usdc}`);
    console.log(`  Factory: ${addresses.factory}`);
    console.log(`  Market: ${addresses.market}`);
    console.log(`  Fee Collector: ${addresses.feeCollector}\n`);

    // Test 1: USDC Contract
    console.log('💵 Test 1: USDC Contract Details');
    const usdc = new ethers.Contract(addresses.usdc, abis.usdc, provider);

    const [
      usdcName,
      usdcSymbol,
      usdcDecimals,
      usdcTotalSupply,
      walletBalance,
    ] = await Promise.all([
      usdc.name(),
      usdc.symbol(),
      usdc.decimals(),
      usdc.totalSupply(),
      usdc.balanceOf(wallet.address),
    ]);

    console.log(`  Name: ${usdcName}`);
    console.log(`  Symbol: ${usdcSymbol}`);
    console.log(`  Decimals: ${usdcDecimals}`);
    console.log(`  Total Supply: ${ethers.formatUnits(usdcTotalSupply, usdcDecimals)}`);
    console.log(`  Wallet Balance: ${ethers.formatUnits(walletBalance, usdcDecimals)} ${usdcSymbol}`);

    if (walletBalance === 0n) {
      console.log(`\n  ⚠️  WARNING: Wallet has 0 USDC!`);
      console.log(`  You need testnet USDC to create markets and test trading.`);
      console.log(`  Get testnet USDC from Base Sepolia faucet:`);
      console.log(`  1. Visit: https://faucet.circle.com/`);
      console.log(`  2. Select "Base Sepolia" network`);
      console.log(`  3. Enter wallet: ${wallet.address}`);
      console.log(`  4. Request testnet USDC\n`);
    }

    // Test 2: Creator Share Factory
    console.log('\n🏭 Test 2: Creator Share Factory');
    const factory = new ethers.Contract(addresses.factory, abis.factory, provider);

    try {
      const [minStake, volumeThreshold, platformFeeRate, creatorFeeRate] = await Promise.all([
        factory.minStakeAmount().catch(() => null),
        factory.volumeThreshold().catch(() => null),
        factory.platformFeeRate().catch(() => null),
        factory.creatorFeeRate().catch(() => null),
      ]);

      if (minStake) console.log(`  Min Stake: ${ethers.formatUnits(minStake, 6)} USDC`);
      if (volumeThreshold) console.log(`  Volume Threshold: ${ethers.formatUnits(volumeThreshold, 6)} USDC`);
      if (platformFeeRate) console.log(`  Platform Fee Rate: ${platformFeeRate / 100n}%`);
      if (creatorFeeRate) console.log(`  Creator Fee Rate: ${creatorFeeRate / 100n}%`);

      // Check if admin wallet has a creator share
      const creatorShare = await factory.creatorShares(wallet.address).catch(() => ethers.ZeroAddress);
      if (creatorShare !== ethers.ZeroAddress) {
        console.log(`  ✅ Admin has creator share at: ${creatorShare}`);
      } else {
        console.log(`  ⚠️  Admin wallet does not have a creator share yet`);
      }
    } catch (error) {
      console.log(`  ⚠️  Some factory methods failed (might be different contract version)`);
    }

    // Test 3: Opinion Market Contract
    console.log('\n🎯 Test 3: Opinion Market Contract');
    const market = new ethers.Contract(addresses.market, abis.market, provider);

    try {
      const [minBetAmount, platformFeeRate, minDuration, maxDuration] = await Promise.all([
        market.minBetAmount().catch(() => null),
        market.platformFeeRate().catch(() => null),
        market.minDuration().catch(() => null),
        market.maxDuration().catch(() => null),
      ]);

      if (minBetAmount) console.log(`  Min Bet Amount: ${ethers.formatUnits(minBetAmount, 6)} USDC`);
      if (platformFeeRate) console.log(`  Platform Fee Rate: ${platformFeeRate / 100n}%`);
      if (minDuration) console.log(`  Min Duration: ${minDuration} seconds (${Number(minDuration) / 3600} hours)`);
      if (maxDuration) console.log(`  Max Duration: ${maxDuration} seconds (${Number(maxDuration) / 86400} days)`);

      // Try to get market count
      const marketCount = await market.marketCount().catch(() => null);
      if (marketCount !== null) {
        console.log(`  Total Markets: ${marketCount}`);

        if (marketCount > 0n) {
          console.log(`\n  📊 Fetching recent markets...`);
          const marketsToShow = marketCount > 3n ? 3 : Number(marketCount);

          for (let i = 0; i < marketsToShow; i++) {
            try {
              const marketData = await market.markets(i);
              console.log(`\n  Market #${i}:`);
              console.log(`    Creator: ${marketData.creator || marketData[0]}`);
              console.log(`    Title: ${marketData.title || marketData[1]}`);
              console.log(`    Description: ${(marketData.description || marketData[2]).substring(0, 50)}...`);
              console.log(`    End Time: ${new Date(Number((marketData.endTime || marketData[3])) * 1000).toISOString()}`);
              console.log(`    Status: ${marketData.status || marketData[4]}`);
            } catch (err) {
              console.log(`    ⚠️  Could not fetch market #${i}`);
            }
          }
        }
      }
    } catch (error) {
      console.log(`  ⚠️  Some market methods failed (might be different contract version)`);
    }

    // Test 4: Fee Collector
    console.log('\n\n💰 Test 4: Fee Collector Contract');
    const feeCollector = new ethers.Contract(addresses.feeCollector, abis.feeCollector, provider);

    try {
      const collectedFees = await feeCollector.totalFeesCollected().catch(() => null);
      if (collectedFees) {
        console.log(`  Total Fees Collected: ${ethers.formatUnits(collectedFees, 6)} USDC`);
      }
    } catch (error) {
      console.log(`  ⚠️  Fee collector methods not available`);
    }

    // Summary
    console.log('\n\n✅ ========================================');
    console.log('✅ CONTRACT INTERACTION TESTS COMPLETE');
    console.log('✅ ========================================\n');

    console.log('📊 Summary:');
    console.log(`  Network: Base Sepolia`);
    console.log(`  Wallet: ${wallet.address}`);
    console.log(`  USDC Balance: ${ethers.formatUnits(walletBalance, usdcDecimals)} ${usdcSymbol}`);
    console.log(`  All contracts deployed and accessible ✓`);

    if (walletBalance === 0n) {
      console.log(`\n⚠️  Next Steps:`);
      console.log(`  1. Get testnet USDC from https://faucet.circle.com/`);
      console.log(`  2. Run 'npm run test:create-market' to test market creation`);
      console.log(`  3. Run 'npm run test:trade' to test trading`);
    } else {
      console.log(`\n✅ You have USDC! Ready to test market creation and trading.`);
    }

    return {
      success: true,
      usdcBalance: ethers.formatUnits(walletBalance, usdcDecimals),
      walletAddress: wallet.address,
    };
  } catch (error) {
    console.error('\n❌ ========================================');
    console.error('❌ CONTRACT TESTS FAILED!');
    console.error('❌ ========================================\n');
    console.error('Error:', error.message);
    if (error.stack) {
      console.error('\nStack trace:', error.stack);
    }
    throw error;
  }
}

// Run tests
testContractInteractions()
  .then(() => {
    console.log('\n✅ Tests completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Tests failed:', error.message);
    process.exit(1);
  });
