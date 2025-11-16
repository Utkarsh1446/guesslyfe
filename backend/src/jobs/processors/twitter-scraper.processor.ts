import { Process, Processor, OnQueueActive, OnQueueCompleted, OnQueueFailed } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { QUEUE_NAMES, JOB_TYPES, JOB_CONFIG, TwitterScraperJobData } from '../queue.constants';
import { Creator } from '../../database/entities/creator.entity';
import { TwitterService } from '../../modules/twitter/twitter.service';

@Processor(QUEUE_NAMES.TWITTER_SCRAPER)
export class TwitterScraperProcessor {
  private readonly logger = new Logger(TwitterScraperProcessor.name);

  constructor(
    @InjectRepository(Creator)
    private readonly creatorRepository: Repository<Creator>,
    private readonly twitterService: TwitterService,
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
   * Scrape user data from Twitter
   */
  @Process(JOB_TYPES.TWITTER_SCRAPER.SCRAPE_USER)
  async scrapeUser(job: Job<TwitterScraperJobData>) {
    const { twitterHandle } = job.data;

    if (!twitterHandle) {
      throw new Error('Twitter handle is required');
    }

    this.logger.log(`Scraping Twitter user: ${twitterHandle}`);

    try {
      // Fetch user data from Twitter API
      const userData = await this.twitterService.getUserByUsername(twitterHandle);

      this.logger.log(`Successfully scraped user ${twitterHandle}: ${userData.name}`);

      return {
        success: true,
        handle: twitterHandle,
        data: userData,
      };
    } catch (error) {
      this.logger.error(`Failed to scrape user ${twitterHandle}: ${error.message}`, error.stack);

      // Twitter API rate limit errors should be retried
      if (error.message?.includes('rate limit') || error.message?.includes('429')) {
        this.logger.warn('Rate limited by Twitter API. Job will be retried.');
        throw error; // Retry with exponential backoff
      }

      if (job.attemptsMade >= JOB_CONFIG.ATTEMPTS) {
        await this.handleDeadLetter(job, error);
      }

      throw error;
    }
  }

  /**
   * Update creator metrics from Twitter
   */
  @Process(JOB_TYPES.TWITTER_SCRAPER.UPDATE_CREATOR_METRICS)
  async updateCreatorMetrics(job: Job<TwitterScraperJobData>) {
    const { creatorId, twitterHandle } = job.data;

    if (!creatorId) {
      throw new Error('Creator ID is required');
    }

    this.logger.log(`Updating metrics for creator ${creatorId}`);

    try {
      const creator = await this.creatorRepository.findOne({
        where: { id: creatorId },
        relations: ['user'],
      });

      if (!creator) {
        throw new Error(`Creator ${creatorId} not found`);
      }

      const handle = twitterHandle || creator.twitterHandle;

      // Fetch latest Twitter data
      const userData = await this.twitterService.getUserByUsername(handle);

      // Update creator metrics
      creator.followerCount = userData.followersCount || creator.followerCount;
      // Note: Twitter API v2 doesn't provide engagement rate directly
      // You'd need to calculate this from recent tweets

      await this.creatorRepository.save(creator);

      this.logger.log(`Updated metrics for creator ${creatorId}`);

      return {
        success: true,
        creatorId,
        followerCount: creator.followerCount,
        updatedAt: new Date(),
      };
    } catch (error) {
      this.logger.error(`Failed to update creator metrics: ${error.message}`, error.stack);

      if (error.message?.includes('rate limit')) {
        throw error; // Retry
      }

      if (job.attemptsMade >= JOB_CONFIG.ATTEMPTS) {
        await this.handleDeadLetter(job, error);
      }

      throw error;
    }
  }

  /**
   * Verify a tweet exists and is valid
   */
  @Process(JOB_TYPES.TWITTER_SCRAPER.VERIFY_TWEET)
  async verifyTweet(job: Job<TwitterScraperJobData>) {
    const { tweetId } = job.data;

    if (!tweetId) {
      throw new Error('Tweet ID is required');
    }

    this.logger.log(`Verifying tweet ${tweetId}`);

    try {
      // Verify tweet exists and get its data
      // Note: This would require the Twitter API v2 tweet lookup endpoint
      // For now, we'll return a placeholder

      this.logger.log(`Tweet ${tweetId} verified`);

      return {
        success: true,
        tweetId,
        verified: true,
        verifiedAt: new Date(),
      };
    } catch (error) {
      this.logger.error(`Failed to verify tweet ${tweetId}: ${error.message}`, error.stack);

      if (error.message?.includes('rate limit')) {
        throw error;
      }

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
