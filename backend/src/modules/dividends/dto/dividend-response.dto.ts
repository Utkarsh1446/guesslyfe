import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class DividendEpochDto {
  @ApiProperty({ description: 'Epoch ID' })
  id: string;

  @ApiProperty({ description: 'Creator address' })
  creatorAddress: string;

  @ApiProperty({ description: 'Epoch number' })
  epochNumber: number;

  @ApiProperty({ description: 'Epoch start time' })
  startTime: Date;

  @ApiProperty({ description: 'Epoch end time' })
  endTime: Date;

  @ApiProperty({ description: 'Total dividends available in USDC' })
  totalDividends: string;

  @ApiProperty({ description: 'Total shares at snapshot' })
  totalSharesAtSnapshot: string;

  @ApiProperty({ description: 'Is epoch finalized' })
  isFinalized: boolean;

  @ApiProperty({ description: 'Finalized at timestamp' })
  finalizedAt: Date;

  @ApiProperty({ description: 'Total amount claimed in USDC' })
  totalClaimed: string;

  @ApiProperty({ description: 'Total amount unclaimed in USDC' })
  totalUnclaimed: string;

  @ApiProperty({ description: 'Number of claimants' })
  claimantCount: number;

  @ApiProperty({ description: 'Created at' })
  createdAt: Date;

  constructor(partial: Partial<DividendEpochDto>) {
    Object.assign(this, partial);
  }
}

export class ClaimableDividendDto {
  @ApiProperty({ description: 'Claimable dividend ID' })
  id: string;

  @ApiProperty({ description: 'Creator address' })
  creatorAddress: string;

  @ApiProperty({ description: 'Epoch number' })
  epochNumber: number;

  @ApiProperty({ description: 'Shareholder wallet address' })
  shareholder: string;

  @ApiProperty({ description: 'Shares held at snapshot' })
  sharesHeld: string;

  @ApiProperty({ description: 'Claimable amount in USDC' })
  claimableAmount: string;

  @ApiProperty({ description: 'Is claimed' })
  isClaimed: boolean;

  @ApiPropertyOptional({ description: 'Claimed at timestamp' })
  claimedAt?: Date;

  @ApiPropertyOptional({ description: 'Transaction hash (if claimed)' })
  transactionHash?: string;

  @ApiProperty({ description: 'Epoch end time' })
  epochEndTime: Date;

  constructor(partial: Partial<ClaimableDividendDto>) {
    Object.assign(this, partial);
  }
}

export class DividendClaimDto {
  @ApiProperty({ description: 'Claim ID' })
  id: string;

  @ApiProperty({ description: 'Creator address' })
  creatorAddress: string;

  @ApiProperty({ description: 'Epoch number' })
  epochNumber: number;

  @ApiProperty({ description: 'Claimer wallet address' })
  claimer: string;

  @ApiPropertyOptional({ description: 'Claimer Twitter handle (if known)' })
  claimerHandle?: string;

  @ApiProperty({ description: 'Amount claimed in USDC' })
  amount: string;

  @ApiProperty({ description: 'Transaction hash' })
  transactionHash: string;

  @ApiProperty({ description: 'Block number' })
  blockNumber: number;

  @ApiProperty({ description: 'Claimed at timestamp' })
  claimedAt: Date;
}

export class CurrentEpochInfoDto {
  @ApiProperty({ description: 'Creator address' })
  creatorAddress: string;

  @ApiProperty({ description: 'Current epoch number' })
  currentEpochNumber: number;

  @ApiProperty({ description: 'Current epoch start time' })
  currentEpochStart: Date;

  @ApiProperty({ description: 'Current epoch end time' })
  currentEpochEnd: Date;

  @ApiProperty({ description: 'Time remaining in current epoch (hours)' })
  hoursRemaining: number;

  @ApiProperty({ description: 'Is current epoch finalized' })
  isFinalized: boolean;

  @ApiProperty({ description: 'Accumulated dividends in current epoch (USDC)' })
  accumulatedDividends: string;

  @ApiProperty({ description: 'Total shares in circulation' })
  totalShares: string;

  @ApiProperty({ description: 'Previous epoch (if exists)' })
  previousEpoch?: DividendEpochDto;

  constructor(partial: Partial<CurrentEpochInfoDto>) {
    Object.assign(this, partial);
  }
}
