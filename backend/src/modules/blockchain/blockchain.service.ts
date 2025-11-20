import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ethers } from 'ethers';
import { BlockchainConfig } from '../../config/blockchain.config';

@Injectable()
export class BlockchainService implements OnModuleInit {
  private readonly logger = new Logger(BlockchainService.name);
  private provider: ethers.JsonRpcProvider;
  private wallet: ethers.Wallet;
  private config: BlockchainConfig;

  constructor(private readonly configService: ConfigService) {
    const config = this.configService.get<BlockchainConfig>('blockchain');

    if (!config) {
      throw new Error('Blockchain configuration is missing');
    }

    this.config = config;

    // Initialize provider
    this.provider = new ethers.JsonRpcProvider(this.config.rpcUrl);

    // Initialize wallet with provider
    if (!this.config.providerPrivateKey) {
      this.logger.warn('Blockchain provider private key not configured. Write operations will fail.');
    } else {
      this.wallet = new ethers.Wallet(this.config.providerPrivateKey, this.provider);
    }
  }

  async onModuleInit() {
    try {
      // Test connection
      const network = await this.provider.getNetwork();
      this.logger.log(`Connected to blockchain network: ${network.name} (Chain ID: ${network.chainId})`);

      if (this.wallet) {
        const balance = await this.provider.getBalance(this.wallet.address);
        this.logger.log(`Wallet address: ${this.wallet.address}`);
        this.logger.log(`Wallet balance: ${ethers.formatEther(balance)} ETH`);
      }
    } catch (error) {
      this.logger.error(`Failed to connect to blockchain: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get the ethers.js provider instance
   */
  getProvider(): ethers.JsonRpcProvider {
    return this.provider;
  }

  /**
   * Get the wallet instance for signing transactions
   */
  getWallet(): ethers.Wallet {
    if (!this.wallet) {
      throw new Error('Wallet not initialized. Check BLOCKCHAIN_PROVIDER_PRIVATE_KEY configuration.');
    }
    return this.wallet;
  }

  /**
   * Get the blockchain configuration
   */
  getConfig(): BlockchainConfig {
    return this.config;
  }

  /**
   * Get contract address by name
   */
  getContractAddress(contractName: keyof BlockchainConfig['contracts']): string {
    const address = this.config.contracts[contractName];
    if (!address) {
      throw new Error(`Contract address for ${contractName} not configured`);
    }
    return address;
  }

  /**
   * Wait for transaction confirmation
   */
  async waitForTransaction(txHash: string, confirmations: number = 1): Promise<ethers.TransactionReceipt> {
    this.logger.log(`Waiting for transaction ${txHash} (${confirmations} confirmations)...`);
    const receipt = await this.provider.waitForTransaction(txHash, confirmations);

    if (!receipt) {
      throw new Error(`Transaction ${txHash} not found`);
    }

    if (receipt.status === 0) {
      throw new Error(`Transaction ${txHash} failed`);
    }

    this.logger.log(`Transaction ${txHash} confirmed in block ${receipt.blockNumber}`);
    return receipt;
  }

  /**
   * Get current gas price
   */
  async getGasPrice(): Promise<bigint> {
    const feeData = await this.provider.getFeeData();
    return feeData.gasPrice || BigInt(0);
  }

  /**
   * Estimate gas for a transaction
   */
  async estimateGas(transaction: ethers.TransactionRequest): Promise<bigint> {
    return await this.provider.estimateGas(transaction);
  }

  /**
   * Get current block number
   */
  async getBlockNumber(): Promise<number> {
    return await this.provider.getBlockNumber();
  }

  /**
   * Get block by number
   */
  async getBlock(blockNumber: number): Promise<ethers.Block> {
    const block = await this.provider.getBlock(blockNumber);
    if (!block) {
      throw new Error(`Block ${blockNumber} not found`);
    }
    return block;
  }

  /**
   * Format Wei to Ether
   */
  formatEther(wei: bigint): string {
    return ethers.formatEther(wei);
  }

  /**
   * Parse Ether to Wei
   */
  parseEther(ether: string): bigint {
    return ethers.parseEther(ether);
  }

  /**
   * Format units (for tokens with custom decimals)
   */
  formatUnits(value: bigint, decimals: number): string {
    return ethers.formatUnits(value, decimals);
  }

  /**
   * Parse units (for tokens with custom decimals)
   */
  parseUnits(value: string, decimals: number): bigint {
    return ethers.parseUnits(value, decimals);
  }
}
