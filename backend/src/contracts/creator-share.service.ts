import { Injectable, Logger } from '@nestjs/common';
import { ethers } from 'ethers';
import { ContractsService } from './contracts.service';

export interface SharePrice {
  priceInUSDC: bigint;
  priceFormatted: string;
}

export interface ShareEvent {
  buyer?: string;
  seller?: string;
  amount: bigint;
  cost: bigint;
  newSupply: bigint;
  blockNumber: number;
  transactionHash: string;
  timestamp: number;
}

@Injectable()
export class CreatorShareService {
  private readonly logger = new Logger(CreatorShareService.name);

  constructor(private readonly contractsService: ContractsService) {
    this.logger.log('CreatorShareService initialized');
  }

  /**
   * Get the buy price for a given amount of shares
   * @param creatorAddress - The creator's wallet address
   * @param amount - Amount of shares to buy
   * @returns Price in USDC (6 decimals)
   */
  async getBuyPrice(creatorAddress: string, amount: bigint): Promise<SharePrice> {
    try {
      const shareContract = await this.getShareContractForCreator(creatorAddress);

      if (!shareContract) {
        throw new Error(`No share contract found for creator ${creatorAddress}`);
      }

      const contract = this.contractsService.getCreatorShareContract(shareContract);
      const priceInUSDC = await contract.getBuyPrice(amount);

      return {
        priceInUSDC,
        priceFormatted: this.contractsService.formatUSDC(priceInUSDC),
      };
    } catch (error) {
      this.logger.error(`Failed to get buy price for ${creatorAddress}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get the sell price for a given amount of shares
   * @param creatorAddress - The creator's wallet address
   * @param amount - Amount of shares to sell
   * @returns Price in USDC (6 decimals)
   */
  async getSellPrice(creatorAddress: string, amount: bigint): Promise<SharePrice> {
    try {
      const shareContract = await this.getShareContractForCreator(creatorAddress);

      if (!shareContract) {
        throw new Error(`No share contract found for creator ${creatorAddress}`);
      }

      const contract = this.contractsService.getCreatorShareContract(shareContract);
      const priceInUSDC = await contract.getSellPrice(amount);

      return {
        priceInUSDC,
        priceFormatted: this.contractsService.formatUSDC(priceInUSDC),
      };
    } catch (error) {
      this.logger.error(`Failed to get sell price for ${creatorAddress}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get the current supply of shares for a creator
   * @param creatorAddress - The creator's wallet address
   * @returns Current total supply of shares
   */
  async getCurrentSupply(creatorAddress: string): Promise<bigint> {
    try {
      const shareContract = await this.getShareContractForCreator(creatorAddress);

      if (!shareContract) {
        throw new Error(`No share contract found for creator ${creatorAddress}`);
      }

      const contract = this.contractsService.getCreatorShareContract(shareContract);
      return await contract.totalSupply();
    } catch (error) {
      this.logger.error(`Failed to get current supply for ${creatorAddress}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get the balance of shares for a specific holder
   * @param creatorAddress - The creator's wallet address
   * @param holder - The holder's wallet address
   * @returns Balance of shares held by the holder
   */
  async getShareholderBalance(creatorAddress: string, holder: string): Promise<bigint> {
    try {
      const shareContract = await this.getShareContractForCreator(creatorAddress);

      if (!shareContract) {
        throw new Error(`No share contract found for creator ${creatorAddress}`);
      }

      const contract = this.contractsService.getCreatorShareContract(shareContract);
      return await contract.balanceOf(holder);
    } catch (error) {
      this.logger.error(`Failed to get balance for holder ${holder} of ${creatorAddress}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get share contract address for a creator
   * @param creatorAddress - The creator's wallet address
   * @returns Share contract address or null if not found
   */
  async getShareContractForCreator(creatorAddress: string): Promise<string | null> {
    try {
      const factoryContract = this.contractsService.getContract('creatorShareFactory');
      const shareContract = await factoryContract.getCreatorShareContract(creatorAddress);

      return shareContract === ethers.ZeroAddress ? null : shareContract;
    } catch (error) {
      this.logger.error(`Failed to get share contract for ${creatorAddress}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get share token details
   * @param shareContractAddress - The share contract address
   * @returns Token name, symbol, decimals
   */
  async getShareTokenDetails(shareContractAddress: string): Promise<{
    name: string;
    symbol: string;
    decimals: number;
    totalSupply: bigint;
  }> {
    try {
      const contract = this.contractsService.getCreatorShareContract(shareContractAddress);

      const [name, symbol, decimals, totalSupply] = await Promise.all([
        contract.name(),
        contract.symbol(),
        contract.decimals(),
        contract.totalSupply(),
      ]);

      return {
        name,
        symbol,
        decimals: Number(decimals),
        totalSupply,
      };
    } catch (error) {
      this.logger.error(`Failed to get token details for ${shareContractAddress}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get maximum supply allowed for shares
   * @param shareContractAddress - The share contract address
   * @returns Maximum supply (usually 1000)
   */
  async getMaxSupply(shareContractAddress: string): Promise<bigint> {
    try {
      const contract = this.contractsService.getCreatorShareContract(shareContractAddress);
      return await contract.MAX_SUPPLY();
    } catch (error) {
      this.logger.error(`Failed to get max supply for ${shareContractAddress}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get accumulated fees available for withdrawal
   * @param shareContractAddress - The share contract address
   * @returns Fee amount in USDC
   */
  async getAccumulatedFees(shareContractAddress: string): Promise<bigint> {
    try {
      const contract = this.contractsService.getCreatorShareContract(shareContractAddress);
      return await contract.accumulatedFees();
    } catch (error) {
      this.logger.error(`Failed to get accumulated fees for ${shareContractAddress}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Setup event listeners for share events
   * @param shareContractAddress - The share contract address
   * @param callbacks - Callback functions for different events
   */
  listenToShareEvents(
    shareContractAddress: string,
    callbacks: {
      onSharesPurchased?: (event: ShareEvent) => void;
      onSharesSold?: (event: ShareEvent) => void;
      onDividendClaimed?: (user: string, amount: bigint, epochId: bigint) => void;
      onFeesWithdrawn?: (recipient: string, amount: bigint) => void;
    },
  ) {
    try {
      const contract = this.contractsService.getCreatorShareContract(shareContractAddress);

      // Listen to SharesPurchased events
      if (callbacks.onSharesPurchased) {
        contract.on('SharesPurchased', async (buyer, amount, cost, timestamp, event) => {
          this.logger.log(`SharesPurchased: ${buyer} bought ${amount} shares for ${cost} USDC`);

          const totalSupply = await contract.totalSupply();

          callbacks.onSharesPurchased?.({
            buyer,
            amount,
            cost,
            newSupply: totalSupply,
            blockNumber: event.log.blockNumber,
            transactionHash: event.log.transactionHash,
            timestamp: Number(timestamp),
          });
        });
      }

      // Listen to SharesSold events
      if (callbacks.onSharesSold) {
        contract.on('SharesSold', async (seller, amount, payout, timestamp, event) => {
          this.logger.log(`SharesSold: ${seller} sold ${amount} shares for ${payout} USDC`);

          const totalSupply = await contract.totalSupply();

          callbacks.onSharesSold?.({
            seller,
            amount,
            cost: payout,
            newSupply: totalSupply,
            blockNumber: event.log.blockNumber,
            transactionHash: event.log.transactionHash,
            timestamp: Number(timestamp),
          });
        });
      }

      // Listen to DividendsClaimed events
      if (callbacks.onDividendClaimed) {
        contract.on('DividendsClaimed', (user, amount, epochId, timestamp) => {
          this.logger.log(`DividendsClaimed: ${user} claimed ${amount} for epoch ${epochId}`);
          callbacks.onDividendClaimed?.(user, amount, epochId);
        });
      }

      // Listen to FeesWithdrawn events
      if (callbacks.onFeesWithdrawn) {
        contract.on('FeesWithdrawn', (recipient, amount) => {
          this.logger.log(`FeesWithdrawn: ${recipient} withdrew ${amount}`);
          callbacks.onFeesWithdrawn?.(recipient, amount);
        });
      }

      this.logger.log(`Event listeners setup for share contract ${shareContractAddress}`);
    } catch (error) {
      this.logger.error(`Failed to setup event listeners for ${shareContractAddress}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Remove all event listeners for a share contract
   * @param shareContractAddress - The share contract address
   */
  removeEventListeners(shareContractAddress: string) {
    try {
      const contract = this.contractsService.getCreatorShareContract(shareContractAddress);
      contract.removeAllListeners();
      this.logger.log(`Event listeners removed for ${shareContractAddress}`);
    } catch (error) {
      this.logger.error(`Failed to remove event listeners for ${shareContractAddress}: ${error.message}`);
      throw error;
    }
  }
}
