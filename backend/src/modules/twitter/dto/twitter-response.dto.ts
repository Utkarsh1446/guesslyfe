import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class TwitterUserDto {
  @ApiProperty({ description: 'Twitter user ID' })
  id: string;

  @ApiProperty({ description: 'Twitter handle (username)' })
  username: string;

  @ApiProperty({ description: 'Display name' })
  name: string;

  @ApiPropertyOptional({ description: 'Profile description/bio' })
  description?: string;

  @ApiProperty({ description: 'Profile picture URL' })
  profileImageUrl: string;

  @ApiProperty({ description: 'Is verified account' })
  verified: boolean;

  @ApiProperty({ description: 'Follower count' })
  followersCount: number;

  @ApiProperty({ description: 'Following count' })
  followingCount: number;

  @ApiProperty({ description: 'Tweet count' })
  tweetCount: number;

  @ApiProperty({ description: 'Account created at' })
  createdAt: Date;

  @ApiPropertyOptional({ description: 'Is creator on our platform' })
  isCreator?: boolean;

  @ApiPropertyOptional({ description: 'Creator address (if is creator)' })
  creatorAddress?: string;

  constructor(partial: Partial<TwitterUserDto>) {
    Object.assign(this, partial);
  }
}

export class TwitterMetricsDto {
  @ApiProperty({ description: 'Twitter handle' })
  username: string;

  @ApiProperty({ description: 'Follower count' })
  followersCount: number;

  @ApiProperty({ description: 'Following count' })
  followingCount: number;

  @ApiProperty({ description: 'Tweet count' })
  tweetCount: number;

  @ApiProperty({ description: 'Engagement rate (estimated)' })
  engagementRate: number;

  @ApiProperty({ description: 'Average likes per tweet (last 10 tweets)' })
  avgLikes: number;

  @ApiProperty({ description: 'Average retweets per tweet (last 10 tweets)' })
  avgRetweets: number;

  @ApiProperty({ description: 'Average replies per tweet (last 10 tweets)' })
  avgReplies: number;

  @ApiProperty({ description: 'Last fetched at' })
  lastFetched: Date;

  constructor(partial: Partial<TwitterMetricsDto>) {
    Object.assign(this, partial);
  }
}

export class SyncResultDto {
  @ApiProperty({ description: 'Was sync successful' })
  success: boolean;

  @ApiProperty({ description: 'Creator address' })
  creatorAddress: string;

  @ApiProperty({ description: 'Updated fields' })
  updatedFields: string[];

  @ApiProperty({ description: 'Twitter data' })
  twitterData: TwitterUserDto;

  constructor(partial: Partial<SyncResultDto>) {
    Object.assign(this, partial);
  }
}
