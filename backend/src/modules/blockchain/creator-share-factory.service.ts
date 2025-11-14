import { Injectable, Logger } from '@nestjs/common';
import { ethers } from 'ethers';
import { BlockchainService } from './blockchain.service';
import * as CreatorShareFactoryABI from '../../contracts/abis/CreatorShareFactory.json';

export interface CreateSharesResult {
  shareContractAddress: string;
  transactionHash: string;
  blockNumber: number;
}

export interface VolumeUpdateResult {
  newTotalVolume: bigint;
  sharesUnlocked: boolean;
  transactionHash: string;
}

@Injectable()
export class CreatorShareFactoryService {
  private readonly logger = new Logger(CreatorShareFactoryService.name);
  private contract: ethers.Contract;

  constructor(private readonly blockchainService: BlockchainService) {
    const contractAddress = this.blockchainService.getContractAddress('creatorShareFactory');
    const wallet = this.blockchainService.getWallet();

    this.contract = new ethers.Contract(
      contractAddress,
      CreatorShareFactoryABI.abi,
      wallet,
    );

    this.logger.log(`CreatorShareFactory service initialized at ${contractAddress}`);
  }

  /**
   * Create creator shares for a new creator
   */
  async createCreatorShares(
    creatorAddress: string,
    name: string,
    symbol: string,
  ): Promise<CreateSharesResult> {
    try {
      this.logger.log(`Creating shares for creator ${creatorAddress}: ${name} (${symbol})`);

      // Check if creator can create shares
      const [canCreate, reason] = await this.canCreateShares(creatorAddress);
      if (!canCreate) {
        throw new Error(`Cannot create shares: ${reason}`);
      }

      // Send transaction
      const tx = await this.contract.createCreatorShares(creatorAddress, name, symbol);
      this.logger.log(`Transaction sent: ${tx.hash}`);

      // Wait for confirmation
      const receipt = await tx.wait();

      // Parse SharesCreated event to get share contract address
      const event = receipt.logs
        .map((log: any) => {
          try {
            return this.contract.interface.parseLog(log);
          } catch {
            return null;
          }
        })
        .find((log: any) => log && log.name === 'SharesCreated');

      if (!event) {
        throw new Error('SharesCreated event not found in transaction receipt');
      }

      const shareContractAddress = event.args.shareContract;

      this.logger.log(`Shares created successfully. Contract: ${shareContractAddress}`);

      return {
        shareContractAddress,
        transactionHash: receipt.hash,
        blockNumber: receipt.blockNumber,
      };
    } catch (error) {
      this.logger.error(`Failed to create shares for ${creatorAddress}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Update creator's market volume (called by whitelisted market contracts)
   */
  async updateCreatorVolume(
    creatorAddress: string,
    additionalVolume: bigint,
  ): Promise<VolumeUpdateResult> {
    try {
      this.logger.log(`Updating volume for creator ${creatorAddress}: +${additionalVolume}`);

      const tx = await this.contract.updateCreatorVolume(creatorAddress, additionalVolume);
      const receipt = await tx.wait();

      // Check current volume and unlock status
      const newTotalVolume = await this.getCreatorVolume(creatorAddress);
      const sharesUnlocked = await this.isSharesUnlocked(creatorAddress);

      this.logger.log(`Volume updated. New total: ${newTotalVolume}, Unlocked: ${sharesUnlocked}`);

      return {
        newTotalVolume,
        sharesUnlocked,
        transactionHash: receipt.hash,
      };
    } catch (error) {
      this.logger.error(`Failed to update volume for ${creatorAddress}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get creator's share contract address
   */
  async getCreatorShareContract(creatorAddress: string): Promise<string | null> {
    try {
      const shareContract = await this.contract.getCreatorShareContract(creatorAddress);
      return shareContract === ethers.ZeroAddress ? null : shareContract;
    } catch (error) {
      this.logger.error(`Failed to get share contract for ${creatorAddress}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get creator's total market volume
   */
  async getCreatorVolume(creatorAddress: string): Promise<bigint> {
    try {
      return await this.contract.getCreatorVolume(creatorAddress);
    } catch (error) {
      this.logger.error(`Failed to get volume for ${creatorAddress}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get remaining volume needed to unlock shares
   */
  async getRemainingVolumeToUnlock(creatorAddress: string): Promise<bigint> {
    try {
      return await this.contract.getRemainingVolumeToUnlock(creatorAddress);
    } catch (error) {
      this.logger.error(`Failed to get remaining volume for ${creatorAddress}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Check if creator's shares are unlocked
   */
  async isSharesUnlocked(creatorAddress: string): Promise<boolean> {
    try {
      return await this.contract.isSharesUnlocked(creatorAddress);
    } catch (error) {
      this.logger.error(`Failed to check unlock status for ${creatorAddress}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Check if creator can create shares
   */
  async canCreateShares(creatorAddress: string): Promise<[boolean, string]> {
    try {
      const result = await this.contract.canCreateShares(creatorAddress);
      return [result.canCreate, result.reason];
    } catch (error) {
      this.logger.error(`Failed to check if creator can create shares: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get all creator share contracts
   */
  async getAllCreatorShares(): Promise<string[]> {
    try {
      return await this.contract.getAllCreatorShares();
    } catch (error) {
      this.logger.error(`Failed to get all creator shares: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get total number of creator shares
   */
  async getTotalCreatorShares(): Promise<number> {
    try {
      const count = await this.contract.getTotalCreatorShares();
      return Number(count);
    } catch (error) {
      this.logger.error(`Failed to get total creator shares: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get the volume threshold for unlocking shares
   */
  async getVolumeThreshold(): Promise<bigint> {
    try {
      return await this.contract.VOLUME_THRESHOLD();
    } catch (error) {
      this.logger.error(`Failed to get volume threshold: ${error.message}`);
      throw error;
    }
  }

  /**
   * Listen to SharesCreated events
   */
  onSharesCreated(callback: (creator: string, shareContract: string, name: string, symbol: string) => void) {
    this.contract.on('SharesCreated', (creator, shareContract, name, symbol) => {
      this.logger.log(`SharesCreated event: ${creator} -> ${shareContract}`);
      callback(creator, shareContract, name, symbol);
    });
  }

  /**
   * Listen to VolumeUpdated events
   */
  onVolumeUpdated(callback: (creator: string, additionalVolume: bigint, newTotalVolume: bigint) => void) {
    this.contract.on('VolumeUpdated', (creator, additionalVolume, newTotalVolume) => {
      this.logger.log(`VolumeUpdated event: ${creator} -> ${newTotalVolume}`);
      callback(creator, additionalVolume, newTotalVolume);
    });
  }

  /**
   * Listen to SharesUnlocked events
   */
  onSharesUnlocked(callback: (creator: string, finalVolume: bigint) => void) {
    this.contract.on('SharesUnlocked', (creator, finalVolume) => {
      this.logger.log(`SharesUnlocked event: ${creator} with volume ${finalVolume}`);
      callback(creator, finalVolume);
    });
  }

  /**
   * Remove all event listeners
   */
  removeAllListeners() {
    this.contract.removeAllListeners();
  }
}
