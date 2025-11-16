import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { QUEUE_NAMES, JOB_CONFIG } from './queue.constants';

// Processors
import { EpochFinalizerProcessor } from './processors/epoch-finalizer.processor';
import { DividendCalculatorProcessor } from './processors/dividend-calculator.processor';
import { TwitterScraperProcessor } from './processors/twitter-scraper.processor';
import { VolumeTrackerProcessor } from './processors/volume-tracker.processor';
import { MarketCheckerProcessor } from './processors/market-checker.processor';
import { NotificationProcessor } from './processors/notification.processor';

// Services (will be injected into processors)
import { DividendsModule } from '../modules/dividends/dividends.module';
import { TwitterModule } from '../modules/twitter/twitter.module';
import { MarketsModule } from '../modules/markets/markets.module';
import { CreatorsModule } from '../modules/creators/creators.module';

@Module({
  imports: [
    // Register all queues (BullModule.forRoot is already configured in AppModule)
    BullModule.registerQueue(
      {
        name: QUEUE_NAMES.EPOCH_FINALIZER,
        defaultJobOptions: {
          attempts: 3,
          backoff: { type: 'exponential', delay: 5000 },
        },
        limiter: JOB_CONFIG.RATE_LIMIT[QUEUE_NAMES.EPOCH_FINALIZER],
      },
      {
        name: QUEUE_NAMES.DIVIDEND_CALCULATOR,
        defaultJobOptions: {
          attempts: 3,
          backoff: { type: 'exponential', delay: 3000 },
        },
        limiter: JOB_CONFIG.RATE_LIMIT[QUEUE_NAMES.DIVIDEND_CALCULATOR],
      },
      {
        name: QUEUE_NAMES.TWITTER_SCRAPER,
        defaultJobOptions: {
          attempts: 5, // More retries for external API
          backoff: { type: 'exponential', delay: 10000 }, // Longer backoff for API limits
        },
        limiter: JOB_CONFIG.RATE_LIMIT[QUEUE_NAMES.TWITTER_SCRAPER],
      },
      {
        name: QUEUE_NAMES.VOLUME_TRACKER,
        defaultJobOptions: {
          attempts: 3,
          backoff: { type: 'exponential', delay: 2000 },
        },
        limiter: JOB_CONFIG.RATE_LIMIT[QUEUE_NAMES.VOLUME_TRACKER],
      },
      {
        name: QUEUE_NAMES.MARKET_CHECKER,
        defaultJobOptions: {
          attempts: 3,
          backoff: { type: 'exponential', delay: 3000 },
        },
        limiter: JOB_CONFIG.RATE_LIMIT[QUEUE_NAMES.MARKET_CHECKER],
      },
      {
        name: QUEUE_NAMES.NOTIFICATION,
        defaultJobOptions: {
          attempts: 5, // More retries for notifications
          backoff: { type: 'exponential', delay: 1000 },
        },
        limiter: JOB_CONFIG.RATE_LIMIT[QUEUE_NAMES.NOTIFICATION],
      },
    ),

    // Import required modules for processors
    DividendsModule,
    TwitterModule,
    MarketsModule,
    CreatorsModule,
  ],
  providers: [
    EpochFinalizerProcessor,
    DividendCalculatorProcessor,
    TwitterScraperProcessor,
    VolumeTrackerProcessor,
    MarketCheckerProcessor,
    NotificationProcessor,
  ],
  exports: [BullModule],
})
export class QueuesModule {}
