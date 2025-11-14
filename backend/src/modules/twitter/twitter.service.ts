import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { Creator } from '../../database/entities/creator.entity';
import { User } from '../../database/entities/user.entity';
import { TwitterUserDto, TwitterMetricsDto, SyncResultDto } from './dto/twitter-response.dto';

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
    public_metrics: {
      like_count: number;
      retweet_count: number;
      reply_count: number;
      quote_count: number;
    };
  }>;
}

@Injectable()
export class TwitterService {
  private readonly logger = new Logger(TwitterService.name);
  private readonly bearerToken: string;
  private readonly API_BASE_URL = 'https://api.twitter.com/2';

  constructor(
    @InjectRepository(Creator)
    private readonly creatorRepository: Repository<Creator>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly configService: ConfigService,
  ) {
    this.bearerToken = this.configService.get<string>('twitter.bearerToken') || '';

    if (!this.bearerToken) {
      this.logger.warn('Twitter Bearer Token not configured. Twitter API features will be disabled.');
    }
  }

  /**
   * Get Twitter user profile by handle
   */
  async getUserByHandle(handle: string): Promise<TwitterUserDto> {
    if (!this.bearerToken) {
      throw new BadRequestException('Twitter API not configured');
    }

    try {
      const cleanHandle = handle.startsWith('@') ? handle.slice(1) : handle;

      const response = await fetch(
        `${this.API_BASE_URL}/users/by/username/${cleanHandle}?user.fields=description,profile_image_url,verified,public_metrics,created_at`,
        {
          headers: {
            Authorization: `Bearer ${this.bearerToken}`,
          },
        },
      );

      if (!response.ok) {
        if (response.status === 404) {
          throw new NotFoundException(`Twitter user @${cleanHandle} not found`);
        }
        throw new Error(`Twitter API error: ${response.statusText}`);
      }

      const data: TwitterAPIUserResponse = await response.json();

      // Check if user is a creator on our platform
      const user = await this.userRepository.findOne({
        where: { twitterId: data.data.id },
        relations: ['creator'],
      });

      return new TwitterUserDto({
        id: data.data.id,
        username: data.data.username,
        name: data.data.name,
        description: data.data.description,
        profileImageUrl: data.data.profile_image_url,
        verified: data.data.verified || false,
        followersCount: data.data.public_metrics.followers_count,
        followingCount: data.data.public_metrics.following_count,
        tweetCount: data.data.public_metrics.tweet_count,
        createdAt: new Date(data.data.created_at),
        isCreator: !!user?.creator,
        creatorAddress: user?.creator?.creatorAddress,
      });
    } catch (error) {
      this.logger.error(`Failed to fetch Twitter user @${handle}:`, error.message);
      throw error;
    }
  }

  /**
   * Get Twitter metrics for a user
   */
  async getUserMetrics(handle: string): Promise<TwitterMetricsDto> {
    if (!this.bearerToken) {
      throw new BadRequestException('Twitter API not configured');
    }

    try {
      const cleanHandle = handle.startsWith('@') ? handle.slice(1) : handle;

      // Get user profile first
      const userResponse = await fetch(
        `${this.API_BASE_URL}/users/by/username/${cleanHandle}?user.fields=public_metrics`,
        {
          headers: {
            Authorization: `Bearer ${this.bearerToken}`,
          },
        },
      );

      if (!userResponse.ok) {
        throw new NotFoundException(`Twitter user @${cleanHandle} not found`);
      }

      const userData: TwitterAPIUserResponse = await userResponse.json();
      const userId = userData.data.id;

      // Get recent tweets to calculate engagement
      const tweetsResponse = await fetch(
        `${this.API_BASE_URL}/users/${userId}/tweets?max_results=10&tweet.fields=public_metrics`,
        {
          headers: {
            Authorization: `Bearer ${this.bearerToken}`,
          },
        },
      );

      let avgLikes = 0;
      let avgRetweets = 0;
      let avgReplies = 0;
      let engagementRate = 0;

      if (tweetsResponse.ok) {
        const tweetsData: TwitterAPITweetsResponse = await tweetsResponse.json();

        if (tweetsData.data && tweetsData.data.length > 0) {
          const totalLikes = tweetsData.data.reduce(
            (sum, tweet) => sum + tweet.public_metrics.like_count,
            0,
          );
          const totalRetweets = tweetsData.data.reduce(
            (sum, tweet) => sum + tweet.public_metrics.retweet_count,
            0,
          );
          const totalReplies = tweetsData.data.reduce(
            (sum, tweet) => sum + tweet.public_metrics.reply_count,
            0,
          );

          avgLikes = totalLikes / tweetsData.data.length;
          avgRetweets = totalRetweets / tweetsData.data.length;
          avgReplies = totalReplies / tweetsData.data.length;

          // Calculate engagement rate: (avg interactions / followers) * 100
          const avgInteractions = avgLikes + avgRetweets + avgReplies;
          engagementRate =
            userData.data.public_metrics.followers_count > 0
              ? (avgInteractions / userData.data.public_metrics.followers_count) * 100
              : 0;
        }
      }

      return new TwitterMetricsDto({
        username: userData.data.username,
        followersCount: userData.data.public_metrics.followers_count,
        followingCount: userData.data.public_metrics.following_count,
        tweetCount: userData.data.public_metrics.tweet_count,
        engagementRate: Math.round(engagementRate * 100) / 100,
        avgLikes: Math.round(avgLikes),
        avgRetweets: Math.round(avgRetweets),
        avgReplies: Math.round(avgReplies),
        lastFetched: new Date(),
      });
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
      const twitterData = await this.getUserByHandle(creator.user.twitterHandle);

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
   * Search for potential creators on Twitter
   */
  async searchCreators(query: string, limit: number = 10): Promise<TwitterUserDto[]> {
    if (!this.bearerToken) {
      throw new BadRequestException('Twitter API not configured');
    }

    try {
      // Note: Twitter API v2 search requires different permissions
      // For now, we'll return an empty array and log a warning
      this.logger.warn('Twitter search requires elevated API access. Feature not fully implemented.');

      return [];
    } catch (error) {
      this.logger.error(`Failed to search Twitter:`, error.message);
      throw error;
    }
  }
}
