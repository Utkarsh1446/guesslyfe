import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreatorResponseDto {
  @ApiProperty({ description: 'Creator ID' })
  id: string;

  @ApiProperty({ description: 'Creator wallet address' })
  creatorAddress: string;

  @ApiProperty({ description: 'Twitter handle' })
  twitterHandle: string;

  @ApiProperty({ description: 'Display name' })
  displayName: string;

  @ApiPropertyOptional({ description: 'Creator bio' })
  bio?: string;

  @ApiProperty({ description: 'Profile picture URL' })
  profilePictureUrl: string;

  @ApiPropertyOptional({ description: 'Website URL' })
  websiteUrl?: string;

  @ApiProperty({ description: 'Twitter follower count' })
  twitterFollowers: number;

  @ApiProperty({ description: 'Share contract address (null if not unlocked)' })
  shareContractAddress: string | null;

  @ApiProperty({ description: 'Are shares unlocked for trading' })
  sharesUnlocked: boolean;

  @ApiProperty({ description: 'Current trading volume in USDC' })
  currentVolume: string;

  @ApiProperty({ description: 'Volume threshold to unlock shares' })
  volumeThreshold: string;

  @ApiProperty({ description: 'Remaining volume needed to unlock' })
  remainingVolume: string;

  @ApiProperty({ description: 'Creator approval status' })
  status: 'PENDING' | 'APPROVED' | 'REJECTED';

  @ApiProperty({ description: 'Date creator was created' })
  createdAt: Date;

  @ApiProperty({ description: 'Last updated date' })
  updatedAt: Date;

  constructor(partial: Partial<CreatorResponseDto>) {
    Object.assign(this, partial);
  }
}

export class CreatorShareInfoDto {
  @ApiProperty({ description: 'Creator address' })
  creatorAddress: string;

  @ApiProperty({ description: 'Share contract address' })
  shareContractAddress: string;

  @ApiProperty({ description: 'Current total supply of shares' })
  currentSupply: string;

  @ApiProperty({ description: 'Number of unique shareholders' })
  shareholderCount: number;

  @ApiProperty({ description: 'Buy price for 1 share (in USDC)' })
  buyPriceForOne: string;

  @ApiProperty({ description: 'Sell price for 1 share (in USDC)' })
  sellPriceForOne: string;

  @ApiProperty({ description: 'Total trading volume in USDC' })
  totalVolume: string;

  @ApiProperty({ description: 'Are shares unlocked' })
  isUnlocked: boolean;
}

export class ShareholderDto {
  @ApiProperty({ description: 'Shareholder wallet address' })
  address: string;

  @ApiProperty({ description: 'Number of shares held' })
  sharesHeld: string;

  @ApiProperty({ description: 'Percentage of total supply' })
  percentageOfSupply: number;

  @ApiPropertyOptional({ description: 'Twitter handle (if linked)' })
  twitterHandle?: string;

  @ApiPropertyOptional({ description: 'Display name (if linked)' })
  displayName?: string;
}

export class CreatorMarketDto {
  @ApiProperty({ description: 'Market ID' })
  marketId: string;

  @ApiProperty({ description: 'Market question' })
  question: string;

  @ApiProperty({ description: 'Market description' })
  description: string;

  @ApiProperty({ description: 'Market end time' })
  endTime: Date;

  @ApiProperty({ description: 'Total liquidity pool in USDC' })
  liquidityPool: string;

  @ApiProperty({ description: 'YES outcome probability' })
  yesProbability: number;

  @ApiProperty({ description: 'NO outcome probability' })
  noProbability: number;

  @ApiProperty({ description: 'Market status' })
  status: 'ACTIVE' | 'RESOLVED' | 'CANCELLED';

  @ApiPropertyOptional({ description: 'Winning outcome (if resolved)' })
  winningOutcome?: boolean;

  @ApiProperty({ description: 'Total volume traded in USDC' })
  totalVolume: string;

  @ApiProperty({ description: 'Number of participants' })
  participantCount: number;

  @ApiProperty({ description: 'Market creation date' })
  createdAt: Date;
}
