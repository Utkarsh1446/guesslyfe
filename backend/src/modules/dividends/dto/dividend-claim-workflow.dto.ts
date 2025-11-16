import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsString, IsNotEmpty, IsUrl } from 'class-validator';

/**
 * DTO for claimable dividends by creator
 */
export class ClaimableByCreatorDto {
  @ApiProperty({ description: 'Creator address' })
  creatorAddress: string;

  @ApiProperty({ description: 'Creator Twitter handle' })
  creatorHandle: string;

  @ApiProperty({ description: 'Total claimable amount in USDC' })
  amount: string;

  @ApiProperty({ description: 'Number of epochs with claimable dividends' })
  epochCount: number;

  @ApiProperty({ description: 'Earliest epoch number' })
  earliestEpoch: number;

  @ApiProperty({ description: 'Latest epoch number' })
  latestEpoch: number;

  @ApiProperty({ description: 'Can claim (meets minimum requirements)' })
  canClaim: boolean;

  @ApiProperty({ description: 'Days since first claimable dividend' })
  daysSinceFirst: number;

  constructor(partial: Partial<ClaimableByCreatorDto>) {
    Object.assign(this, partial);
  }
}

/**
 * Response DTO for GET /dividends/claimable/:address
 */
export class ClaimableDividendsResponseDto {
  @ApiProperty({ description: 'Total claimable amount across all creators (USDC)' })
  total: string;

  @ApiProperty({ description: 'Breakdown by creator', type: [ClaimableByCreatorDto] })
  byCreator: ClaimableByCreatorDto[];

  @ApiProperty({
    description: 'Claim requirements',
    example: { minAmount: 5, minDays: 7 }
  })
  requirements: {
    minAmount: number;
    minDays: number;
  };

  @ApiProperty({ description: 'Can claim any dividends (meets requirements)' })
  canClaim: boolean;

  @ApiProperty({ description: 'User wallet address' })
  userAddress: string;

  constructor(partial: Partial<ClaimableDividendsResponseDto>) {
    Object.assign(this, partial);
  }
}

/**
 * Request DTO for POST /dividends/initiate-claim
 */
export class InitiateClaimDto {
  @ApiProperty({
    description: 'Creator addresses to claim dividends from',
    type: [String],
    example: ['0x1234...', '0x5678...']
  })
  @IsArray()
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  creatorIds: string[];
}

/**
 * Response DTO for POST /dividends/initiate-claim
 */
export class InitiateClaimResponseDto {
  @ApiProperty({ description: 'Tweet text to post' })
  tweetText: string;

  @ApiProperty({ description: 'Tweet tracking ID (for internal use)' })
  tweetTrackingId: string;

  @ApiProperty({ description: 'Total amount to claim (USDC)' })
  totalAmount: string;

  @ApiProperty({ description: 'Creator handles mentioned' })
  creatorHandles: string[];

  @ApiProperty({ description: 'Expiration time (1 hour from now)' })
  expiresAt: Date;

  constructor(partial: Partial<InitiateClaimResponseDto>) {
    Object.assign(this, partial);
  }
}

/**
 * Request DTO for POST /dividends/complete-claim
 */
export class CompleteClaimDto {
  @ApiProperty({
    description: 'Tweet URL',
    example: 'https://twitter.com/user/status/1234567890123456789'
  })
  @IsUrl()
  @IsNotEmpty()
  tweetUrl: string;

  @ApiProperty({
    description: 'Creator addresses to claim from (must match initiate-claim)',
    type: [String]
  })
  @IsArray()
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  creatorIds: string[];
}

/**
 * Response DTO for POST /dividends/complete-claim
 */
export class CompleteClaimResponseDto {
  @ApiProperty({ description: 'Unsigned transaction for user to sign' })
  unsignedTx: {
    to: string;
    data: string;
    value: string;
    gasLimit: string;
    description: string;
  };

  @ApiProperty({ description: 'Total amount to claim (USDC)' })
  amount: string;

  @ApiProperty({ description: 'Creators being claimed from', type: [String] })
  creators: string[];

  @ApiProperty({ description: 'Tweet ID that was verified' })
  tweetId: string;

  @ApiProperty({ description: 'Tweet verification status' })
  tweetVerified: boolean;

  constructor(partial: Partial<CompleteClaimResponseDto>) {
    Object.assign(this, partial);
  }
}

/**
 * DTO for claim history item
 */
export class DividendClaimHistoryDto {
  @ApiProperty({ description: 'Claim ID' })
  id: string;

  @ApiProperty({ description: 'Creator addresses claimed from', type: [String] })
  creators: string[];

  @ApiProperty({ description: 'Total amount claimed (USDC)' })
  amount: string;

  @ApiProperty({ description: 'Tweet URL' })
  tweetUrl: string;

  @ApiProperty({ description: 'Transaction hash' })
  transactionHash: string;

  @ApiProperty({ description: 'Block number' })
  blockNumber: number;

  @ApiProperty({ description: 'Claimed at timestamp' })
  claimedAt: Date;

  constructor(partial: Partial<DividendClaimHistoryDto>) {
    Object.assign(this, partial);
  }
}

/**
 * Response DTO for GET /dividends/history/:address
 */
export class ClaimHistoryResponseDto {
  @ApiProperty({ description: 'Claim history', type: [DividendClaimHistoryDto] })
  claims: DividendClaimHistoryDto[];

  @ApiProperty({ description: 'Total number of claims' })
  total: number;

  @ApiProperty({ description: 'Current page' })
  page: number;

  @ApiProperty({ description: 'Total pages' })
  totalPages: number;

  constructor(partial: Partial<ClaimHistoryResponseDto>) {
    Object.assign(this, partial);
  }
}
