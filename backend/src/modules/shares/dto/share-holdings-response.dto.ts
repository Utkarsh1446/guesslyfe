import { ApiProperty } from '@nestjs/swagger';

export class ShareHoldingDto {
  @ApiProperty({ description: 'Creator ID', example: 'uuid-here' })
  creatorId: string;

  @ApiProperty({ description: 'Creator name', example: 'Creator Name' })
  creatorName: string;

  @ApiProperty({ description: 'Creator Twitter handle', example: '@creator' })
  creatorHandle: string;

  @ApiProperty({ description: 'Number of shares held', example: 100 })
  sharesHeld: number;

  @ApiProperty({ description: 'Average buy price per share', example: 1.5 })
  averageBuyPrice: number;

  @ApiProperty({ description: 'Current price per share', example: 2.0 })
  currentPrice: number;

  @ApiProperty({ description: 'Total value in USDC', example: 200.0 })
  totalValue: number;

  @ApiProperty({ description: 'Total amount invested', example: 150.0 })
  totalInvested: number;

  @ApiProperty({ description: 'Unrealized profit/loss', example: 50.0 })
  unrealizedPnL: number;

  @ApiProperty({ description: 'Unrealized PnL percentage', example: 33.33 })
  unrealizedPnLPercent: number;

  @ApiProperty({ description: 'Percentage of total supply', example: 10.0 })
  percentOfSupply: number;
}

export class PortfolioSummaryDto {
  @ApiProperty({ description: 'Total portfolio value', example: 1000.0 })
  totalValue: number;

  @ApiProperty({ description: 'Total amount invested', example: 800.0 })
  totalInvested: number;

  @ApiProperty({ description: 'Total profit/loss', example: 200.0 })
  totalPnL: number;

  @ApiProperty({ description: 'Total PnL percentage', example: 25.0 })
  totalPnLPercent: number;
}

export class ShareHoldingsResponseDto {
  @ApiProperty({
    description: 'Array of share holdings',
    type: [ShareHoldingDto],
  })
  holdings: ShareHoldingDto[];

  @ApiProperty({
    description: 'Portfolio summary',
    type: PortfolioSummaryDto,
  })
  summary: PortfolioSummaryDto;
}
