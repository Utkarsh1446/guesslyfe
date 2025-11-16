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
import { QUEUE_NAMES, JOB_TYPES } from './queue.constants';
import { CreatorStatus } from '../database/enums';

@Injectable()
export class ScheduledTasksService {
  private readonly logger = new Logger(ScheduledTasksService.name);
  private readonly EXECUTION_TIMEOUT_MS = 10 * 60 * 1000; // 10 minutes
  private readonly SHARE_FEE_BPS = 250; // 2.5%
  private readonly MARKET_FEE_BPS = 15; // 0.15%
  private readonly FEE_PRECISION = 10000;

  constructor(
    @InjectRepository(Creator)
    private readonly creatorRepository: Repository<Creator>,
    @InjectRepository(DividendEpoch)
    private readonly dividendEpochRepository: Repository<DividendEpoch>,
    @InjectRepository(ShareTransaction)
    private readonly shareTransactionRepository: Repository<ShareTransaction>,
    @InjectRepository(MarketTrade)
    private readonly marketTradeRepository: Repository<MarketTrade>,
    @InjectQueue(QUEUE_NAMES.EPOCH_FINALIZER)
    private readonly epochQueue: Queue,
    @InjectQueue(QUEUE_NAMES.DIVIDEND_CALCULATOR)
    private readonly dividendQueue: Queue,
    @InjectQueue(QUEUE_NAMES.NOTIFICATION)
    private readonly notificationQueue: Queue,
    private readonly dataSource: DataSource,
    private readonly schedulerRegistry: SchedulerRegistry,
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
   * Manual trigger for testing
   * Can be called via API endpoint
   */
  async triggerManualFinalization(): Promise<any> {
    this.logger.log('🔧 Manual epoch finalization triggered');
    return await this.finalizeDailyEpochs();
  }
}
