import { Injectable, NotFoundException, BadRequestException, Logger, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { Creator } from '../../database/entities/creator.entity';
import { User } from '../../database/entities/user.entity';
import { TwitterUserDto, TwitterMetricsDto, SyncResultDto } from './dto/twitter-response.dto';
import { TwitterAPIService, TweetVerification } from './twitter-api.service';
import { TwitterScraperService } from './twitter-scraper.service';

export type { TweetVerification } from './twitter-api.service';

@Injectable()
export class TwitterService {
  private readonly logger = new Logger(TwitterService.name);
  private readonly CACHE_TTL = 15 * 60 * 1000; // 15 minutes

  constructor(
    @InjectRepository(Creator)
    private readonly creatorRepository: Repository<Creator>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly twitterAPI: TwitterAPIService,
    private readonly twitterScraper: TwitterScraperService,
    @Inject(CACHE_MANAGER)
    private readonly cacheManager: Cache,
  ) {}

  /**
   * Get user by username
   * Uses API for basic info, Puppeteer for engagement
   */
  async getUserByUsername(username: string): Promise<TwitterUserDto> {
    const cleanUsername = username.startsWith('@') ? username.slice(1) : username;
    const cacheKey = `twitter:user:${cleanUsername}`;

    // Check cache
    const cached = await this.cacheManager.get<TwitterUserDto>(cacheKey);
    if (cached) {
      this.logger.debug(`Cache hit for user @${cleanUsername}`);
      return cached;
    }

    this.logger.log(`Fetching data for @${cleanUsername}`);

    try {
      // Get basic info from API (OAuth data)
      const apiUser = await this.twitterAPI.getUserByUsername(cleanUsername);

      // Get engagement data from Puppeteer scraping
      let scrapedData: any = null;
      try {
        scrapedData = await this.twitterScraper.scrapeUserEngagement(cleanUsername);
      } catch (error) {
        this.logger.warn(`Failed to scrape engagement for @${cleanUsername}, using API data only`);
      }

      // Check if user is a creator on our platform
      const user = await this.userRepository.findOne({
        where: { twitterId: apiUser.id },
        relations: ['creator'],
      });

      const result = new TwitterUserDto({
        id: apiUser.id,
        username: apiUser.username,
        name: apiUser.name,
        description: apiUser.description,
        profileImageUrl: apiUser.profile_image_url,
        verified: apiUser.verified || false,
        // Use scraped data if available, otherwise use API
        followersCount: scrapedData?.followerCount || apiUser.public_metrics.followers_count,
        followingCount: scrapedData?.followingCount || apiUser.public_metrics.following_count,
        tweetCount: apiUser.public_metrics.tweet_count, // Always from API (more reliable)
        createdAt: new Date(apiUser.created_at),
        isCreator: !!user?.creator,
        creatorAddress: user?.creator?.creatorAddress,
      });

      // Cache for 15 minutes
      await this.cacheManager.set(cacheKey, result, this.CACHE_TTL);

      return result;
    } catch (error) {
      this.logger.error(`Failed to fetch Twitter user @${cleanUsername}:`, error.message);
      throw error;
    }
  }

  /**
   * Get user tweets
   */
  async getUserTweets(
    userId: string,
    params: {
      maxResults?: number;
      startTime?: Date;
    } = {},
  ) {
    const cacheKey = `twitter:tweets:${userId}:${params.maxResults || 100}`;

    // Check cache
    const cached = await this.cacheManager.get(cacheKey);
    if (cached) {
      this.logger.debug(`Cache hit for tweets of user ${userId}`);
      return cached;
    }

    try {
      const tweets = await this.twitterAPI.getUserTweets(userId, params);

      // Cache for 15 minutes
      await this.cacheManager.set(cacheKey, tweets, this.CACHE_TTL);

      return tweets;
    } catch (error) {
      this.logger.error(`Failed to fetch tweets for user ${userId}:`, error.message);
      throw error;
    }
  }

  /**
   * Calculate engagement rate
   * Uses Puppeteer scraping for more accurate engagement metrics
   */
  async calculateEngagementRate(userId: string, username: string): Promise<number> {
    const cacheKey = `twitter:engagement:${userId}`;

    // Check cache
    const cached = await this.cacheManager.get<number>(cacheKey);
    if (cached !== null && cached !== undefined) {
      this.logger.debug(`Cache hit for engagement rate of ${username}`);
      return cached;
    }

    try {
      // Try scraping first (more accurate for engagement)
      try {
        const scrapedData = await this.twitterScraper.scrapeUserEngagement(username);
        const engagementRate = scrapedData.engagementRate;

        // Cache for 15 minutes
        await this.cacheManager.set(cacheKey, engagementRate, this.CACHE_TTL);

        return engagementRate;
      } catch (scrapError) {
        this.logger.warn(`Scraping failed for @${username}, falling back to API`);

        // Fallback to API calculation
        const apiUser = await this.twitterAPI.getUserByUsername(username);
        const engagementRate = await this.twitterAPI.calculateEngagementRate(
          userId,
          apiUser.public_metrics.followers_count,
        );

        // Cache for 15 minutes
        await this.cacheManager.set(cacheKey, engagementRate, this.CACHE_TTL);

        return engagementRate;
      }
    } catch (error) {
      this.logger.error(`Failed to calculate engagement rate for ${username}:`, error.message);
      throw error;
    }
  }

  /**
   * Verify a tweet
   * Checks tweet exists, author, and required mentions
   */
  async verifyTweet(
    tweetUrl: string,
    expectedAuthorId: string,
    requiredCreatorHandles: string[] = [],
  ): Promise<TweetVerification> {
    try {
      // Add @guesslydotfun to required mentions
      const allRequiredMentions = ['@guesslydotfun', ...requiredCreatorHandles];

      const verification = await this.twitterAPI.verifyTweet(tweetUrl, expectedAuthorId, []);

      if (!verification.isValid) {
        return verification;
      }

      // Additional checks for our use case
      const errors: string[] = [];

      // Check for @guesslydotfun mention
      if (!verification.mentions.includes('guesslydotfun')) {
        errors.push('Tweet must mention @guesslydotfun');
      }

      // Check for creator mentions
      if (requiredCreatorHandles.length > 0) {
        const creatorHandlesLower = requiredCreatorHandles.map((h) =>
          h.toLowerCase().replace('@', ''),
        );
        const hasCreatorMention = creatorHandlesLower.some((handle) =>
          verification.mentions.includes(handle),
        );

        if (!hasCreatorMention) {
          errors.push(
            `Tweet must mention at least one creator: ${requiredCreatorHandles.join(', ')}`,
          );
        }
      }

      return {
        ...verification,
        isValid: errors.length === 0,
        errors,
      };
    } catch (error) {
      this.logger.error(`Failed to verify tweet:`, error.message);
      throw error;
    }
  }

  /**
   * Check if a tweet was posted by a specific user
   */
  async checkUserTweetExists(userId: string, tweetId: string): Promise<boolean> {
    const cacheKey = `twitter:tweet-check:${tweetId}:${userId}`;

    // Check cache
    const cached = await this.cacheManager.get<boolean>(cacheKey);
    if (cached !== null && cached !== undefined) {
      return cached;
    }

    try {
      const exists = await this.twitterAPI.checkUserTweetExists(userId, tweetId);

      // Cache for 15 minutes
      await this.cacheManager.set(cacheKey, exists, this.CACHE_TTL);

      return exists;
    } catch (error) {
      this.logger.error(`Failed to check tweet ${tweetId}:`, error.message);
      return false;
    }
  }

  /**
   * Get Twitter metrics for a user
   * Uses Puppeteer for accurate engagement data
   */
  async getUserMetrics(handle: string): Promise<TwitterMetricsDto> {
    const cleanHandle = handle.startsWith('@') ? handle.slice(1) : handle;
    const cacheKey = `twitter:metrics:${cleanHandle}`;

    // Check cache
    const cached = await this.cacheManager.get<TwitterMetricsDto>(cacheKey);
    if (cached) {
      this.logger.debug(`Cache hit for metrics of @${cleanHandle}`);
      return cached;
    }

    try {
      // Get user info
      const user = await this.twitterAPI.getUserByUsername(cleanHandle);

      // Get scraped engagement data
      const scrapedData = await this.twitterScraper.scrapeUserEngagement(cleanHandle);

      // Calculate average engagement from scraped tweets
      let avgLikes = 0;
      let avgRetweets = 0;
      let avgReplies = 0;

      if (scrapedData.recentTweets.length > 0) {
        const totalLikes = scrapedData.recentTweets.reduce((sum, t) => sum + t.likes, 0);
        const totalRetweets = scrapedData.recentTweets.reduce((sum, t) => sum + t.retweets, 0);
        const totalReplies = scrapedData.recentTweets.reduce((sum, t) => sum + t.replies, 0);

        avgLikes = totalLikes / scrapedData.recentTweets.length;
        avgRetweets = totalRetweets / scrapedData.recentTweets.length;
        avgReplies = totalReplies / scrapedData.recentTweets.length;
      }

      const result = new TwitterMetricsDto({
        username: user.username,
        followersCount: scrapedData.followerCount || user.public_metrics.followers_count,
        followingCount: scrapedData.followingCount || user.public_metrics.following_count,
        tweetCount: user.public_metrics.tweet_count,
        engagementRate: scrapedData.engagementRate,
        avgLikes: Math.round(avgLikes),
        avgRetweets: Math.round(avgRetweets),
        avgReplies: Math.round(avgReplies),
        lastFetched: new Date(),
      });

      // Cache for 15 minutes
      await this.cacheManager.set(cacheKey, result, this.CACHE_TTL);

      return result;
    } catch (error) {
      this.logger.error(`Failed to fetch metrics for @${handle}:`, error.message);
      throw error;
    }
  }

  /**
   * Sync creator's Twitter data
   */
  async syncCreatorData(creatorAddress: string): Promise<SyncResultDto> {
    const creator = await this.creatorRepository.findOne({
      where: { creatorAddress: creatorAddress.toLowerCase() },
      relations: ['user'],
    });

    if (!creator) {
      throw new NotFoundException(`Creator with address ${creatorAddress} not found`);
    }

    try {
      // Fetch latest Twitter data
      const twitterData = await this.getUserByUsername(creator.user.twitterHandle);

      // Update user fields
      const updatedFields: string[] = [];

      if (creator.user.twitterFollowers !== twitterData.followersCount) {
        creator.user.twitterFollowers = twitterData.followersCount;
        updatedFields.push('twitterFollowers');
      }

      if (creator.user.displayName !== twitterData.name) {
        creator.user.displayName = twitterData.name;
        updatedFields.push('displayName');
      }

      if (creator.user.profilePictureUrl !== twitterData.profileImageUrl) {
        creator.user.profilePictureUrl = twitterData.profileImageUrl;
        creator.profilePictureUrl = twitterData.profileImageUrl;
        updatedFields.push('profilePictureUrl');
      }

      if (twitterData.description && creator.user.bio !== twitterData.description) {
        creator.user.bio = twitterData.description;
        updatedFields.push('bio');
      }

      // Save if any fields were updated
      if (updatedFields.length > 0) {
        await this.userRepository.save(creator.user);
        await this.creatorRepository.save(creator);
        this.logger.log(`Synced Twitter data for creator ${creatorAddress}: ${updatedFields.join(', ')}`);
      }

      return new SyncResultDto({
        success: true,
        creatorAddress,
        updatedFields,
        twitterData,
      });
    } catch (error) {
      this.logger.error(`Failed to sync Twitter data for creator ${creatorAddress}:`, error.message);
      throw new BadRequestException(`Failed to sync Twitter data: ${error.message}`);
    }
  }

  /**
   * Extract tweet ID from URL
   */
  extractTweetId(tweetUrl: string): string | null {
    return this.twitterAPI.extractTweetId(tweetUrl);
  }
}
