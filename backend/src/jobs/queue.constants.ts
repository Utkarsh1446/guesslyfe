/**
 * Queue names and job types
 */

// Queue Names
export const QUEUE_NAMES = {
  EPOCH_FINALIZER: 'epoch-finalizer',
  DIVIDEND_CALCULATOR: 'dividend-calculator',
  TWITTER_SCRAPER: 'twitter-scraper',
  VOLUME_TRACKER: 'volume-tracker',
  MARKET_CHECKER: 'market-checker',
  NOTIFICATION: 'notification',
} as const;

// Job Types
export const JOB_TYPES = {
  EPOCH_FINALIZER: {
    FINALIZE_EPOCH: 'finalize-epoch',
    CHECK_PENDING_EPOCHS: 'check-pending-epochs',
  },
  DIVIDEND_CALCULATOR: {
    CALCULATE_DIVIDENDS: 'calculate-dividends',
    DISTRIBUTE_EPOCH: 'distribute-epoch',
  },
  TWITTER_SCRAPER: {
    SCRAPE_USER: 'scrape-user',
    UPDATE_CREATOR_METRICS: 'update-creator-metrics',
    VERIFY_TWEET: 'verify-tweet',
  },
  VOLUME_TRACKER: {
    TRACK_MARKET_VOLUME: 'track-market-volume',
    UPDATE_CREATOR_VOLUME: 'update-creator-volume',
    SYNC_BLOCKCHAIN_DATA: 'sync-blockchain-data',
  },
  MARKET_CHECKER: {
    CHECK_EXPIRED_MARKETS: 'check-expired-markets',
    RESOLVE_MARKET: 'resolve-market',
    UPDATE_MARKET_DATA: 'update-market-data',
  },
  NOTIFICATION: {
    SEND_EMAIL: 'send-email',
    SEND_PUSH: 'send-push',
    SEND_WEBHOOK: 'send-webhook',
  },
} as const;

// Job Configuration
export const JOB_CONFIG = {
  // Retry settings
  ATTEMPTS: 3,
  BACKOFF: {
    type: 'exponential' as const,
    delay: 2000, // 2 seconds initial delay
  },

  // Retention settings (in milliseconds)
  RETENTION: {
    COMPLETED: 7 * 24 * 60 * 60 * 1000, // 7 days
    FAILED: 30 * 24 * 60 * 60 * 1000, // 30 days
  },

  // Concurrency settings per queue
  CONCURRENCY: {
    [QUEUE_NAMES.EPOCH_FINALIZER]: 2,
    [QUEUE_NAMES.DIVIDEND_CALCULATOR]: 3,
    [QUEUE_NAMES.TWITTER_SCRAPER]: 5,
    [QUEUE_NAMES.VOLUME_TRACKER]: 10,
    [QUEUE_NAMES.MARKET_CHECKER]: 5,
    [QUEUE_NAMES.NOTIFICATION]: 20,
  },

  // Rate limiting (jobs per time period)
  RATE_LIMIT: {
    [QUEUE_NAMES.EPOCH_FINALIZER]: { max: 10, duration: 60000 }, // 10 jobs per minute
    [QUEUE_NAMES.DIVIDEND_CALCULATOR]: { max: 20, duration: 60000 },
    [QUEUE_NAMES.TWITTER_SCRAPER]: { max: 100, duration: 60000 }, // Respect Twitter API limits
    [QUEUE_NAMES.VOLUME_TRACKER]: { max: 200, duration: 60000 },
    [QUEUE_NAMES.MARKET_CHECKER]: { max: 50, duration: 60000 },
    [QUEUE_NAMES.NOTIFICATION]: { max: 500, duration: 60000 },
  },
} as const;

// Job Data Types
export interface EpochFinalizerJobData {
  creatorId: string;
  epochNumber: number;
}

export interface DividendCalculatorJobData {
  epochId: string;
  creatorId: string;
}

export interface TwitterScraperJobData {
  type: 'user' | 'metrics' | 'verify-tweet';
  twitterHandle?: string;
  creatorId?: string;
  tweetId?: string;
}

export interface VolumeTrackerJobData {
  marketId?: string;
  creatorId?: string;
  fromBlock?: number;
  toBlock?: number;
}

export interface MarketCheckerJobData {
  marketId?: string;
  action: 'check-expired' | 'resolve' | 'update-data';
}

export interface NotificationJobData {
  type: 'email' | 'push' | 'webhook';
  recipient: string;
  subject?: string;
  body?: string;
  data?: Record<string, any>;
}
