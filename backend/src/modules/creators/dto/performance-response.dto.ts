import { ApiProperty } from '@nestjs/swagger';

export class RevenueBreakdownDto {
  @ApiProperty({ description: 'Revenue from market fees' })
  marketFees: number;

  @ApiProperty({ description: 'Revenue from share fees' })
  shareFees: number;
}

export class SharePerformanceDto {
  @ApiProperty({ description: 'Current price per share' })
  currentPrice: number;

  @ApiProperty({ description: 'All-time high price' })
  allTimeHigh: number;

  @ApiProperty({ description: 'All-time low price' })
  allTimeLow: number;

  @ApiProperty({ description: 'Number of holders' })
  holders: number;

  @ApiProperty({ description: 'Total supply' })
  totalSupply: number;
}

export class PerformanceResponseDto {
  @ApiProperty({
    description: 'Performance metrics',
  })
  performance: {
    totalVolume: number;
    marketsCreated: number;
    marketsResolved: number;
    resolutionAccuracy: number;
    averageMarketVolume: number;
    totalRevenue: number;
    revenueBreakdown: RevenueBreakdownDto;
    sharePerformance: SharePerformanceDto | null;
  };
}
