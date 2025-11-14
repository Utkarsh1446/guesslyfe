import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SharePriceQuoteDto {
  @ApiProperty({ description: 'Creator address' })
  creatorAddress: string;

  @ApiProperty({ description: 'Number of shares' })
  amount: string;

  @ApiProperty({ description: 'Price in USDC' })
  priceInUSDC: string;

  @ApiProperty({ description: 'Price per share in USDC' })
  pricePerShare: string;

  @ApiProperty({ description: 'Protocol fee in USDC' })
  protocolFee: string;

  @ApiProperty({ description: 'Creator fee in USDC' })
  creatorFee: string;

  @ApiProperty({ description: 'Total cost including fees (for buy) or net proceeds (for sell)' })
  totalCost: string;

  constructor(partial: Partial<SharePriceQuoteDto>) {
    Object.assign(this, partial);
  }
}

export class TradeResultDto {
  @ApiProperty({ description: 'Transaction hash' })
  transactionHash: string;

  @ApiProperty({ description: 'Creator address' })
  creatorAddress: string;

  @ApiProperty({ description: 'Trade type' })
  tradeType: 'BUY' | 'SELL';

  @ApiProperty({ description: 'Number of shares traded' })
  shareAmount: string;

  @ApiProperty({ description: 'Price per share in USDC' })
  pricePerShare: string;

  @ApiProperty({ description: 'Total amount in USDC' })
  totalAmount: string;

  @ApiProperty({ description: 'Protocol fee in USDC' })
  protocolFee: string;

  @ApiProperty({ description: 'Creator fee in USDC' })
  creatorFee: string;

  @ApiProperty({ description: 'Block number' })
  blockNumber: number;

  @ApiProperty({ description: 'Timestamp' })
  timestamp: Date;

  constructor(partial: Partial<TradeResultDto>) {
    Object.assign(this, partial);
  }
}

export class ShareHistoryDto {
  @ApiProperty({ description: 'Transaction ID' })
  id: string;

  @ApiProperty({ description: 'Transaction type' })
  transactionType: 'BUY' | 'SELL';

  @ApiProperty({ description: 'Buyer/Seller wallet address' })
  trader: string;

  @ApiPropertyOptional({ description: 'Trader Twitter handle (if known)' })
  traderHandle?: string;

  @ApiProperty({ description: 'Number of shares' })
  shares: string;

  @ApiProperty({ description: 'Price per share in USDC' })
  pricePerShare: string;

  @ApiProperty({ description: 'Total price in USDC' })
  totalPrice: string;

  @ApiProperty({ description: 'Protocol fee in USDC' })
  protocolFee: string;

  @ApiProperty({ description: 'Creator fee in USDC' })
  creatorFee: string;

  @ApiProperty({ description: 'Transaction hash' })
  transactionHash: string;

  @ApiProperty({ description: 'Block number' })
  blockNumber: number;

  @ApiProperty({ description: 'Timestamp' })
  timestamp: Date;
}

export class TrendingShareDto {
  @ApiProperty({ description: 'Creator address' })
  creatorAddress: string;

  @ApiProperty({ description: 'Creator Twitter handle' })
  twitterHandle: string;

  @ApiProperty({ description: 'Creator display name' })
  displayName: string;

  @ApiProperty({ description: 'Profile picture URL' })
  profilePictureUrl: string;

  @ApiProperty({ description: '24h trading volume in USDC' })
  volume24h: string;

  @ApiProperty({ description: '24h price change percentage' })
  priceChange24h: number;

  @ApiProperty({ description: 'Current price per share in USDC' })
  currentPrice: string;

  @ApiProperty({ description: 'Number of unique traders in 24h' })
  traders24h: number;

  @ApiProperty({ description: 'Total supply of shares' })
  totalSupply: string;
}
