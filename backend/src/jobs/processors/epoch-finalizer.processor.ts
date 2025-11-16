import { Process, Processor, OnQueueActive, OnQueueCompleted, OnQueueFailed } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThanOrEqual } from 'typeorm';
import { QUEUE_NAMES, JOB_TYPES, JOB_CONFIG, EpochFinalizerJobData } from '../queue.constants';
import { DividendEpoch } from '../../database/entities/dividend-epoch.entity';
import { DividendsService } from '../../modules/dividends/dividends.service';

@Processor(QUEUE_NAMES.EPOCH_FINALIZER)
export class EpochFinalizerProcessor {
  private readonly logger = new Logger(EpochFinalizerProcessor.name);

  constructor(
    @InjectRepository(DividendEpoch)
    private readonly dividendEpochRepository: Repository<DividendEpoch>,
    private readonly dividendsService: DividendsService,
  ) {}

  @OnQueueActive()
  onActive(job: Job) {
    this.logger.log(`Processing job ${job.id} of type ${job.name}...`);
  }

  @OnQueueCompleted()
  onComplete(job: Job, result: any) {
    this.logger.log(`Job ${job.id} completed successfully with result: ${JSON.stringify(result)}`);
  }

  @OnQueueFailed()
  onError(job: Job, error: Error) {
    this.logger.error(
      `Job ${job.id} failed with error: ${error.message}`,
      error.stack,
    );
  }

  /**
   * Finalize a specific epoch
   */
  @Process(JOB_TYPES.EPOCH_FINALIZER.FINALIZE_EPOCH)
  async finalizeEpoch(job: Job<EpochFinalizerJobData>) {
    const { creatorId, epochNumber } = job.data;

    this.logger.log(`Finalizing epoch ${epochNumber} for creator ${creatorId}`);

    try {
      // Find the epoch
      const epoch = await this.dividendEpochRepository.findOne({
        where: { creatorId, epochNumber },
        relations: ['creator'],
      });

      if (!epoch) {
        throw new Error(`Epoch ${epochNumber} not found for creator ${creatorId}`);
      }

      // Check if epoch has ended
      const now = new Date();
      if (epoch.endTime > now) {
        this.logger.warn(`Epoch ${epochNumber} has not ended yet (ends at ${epoch.endTime})`);
        return {
          success: false,
          message: 'Epoch has not ended yet',
          epochNumber,
        };
      }

      // Check if already distributed
      if (epoch.distributed) {
        this.logger.warn(`Epoch ${epochNumber} already distributed`);
        return {
          success: false,
          message: 'Epoch already distributed',
          epochNumber,
        };
      }

      // Calculate total fees for epoch
      // This would involve querying market trades and share trades within the epoch period
      const totalFees = epoch.shareFeesCollected + epoch.marketFeesCollected;

      // Update epoch
      epoch.totalFees = totalFees;
      epoch.distributed = true;
      epoch.distributedAt = new Date();
      await this.dividendEpochRepository.save(epoch);

      this.logger.log(`Epoch ${epochNumber} finalized with ${totalFees} USDC in fees`);

      return {
        success: true,
        epochNumber,
        totalFees: totalFees.toString(),
        distributedAt: epoch.distributedAt,
      };
    } catch (error) {
      this.logger.error(`Failed to finalize epoch: ${error.message}`, error.stack);

      // Add to dead letter queue if max retries exceeded
      if (job.attemptsMade >= JOB_CONFIG.ATTEMPTS) {
        await this.handleDeadLetter(job, error);
      }

      throw error; // Re-throw to trigger retry
    }
  }

  /**
   * Check for pending epochs that need finalization
   */
  @Process(JOB_TYPES.EPOCH_FINALIZER.CHECK_PENDING_EPOCHS)
  async checkPendingEpochs(job: Job) {
    this.logger.log('Checking for pending epochs to finalize...');

    try {
      const now = new Date();

      // Find epochs that have ended but not distributed
      const pendingEpochs = await this.dividendEpochRepository.find({
        where: {
          distributed: false,
          endTime: LessThanOrEqual(now),
        },
        relations: ['creator'],
      });

      this.logger.log(`Found ${pendingEpochs.length} pending epochs`);

      const results = [];

      for (const epoch of pendingEpochs) {
        try {
          // Queue finalization job for each epoch
          await job.queue.add(
            JOB_TYPES.EPOCH_FINALIZER.FINALIZE_EPOCH,
            {
              creatorId: epoch.creatorId,
              epochNumber: epoch.epochNumber,
            },
            {
              priority: 1, // High priority
              delay: 0,
            },
          );

          results.push({
            creatorId: epoch.creatorId,
            epochNumber: epoch.epochNumber,
            queued: true,
          });
        } catch (error) {
          this.logger.error(
            `Failed to queue epoch ${epoch.epochNumber} for creator ${epoch.creatorId}: ${error.message}`,
          );
          results.push({
            creatorId: epoch.creatorId,
            epochNumber: epoch.epochNumber,
            queued: false,
            error: error.message,
          });
        }
      }

      return {
        success: true,
        totalPending: pendingEpochs.length,
        results,
      };
    } catch (error) {
      this.logger.error(`Failed to check pending epochs: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Handle dead letter queue for failed jobs
   */
  private async handleDeadLetter(job: Job, error: Error) {
    this.logger.error(
      `Job ${job.id} exceeded max retries. Moving to dead letter queue.`,
      {
        jobId: job.id,
        jobName: job.name,
        data: job.data,
        error: error.message,
        stack: error.stack,
        attempts: job.attemptsMade,
      },
    );

    // TODO: Implement dead letter queue storage (could be database, separate Redis queue, etc.)
    // For now, just log the failure
  }
}
