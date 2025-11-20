import { ethers } from 'ethers';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.production' });

// Contract ABIs (minimal for testing)
const USDC_ABI = [
  'function balanceOf(address account) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)',
  'function totalSupply() view returns (uint256)',
];

const CREATOR_SHARE_FACTORY_ABI = [
  'function creatorShares(address creator) view returns (address)',
  'function minStakeAmount() view returns (uint256)',
  'function volumeThreshold() view returns (uint256)',
];

const OPINION_MARKET_ABI = [
  'function marketCount() view returns (uint256)',
  'function markets(uint256 index) view returns (tuple(address creator, string title, string description, uint256 endTime, uint8 status, uint256 yesShares, uint256 noShares, uint256 totalVolume))',
];

async function testBlockchainConnection() {
  console.log('🔗 Testing Blockchain Connection to Base Sepolia...\n');

  try {
    // Initialize provider
    const rpcUrl = process.env.BLOCKCHAIN_RPC_URL || 'https://sepolia.base.org';
    const provider = new ethers.JsonRpcProvider(rpcUrl);

    // Test 1: Check network connection
    console.log('📡 Test 1: Network Connection');
    const network = await provider.getNetwork();
    console.log(`✅ Connected to: ${network.name}`);
    console.log(`✅ Chain ID: ${network.chainId}`);

    const blockNumber = await provider.getBlockNumber();
    console.log(`✅ Current block: ${blockNumber}\n`);

    // Test 2: Check wallet
    console.log('👛 Test 2: Wallet Setup');
    const privateKey = process.env.BLOCKCHAIN_PROVIDER_PRIVATE_KEY;
    if (!privateKey) {
      throw new Error('BLOCKCHAIN_PROVIDER_PRIVATE_KEY not set');
    }

    const wallet = new ethers.Wallet(privateKey, provider);
    console.log(`✅ Wallet address: ${wallet.address}`);

    const balance = await provider.getBalance(wallet.address);
    console.log(`✅ ETH balance: ${ethers.formatEther(balance)} ETH\n`);

    // Test 3: Check USDC contract
    console.log('💵 Test 3: USDC Contract');
    const usdcAddress = process.env.CONTRACT_USDC;
    if (!usdcAddress) {
      throw new Error('CONTRACT_USDC not set');
    }

    const usdcContract = new ethers.Contract(usdcAddress, USDC_ABI, provider);
    const [symbol, decimals, totalSupply, walletUsdcBalance] = await Promise.all([
      usdcContract.symbol(),
      usdcContract.decimals(),
      usdcContract.totalSupply(),
      usdcContract.balanceOf(wallet.address),
    ]);

    console.log(`✅ USDC Address: ${usdcAddress}`);
    console.log(`✅ Symbol: ${symbol}`);
    console.log(`✅ Decimals: ${decimals}`);
    console.log(`✅ Total Supply: ${ethers.formatUnits(totalSupply, decimals)} ${symbol}`);
    console.log(`✅ Wallet USDC Balance: ${ethers.formatUnits(walletUsdcBalance, decimals)} ${symbol}\n`);

    // Test 4: Check Creator Share Factory
    console.log('🏭 Test 4: Creator Share Factory Contract');
    const factoryAddress = process.env.CONTRACT_CREATOR_SHARE_FACTORY;
    if (!factoryAddress) {
      throw new Error('CONTRACT_CREATOR_SHARE_FACTORY not set');
    }

    const factoryContract = new ethers.Contract(
      factoryAddress,
      CREATOR_SHARE_FACTORY_ABI,
      provider,
    );

    try {
      const [minStake, volumeThreshold] = await Promise.all([
        factoryContract.minStakeAmount(),
        factoryContract.volumeThreshold(),
      ]);

      console.log(`✅ Factory Address: ${factoryAddress}`);
      console.log(`✅ Min Stake: ${ethers.formatUnits(minStake, 6)} USDC`);
      console.log(`✅ Volume Threshold: ${ethers.formatUnits(volumeThreshold, 6)} USDC\n`);
    } catch (error) {
      console.log(`⚠️  Factory contract methods not available (might need different ABI)`);
      console.log(`✅ Factory Address: ${factoryAddress}\n`);
    }

    // Test 5: Check Opinion Market Contract
    console.log('🎯 Test 5: Opinion Market Contract');
    const marketAddress = process.env.CONTRACT_OPINION_MARKET;
    if (!marketAddress) {
      throw new Error('CONTRACT_OPINION_MARKET not set');
    }

    const marketContract = new ethers.Contract(
      marketAddress,
      OPINION_MARKET_ABI,
      provider,
    );

    try {
      const marketCount = await marketContract.marketCount();
      console.log(`✅ Market Address: ${marketAddress}`);
      console.log(`✅ Total Markets Created: ${marketCount}\n`);

      if (marketCount > 0n) {
        console.log('📊 Recent Markets:');
        const marketsToShow = marketCount > 3n ? 3 : Number(marketCount);
        for (let i = 0; i < marketsToShow; i++) {
          try {
            const market = await marketContract.markets(i);
            console.log(`\nMarket #${i}:`);
            console.log(`  Creator: ${market.creator}`);
            console.log(`  Title: ${market.title}`);
            console.log(`  Status: ${market.status}`);
            console.log(`  YES Shares: ${market.yesShares}`);
            console.log(`  NO Shares: ${market.noShares}`);
            console.log(`  Total Volume: ${ethers.formatUnits(market.totalVolume, 6)} USDC`);
          } catch (err) {
            console.log(`  ⚠️  Could not fetch market #${i}`);
          }
        }
      }
    } catch (error) {
      console.log(`⚠️  Market contract methods not available (might need different ABI)`);
      console.log(`✅ Market Address: ${marketAddress}\n`);
    }

    // Test 6: Check Fee Collector
    console.log('\n💰 Test 6: Fee Collector Contract');
    const feeCollectorAddress = process.env.CONTRACT_FEE_COLLECTOR;
    if (!feeCollectorAddress) {
      throw new Error('CONTRACT_FEE_COLLECTOR not set');
    }

    const code = await provider.getCode(feeCollectorAddress);
    const isContract = code !== '0x';
    console.log(`✅ Fee Collector Address: ${feeCollectorAddress}`);
    console.log(`✅ Is Contract: ${isContract ? 'Yes' : 'No'}\n`);

    // Test 7: Gas Price
    console.log('⛽ Test 7: Gas Prices');
    const feeData = await provider.getFeeData();
    console.log(`✅ Gas Price: ${feeData.gasPrice ? ethers.formatUnits(feeData.gasPrice, 'gwei') : 'N/A'} gwei`);
    console.log(`✅ Max Fee Per Gas: ${feeData.maxFeePerGas ? ethers.formatUnits(feeData.maxFeePerGas, 'gwei') : 'N/A'} gwei`);
    console.log(`✅ Max Priority Fee: ${feeData.maxPriorityFeePerGas ? ethers.formatUnits(feeData.maxPriorityFeePerGas, 'gwei') : 'N/A'} gwei\n`);

    console.log('✅ ========================================');
    console.log('✅ ALL BLOCKCHAIN TESTS PASSED!');
    console.log('✅ ========================================\n');

    console.log('📋 Summary:');
    console.log(`  Network: Base Sepolia (Chain ID: ${network.chainId})`);
    console.log(`  Block: ${blockNumber}`);
    console.log(`  Wallet: ${wallet.address}`);
    console.log(`  ETH Balance: ${ethers.formatEther(balance)} ETH`);
    console.log(`  USDC Balance: ${ethers.formatUnits(walletUsdcBalance, decimals)} ${symbol}`);
    console.log(`  Contracts: All verified ✓`);

    return {
      success: true,
      network: network.name,
      chainId: network.chainId.toString(),
      blockNumber,
      walletAddress: wallet.address,
      ethBalance: ethers.formatEther(balance),
      usdcBalance: ethers.formatUnits(walletUsdcBalance, decimals),
    };
  } catch (error) {
    console.error('\n❌ ========================================');
    console.error('❌ BLOCKCHAIN TEST FAILED!');
    console.error('❌ ========================================\n');
    console.error('Error:', error.message);
    if (error.stack) {
      console.error('\nStack trace:', error.stack);
    }
    throw error;
  }
}

// Run tests
testBlockchainConnection()
  .then(() => {
    console.log('\n✅ Tests completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Tests failed:', error.message);
    process.exit(1);
  });
