import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ethers } from 'ethers';
import { BlockchainConfig } from '../config/blockchain.config';

// Import contract ABIs
import * as CreatorShareABI from './abis/CreatorShare.json';
import * as CreatorShareFactoryABI from './abis/CreatorShareFactory.json';
import * as OpinionMarketABI from './abis/OpinionMarket.json';
import * as FeeCollectorABI from './abis/FeeCollector.json';
import * as ERC20ABI from './abis/ERC20.json';

export interface ContractInstances {
  creatorShareFactory: ethers.Contract;
  opinionMarket: ethers.Contract;
  feeCollector: ethers.Contract;
  usdc: ethers.Contract;
}

@Injectable()
export class ContractsService implements OnModuleInit {
  private readonly logger = new Logger(ContractsService.name);
  private provider: ethers.JsonRpcProvider;
  private wallet: ethers.Wallet;
  private config: BlockchainConfig;
  private contracts: ContractInstances;

  constructor(private readonly configService: ConfigService) {
    const config = this.configService.get<BlockchainConfig>('blockchain');

    if (!config) {
      throw new Error('Blockchain configuration is missing');
    }

    this.config = config;

    this.initializeProvider();
    this.initializeWallet();
  }

  async onModuleInit() {
    await this.testConnection();
    this.initializeContracts();
    this.logger.log('Contracts service initialized successfully');
  }

  /**
   * Initialize ethers provider for Base Chain
   */
  private initializeProvider() {
    this.provider = new ethers.JsonRpcProvider(this.config.rpcUrl, {
      chainId: this.config.chainId,
      name: this.config.network,
    });
    this.logger.log(`Provider initialized for ${this.config.network} (Chain ID: ${this.config.chainId})`);
  }

  /**
   * Initialize wallet for signing transactions
   */
  private initializeWallet() {
    if (!this.config.providerPrivateKey) {
      this.logger.warn('Provider private key not configured. Write operations will not be available.');
      return;
    }

    try {
      this.wallet = new ethers.Wallet(this.config.providerPrivateKey, this.provider);
      this.logger.log(`Wallet initialized: ${this.wallet.address}`);
    } catch (error) {
      this.logger.error(`Failed to initialize wallet: ${error.message}`);
      throw error;
    }
  }

  /**
   * Test blockchain connection
   */
  private async testConnection() {
    try {
      const network = await this.provider.getNetwork();
      const blockNumber = await this.provider.getBlockNumber();
      this.logger.log(`Connected to ${network.name} (Chain ID: ${network.chainId})`);
      this.logger.log(`Current block number: ${blockNumber}`);

      if (this.wallet) {
        const balance = await this.provider.getBalance(this.wallet.address);
        this.logger.log(`Wallet balance: ${ethers.formatEther(balance)} ETH`);
      }
    } catch (error) {
      this.logger.error(`Connection test failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Load contract ABIs and create contract instances
   */
  private initializeContracts() {
    try {
      const signer = this.wallet || this.provider;

      this.contracts = {
        creatorShareFactory: new ethers.Contract(
          this.config.contracts.creatorShareFactory,
          CreatorShareFactoryABI.abi,
          signer,
        ),
        opinionMarket: new ethers.Contract(
          this.config.contracts.opinionMarket,
          OpinionMarketABI.abi,
          signer,
        ),
        feeCollector: new ethers.Contract(
          this.config.contracts.feeCollector,
          FeeCollectorABI.abi,
          signer,
        ),
        usdc: new ethers.Contract(
          this.config.contracts.usdc,
          ERC20ABI.abi,
          signer,
        ),
      };

      this.logger.log('Contract instances created successfully');
      this.logger.log(`CreatorShareFactory: ${this.config.contracts.creatorShareFactory}`);
      this.logger.log(`OpinionMarket: ${this.config.contracts.opinionMarket}`);
      this.logger.log(`FeeCollector: ${this.config.contracts.feeCollector}`);
      this.logger.log(`USDC: ${this.config.contracts.usdc}`);
    } catch (error) {
      this.logger.error(`Failed to initialize contracts: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get ethers provider
   */
  getProvider(): ethers.JsonRpcProvider {
    return this.provider;
  }

  /**
   * Get wallet for signing transactions
   */
  getWallet(): ethers.Wallet {
    if (!this.wallet) {
      throw new Error('Wallet not initialized. Check BLOCKCHAIN_PROVIDER_PRIVATE_KEY configuration.');
    }
    return this.wallet;
  }

  /**
   * Get all contract instances
   */
  getContracts(): ContractInstances {
    return this.contracts;
  }

  /**
   * Get specific contract instance
   */
  getContract(name: keyof ContractInstances): ethers.Contract {
    return this.contracts[name];
  }

  /**
   * Create a CreatorShare contract instance for a specific creator
   */
  getCreatorShareContract(shareContractAddress: string): ethers.Contract {
    const signer = this.wallet || this.provider;
    return new ethers.Contract(shareContractAddress, CreatorShareABI.abi, signer);
  }

  /**
   * Get blockchain configuration
   */
  getConfig(): BlockchainConfig {
    return this.config;
  }

  /**
   * Helper: Format token amount from Wei to human-readable (18 decimals)
   */
  formatToken(amount: bigint): string {
    return ethers.formatEther(amount);
  }

  /**
   * Helper: Parse token amount from human-readable to Wei (18 decimals)
   */
  parseToken(amount: string): bigint {
    return ethers.parseEther(amount);
  }

  /**
   * Helper: Format USDC amount (6 decimals)
   */
  formatUSDC(amount: bigint): string {
    return ethers.formatUnits(amount, 6);
  }

  /**
   * Helper: Parse USDC amount (6 decimals)
   */
  parseUSDC(amount: string): bigint {
    return ethers.parseUnits(amount, 6);
  }

  /**
   * Helper: Check if address is valid
   */
  isValidAddress(address: string): boolean {
    return ethers.isAddress(address);
  }

  /**
   * Helper: Get checksummed address
   */
  getChecksumAddress(address: string): string {
    return ethers.getAddress(address);
  }

  /**
   * Helper: Get current block number
   */
  async getBlockNumber(): Promise<number> {
    return await this.provider.getBlockNumber();
  }

  /**
   * Helper: Get block by number
   */
  async getBlock(blockNumber: number): Promise<ethers.Block> {
    const block = await this.provider.getBlock(blockNumber);
    if (!block) {
      throw new Error(`Block ${blockNumber} not found`);
    }
    return block;
  }

  /**
   * Helper: Get transaction by hash
   */
  async getTransaction(txHash: string): Promise<ethers.TransactionResponse> {
    const tx = await this.provider.getTransaction(txHash);
    if (!tx) {
      throw new Error(`Transaction ${txHash} not found`);
    }
    return tx;
  }

  /**
   * Helper: Get current network gas price
   */
  async getGasPrice(): Promise<bigint> {
    const feeData = await this.provider.getFeeData();
    return feeData.gasPrice || BigInt(0);
  }

  /**
   * Helper: Convert hex string to number
   */
  hexToNumber(hex: string): number {
    return parseInt(hex, 16);
  }

  /**
   * Helper: Convert number to hex string
   */
  numberToHex(num: number): string {
    return '0x' + num.toString(16);
  }
}
