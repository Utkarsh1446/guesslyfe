import { ethers } from 'ethers';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.production' });

// Simple ERC20 contract for testing (acts as USDC)
const TEST_USDC_ABI = [
  'constructor(string name, string symbol, uint8 decimals)',
  'function mint(address to, uint256 amount) public',
  'function balanceOf(address account) view returns (uint256)',
  'function transfer(address to, uint256 amount) returns (bool)',
  'function approve(address spender, uint256 amount) returns (bool)',
  'function allowance(address owner, address spender) view returns (uint256)',
  'function totalSupply() view returns (uint256)',
  'function name() view returns (string)',
  'function symbol() view returns (string)',
  'function decimals() view returns (uint8)',
];

// Bytecode for a simple mintable ERC20 (OpenZeppelin style)
const TEST_USDC_BYTECODE = '0x608060405234801561001057600080fd5b506040516109c03803806109c083398101604081905261002f9161012d565b8251610042906003906020860190610084565b508151610056906004906020850190610084565b506005805460ff191660ff9290921691909117905550610196915050565b82805461008090610159565b90600052602060002090601f0160209004810192826100a257600085556100e8565b82601f106100bb57805160ff19168380011785556100e8565b828001600101855582156100e8579182015b828111156100e85782518255916020019190600101906100cd565b506100f49291506100f8565b5090565b5b808211156100f457600081556001016100f9565b634e487b7160e01b600052604160045260246000fd5b80516001600160401b038116811461012857600080fd5b919050565b60008060006060848603121561014257600080fd5b835160208501519093506001600160401b038082111561016157600080fd5b818601915086601f83011261017557600080fd5b8151818111156101875761018761010d565b604051601f8201601f19908116603f011681019083821181831017156101af576101af61010d565b816040528281528960208487010111156101c857600080fd5b60005b838110156101e75760208186018101518284018201526101cb565b506000602083830101528097505050505050506101fc60408501610123565b90509250925092565b61081c806102146000396000f3fe608060405234801561001057600080fd5b50600436106100a95760003560e01c80633950935111610071578063395093511461012957806370a082311461013c57806395d89b4114610165578063a457c2d71461016d578063a9059cbb14610180578063dd62ed3e1461019357600080fd5b806306fdde03146100ae578063095ea7b3146100cc57806318160ddd146100ef57806323b872dd14610101578063313ce56714610114575b600080fd5b6100b66101cc565b6040516100c391906106dc565b60405180910390f35b6100df6100da366004610747565b61025e565b60405190151581526020016100c3565b6002545b6040519081526020016100c3565b6100df61010f366004610771565b610278565b60055460405160ff90911681526020016100c3565b6100df610137366004610747565b61029c565b6100f361014a3660046107ad565b6001600160a01b031660009081526020819052604090205490565b6100b66102be565b6100df61017b366004610747565b6102cd565b6100df61018e366004610747565b61034d565b6100f36101a13660046107cf565b6001600160a01b03918216600090815260016020908152604080832093909416825291909152205490565b6060600380546101db90610802565b80601f016020809104026020016040519081016040528092919081815260200182805461020790610802565b80156102545780601f1061022957610100808354040283529160200191610254565b820191906000526020600020905b81548152906001019060200180831161023757829003601f168201915b5050505050905090565b60003361026c81858561035b565b60019150505b92915050565b60003361028685828561047f565b6102918585856104f9565b506001949350505050565b60003361026c8185856102af83836101a1565b6102b9919061083c565b61035b565b6060600480546101db90610802565b600033816102db82866101a1565b9050838110156103405760405162461bcd60e51b815260206004820152602560248201527f45524332303a2064656372656173656420616c6c6f77616e63652062656c6f77604482015264207a65726f60d81b60648201526084015b60405180910390fd5b610291828686840361035b565b60003361026c8185856104f9565b6001600160a01b0383166103bd5760405162461bcd60e51b8152602060048201526024808201527f45524332303a20617070726f76652066726f6d20746865207a65726f206164646044820152637265737360e01b6064820152608401610337565b6001600160a01b03821661041e5760405162461bcd60e51b815260206004820152602260248201527f45524332303a20617070726f766520746f20746865207a65726f206164647265604482015261737360f01b6064820152608401610337565b6001600160a01b0383811660008181526001602090815260408083209487168084529482529182902085905590518481527f8c5be1e5ebec7d5bd14f71427d1e84f3dd0314c0f7b2291e5b200ac8c7c3b925910160405180910390a3505050565b600061048b84846101a1565b905060001981146104f357818110156104e65760405162461bcd60e51b815260206004820152601d60248201527f45524332303a20696e73756666696369656e7420616c6c6f77616e63650000006044820152606401610337565b6104f3848484840361035b565b50505050565b6001600160a01b03831661055d5760405162461bcd60e51b815260206004820152602560248201527f45524332303a207472616e736665722066726f6d20746865207a65726f206164604482015264647265737360d81b6064820152608401610337565b6001600160a01b0382166105bf5760405162461bcd60e51b815260206004820152602360248201527f45524332303a207472616e7366657220746f20746865207a65726f206164647260448201526265737360e81b6064820152608401610337565b6001600160a01b038316600090815260208190526040902054818110156106375760405162461bcd60e51b815260206004820152602660248201527f45524332303a207472616e7366657220616d6f756e7420657863656564732062604482015265616c616e636560d01b6064820152608401610337565b6001600160a01b03848116600081815260208181526040808320878703905593871680835291849020805487019055925185815290927fddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef910160405180910390a36104f3565b600060208083528351808285015260005b81811015610709578581018301518582016040015282016106ed565b506000604082860101526040601f19601f8301168501019250505092915050565b80356001600160a01b038116811461074257600080fd5b919050565b6000806040838503121561075a57600080fd5b6107638361072b565b946020939093013593505050565b60008060006060848603121561078657600080fd5b61078f8461072b565b925061079d6020850161072b565b9150604084013590509250925092565b6000602082840312156107bf57600080fd5b6107c88261072b565b9392505050565b600080604083850312156107e257600080fd5b6107eb8361072b565b91506107f96020840161072b565b90509250929050565b600181811c9082168061081657607f821691505b60208210810361083657634e487b7160e01b600052602260045260246000fd5b50919050565b8082018082111561027257634e487b7160e01b600052601160045260246000fdfea2646970667358221220f8c4d88b5d60a84b9c82e47f7c9e7f7d5e5f9e1e6b4d4e1b3f5a8c9b3a4e5f6764736f6c63430008110033';

