import { Process, Processor, OnQueueActive, OnQueueCompleted, OnQueueFailed } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { QUEUE_NAMES, JOB_TYPES, JOB_CONFIG, DividendCalculatorJobData } from '../queue.constants';
import { DividendEpoch } from '../../database/entities/dividend-epoch.entity';
import { ClaimableDividend } from '../../database/entities/claimable-dividend.entity';
import { ShareTransaction } from '../../database/entities/share-transaction.entity';
import { DividendsService } from '../../modules/dividends/dividends.service';

@Processor(QUEUE_NAMES.DIVIDEND_CALCULATOR)
export class DividendCalculatorProcessor {
  private readonly logger = new Logger(DividendCalculatorProcessor.name);

  constructor(
    @InjectRepository(DividendEpoch)
    private readonly dividendEpochRepository: Repository<DividendEpoch>,
    @InjectRepository(ClaimableDividend)
    private readonly claimableDividendRepository: Repository<ClaimableDividend>,
    @InjectRepository(ShareTransaction)
    private readonly shareTransactionRepository: Repository<ShareTransaction>,
    private readonly dividendsService: DividendsService,
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
   * Calculate dividends for all shareholders of an epoch
   */
  @Process(JOB_TYPES.DIVIDEND_CALCULATOR.CALCULATE_DIVIDENDS)
  async calculateDividends(job: Job<DividendCalculatorJobData>) {
    const { epochId, creatorId } = job.data;

    this.logger.log(`Calculating dividends for epoch ${epochId}`);

    try {
      const epoch = await this.dividendEpochRepository.findOne({
        where: { id: epochId },
        relations: ['creator'],
      });

      if (!epoch) {
        throw new Error(`Epoch ${epochId} not found`);
      }

      if (!epoch.distributed) {
        throw new Error(`Epoch ${epochId} not yet finalized`);
      }

      // Get all share holders during this epoch
      // We need to find all unique holders who held shares during the epoch period
      const shareHolders = await this.findShareHolders(
        creatorId,
        epoch.startTime,
        epoch.endTime,
      );

      this.logger.log(`Found ${shareHolders.length} shareholders for epoch ${epochId}`);

      if (shareHolders.length === 0) {
        return {
          success: true,
          epochId,
          shareholdersCount: 0,
          message: 'No shareholders found',
        };
      }

      // Calculate total shares held during epoch
      const totalShares = shareHolders.reduce((sum, holder) => sum + holder.shares, 0);

      if (totalShares === 0) {
        return {
          success: true,
          epochId,
          shareholdersCount: shareHolders.length,
          totalShares: 0,
          message: 'No shares held during epoch',
        };
      }

      const totalFees = BigInt(epoch.totalFees);
      const createdDividends = [];

      // Calculate and create claimable dividends for each holder
      for (const holder of shareHolders) {
        const shareholderPortion = holder.shares / totalShares;
        const dividendAmount = (totalFees * BigInt(Math.floor(shareholderPortion * 1e6))) / BigInt(1e6);

        // Create claimable dividend
        const claimable = this.claimableDividendRepository.create({
          dividendEpochId: epoch.id,
          creatorId: epoch.creatorId,
          userAddress: holder.address,
          amount: Number(dividendAmount),
          claimableAmount: Number(dividendAmount),
          sharesHeld: holder.shares,
          epochsIncluded: { [epoch.epochNumber]: true },
          claimable: true,
          isClaimed: false,
        });

        await this.claimableDividendRepository.save(claimable);

        createdDividends.push({
          address: holder.address,
          shares: holder.shares,
          amount: dividendAmount.toString(),
        });
      }

      this.logger.log(`Created ${createdDividends.length} claimable dividends for epoch ${epochId}`);

      return {
        success: true,
        epochId,
        shareholdersCount: shareHolders.length,
        totalShares,
        totalFees: totalFees.toString(),
        dividends: createdDividends,
      };
    } catch (error) {
      this.logger.error(`Failed to calculate dividends: ${error.message}`, error.stack);

      if (job.attemptsMade >= JOB_CONFIG.ATTEMPTS) {
        await this.handleDeadLetter(job, error);
      }

      throw error;
    }
  }

  /**
   * Distribute epoch dividends (trigger calculation)
   */
  @Process(JOB_TYPES.DIVIDEND_CALCULATOR.DISTRIBUTE_EPOCH)
  async distributeEpoch(job: Job<DividendCalculatorJobData>) {
    const { epochId, creatorId } = job.data;

    this.logger.log(`Distributing epoch ${epochId}`);

    try {
      // Simply call the calculate dividends for this epoch
      return await this.calculateDividends(job);
    } catch (error) {
      this.logger.error(`Failed to distribute epoch: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Find all shareholders for a creator during a time period
   */
  private async findShareHolders(
    creatorId: string,
    startTime: Date,
    endTime: Date,
  ): Promise<Array<{ address: string; shares: number }>> {
    // Query share transactions to find all holders
    // This is a simplified version - in production, you'd need to track
    // the exact number of shares each holder had during the epoch period

    const transactions = await this.shareTransactionRepository
      .createQueryBuilder('tx')
      .where('tx.creatorId = :creatorId', { creatorId })
      .andWhere('tx.timestamp <= :endTime', { endTime })
      .orderBy('tx.timestamp', 'ASC')
      .getMany();

    // Build holdings map
    const holdings = new Map<string, number>();

    for (const tx of transactions) {
      // Skip transactions without a buyer
      if (!tx.buyer) continue;

      const currentHolding = holdings.get(tx.buyer) || 0;

      if (tx.transactionType === 'BUY') {
        holdings.set(tx.buyer, currentHolding + Number(tx.shares));
      } else if (tx.transactionType === 'SELL') {
        holdings.set(tx.buyer, Math.max(0, currentHolding - Number(tx.shares)));
      }
    }

    // Convert to array and filter out zero holdings
    return Array.from(holdings.entries())
      .filter(([_, shares]) => shares > 0)
      .map(([address, shares]) => ({ address, shares }));
  }

  private async handleDeadLetter(job: Job, error: Error) {
    this.logger.error(`Job ${job.id} exceeded max retries.`, {
      jobId: job.id,
      data: job.data,
      error: error.message,
    });
  }
}
