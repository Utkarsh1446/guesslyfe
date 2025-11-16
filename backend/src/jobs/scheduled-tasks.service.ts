import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression, SchedulerRegistry } from '@nestjs/schedule';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, LessThanOrEqual } from 'typeorm';
import { Creator } from '../database/entities/creator.entity';
import { DividendEpoch } from '../database/entities/dividend-epoch.entity';
import { ShareTransaction } from '../database/entities/share-transaction.entity';
import { MarketTrade } from '../database/entities/market-trade.entity';
import { OpinionMarket } from '../database/entities/opinion-market.entity';
import { QUEUE_NAMES, JOB_TYPES } from './queue.constants';
import { CreatorStatus } from '../database/enums';
import { CreatorShareFactoryService } from '../contracts/creator-share-factory.service';

@Injectable()
export class ScheduledTasksService {
  private readonly logger = new Logger(ScheduledTasksService.name);
  private readonly EXECUTION_TIMEOUT_MS = 10 * 60 * 1000; // 10 minutes
  private readonly SHARE_FEE_BPS = 250; // 2.5%
  private readonly MARKET_FEE_BPS = 15; // 0.15%
  private readonly FEE_PRECISION = 10000;
  private readonly VOLUME_THRESHOLD = 30000; // $30,000 USDC

  constructor(
    @InjectRepository(Creator)
    private readonly creatorRepository: Repository<Creator>,
    @InjectRepository(DividendEpoch)
    private readonly dividendEpochRepository: Repository<DividendEpoch>,
    @InjectRepository(ShareTransaction)
    private readonly shareTransactionRepository: Repository<ShareTransaction>,
    @InjectRepository(MarketTrade)
    private readonly marketTradeRepository: Repository<MarketTrade>,
    @InjectRepository(OpinionMarket)
    private readonly opinionMarketRepository: Repository<OpinionMarket>,
    @InjectQueue(QUEUE_NAMES.EPOCH_FINALIZER)
    private readonly epochQueue: Queue,
    @InjectQueue(QUEUE_NAMES.DIVIDEND_CALCULATOR)
    private readonly dividendQueue: Queue,
    @InjectQueue(QUEUE_NAMES.NOTIFICATION)
    private readonly notificationQueue: Queue,
    @InjectQueue(QUEUE_NAMES.VOLUME_TRACKER)
    private readonly volumeTrackerQueue: Queue,
    private readonly dataSource: DataSource,
    private readonly schedulerRegistry: SchedulerRegistry,
    private readonly creatorShareFactoryService: CreatorShareFactoryService,
  ) {}

