import { Process, Processor, OnQueueActive, OnQueueCompleted, OnQueueFailed } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThanOrEqual } from 'typeorm';
import { QUEUE_NAMES, JOB_TYPES, JOB_CONFIG, MarketCheckerJobData } from '../queue.constants';
import { OpinionMarket } from '../../database/entities/opinion-market.entity';
import { OpinionMarketService } from '../../contracts/opinion-market.service';
import { MarketsService } from '../../modules/markets/markets.service';

@Processor(QUEUE_NAMES.MARKET_CHECKER)
export class MarketCheckerProcessor {
  private readonly logger = new Logger(MarketCheckerProcessor.name);

  constructor(
    @InjectRepository(OpinionMarket)
    private readonly opinionMarketRepository: Repository<OpinionMarket>,
    private readonly opinionMarketService: OpinionMarketService,
    private readonly marketsService: MarketsService,
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
   * Check for expired markets that need resolution
   */
  @Process(JOB_TYPES.MARKET_CHECKER.CHECK_EXPIRED_MARKETS)
  async checkExpiredMarkets(job: Job<MarketCheckerJobData>) {
    this.logger.log('Checking for expired markets...');

    try {
      const now = new Date();

      // Find markets that have expired but not resolved
      const expiredMarkets = await this.opinionMarketRepository.find({
        where: {
          endTime: LessThanOrEqual(now),
          isResolved: false,
          cancelled: false,
        },
        relations: ['creator'],
      });

      this.logger.log(`Found ${expiredMarkets.length} expired markets`);

      const results = [];

      for (const market of expiredMarkets) {
        try {
          // Check blockchain status if market has blockchain ID
          if (market.marketId) {
            const marketInfo = await this.opinionMarketService.getMarketInfo(market.marketId);

            if (marketInfo.resolved) {
              // Update local database
              market.isResolved = true;
              market.resolutionTime = new Date();
              // Note: winningOutcome would need to be added to entity
              await this.opinionMarketRepository.save(market);

              results.push({
                marketId: market.id,
                blockchainId: market.marketId.toString(),
                status: 'resolved',
                resolved: true,
              });
            } else {
              results.push({
                marketId: market.id,
                blockchainId: market.marketId.toString(),
                status: 'pending_resolution',
                resolved: false,
              });
            }
          } else {
            results.push({
              marketId: market.id,
              status: 'no_blockchain_id',
              resolved: false,
            });
          }
        } catch (error) {
          this.logger.error(
            `Failed to check market ${market.id}: ${error.message}`,
          );
          results.push({
            marketId: market.id,
            status: 'error',
            error: error.message,
          });
        }
      }

      return {
        success: true,
        totalExpired: expiredMarkets.length,
        results,
      };
    } catch (error) {
      this.logger.error(`Failed to check expired markets: ${error.message}`, error.stack);

      if (job.attemptsMade >= JOB_CONFIG.ATTEMPTS) {
        await this.handleDeadLetter(job, error);
      }

      throw error;
    }
  }

  /**
   * Resolve a specific market
   */
  @Process(JOB_TYPES.MARKET_CHECKER.RESOLVE_MARKET)
  async resolveMarket(job: Job<MarketCheckerJobData>) {
    const { marketId } = job.data;

    if (!marketId) {
      throw new Error('Market ID is required');
    }

    this.logger.log(`Resolving market ${marketId}`);

    try {
      const market = await this.opinionMarketRepository.findOne({
        where: { id: marketId },
        relations: ['creator'],
      });

      if (!market) {
        throw new Error(`Market ${marketId} not found`);
      }

      if (market.isResolved) {
        this.logger.warn(`Market ${marketId} already resolved`);
        return {
          success: false,
          marketId,
          message: 'Market already resolved',
        };
      }

      // Check if market has ended
      const now = new Date();
      if (market.endTime > now) {
        throw new Error(`Market ${marketId} has not ended yet`);
      }

      // Check blockchain status if available
      if (market.marketId) {
        const marketInfo = await this.opinionMarketService.getMarketInfo(market.marketId);

        if (marketInfo.resolved) {
          market.isResolved = true;
          market.resolutionTime = new Date();
          // Store winning outcome
          await this.opinionMarketRepository.save(market);

          this.logger.log(`Market ${marketId} resolved`);

          return {
            success: true,
            marketId,
            resolved: true,
            winningOutcome: marketInfo.winningOutcome,
            resolvedAt: market.resolutionTime,
          };
        }
      }

      return {
        success: false,
        marketId,
        message: 'Market not yet resolved on blockchain',
      };
    } catch (error) {
      this.logger.error(`Failed to resolve market: ${error.message}`, error.stack);

      if (job.attemptsMade >= JOB_CONFIG.ATTEMPTS) {
        await this.handleDeadLetter(job, error);
      }

      throw error;
    }
  }

  /**
   * Update market data from blockchain
   */
  @Process(JOB_TYPES.MARKET_CHECKER.UPDATE_MARKET_DATA)
  async updateMarketData(job: Job<MarketCheckerJobData>) {
    const { marketId } = job.data;

    if (!marketId) {
      throw new Error('Market ID is required');
    }

    this.logger.log(`Updating data for market ${marketId}`);

    try {
      const market = await this.opinionMarketRepository.findOne({
        where: { id: marketId },
      });

      if (!market) {
        throw new Error(`Market ${marketId} not found`);
      }

      if (!market.marketId) {
        throw new Error(`Market ${marketId} has no blockchain ID`);
      }

      // Fetch latest data from blockchain
      const marketInfo = await this.opinionMarketService.getMarketInfo(market.marketId);

      // Update market data
      market.isResolved = marketInfo.resolved;
      market.cancelled = marketInfo.cancelled;

      if (marketInfo.resolved && !market.resolutionTime) {
        market.resolutionTime = new Date();
      }

      await this.opinionMarketRepository.save(market);

      this.logger.log(`Market ${marketId} data updated`);

      return {
        success: true,
        marketId,
        resolved: marketInfo.resolved,
        cancelled: marketInfo.cancelled,
        updatedAt: new Date(),
      };
    } catch (error) {
      this.logger.error(`Failed to update market data: ${error.message}`, error.stack);

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
