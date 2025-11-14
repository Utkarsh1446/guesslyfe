import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class MarketResponseDto {
  @ApiProperty({ description: 'Market ID' })
  marketId: string;

  @ApiProperty({ description: 'Creator wallet address' })
  creatorAddress: string;

  @ApiProperty({ description: 'Creator Twitter handle' })
  creatorHandle: string;

  @ApiProperty({ description: 'Creator display name' })
  creatorName: string;

  @ApiProperty({ description: 'Market question' })
  question: string;

  @ApiProperty({ description: 'Market description' })
  description: string;

  @ApiProperty({ description: 'Market category/tags' })
  category: string;

  @ApiProperty({ description: 'Market end time' })
  endTime: Date;

  @ApiProperty({ description: 'Total liquidity pool in USDC' })
  liquidityPool: string;

  @ApiProperty({ description: 'YES outcome probability (0-100)' })
  yesProbability: number;

  @ApiProperty({ description: 'NO outcome probability (0-100)' })
  noProbability: number;

  @ApiProperty({ description: 'Total YES shares' })
  totalYesShares: string;

  @ApiProperty({ description: 'Total NO shares' })
  totalNoShares: string;

  @ApiProperty({ description: 'Market status' })
  status: 'ACTIVE' | 'RESOLVED' | 'CANCELLED';

  @ApiProperty({ description: 'Is market resolved' })
  resolved: boolean;

  @ApiPropertyOptional({ description: 'Winning outcome (if resolved)' })
  winningOutcome?: boolean;

  @ApiProperty({ description: 'Is market cancelled' })
  cancelled: boolean;

  @ApiProperty({ description: 'Total trading volume in USDC' })
  totalVolume: string;

  @ApiProperty({ description: 'Number of unique participants' })
  participantCount: number;

  @ApiProperty({ description: 'Market creation date' })
  createdAt: Date;

  constructor(partial: Partial<MarketResponseDto>) {
    Object.assign(this, partial);
  }
}

export class MarketPriceQuoteDto {
  @ApiProperty({ description: 'Market ID' })
  marketId: string;

  @ApiProperty({ description: 'Outcome (YES or NO)' })
  outcome: 'YES' | 'NO';

  @ApiProperty({ description: 'Amount to bet in USDC' })
  betAmount: string;

  @ApiProperty({ description: 'Expected shares to receive' })
  expectedShares: string;

  @ApiProperty({ description: 'Price per share in USDC' })
  pricePerShare: string;

  @ApiProperty({ description: 'Current probability for this outcome' })
  currentProbability: number;

  @ApiProperty({ description: 'New probability after bet' })
  newProbability: number;

  constructor(partial: Partial<MarketPriceQuoteDto>) {
    Object.assign(this, partial);
  }
}

export class MarketPositionDto {
  @ApiProperty({ description: 'Position ID' })
  id: string;

  @ApiProperty({ description: 'User wallet address' })
  userAddress: string;

  @ApiPropertyOptional({ description: 'User Twitter handle (if known)' })
  userHandle?: string;

  @ApiProperty({ description: 'YES shares held' })
  yesShares: string;

  @ApiProperty({ description: 'NO shares held' })
  noShares: string;

  @ApiProperty({ description: 'Total invested in USDC' })
  totalInvested: string;

  @ApiProperty({ description: 'Current value in USDC' })
  currentValue: string;

  @ApiProperty({ description: 'Profit/Loss in USDC' })
  profitLoss: string;

  @ApiPropertyOptional({ description: 'Claimable winnings in USDC (if resolved)' })
  claimableWinnings?: string;

  @ApiProperty({ description: 'Last updated' })
  lastUpdated: Date;
}

export class MarketTradeDto {
  @ApiProperty({ description: 'Trade ID' })
  id: string;

  @ApiProperty({ description: 'Trader wallet address' })
  traderAddress: string;

  @ApiPropertyOptional({ description: 'Trader Twitter handle (if known)' })
  traderHandle?: string;

  @ApiProperty({ description: 'Outcome traded (YES or NO)' })
  outcome: boolean;

  @ApiProperty({ description: 'Amount bet in USDC' })
  amount: string;

  @ApiProperty({ description: 'Shares purchased' })
  sharesPurchased: string;

  @ApiProperty({ description: 'Price per share in USDC' })
  pricePerShare: string;

  @ApiProperty({ description: 'Transaction hash' })
  transactionHash: string;

  @ApiProperty({ description: 'Block number' })
  blockNumber: number;

  @ApiProperty({ description: 'Timestamp' })
  timestamp: Date;
}

export class TrendingMarketDto {
  @ApiProperty({ description: 'Market ID' })
  marketId: string;

  @ApiProperty({ description: 'Market question' })
  question: string;

  @ApiProperty({ description: 'Creator address' })
  creatorAddress: string;

  @ApiProperty({ description: 'Creator Twitter handle' })
  creatorHandle: string;

  @ApiProperty({ description: '24h trading volume in USDC' })
  volume24h: string;

  @ApiProperty({ description: '24h traders' })
  traders24h: number;

  @ApiProperty({ description: 'YES probability' })
  yesProbability: number;

  @ApiProperty({ description: 'Total liquidity in USDC' })
  totalLiquidity: string;

  @ApiProperty({ description: 'Market end time' })
  endTime: Date;

  @ApiProperty({ description: 'Time remaining in hours' })
  hoursRemaining: number;
}
