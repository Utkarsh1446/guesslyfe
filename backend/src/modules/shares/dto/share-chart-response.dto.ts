import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';

export enum ChartTimeframe {
  HOUR_24 = '24h',
  DAYS_7 = '7d',
  DAYS_30 = '30d',
  ALL = 'all',
}

export enum ChartInterval {
  HOUR_1 = '1h',
  HOUR_4 = '4h',
  DAY_1 = '1d',
}

export class ShareChartQueryDto {
  @ApiProperty({
    description: 'Timeframe for chart data',
    enum: ChartTimeframe,
    default: ChartTimeframe.DAYS_7,
    required: false,
  })
  @IsOptional()
  @IsEnum(ChartTimeframe)
  timeframe?: ChartTimeframe;

  @ApiProperty({
    description: 'Data interval',
    enum: ChartInterval,
    default: ChartInterval.HOUR_1,
    required: false,
  })
  @IsOptional()
  @IsEnum(ChartInterval)
  interval?: ChartInterval;
}

export class ShareChartDataPointDto {
  @ApiProperty({
    description: 'Timestamp',
    example: '2025-01-01T00:00:00Z',
  })
  timestamp: string;

  @ApiProperty({ description: 'Share price', example: 2.5 })
  price: number;

  @ApiProperty({ description: 'Trading volume', example: 1000.0 })
  volume: number;

  @ApiProperty({ description: 'Total supply', example: 500 })
  supply: number;
}

export class ShareChartSummaryDto {
  @ApiProperty({ description: 'Current price', example: 2.5 })
  currentPrice: number;

  @ApiProperty({ description: '24h price change', example: 0.25 })
  priceChange24h: number;

  @ApiProperty({ description: '24h price change percentage', example: 11.11 })
  priceChangePercent24h: number;

  @ApiProperty({ description: '24h volume', example: 5000.0 })
  volume24h: number;

  @ApiProperty({ description: 'All-time high price', example: 3.0 })
  allTimeHigh: number;

  @ApiProperty({ description: 'All-time low price', example: 0.5 })
  allTimeLow: number;
}

export class ShareChartResponseDto {
  @ApiProperty({
    description: 'Chart data points',
    type: [ShareChartDataPointDto],
  })
  data: ShareChartDataPointDto[];

  @ApiProperty({
    description: 'Summary statistics',
    type: ShareChartSummaryDto,
  })
  summary: ShareChartSummaryDto;
}
