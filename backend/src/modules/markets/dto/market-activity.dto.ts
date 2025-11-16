import { ApiProperty } from '@nestjs/swagger';

export class MarketActivityDto {
  @ApiProperty({ description: 'Activity ID' })
  id: string;

  @ApiProperty({ description: 'Activity type' })
  type: 'TRADE' | 'CREATED' | 'RESOLVED' | 'CANCELLED';

  @ApiProperty({ description: 'User address involved' })
  userAddress?: string;

  @ApiProperty({ description: 'User Twitter handle (if known)' })
  userHandle?: string;

  @ApiProperty({ description: 'Activity description' })
  description: string;

  @ApiProperty({ description: 'Related amount (if applicable)' })
  amount?: string;

  @ApiProperty({ description: 'Related outcome (if applicable)' })
  outcome?: boolean;

  @ApiProperty({ description: 'Transaction hash' })
  transactionHash?: string;

  @ApiProperty({ description: 'Timestamp' })
  timestamp: Date;
}

export class UserPositionResponseDto {
  @ApiProperty({ description: 'Market ID' })
  marketId: string;

  @ApiProperty({ description: 'User wallet address' })
  userAddress: string;

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

  @ApiProperty({ description: 'Profit/Loss percentage' })
  profitLossPercentage: number;

  @ApiProperty({ description: 'Claimable winnings (if market resolved)' })
  claimableWinnings?: string;

  @ApiProperty({ description: 'Market status' })
  marketStatus: 'ACTIVE' | 'RESOLVED' | 'CANCELLED';

  @ApiProperty({ description: 'Last updated' })
  lastUpdated: Date;

  constructor(partial: Partial<UserPositionResponseDto>) {
    Object.assign(this, partial);
  }
}
