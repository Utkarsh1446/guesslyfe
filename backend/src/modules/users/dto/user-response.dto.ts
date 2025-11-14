import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class UserResponseDto {
  @ApiProperty({ description: 'User ID' })
  id: string;

  @ApiProperty({ description: 'Twitter ID' })
  twitterId: string;

  @ApiProperty({ description: 'Twitter handle (username)' })
  twitterHandle: string;

  @ApiProperty({ description: 'Display name' })
  displayName: string;

  @ApiPropertyOptional({ description: 'User bio' })
  bio?: string;

  @ApiProperty({ description: 'Profile picture URL' })
  profilePictureUrl: string;

  @ApiPropertyOptional({ description: 'Wallet address' })
  walletAddress?: string;

  @ApiProperty({ description: 'Is user a creator' })
  isCreator: boolean;

  @ApiProperty({ description: 'Twitter follower count' })
  twitterFollowers: number;

  @ApiProperty({ description: 'Account creation date' })
  createdAt: Date;

  @ApiProperty({ description: 'Last updated date' })
  updatedAt: Date;

  constructor(partial: Partial<UserResponseDto>) {
    Object.assign(this, partial);
  }
}

export class UserPortfolioDto {
  @ApiProperty({ description: 'Creator address' })
  creatorAddress: string;

  @ApiProperty({ description: 'Creator Twitter handle' })
  creatorHandle: string;

  @ApiProperty({ description: 'Creator display name' })
  creatorName: string;

  @ApiProperty({ description: 'Number of shares held' })
  sharesHeld: string;

  @ApiProperty({ description: 'Average buy price in USDC' })
  averageBuyPrice: string;

  @ApiProperty({ description: 'Current value in USDC' })
  currentValue: string;

  @ApiProperty({ description: 'Profit/Loss in USDC' })
  profitLoss: string;

  @ApiProperty({ description: 'Profit/Loss percentage' })
  profitLossPercentage: number;

  @ApiProperty({ description: 'Total dividends earned in USDC' })
  totalDividendsEarned: string;
}

export class UserMarketPositionDto {
  @ApiProperty({ description: 'Market ID' })
  marketId: string;

  @ApiProperty({ description: 'Market question' })
  question: string;

  @ApiProperty({ description: 'Creator address' })
  creatorAddress: string;

  @ApiProperty({ description: 'YES shares held' })
  yesShares: string;

  @ApiProperty({ description: 'NO shares held' })
  noShares: string;

  @ApiProperty({ description: 'Total invested in USDC' })
  totalInvested: string;

  @ApiProperty({ description: 'Current value in USDC' })
  currentValue: string;

  @ApiProperty({ description: 'Market status' })
  status: 'ACTIVE' | 'RESOLVED' | 'CANCELLED';

  @ApiProperty({ description: 'Market end time' })
  endTime: Date;

  @ApiPropertyOptional({ description: 'Winning outcome (if resolved)' })
  winningOutcome?: boolean;

  @ApiPropertyOptional({ description: 'Claimable winnings in USDC' })
  claimableWinnings?: string;
}

export class TransactionHistoryDto {
  @ApiProperty({ description: 'Transaction ID' })
  id: string;

  @ApiProperty({ description: 'Transaction type' })
  type: 'SHARE_BUY' | 'SHARE_SELL' | 'MARKET_BET' | 'DIVIDEND_CLAIM' | 'WINNINGS_CLAIM';

  @ApiProperty({ description: 'Transaction hash' })
  transactionHash: string;

  @ApiProperty({ description: 'Creator/Market address' })
  relatedAddress: string;

  @ApiProperty({ description: 'Amount in USDC' })
  amount: string;

  @ApiProperty({ description: 'Shares/Units involved' })
  shares: string;

  @ApiProperty({ description: 'Transaction timestamp' })
  timestamp: Date;

  @ApiProperty({ description: 'Transaction status' })
  status: 'PENDING' | 'SUCCESS' | 'FAILED';

  @ApiPropertyOptional({ description: 'Additional details' })
  details?: Record<string, any>;
}