  /**
   * Daily Epoch Finalization Job
   * Runs every day at midnight UTC
   * Cron: '0 0 * * *' (minute hour day month dayOfWeek)
   */
  @Cron('0 0 * * *', {
    name: 'finalize-daily-epochs',
    timeZone: 'UTC',
  })
  async finalizeDailyEpochs() {
    const startTime = Date.now();
    const jobName = 'Daily Epoch Finalization';

    this.logger.log(`========================================`);
    this.logger.log(`Starting ${jobName} at ${new Date().toISOString()}`);
    this.logger.log(`========================================`);

    try {
      // Set timeout monitor
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => {
          reject(new Error(`${jobName} exceeded ${this.EXECUTION_TIMEOUT_MS / 1000}s timeout`));
        }, this.EXECUTION_TIMEOUT_MS);
      });

      // Run finalization with timeout
      await Promise.race([
        this.executeEpochFinalization(),
        timeoutPromise,
      ]);

      const executionTime = Date.now() - startTime;
      this.logger.log(`${jobName} completed successfully in ${executionTime}ms`);

      // Alert if execution took too long (>5 minutes warning threshold)
      if (executionTime > 5 * 60 * 1000) {
        this.logger.warn(`⚠️  ${jobName} took ${executionTime}ms - consider optimization`);
        await this.sendAlert({
          type: 'warning',
          message: `${jobName} took ${executionTime}ms`,
          threshold: '5 minutes',
        });
      }

    } catch (error) {
      const executionTime = Date.now() - startTime;
      this.logger.error(
        `❌ ${jobName} FAILED after ${executionTime}ms: ${error.message}`,
        error.stack,
      );

      // Send critical alert
      await this.sendAlert({
        type: 'critical',
        message: `${jobName} failed: ${error.message}`,
        stack: error.stack,
        executionTime,
      });

      // Re-throw to mark job as failed
      throw error;
    }
  }

  /**
   * Execute the complete epoch finalization workflow
   */
  private async executeEpochFinalization(): Promise<void> {
    // Step 1: Find all creators with active shares
    const creatorsWithShares = await this.creatorRepository.find({
      where: {
        sharesUnlocked: true,
        status: CreatorStatus.APPROVED,
      },
      relations: ['user'],
    });

    this.logger.log(`Found ${creatorsWithShares.length} creators with active shares`);

    if (creatorsWithShares.length === 0) {
      this.logger.log('No creators to process. Exiting.');
      return;
    }

    const results = {
      total: creatorsWithShares.length,
      finalized: 0,
      failed: 0,
      skipped: 0,
      errors: [] as any[],
    };

    // Step 2: Process each creator
    for (const creator of creatorsWithShares) {
      try {
        await this.finalizeCreatorEpoch(creator);
        results.finalized++;
      } catch (error) {
        results.failed++;
        results.errors.push({
          creatorId: creator.id,
          handle: creator.twitterHandle,
          error: error.message,
        });
        this.logger.error(
          `Failed to finalize epoch for creator ${creator.twitterHandle}: ${error.message}`,
        );
      }
    }

    // Log summary
    this.logger.log(`========================================`);
    this.logger.log(`Epoch Finalization Summary:`);
    this.logger.log(`  Total Creators: ${results.total}`);
    this.logger.log(`  ✅ Finalized: ${results.finalized}`);
    this.logger.log(`  ❌ Failed: ${results.failed}`);
    this.logger.log(`  ⏭️  Skipped: ${results.skipped}`);
    if (results.failed > 0) {
      this.logger.error(`  Errors:`, JSON.stringify(results.errors, null, 2));
    }
    this.logger.log(`========================================`);
  }

  /**
   * Finalize epoch for a single creator
   */
  private async finalizeCreatorEpoch(creator: Creator): Promise<void> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      this.logger.log(`Processing creator: ${creator.twitterHandle} (${creator.id})`);

      // Get current epoch (if exists)
      const currentEpoch = await queryRunner.manager.findOne(DividendEpoch, {
        where: {
          creatorId: creator.id,
          distributed: false,
        },
        order: {
          epochNumber: 'DESC',
        },
      });

      if (!currentEpoch) {
        // No current epoch - create the first one
        const newEpoch = await this.createNewEpoch(creator, 1, queryRunner);
        await queryRunner.commitTransaction();
        this.logger.log(`Created initial epoch for creator ${creator.twitterHandle}`);
        return;
      }

      // Check if current epoch has ended
      const now = new Date();
      if (currentEpoch.endTime > now) {
        this.logger.log(`Epoch ${currentEpoch.epochNumber} for ${creator.twitterHandle} has not ended yet`);
        await queryRunner.rollbackTransaction();
        return;
      }

      this.logger.log(`Finalizing epoch ${currentEpoch.epochNumber} for ${creator.twitterHandle}`);

      // Calculate fees collected during this epoch
      const fees = await this.calculateEpochFees(
        creator.id,
        currentEpoch.startTime,
        currentEpoch.endTime,
        queryRunner,
      );

      // Update epoch with collected fees
      currentEpoch.shareFeesCollected = fees.shareFees;
      currentEpoch.marketFeesCollected = fees.marketFees;
      currentEpoch.totalFees = fees.shareFees + fees.marketFees;

      // TODO: Call contract's finalizeEpoch() when contract method is available
      // For now, mark as distributed without blockchain call
      currentEpoch.distributed = true;
      currentEpoch.distributedAt = new Date();

      await queryRunner.manager.save(DividendEpoch, currentEpoch);

      // Create next epoch
      const nextEpoch = await this.createNewEpoch(
        creator,
        currentEpoch.epochNumber + 1,
        queryRunner,
      );

      // Commit transaction
      await queryRunner.commitTransaction();

      this.logger.log(
        `✅ Finalized epoch ${currentEpoch.epochNumber} for ${creator.twitterHandle} ` +
        `(Total Fees: ${currentEpoch.totalFees.toFixed(6)} USDC)`
      );

      // Queue dividend calculation job (after commit)
      await this.epochQueue.add(
        JOB_TYPES.EPOCH_FINALIZER.FINALIZE_EPOCH,
        {
          creatorId: creator.id,
          epochNumber: currentEpoch.epochNumber,
        },
        {
          priority: 1,
          delay: 1000, // Small delay to ensure DB is consistent
        },
      );

      // Queue dividend distribution calculation
      if (currentEpoch.totalFees > 0) {
        await this.dividendQueue.add(
          JOB_TYPES.DIVIDEND_CALCULATOR.CALCULATE_DIVIDENDS,
          {
            epochId: currentEpoch.id,
            creatorId: creator.id,
          },
          {
            priority: 1,
            delay: 2000,
          },
        );
      }

      // Send notifications to shareholders
      await this.notifyEpochFinalized(creator, currentEpoch);

    } catch (error) {
      // Rollback on any error
      await queryRunner.rollbackTransaction();
      this.logger.error(
        `Error finalizing epoch for ${creator.twitterHandle}: ${error.message}`,
        error.stack,
      );
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Calculate fees collected during an epoch
   */
  private async calculateEpochFees(
    creatorId: string,
    startTime: Date,
    endTime: Date,
    queryRunner: any,
  ): Promise<{ shareFees: number; marketFees: number }> {
    // Calculate share trading fees (2.5% of volume)
    const shareVolume = await queryRunner.manager
      .createQueryBuilder(ShareTransaction, 'tx')
      .select('COALESCE(SUM(tx.totalAmount), 0)', 'total')
      .where('tx.creatorId = :creatorId', { creatorId })
      .andWhere('tx.timestamp >= :startTime', { startTime })
      .andWhere('tx.timestamp < :endTime', { endTime })
      .getRawOne();

    const shareFees = (Number(shareVolume?.total || 0) * this.SHARE_FEE_BPS) / this.FEE_PRECISION;

    // Calculate market trading fees (0.15% of volume)
    // Get all markets for this creator
    const marketVolume = await queryRunner.manager
      .createQueryBuilder(MarketTrade, 'trade')
      .select('COALESCE(SUM(trade.amount), 0)', 'total')
      .innerJoin('trade.opinionMarket', 'market')
      .where('market.creatorId = :creatorId', { creatorId })
      .andWhere('trade.timestamp >= :startTime', { startTime })
      .andWhere('trade.timestamp < :endTime', { endTime })
      .getRawOne();

    const marketFees = (Number(marketVolume?.total || 0) * this.MARKET_FEE_BPS) / this.FEE_PRECISION;

    this.logger.log(
      `Fees for epoch: Share Volume=${shareVolume?.total || 0} (${shareFees.toFixed(6)} USDC), ` +
      `Market Volume=${marketVolume?.total || 0} (${marketFees.toFixed(6)} USDC)`
    );

    return {
      shareFees,
      marketFees,
    };
  }

  /**
   * Create a new epoch for the next period
   */
  private async createNewEpoch(
    creator: Creator,
    epochNumber: number,
    queryRunner: any,
  ): Promise<DividendEpoch> {
    const now = new Date();
    const nextEpochEnd = new Date(now);
    nextEpochEnd.setUTCDate(nextEpochEnd.getUTCDate() + 1); // 1 day epoch
    nextEpochEnd.setUTCHours(0, 0, 0, 0); // Midnight UTC

    const newEpoch = queryRunner.manager.create(DividendEpoch, {
      creatorId: creator.id,
      epochNumber,
      startTime: now,
      endTime: nextEpochEnd,
      shareFeesCollected: 0,
      marketFeesCollected: 0,
      totalFees: 0,
      distributed: false,
    });

    await queryRunner.manager.save(DividendEpoch, newEpoch);

    this.logger.log(
      `Created epoch ${epochNumber} for ${creator.twitterHandle} ` +
      `(${now.toISOString()} -> ${nextEpochEnd.toISOString()})`
    );

    return newEpoch;
  }

  /**
   * Send notifications to shareholders about epoch finalization
   */
  private async notifyEpochFinalized(
    creator: Creator,
    epoch: DividendEpoch,
  ): Promise<void> {
    // Get all shareholders for this creator
    const shareholders = await this.getEpochShareholders(
      creator.id,
      epoch.startTime,
      epoch.endTime,
    );

    if (shareholders.length === 0) {
      return;
    }

    this.logger.log(`Sending notifications to ${shareholders.length} shareholders`);

    // Queue notification jobs
    for (const shareholder of shareholders.slice(0, 100)) { // Limit to first 100 to avoid spam
      await this.notificationQueue.add(
        JOB_TYPES.NOTIFICATION.SEND_EMAIL,
        {
          type: 'email',
          recipient: shareholder.address,
          subject: `Dividend Epoch ${epoch.epochNumber} Finalized`,
          body: `Creator ${creator.twitterHandle}'s epoch ${epoch.epochNumber} has been finalized. Total fees: ${epoch.totalFees.toFixed(6)} USDC`,
          data: {
            creatorId: creator.id,
            creatorHandle: creator.twitterHandle,
            epochNumber: epoch.epochNumber,
            totalFees: epoch.totalFees,
          },
        },
        {
          priority: 3, // Lower priority
          delay: 5000,
        },
      );
    }
  }

  /**
   * Get all shareholders during an epoch period
   */
  private async getEpochShareholders(
    creatorId: string,
    startTime: Date,
    endTime: Date,
  ): Promise<Array<{ address: string; shares: number }>> {
    const transactions = await this.shareTransactionRepository
      .createQueryBuilder('tx')
      .where('tx.creatorId = :creatorId', { creatorId })
      .andWhere('tx.timestamp <= :endTime', { endTime })
      .orderBy('tx.timestamp', 'ASC')
      .getMany();

    const holdings = new Map<string, number>();

    for (const tx of transactions) {
      if (!tx.buyer) continue;

      const currentHolding = holdings.get(tx.buyer) || 0;

      if (tx.transactionType === 'BUY') {
        holdings.set(tx.buyer, currentHolding + Number(tx.shares));
      } else if (tx.transactionType === 'SELL') {
        holdings.set(tx.buyer, Math.max(0, currentHolding - Number(tx.shares)));
      }
    }

    return Array.from(holdings.entries())
      .filter(([_, shares]) => shares > 0)
      .map(([address, shares]) => ({ address, shares }));
  }

  /**
   * Send alert for monitoring
   */
  private async sendAlert(alert: {
    type: 'warning' | 'critical';
    message: string;
    [key: string]: any;
  }): Promise<void> {
    this.logger.log(`📢 Alert: [${alert.type.toUpperCase()}] ${alert.message}`);

    // Queue alert notification
    await this.notificationQueue.add(
      JOB_TYPES.NOTIFICATION.SEND_WEBHOOK,
      {
        type: 'webhook',
        recipient: process.env.ALERT_WEBHOOK_URL || 'http://localhost:3000/alerts',
        data: {
          ...alert,
          timestamp: new Date().toISOString(),
          service: 'epoch-finalizer',
        },
      },
      {
        priority: 0, // Highest priority
        attempts: 5,
      },
    );
  }

  /**
   * Hourly Volume Tracking Job
   * Runs every hour to track creator volumes and unlock shares
   * Cron: '0 * * * *' (minute hour day month dayOfWeek)
   */
  @Cron('0 * * * *', {
    name: 'track-creator-volumes',
    timeZone: 'UTC',
  })
  async trackCreatorVolumes() {
    const startTime = Date.now();
    const jobName = 'Creator Volume Tracking';

    this.logger.log(`========================================`);
    this.logger.log(`Starting ${jobName} at ${new Date().toISOString()}`);
    this.logger.log(`========================================`);

    try {
      // Execute volume tracking
      await this.executeVolumeTracking();

      const executionTime = Date.now() - startTime;
      this.logger.log(`${jobName} completed successfully in ${executionTime}ms`);

      // Alert if execution took too long (>2 minutes warning threshold)
      if (executionTime > 2 * 60 * 1000) {
        this.logger.warn(`⚠️  ${jobName} took ${executionTime}ms - consider optimization`);
        await this.sendAlert({
          type: 'warning',
          message: `${jobName} took ${executionTime}ms`,
          threshold: '2 minutes',
        });
      }

    } catch (error) {
      const executionTime = Date.now() - startTime;
      this.logger.error(
        `❌ ${jobName} FAILED after ${executionTime}ms: ${error.message}`,
        error.stack,
      );

      // Send critical alert
      await this.sendAlert({
        type: 'critical',
        message: `${jobName} failed: ${error.message}`,
        stack: error.stack,
        executionTime,
      });

      // Re-throw to mark job as failed
      throw error;
    }
  }

  /**
   * Execute the complete volume tracking workflow
   */
  private async executeVolumeTracking(): Promise<void> {
    // Get all approved creators
    const allCreators = await this.creatorRepository.find({
      where: {
        status: CreatorStatus.APPROVED,
      },
    });

    this.logger.log(`Found ${allCreators.length} approved creators`);

    if (allCreators.length === 0) {
      this.logger.log('No creators to process. Exiting.');
      return;
    }

    const results = {
      total: allCreators.length,
      volumeUpdated: 0,
      sharesUnlocked: 0,
      failed: 0,
      skipped: 0,
      errors: [] as any[],
    };

    // Separate creators by unlock status
    const lockedCreators = allCreators.filter(c => !c.sharesUnlocked);
    const unlockedCreators = allCreators.filter(c => c.sharesUnlocked);

    this.logger.log(`  Locked creators: ${lockedCreators.length}`);
    this.logger.log(`  Unlocked creators: ${unlockedCreators.length}`);

    // Process locked creators (check for unlock)
    for (const creator of lockedCreators) {
      try {
        const unlocked = await this.processLockedCreator(creator);
        if (unlocked) {
          results.sharesUnlocked++;
        }
        results.volumeUpdated++;
      } catch (error) {
        results.failed++;
        results.errors.push({
          creatorId: creator.id,
          handle: creator.twitterHandle,
          error: error.message,
        });
        this.logger.error(
          `Failed to process locked creator ${creator.twitterHandle}: ${error.message}`,
        );
      }
    }

    // Process unlocked creators (update volume)
    for (const creator of unlockedCreators) {
      try {
        await this.processUnlockedCreator(creator);
        results.volumeUpdated++;
      } catch (error) {
        results.failed++;
        results.errors.push({
          creatorId: creator.id,
          handle: creator.twitterHandle,
          error: error.message,
        });
        this.logger.error(
          `Failed to process unlocked creator ${creator.twitterHandle}: ${error.message}`,
        );
      }
    }

    // Log summary
    this.logger.log(`========================================`);
    this.logger.log(`Volume Tracking Summary:`);
    this.logger.log(`  Total Creators: ${results.total}`);
    this.logger.log(`  📊 Volume Updated: ${results.volumeUpdated}`);
    this.logger.log(`  🔓 Shares Unlocked: ${results.sharesUnlocked}`);
    this.logger.log(`  ❌ Failed: ${results.failed}`);
    if (results.failed > 0) {
      this.logger.error(`  Errors:`, JSON.stringify(results.errors, null, 2));
    }
    this.logger.log(`========================================`);
  }

  /**
   * Process a creator whose shares are locked (check for unlock)
   */
  private async processLockedCreator(creator: Creator): Promise<boolean> {
    this.logger.log(`Processing locked creator: ${creator.twitterHandle} (${creator.id})`);

    // Calculate total volume from all markets
    const totalVolume = await this.calculateCreatorVolume(creator.id);

    // Update totalMarketVolume
    creator.totalMarketVolume = totalVolume;
    await this.creatorRepository.save(creator);

    this.logger.log(
      `Updated volume for ${creator.twitterHandle}: $${totalVolume.toFixed(2)} USDC`
    );

    // Check if threshold reached ($30,000)
    if (totalVolume >= this.VOLUME_THRESHOLD) {
      this.logger.log(
        `🎉 Volume threshold reached for ${creator.twitterHandle}! Unlocking shares...`
      );

      // Unlock shares
      await this.unlockCreatorShares(creator, totalVolume);
      return true;
    } else {
      const remaining = this.VOLUME_THRESHOLD - totalVolume;
      this.logger.log(
        `${creator.twitterHandle} needs $${remaining.toFixed(2)} more to unlock shares`
      );
      return false;
    }
  }

  /**
   * Process a creator whose shares are already unlocked (update volume)
   */
  private async processUnlockedCreator(creator: Creator): Promise<void> {
    this.logger.log(`Updating volume for unlocked creator: ${creator.twitterHandle}`);

    // Calculate total volume from all markets
    const totalVolume = await this.calculateCreatorVolume(creator.id);

    // Update totalMarketVolume
    creator.totalMarketVolume = totalVolume;
    await this.creatorRepository.save(creator);

    this.logger.log(
      `Updated volume for ${creator.twitterHandle}: $${totalVolume.toFixed(2)} USDC`
    );

    // Queue job to report volume to contract (if creator has wallet address)
    if (creator.creatorAddress) {
      await this.volumeTrackerQueue.add(
        JOB_TYPES.VOLUME_TRACKER.UPDATE_CREATOR_VOLUME,
        {
          creatorId: creator.id,
          creatorAddress: creator.creatorAddress,
          volume: totalVolume,
        },
        {
          priority: 2,
          delay: 1000,
        },
      );
    }
  }

  /**
   * Calculate total volume across all creator's markets
   */
  private async calculateCreatorVolume(creatorId: string): Promise<number> {
    const result = await this.opinionMarketRepository
      .createQueryBuilder('market')
      .select('COALESCE(SUM(market.volume), 0)', 'total')
      .where('market.creatorId = :creatorId', { creatorId })
      .getRawOne();

    return Number(result?.total || 0);
  }

  /**
   * Unlock shares for a creator when threshold is reached
   */
  private async unlockCreatorShares(creator: Creator, totalVolume: number): Promise<void> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Update creator record
      creator.sharesUnlocked = true;
      creator.sharesUnlockedAt = new Date();
      creator.totalMarketVolume = totalVolume;

      await queryRunner.manager.save(Creator, creator);

      // Verify on blockchain if creator has wallet address
      if (creator.creatorAddress) {
        try {
          const isUnlockedOnChain = await this.creatorShareFactoryService.checkSharesUnlocked(
            creator.creatorAddress
          );

          this.logger.log(
            `Blockchain verification for ${creator.twitterHandle}: ${isUnlockedOnChain ? 'UNLOCKED' : 'LOCKED'}`
          );

          if (!isUnlockedOnChain) {
            this.logger.warn(
              `⚠️  Database shows unlocked but blockchain shows locked for ${creator.twitterHandle}. ` +
              `This may be expected if contract hasn't been updated yet.`
            );

            // Send alert about sync issue
            await this.sendAlert({
              type: 'warning',
              message: `Blockchain sync mismatch for ${creator.twitterHandle}`,
              creatorId: creator.id,
              dbStatus: 'unlocked',
              blockchainStatus: 'locked',
              volume: totalVolume,
            });
          }
        } catch (error) {
          this.logger.error(
            `Failed to verify blockchain status for ${creator.twitterHandle}: ${error.message}`
          );

          // Send alert but don't fail the unlock
          await this.sendAlert({
            type: 'warning',
            message: `Failed blockchain verification for ${creator.twitterHandle}: ${error.message}`,
            creatorId: creator.id,
          });
        }
      }

      await queryRunner.commitTransaction();

      this.logger.log(
        `✅ Shares unlocked for ${creator.twitterHandle} at volume $${totalVolume.toFixed(2)} USDC`
      );

      // Send notification to creator
      await this.notifySharesUnlocked(creator, totalVolume);

      // Queue volume update job to report to contract
      if (creator.creatorAddress) {
        await this.volumeTrackerQueue.add(
          JOB_TYPES.VOLUME_TRACKER.UPDATE_CREATOR_VOLUME,
          {
            creatorId: creator.id,
            creatorAddress: creator.creatorAddress,
            volume: totalVolume,
            justUnlocked: true,
          },
          {
            priority: 1, // High priority for unlock
            delay: 2000,
          },
        );
      }

    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error(
        `Error unlocking shares for ${creator.twitterHandle}: ${error.message}`,
        error.stack,
      );
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Send notification to creator about shares being unlocked
   */
  private async notifySharesUnlocked(
    creator: Creator,
    totalVolume: number,
  ): Promise<void> {
    this.logger.log(`Sending unlock notification to ${creator.twitterHandle}`);

    // Queue notification job
    await this.notificationQueue.add(
      JOB_TYPES.NOTIFICATION.SEND_EMAIL,
      {
        type: 'email',
        recipient: creator.creatorAddress || creator.twitterHandle,
        subject: `🎉 Your Creator Shares Are Now Unlocked!`,
        body: `Congratulations! Your creator shares have been unlocked after reaching $${totalVolume.toFixed(2)} USDC in total market volume. You can now start earning dividends from trading fees!`,
        data: {
          creatorId: creator.id,
          creatorHandle: creator.twitterHandle,
          totalVolume,
          threshold: this.VOLUME_THRESHOLD,
          unlockedAt: new Date().toISOString(),
        },
      },
      {
        priority: 1, // High priority
        delay: 3000,
      },
    );
  }

  /**
   * Manual trigger for testing
   * Can be called via API endpoint
   */
  async triggerManualFinalization(): Promise<any> {
    this.logger.log('🔧 Manual epoch finalization triggered');
    return await this.finalizeDailyEpochs();
  }

  /**
   * Manual trigger for volume tracking
   * Can be called via API endpoint
   */
  async triggerManualVolumeTracking(): Promise<any> {
    this.logger.log('🔧 Manual volume tracking triggered');
    return await this.trackCreatorVolumes();
  }
}
