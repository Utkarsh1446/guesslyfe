import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

interface TwitterAPIUserResponse {
  data: {
    id: string;
    username: string;
    name: string;
    description?: string;
    profile_image_url: string;
    verified: boolean;
    public_metrics: {
      followers_count: number;
      following_count: number;
      tweet_count: number;
    };
    created_at: string;
  };
}

interface TwitterAPITweetsResponse {
  data?: Array<{
    id: string;
    text: string;
    created_at: string;
    public_metrics: {
      like_count: number;
      retweet_count: number;
      reply_count: number;
      quote_count: number;
    };
  }>;
  meta?: {
    result_count: number;
    newest_id?: string;
    oldest_id?: string;
    next_token?: string;
  };
}

interface TwitterAPITweetResponse {
  data: {
    id: string;
    text: string;
    author_id: string;
    created_at: string;
    entities?: {
      mentions?: Array<{
        start: number;
        end: number;
        username: string;
      }>;
    };
  };
  includes?: {
    users?: Array<{
      id: string;
      username: string;
      name: string;
    }>;
  };
}

export interface TweetVerification {
  tweetId: string;
  authorId: string;
  authorUsername: string;
  text: string;
  mentions: string[];
  createdAt: Date;
  isValid: boolean;
  errors: string[];
}

@Injectable()
export class TwitterAPIService {
  private readonly logger = new Logger(TwitterAPIService.name);
  private readonly bearerToken: string;
  private readonly API_BASE_URL = 'https://api.twitter.com/2';

  // Rate limiting: Track requests per 15-minute window
  private requestCounts = new Map<string, { count: number; resetTime: number }>();
  private readonly RATE_LIMIT = 300; // 300 requests per 15 minutes
  private readonly RATE_WINDOW = 15 * 60 * 1000; // 15 minutes

  constructor(private readonly configService: ConfigService) {
    this.bearerToken = this.configService.get<string>('twitter.bearerToken') || '';

    if (!this.bearerToken) {
      this.logger.warn('Twitter Bearer Token not configured. Twitter API features will be disabled.');
    }
  }

  /**
   * Check and enforce rate limiting
   */
  private checkRateLimit(endpoint: string): void {
    const now = Date.now();
    const key = `twitter-api-${endpoint}`;

    let tracker = this.requestCounts.get(key);

    // Reset if window expired
    if (!tracker || now > tracker.resetTime) {
      tracker = {
        count: 0,
        resetTime: now + this.RATE_WINDOW,
      };
      this.requestCounts.set(key, tracker);
    }

    // Check limit
    if (tracker.count >= this.RATE_LIMIT) {
      const waitTime = Math.ceil((tracker.resetTime - now) / 1000);
      throw new BadRequestException(
        `Rate limit exceeded for ${endpoint}. Please try again in ${waitTime} seconds.`,
      );
    }

    tracker.count++;
  }

  /**
   * Retry with exponential backoff
   */
  private async retryWithBackoff<T>(
    fn: () => Promise<T>,
    maxRetries: number = 3,
    baseDelay: number = 1000,
  ): Promise<T> {
    let lastError: Error;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error;

        // Don't retry on certain errors
        if (error.status === 401 || error.status === 403 || error.status === 404) {
          throw error;
        }

        // Don't retry on last attempt
        if (attempt === maxRetries) {
          break;
        }

        // Calculate delay with exponential backoff
        const delay = baseDelay * Math.pow(2, attempt);
        this.logger.warn(`Request failed (attempt ${attempt + 1}/${maxRetries + 1}), retrying in ${delay}ms...`);

        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }

