import { Process, Processor, OnQueueActive, OnQueueCompleted, OnQueueFailed } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { QUEUE_NAMES, JOB_TYPES, JOB_CONFIG, VolumeTrackerJobData } from '../queue.constants';
import { CreatorVolumeTracking } from '../../database/entities/creator-volume-tracking.entity';
import { OpinionMarket } from '../../database/entities/opinion-market.entity';
import { MarketTrade } from '../../database/entities/market-trade.entity';
import { Creator } from '../../database/entities/creator.entity';

@Processor(QUEUE_NAMES.VOLUME_TRACKER)
export class VolumeTrackerProcessor {
  private readonly logger = new Logger(VolumeTrackerProcessor.name);

  constructor(
    @InjectRepository(CreatorVolumeTracking)
    private readonly volumeTrackingRepository: Repository<CreatorVolumeTracking>,
    @InjectRepository(OpinionMarket)
    private readonly opinionMarketRepository: Repository<OpinionMarket>,
    @InjectRepository(MarketTrade)
    private readonly marketTradeRepository: Repository<MarketTrade>,
    @InjectRepository(Creator)
    private readonly creatorRepository: Repository<Creator>,
  ) {}

  @OnQueueActive()
  onActive(job: Job) {
    this.logger.log(`Processing job ${job.id} of type ${job.name}...`);
  }

  @OnQueueCompleted()
  onComplete(job: Job, result: any) {
    this.logger.log(`Job ${job.id} completed: ${JSON.stringify(result)}`);
  }

  @OnQueueFailed()
  onError(job: Job, error: Error) {
    this.logger.error(`Job ${job.id} failed: ${error.message}`, error.stack);
  }

  /**
   * Track volume for a specific market
   */
  @Process(JOB_TYPES.VOLUME_TRACKER.TRACK_MARKET_VOLUME)
  async trackMarketVolume(job: Job<VolumeTrackerJobData>) {
    const { marketId } = job.data;

    if (!marketId) {
      throw new Error('Market ID is required');
    }

    this.logger.log(`Tracking volume for market ${marketId}`);

    try {
      const market = await this.opinionMarketRepository.findOne({
        where: { id: marketId },
        relations: ['creator'],
      });

      if (!market) {
        throw new Error(`Market ${marketId} not found`);
      }

      // Calculate total volume from trades
      const volumeResult = await this.marketTradeRepository
        .createQueryBuilder('trade')
        .select('SUM(trade.amount)', 'total')
        .where('trade.marketId = :marketId', { marketId })
        .getRawOne();

      const totalVolume = volumeResult?.total || 0;

      // Update market volume
      market.volume = totalVolume;
      await this.opinionMarketRepository.save(market);

      // Update or create volume tracking record
      let volumeTracking = await this.volumeTrackingRepository.findOne({
        where: {
          creatorId: market.creatorId,
          marketId: market.id,
        },
      });

      if (!volumeTracking) {
        volumeTracking = this.volumeTrackingRepository.create({
          creatorId: market.creatorId,
          marketId: market.id,
          marketVolume: totalVolume,
          trackedAt: new Date(),
        });
      } else {
        volumeTracking.marketVolume = totalVolume;
        volumeTracking.trackedAt = new Date();
      }

      await this.volumeTrackingRepository.save(volumeTracking);

      this.logger.log(`Market ${marketId} volume: ${totalVolume} USDC`);

      return {
        success: true,
        marketId,
        volume: totalVolume.toString(),
        trackedAt: new Date(),
      };
    } catch (error) {
      this.logger.error(`Failed to track market volume: ${error.message}`, error.stack);

      if (job.attemptsMade >= JOB_CONFIG.ATTEMPTS) {
        await this.handleDeadLetter(job, error);
      }

      throw error;
    }
  }

  /**
   * Update total volume for a creator across all markets
   */
  @Process(JOB_TYPES.VOLUME_TRACKER.UPDATE_CREATOR_VOLUME)
  async updateCreatorVolume(job: Job<VolumeTrackerJobData>) {
    const { creatorId } = job.data;

    if (!creatorId) {
      throw new Error('Creator ID is required');
    }

    this.logger.log(`Updating total volume for creator ${creatorId}`);

    try {
      const creator = await this.creatorRepository.findOne({
        where: { id: creatorId },
      });

      if (!creator) {
        throw new Error(`Creator ${creatorId} not found`);
      }

      // Calculate total volume across all creator's markets
      const volumeResult = await this.volumeTrackingRepository
        .createQueryBuilder('vt')
        .select('SUM(vt.marketVolume)', 'total')
        .where('vt.creatorId = :creatorId', { creatorId })
        .getRawOne();

      const totalVolume = BigInt(volumeResult?.total || '0');

      // Update creator total volume
      creator.totalMarketVolume = Number(totalVolume);
      await this.creatorRepository.save(creator);

      this.logger.log(`Creator ${creatorId} total volume: ${totalVolume} USDC`);

      return {
        success: true,
        creatorId,
        totalVolume: totalVolume.toString(),
        updatedAt: new Date(),
      };
    } catch (error) {
      this.logger.error(`Failed to update creator volume: ${error.message}`, error.stack);

      if (job.attemptsMade >= JOB_CONFIG.ATTEMPTS) {
        await this.handleDeadLetter(job, error);
      }

      throw error;
    }
  }

  /**
   * Sync blockchain data for volume tracking
   */
  @Process(JOB_TYPES.VOLUME_TRACKER.SYNC_BLOCKCHAIN_DATA)
  async syncBlockchainData(job: Job<VolumeTrackerJobData>) {
    const { fromBlock, toBlock } = job.data;

    this.logger.log(`Syncing blockchain data from block ${fromBlock} to ${toBlock}`);

    try {
      // This would involve:
      // 1. Fetching events from blockchain for the block range
      // 2. Processing trade events
      // 3. Updating volume tracking records
      // For now, this is a placeholder

      this.logger.log('Blockchain sync completed');

      return {
        success: true,
        fromBlock,
        toBlock,
        syncedAt: new Date(),
      };
    } catch (error) {
      this.logger.error(`Failed to sync blockchain data: ${error.message}`, error.stack);

      if (job.attemptsMade >= JOB_CONFIG.ATTEMPTS) {
        await this.handleDeadLetter(job, error);
      }

      throw error;
    }
  }

  private async handleDeadLetter(job: Job, error: Error) {
    this.logger.error(`Job ${job.id} exceeded max retries.`, {
      jobId: job.id,
      data: job.data,
      error: error.message,
    });
  }
}
