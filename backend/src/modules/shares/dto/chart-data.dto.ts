import { ApiProperty } from '@nestjs/swagger';

/**
 * Single data point in price chart
 */
export class ChartDataPointDto {
  @ApiProperty({ description: 'Timestamp of data point' })
  timestamp: Date;

  @ApiProperty({ description: 'Price per share in USDC at this time' })
  price: string;

  @ApiProperty({ description: 'Trading volume in this time period (USDC)' })
  volume: string;

  @ApiProperty({ description: 'Number of transactions in this period' })
  transactions: number;
}

/**
 * Price chart data for creator shares
 */
export class ShareChartDataDto {
  @ApiProperty({ description: 'Creator address' })
  creatorAddress: string;

  @ApiProperty({ description: 'Timeframe requested' })
  timeframe: '24h' | '7d' | '30d' | 'all';

  @ApiProperty({ description: 'Chart data points', type: [ChartDataPointDto] })
  data: ChartDataPointDto[];

  @ApiProperty({ description: 'Current price per share' })
  currentPrice: string;

  @ApiProperty({ description: 'Lowest price in timeframe' })
  lowPrice: string;

  @ApiProperty({ description: 'Highest price in timeframe' })
  highPrice: string;

  @ApiProperty({ description: 'Total volume in timeframe (USDC)' })
  totalVolume: string;

  @ApiProperty({ description: 'Price change percentage in timeframe' })
  priceChange: number;

  constructor(partial: Partial<ShareChartDataDto>) {
    Object.assign(this, partial);
  }
}