    throw lastError!;
  }

  /**
   * Get user by username (API v2)
   */
  async getUserByUsername(username: string): Promise<TwitterAPIUserResponse['data']> {
    if (!this.bearerToken) {
      throw new BadRequestException('Twitter API not configured');
    }

    this.checkRateLimit('users');

    const cleanUsername = username.startsWith('@') ? username.slice(1) : username;

    return this.retryWithBackoff(async () => {
      const response = await fetch(
        `${this.API_BASE_URL}/users/by/username/${cleanUsername}?user.fields=description,profile_image_url,verified,public_metrics,created_at`,
        {
          headers: {
            Authorization: `Bearer ${this.bearerToken}`,
          },
        },
      );

      if (!response.ok) {
        if (response.status === 404) {
          throw new NotFoundException(`Twitter user @${cleanUsername} not found`);
        }
        if (response.status === 429) {
          throw new BadRequestException('Twitter API rate limit exceeded');
        }
        throw new Error(`Twitter API error: ${response.status} ${response.statusText}`);
      }

      const data: TwitterAPIUserResponse = await response.json();
      return data.data;
    });
  }

  /**
   * Get user tweets (API v2)
   */
  async getUserTweets(
    userId: string,
    params: {
      maxResults?: number;
      startTime?: Date;
      endTime?: Date;
    } = {},
  ): Promise<TwitterAPITweetsResponse['data']> {
    if (!this.bearerToken) {
      throw new BadRequestException('Twitter API not configured');
    }

    this.checkRateLimit('tweets');

    const maxResults = Math.min(params.maxResults || 100, 100); // Twitter max is 100
    const queryParams = new URLSearchParams({
      max_results: maxResults.toString(),
      'tweet.fields': 'created_at,public_metrics',
    });

    // Add time filters if provided
    if (params.startTime) {
      queryParams.append('start_time', params.startTime.toISOString());
    }
    if (params.endTime) {
      queryParams.append('end_time', params.endTime.toISOString());
    }

    return this.retryWithBackoff(async () => {
      const response = await fetch(
        `${this.API_BASE_URL}/users/${userId}/tweets?${queryParams.toString()}`,
        {
          headers: {
            Authorization: `Bearer ${this.bearerToken}`,
          },
        },
      );

      if (!response.ok) {
        if (response.status === 404) {
          throw new NotFoundException(`Twitter user with ID ${userId} not found`);
        }
        if (response.status === 429) {
          throw new BadRequestException('Twitter API rate limit exceeded');
        }
        throw new Error(`Twitter API error: ${response.status} ${response.statusText}`);
      }

      const data: TwitterAPITweetsResponse = await response.json();
      return data.data || [];
    });
  }

  /**
   * Calculate engagement rate from recent tweets
   */
  async calculateEngagementRate(userId: string, followerCount: number): Promise<number> {
    // Get tweets from last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const tweets = await this.getUserTweets(userId, {
      maxResults: 100,
      startTime: thirtyDaysAgo,
    });

    if (!tweets || tweets.length === 0) {
      return 0;
    }

    // Calculate total engagement
    const totalEngagement = tweets.reduce((sum, tweet) => {
      return (
        sum +
        tweet.public_metrics.like_count +
        tweet.public_metrics.retweet_count +
        tweet.public_metrics.reply_count
      );
    }, 0);

    // Average engagement per tweet
    const avgEngagementPerTweet = totalEngagement / tweets.length;

    // Engagement rate as percentage of followers
    const engagementRate = followerCount > 0 ? (avgEngagementPerTweet / followerCount) * 100 : 0;

    return Math.round(engagementRate * 100) / 100; // Round to 2 decimals
  }

  /**
   * Verify a tweet exists and check content
   */
  async verifyTweet(
    tweetUrl: string,
    expectedAuthorId: string,
    requiredMentions: string[] = [],
  ): Promise<TweetVerification> {
    if (!this.bearerToken) {
      throw new BadRequestException('Twitter API not configured');
    }

    const tweetId = this.extractTweetId(tweetUrl);

    if (!tweetId) {
      return {
        tweetId: '',
        authorId: '',
        authorUsername: '',
        text: '',
        mentions: [],
        createdAt: new Date(),
        isValid: false,
        errors: ['Invalid tweet URL format'],
      };
    }

    this.checkRateLimit('tweets');

    return this.retryWithBackoff(async () => {
      const response = await fetch(
        `${this.API_BASE_URL}/tweets/${tweetId}?tweet.fields=author_id,created_at,entities&expansions=author_id`,
        {
          headers: {
            Authorization: `Bearer ${this.bearerToken}`,
          },
        },
      );

      if (!response.ok) {
        if (response.status === 404) {
          return {
            tweetId,
            authorId: '',
            authorUsername: '',
            text: '',
            mentions: [],
            createdAt: new Date(),
            isValid: false,
            errors: ['Tweet not found'],
          };
        }
        throw new Error(`Twitter API error: ${response.statusText}`);
      }

      const data: TwitterAPITweetResponse = await response.json();
      const tweet = data.data;
      const author = data.includes?.users?.[0];

      const errors: string[] = [];

      // Check author matches expected user
      if (expectedAuthorId && tweet.author_id !== expectedAuthorId) {
        errors.push('Tweet is not by the expected user');
      }

      // Extract mentions from tweet
      const mentions = tweet.entities?.mentions?.map((m) => m.username.toLowerCase()) || [];

      // Also check text for @mentions (fallback)
      const textMentions = tweet.text.match(/@(\w+)/g)?.map((m) => m.slice(1).toLowerCase()) || [];
      const allMentions = [...new Set([...mentions, ...textMentions])];

      // Check required mentions
      if (requiredMentions.length > 0) {
        const requiredLower = requiredMentions.map((m) => m.toLowerCase().replace('@', ''));
        const hasAllRequired = requiredLower.every((req) => allMentions.includes(req));

        if (!hasAllRequired) {
          errors.push(`Tweet must mention: ${requiredMentions.join(', ')}`);
        }
      }

      return {
        tweetId,
        authorId: tweet.author_id,
        authorUsername: author?.username || '',
        text: tweet.text,
        mentions: allMentions,
        createdAt: new Date(tweet.created_at),
        isValid: errors.length === 0,
        errors,
      };
    });
  }

  /**
   * Check if a tweet was posted by a specific user
   */
  async checkUserTweetExists(userId: string, tweetId: string): Promise<boolean> {
    if (!this.bearerToken) {
      throw new BadRequestException('Twitter API not configured');
    }

    this.checkRateLimit('tweets');

    try {
      return await this.retryWithBackoff(async () => {
        const response = await fetch(
          `${this.API_BASE_URL}/tweets/${tweetId}?tweet.fields=author_id`,
          {
            headers: {
              Authorization: `Bearer ${this.bearerToken}`,
            },
          },
        );

        if (!response.ok) {
          return false;
        }

        const data: TwitterAPITweetResponse = await response.json();
        return data.data.author_id === userId;
      });
    } catch (error) {
      this.logger.error(`Failed to check tweet ${tweetId}:`, error.message);
      return false;
    }
  }

  /**
   * Extract tweet ID from Twitter URL
   */
  extractTweetId(tweetUrl: string): string | null {
    // Support formats:
    // - https://twitter.com/username/status/1234567890
    // - https://x.com/username/status/1234567890
    // - https://www.twitter.com/username/status/1234567890
    const match = tweetUrl.match(/(?:twitter|x)\.com\/\w+\/status\/(\d+)/);
    return match ? match[1] : null;
  }
}
