import { Injectable, Logger } from '@nestjs/common';
import { ethers } from 'ethers';
import { ContractsService } from './contracts.service';

export interface VolumeInfo {
  currentVolume: bigint;
  volumeFormatted: string;
  threshold: bigint;
  thresholdFormatted: string;
  remainingVolume: bigint;
  remainingFormatted: string;
  isUnlocked: boolean;
}

@Injectable()
export class CreatorShareFactoryService {
  private readonly logger = new Logger(CreatorShareFactoryService.name);

  constructor(private readonly contractsService: ContractsService) {
    this.logger.log('CreatorShareFactoryService initialized');
  }

  /**
   * Check if shares are unlocked for a creator
   * @param creatorAddress - The creator's wallet address
   * @returns True if shares are unlocked (volume threshold met)
   */
  async checkSharesUnlocked(creatorAddress: string): Promise<boolean> {
    try {
      const contract = this.contractsService.getContract('creatorShareFactory');
      return await contract.isSharesUnlocked(creatorAddress);
    } catch (error) {
      this.logger.error(`Failed to check shares unlocked for ${creatorAddress}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get creator's total market volume
   * @param creatorAddress - The creator's wallet address
   * @returns Total volume in USDC (6 decimals)
   */
  async getCreatorVolume(creatorAddress: string): Promise<bigint> {
    try {
      const contract = this.contractsService.getContract('creatorShareFactory');
      return await contract.getCreatorVolume(creatorAddress);
    } catch (error) {
      this.logger.error(`Failed to get creator volume for ${creatorAddress}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get share contract address for a creator
   * @param creatorAddress - The creator's wallet address
   * @returns Share contract address or null if not created yet
   */
  async getShareContract(creatorAddress: string): Promise<string | null> {
    try {
      const contract = this.contractsService.getContract('creatorShareFactory');
      const shareContract = await contract.getCreatorShareContract(creatorAddress);
      return shareContract === ethers.ZeroAddress ? null : shareContract;
    } catch (error) {
      this.logger.error(`Failed to get share contract for ${creatorAddress}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get detailed volume information for a creator
   * @param creatorAddress - The creator's wallet address
   * @returns Volume details including current volume, threshold, and unlock status
   */
  async getVolumeInfo(creatorAddress: string): Promise<VolumeInfo> {
    try {
      const contract = this.contractsService.getContract('creatorShareFactory');

      const [currentVolume, threshold, remainingVolume, isUnlocked] = await Promise.all([
        contract.getCreatorVolume(creatorAddress),
        contract.VOLUME_THRESHOLD(),
        contract.getRemainingVolumeToUnlock(creatorAddress),
        contract.isSharesUnlocked(creatorAddress),
      ]);

      return {
        currentVolume,
        volumeFormatted: this.contractsService.formatUSDC(currentVolume),
        threshold,
        thresholdFormatted: this.contractsService.formatUSDC(threshold),
        remainingVolume,
        remainingFormatted: this.contractsService.formatUSDC(remainingVolume),
        isUnlocked,
      };
    } catch (error) {
      this.logger.error(`Failed to get volume info for ${creatorAddress}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get remaining volume needed to unlock shares
   * @param creatorAddress - The creator's wallet address
   * @returns Remaining volume in USDC
   */
  async getRemainingVolumeToUnlock(creatorAddress: string): Promise<bigint> {
    try {
      const contract = this.contractsService.getContract('creatorShareFactory');
      return await contract.getRemainingVolumeToUnlock(creatorAddress);
    } catch (error) {
      this.logger.error(`Failed to get remaining volume for ${creatorAddress}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get the volume threshold for unlocking shares
   * @returns Volume threshold (default: 30,000 USDC)
   */
  async getVolumeThreshold(): Promise<bigint> {
    try {
      const contract = this.contractsService.getContract('creatorShareFactory');
      return await contract.VOLUME_THRESHOLD();
    } catch (error) {
      this.logger.error(`Failed to get volume threshold: ${error.message}`);
      throw error;
    }
  }

  /**
   * Check if creator can create shares
   * @param creatorAddress - The creator's wallet address
   * @returns [canCreate, reason]
   */
  async canCreateShares(creatorAddress: string): Promise<[boolean, string]> {
    try {
      const contract = this.contractsService.getContract('creatorShareFactory');
      const result = await contract.canCreateShares(creatorAddress);
      return [result.canCreate, result.reason];
    } catch (error) {
      this.logger.error(`Failed to check if creator can create shares: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get all creator share contracts
   * @returns Array of all share contract addresses
   */
  async getAllCreatorShares(): Promise<string[]> {
    try {
      const contract = this.contractsService.getContract('creatorShareFactory');
      return await contract.getAllCreatorShares();
    } catch (error) {
      this.logger.error(`Failed to get all creator shares: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get total number of creator shares created
   * @returns Total count of creator share contracts
   */
  async getTotalCreatorShares(): Promise<number> {
    try {
      const contract = this.contractsService.getContract('creatorShareFactory');
      const count = await contract.getTotalCreatorShares();
      return Number(count);
    } catch (error) {
      this.logger.error(`Failed to get total creator shares: ${error.message}`);
      throw error;
    }
  }

  /**
   * Check if a market contract is whitelisted
   * @param marketAddress - The market contract address
   * @returns True if whitelisted
   */
  async isMarketWhitelisted(marketAddress: string): Promise<boolean> {
    try {
      const contract = this.contractsService.getContract('creatorShareFactory');
      return await contract.isMarketWhitelisted(marketAddress);
    } catch (error) {
      this.logger.error(`Failed to check if market is whitelisted: ${error.message}`);
      throw error;
    }
  }

  /**
   * Listen to volume update events
   * @param callback - Function to call when volume is updated
   */
  listenToVolumeUpdates(
    callback: (creator: string, additionalVolume: bigint, newTotalVolume: bigint, timestamp: bigint) => void,
  ) {
    try {
      const contract = this.contractsService.getContract('creatorShareFactory');

      contract.on('VolumeUpdated', (creator, additionalVolume, newTotalVolume, timestamp) => {
        this.logger.log(`VolumeUpdated: ${creator} -> ${newTotalVolume} (+ ${additionalVolume})`);
        callback(creator, additionalVolume, newTotalVolume, timestamp);
      });

      this.logger.log('VolumeUpdated event listener setup');
    } catch (error) {
      this.logger.error(`Failed to setup volume update listener: ${error.message}`);
      throw error;
    }
  }

  /**
   * Listen to shares unlocked events
   * @param callback - Function to call when shares are unlocked
   */
  listenToSharesUnlocked(
    callback: (creator: string, finalVolume: bigint, timestamp: bigint) => void,
  ) {
    try {
      const contract = this.contractsService.getContract('creatorShareFactory');

      contract.on('SharesUnlocked', (creator, finalVolume, timestamp) => {
        this.logger.log(`SharesUnlocked: ${creator} with volume ${finalVolume}`);
        callback(creator, finalVolume, timestamp);
      });

      this.logger.log('SharesUnlocked event listener setup');
    } catch (error) {
      this.logger.error(`Failed to setup shares unlocked listener: ${error.message}`);
      throw error;
    }
  }

  /**
   * Listen to shares created events
   * @param callback - Function to call when shares are created
   */
  listenToSharesCreated(
    callback: (creator: string, shareContract: string, name: string, symbol: string, timestamp: bigint) => void,
  ) {
    try {
      const contract = this.contractsService.getContract('creatorShareFactory');

      contract.on('SharesCreated', (creator, shareContract, name, symbol, timestamp) => {
        this.logger.log(`SharesCreated: ${creator} -> ${shareContract} (${name} - ${symbol})`);
        callback(creator, shareContract, name, symbol, timestamp);
      });

      this.logger.log('SharesCreated event listener setup');
    } catch (error) {
      this.logger.error(`Failed to setup shares created listener: ${error.message}`);
      throw error;
    }
  }

  /**
   * Remove all event listeners
   */
  removeAllListeners() {
    try {
      const contract = this.contractsService.getContract('creatorShareFactory');
      contract.removeAllListeners();
      this.logger.log('All event listeners removed from CreatorShareFactory');
    } catch (error) {
      this.logger.error(`Failed to remove event listeners: ${error.message}`);
      throw error;
    }
  }
}