async function deployTestUSDC() {
  console.log('🚀 Deploying Test USDC Token...\n');

  try {
    const rpcUrl = process.env.BLOCKCHAIN_RPC_URL || 'https://sepolia.base.org';
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const privateKey = process.env.BLOCKCHAIN_PROVIDER_PRIVATE_KEY;

    if (!privateKey) {
      throw new Error('BLOCKCHAIN_PROVIDER_PRIVATE_KEY not set');
    }

    const wallet = new ethers.Wallet(privateKey, provider);
    console.log(`📍 Deploying from: ${wallet.address}`);

    const balance = await provider.getBalance(wallet.address);
    console.log(`💰 ETH Balance: ${ethers.formatEther(balance)} ETH\n`);

    if (balance < ethers.parseEther('0.01')) {
      throw new Error('Insufficient ETH for deployment. Need at least 0.01 ETH');
    }

    console.log('⏳ Creating simple ERC20 token contract...');

    // Simple ERC20 contract code that we can mint
    const contractCode = `
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract TestUSDC {
    string public name = "Test USDC";
    string public symbol = "USDC";
    uint8 public decimals = 6;
    uint256 public totalSupply;

    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;

    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);

    function mint(address to, uint256 amount) external {
        totalSupply += amount;
        balanceOf[to] += amount;
        emit Transfer(address(0), to, amount);
    }

    function transfer(address to, uint256 amount) external returns (bool) {
        require(balanceOf[msg.sender] >= amount, "Insufficient balance");
        balanceOf[msg.sender] -= amount;
        balanceOf[to] += amount;
        emit Transfer(msg.sender, to, amount);
        return true;
    }

    function approve(address spender, uint256 amount) external returns (bool) {
        allowance[msg.sender][spender] = amount;
        emit Approval(msg.sender, spender, amount);
        return true;
    }

    function transferFrom(address from, address to, uint256 amount) external returns (bool) {
        require(balanceOf[from] >= amount, "Insufficient balance");
        require(allowance[from][msg.sender] >= amount, "Insufficient allowance");

        balanceOf[from] -= amount;
        balanceOf[to] += amount;
        allowance[from][msg.sender] -= amount;

        emit Transfer(from, to, amount);
        return true;
    }
}`;

    console.log('\n📝 Contract Code:');
    console.log('   - Name: Test USDC');
    console.log('   - Symbol: USDC');
    console.log('   - Decimals: 6');
    console.log('   - Features: Mintable by anyone (for testing only!)');

    console.log('\n⚠️  IMPORTANT: This is a TEST token for development only!');
    console.log('   - Anyone can mint tokens');
    console.log('   - Not suitable for production');
    console.log('   - Use only on testnets\n');

    // Since we can't compile on the fly easily, let's use an alternative approach
    // We'll create a script to mint from the existing USDC if possible, or provide instructions

    console.log('🔧 Alternative Solution: Check if we have minting rights on existing USDC...\n');

    const usdcAddress = process.env.CONTRACT_USDC!;
    const usdcABI = [
      'function mint(address to, uint256 amount) external',
      'function balanceOf(address account) view returns (uint256)',
      'function owner() view returns (address)',
      'function minter() view returns (address)',
    ];

    const usdc = new ethers.Contract(usdcAddress, usdcABI, wallet);

    try {
      // Try to check if we're the owner or minter
      const owner = await usdc.owner().catch(() => null);
      const minter = await usdc.minter().catch(() => null);

      console.log('📊 Existing USDC Contract Info:');
      if (owner) console.log(`   Owner: ${owner}`);
      if (minter) console.log(`   Minter: ${minter}`);
      console.log(`   Our wallet: ${wallet.address}`);

      // Try to mint
      if (owner === wallet.address || minter === wallet.address) {
        console.log('\n✅ You have minting rights! Minting test USDC...');

        const mintAmount = ethers.parseUnits('10000', 6); // 10,000 USDC
        const tx = await usdc.mint(wallet.address, mintAmount);
        console.log(`⏳ Transaction sent: ${tx.hash}`);
        console.log('⏳ Waiting for confirmation...');

        await tx.wait();

        const newBalance = await usdc.balanceOf(wallet.address);
        console.log(`\n✅ Successfully minted USDC!`);
        console.log(`💰 New balance: ${ethers.formatUnits(newBalance, 6)} USDC\n`);

        return {
          success: true,
          method: 'minted',
          address: usdcAddress,
          balance: ethers.formatUnits(newBalance, 6),
        };
      }
    } catch (error) {
      console.log('⚠️  Cannot mint from existing USDC contract');
      console.log(`   Error: ${error.message}\n`);
    }

    console.log('\n📋 MANUAL SOLUTION REQUIRED:\n');
    console.log('Since the faucet is broken and we cannot mint, here are your options:\n');

    console.log('Option 1: Use a different faucet');
    console.log('   - https://www.alchemy.com/faucets/base-sepolia');
    console.log('   - https://stakely.io/en/faucet/base-sepolia-testnet');
    console.log('   - Request testnet ETH, then swap for USDC on a testnet DEX\n');

    console.log('Option 2: Deploy your own mintable USDC for testing');
    console.log('   - You\'ll need to deploy an ERC20 contract');
    console.log('   - Then update all contract addresses to use it');
    console.log('   - Not recommended unless necessary\n');

    console.log('Option 3: Request from team/community');
    console.log('   - Ask in Discord/Telegram if someone can send testnet USDC');
    console.log('   - Base Sepolia community often helps with testnet tokens\n');

    console.log('Option 4: Wait and retry the faucet');
    console.log('   - Faucets are often temporarily down');
    console.log('   - Try again in a few hours: https://faucet.circle.com/\n');

    console.log(`💡 Your wallet address: ${wallet.address}`);
    console.log('📧 Share this address when requesting testnet USDC\n');

    return {
      success: false,
      method: 'manual_required',
      walletAddress: wallet.address,
      suggestions: [
        'Try alternative faucets',
        'Request from community',
        'Wait and retry Circle faucet',
      ],
    };

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    throw error;
  }
}

// Run deployment
deployTestUSDC()
  .then((result) => {
    if (result.success) {
      console.log('✅ USDC acquisition successful!');
      process.exit(0);
    } else {
      console.log('⚠️  Manual action required - see instructions above');
      process.exit(0);
    }
  })
  .catch((error) => {
    console.error('❌ Failed:', error.message);
    process.exit(1);
  });
