import { ApiProperty } from '@nestjs/swagger';

export class ShareHoldingDto {
  @ApiProperty({ description: 'Creator ID' })
  creatorId: string;

  @ApiProperty({ description: 'Creator name' })
  creatorName: string;

  @ApiProperty({ description: 'Shares held' })
  sharesHeld: number;

  @ApiProperty({ description: 'Average buy price' })
  averageBuyPrice: number;

  @ApiProperty({ description: 'Current price per share' })
  currentPrice: number;

  @ApiProperty({ description: 'Total value' })
  totalValue: number;

  @ApiProperty({ description: 'Unrealized PnL' })
  unrealizedPnL: number;
}

export class MarketPositionDto {
  @ApiProperty({ description: 'Market ID' })
  marketId: string;

  @ApiProperty({ description: 'Market title' })
  marketTitle: string;

  @ApiProperty({ description: 'Outcome index' })
  outcome: number;

  @ApiProperty({ description: 'Shares held' })
  shares: number;

  @ApiProperty({ description: 'Cost basis' })
  costBasis: number;

  @ApiProperty({ description: 'Current value' })
  currentValue: number;

  @ApiProperty({ description: 'Market status' })
  status: string;
}

export class UserPortfolioResponseDto {
  @ApiProperty({
    description: 'Portfolio summary',
    type: 'object',
    properties: {
      totalValue: { type: 'number' },
      totalPnL: { type: 'number' },
    },
  })
  portfolio: {
    totalValue: number;
    totalPnL: number;
    shares: ShareHoldingDto[];
    marketPositions: MarketPositionDto[];
  };

  @ApiProperty({
    description: 'Pagination',
    type: 'object',
    properties: {
      page: { type: 'number' },
      limit: { type: 'number' },
      total: { type: 'number' },
    },
  })
  pagination: {
    page: number;
    limit: number;
    total: number;
  };
}
