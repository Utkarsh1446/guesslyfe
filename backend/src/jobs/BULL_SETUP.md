# Bull Queue System Setup Guide

## Overview

This document describes the Bull queue system implementation for background job processing.

## Queues

### 1. Epoch Finalizer Queue (`epoch-finalizer`)
**Purpose**: Finalize dividend epochs when they end

**Jobs**:
- `finalize-epoch`: Finalize a specific epoch
- `check-pending-epochs`: Check for epochs that need finalization

**Configuration**:
- Concurrency: 2
- Rate Limit: 10 jobs/minute
- Retry: 3 attempts with 5s exponential backoff

### 2. Dividend Calculator Queue (`dividend-calculator`)
**Purpose**: Calculate and distribute dividends to shareholders

**Jobs**:
- `calculate-dividends`: Calculate dividends for epoch shareholders
- `distribute-epoch`: Trigger dividend distribution

**Configuration**:
- Concurrency: 3
- Rate Limit: 20 jobs/minute
- Retry: 3 attempts with 3s exponential backoff

### 3. Twitter Scraper Queue (`twitter-scraper`)
**Purpose**: Scrape and update Twitter data for creators

**Jobs**:
- `scrape-user`: Fetch Twitter user data
- `update-creator-metrics`: Update creator metrics from Twitter
- `verify-tweet`: Verify tweet existence

**Configuration**:
- Concurrency: 5
- Rate Limit: 100 jobs/minute (respects Twitter API limits)
- Retry: 5 attempts with 10s exponential backoff

### 4. Volume Tracker Queue (`volume-tracker`)
**Purpose**: Track trading volume for markets and creators

**Jobs**:
- `track-market-volume`: Update volume for a specific market
- `update-creator-volume`: Update total volume for a creator
- `sync-blockchain-data`: Sync volume data from blockchain

**Configuration**:
- Concurrency: 10
- Rate Limit: 200 jobs/minute
- Retry: 3 attempts with 2s exponential backoff

### 5. Market Checker Queue (`market-checker`)
**Purpose**: Check and update market statuses

**Jobs**:
- `check-expired-markets`: Find and process expired markets
- `resolve-market`: Resolve a specific market
- `update-market-data`: Sync market data from blockchain

**Configuration**:
- Concurrency: 5
- Rate Limit: 50 jobs/minute
- Retry: 3 attempts with 3s exponential backoff

### 6. Notification Queue (`notification`)
**Purpose**: Send notifications via email, push, or webhook

**Jobs**:
- `send-email`: Send email notification
- `send-push`: Send push notification
- `send-webhook`: Send webhook POST request

**Configuration**:
- Concurrency: 20
- Rate Limit: 500 jobs/minute
- Retry: 5 attempts with 1s exponential backoff

## Redis Configuration

### Environment Variables

```env
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0
```

### Connection Settings

- Max retries per request: 3
- Retry strategy: Exponential (min 50ms, max 2s)
- Enable ready check: true

## Job Configuration

### Global Defaults

- Attempts: 3
- Backoff: Exponential starting at 2s
- Remove on complete: After 7 days (max 1000 jobs)
- Remove on fail: After 30 days

### Retry Logic

All jobs implement exponential backoff:
- Attempt 1: Initial delay (varies by queue)
- Attempt 2: delay * 2
- Attempt 3: delay * 4

After max attempts, jobs are moved to a dead letter queue.

## Bull Board Monitoring

### Access

Dashboard available at: `http://localhost:3000/admin/queues`

### Authentication

Protected by Basic Auth:
- Username: Set via `ADMIN_USERNAME` (default: 'admin')
- Password: Set via `ADMIN_PASSWORD` (required)

### Features

- View all queues and their status
- Monitor active, waiting, completed, and failed jobs
- Retry failed jobs
- Clean old jobs
- View job details and logs

## Integration Example

### Adding a Job

```typescript
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { QUEUE_NAMES, JOB_TYPES } from './jobs/queue.constants';

export class MyService {
  constructor(
    @InjectQueue(QUEUE_NAMES.EPOCH_FINALIZER)
    private readonly epochQueue: Queue,
  ) {}

  async scheduleEpochFinalization(creatorId: string, epochNumber: number) {
    await this.epochQueue.add(
      JOB_TYPES.EPOCH_FINALIZER.FINALIZE_EPOCH,
      { creatorId, epochNumber },
      {
        priority: 1, // Higher priority
        delay: 5000, // Delay 5 seconds
      },
    );
  }
}
```

### Scheduled Jobs (Cron)

```typescript
import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';

@Injectable()
export class ScheduledTasks {
  constructor(
    @InjectQueue(QUEUE_NAMES.EPOCH_FINALIZER)
    private readonly epochQueue: Queue,
  ) {}

  // Check for pending epochs every hour
  @Cron(CronExpression.EVERY_HOUR)
  async checkPendingEpochs() {
    await this.epochQueue.add(
      JOB_TYPES.EPOCH_FINALIZER.CHECK_PENDING_EPOCHS,
      {},
    );
  }
}
```

## Error Handling

### Dead Letter Queue

Failed jobs (after max retries) are logged with full context:
- Job ID
- Job name and data
- Error message and stack trace
- Number of attempts

### Monitoring Failed Jobs

1. Access Bull Board at `/admin/queues`
2. Select the queue
3. View "Failed" tab
4. Review job details and error messages
5. Retry individual jobs or clean failed jobs

## Performance Tuning

### Concurrency

Adjust per-queue concurrency in `JOB_CONFIG.CONCURRENCY`:

```typescript
CONCURRENCY: {
  [QUEUE_NAMES.NOTIFICATION]: 20, // Process 20 notifications concurrently
}
```

### Rate Limiting

Adjust rate limits to respect API limits or prevent overload:

```typescript
RATE_LIMIT: {
  [QUEUE_NAMES.TWITTER_SCRAPER]: { max: 100, duration: 60000 }, // 100/minute
}
```

### Job Retention

Control storage usage by adjusting retention periods:

```typescript
RETENTION: {
  COMPLETED: 7 * 24 * 60 * 60 * 1000, // 7 days
  FAILED: 30 * 24 * 60 * 60 * 1000,    // 30 days
}
```

## Troubleshooting

### Redis Connection Issues

Check:
1. Redis is running: `redis-cli ping`
2. Environment variables are correct
3. Network connectivity
4. Redis password (if set)

### Jobs Not Processing

Check:
1. Queue processor is registered in QueuesModule
2. Redis connection is active
3. Rate limits aren't blocking jobs
4. Check Bull Board for queue status

### High Memory Usage

Solutions:
1. Reduce job retention periods
2. Enable `removeOnComplete` and `removeOnFail`
3. Limit max jobs per queue
4. Clean old jobs regularly

## Security Considerations

1. **Admin Dashboard**: Always set a strong `ADMIN_PASSWORD`
2. **Redis**: Use password authentication in production
3. **Network**: Restrict Redis access to application servers only
4. **Logs**: Sanitize sensitive data in job payloads before logging

## Migration Guide

### From No Queue System

1. Install dependencies (already in package.json)
2. Set Redis environment variables
3. Import QueuesModule in AppModule
4. Add Bull Board to main.ts
5. Start using queues in services

### Production Deployment

1. Use managed Redis (AWS ElastiCache, Redis Cloud, etc.)
2. Set strong admin credentials
3. Configure firewall rules for Redis
4. Monitor queue metrics
5. Set up alerts for failed jobs
6. Consider Redis Sentinel for high availability
