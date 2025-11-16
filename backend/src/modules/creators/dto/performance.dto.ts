import { ApiProperty } from '@nestjs/swagger';

export class PerformanceResponseDto {
  @ApiProperty({ description: 'Creator address' })
  creatorAddress: string;

  @ApiProperty({ description: 'Total trading volume across all markets (USDC)' })
  totalVolume: string;

  @ApiProperty({ description: 'Total number of markets created' })
  marketsCreated: number;

  @ApiProperty({ description: 'Number of markets resolved' })
  marketsResolved: number;

  @ApiProperty({ description: 'Resolution accuracy (%)' })
  resolutionAccuracy: number;

  @ApiProperty({ description: 'Total revenue earned (USDC)' })
  totalRevenue: string;

  @ApiProperty({ description: 'Revenue from market fees (USDC)' })
  marketFeeRevenue: string;

  @ApiProperty({ description: 'Revenue from share trading fees (USDC)' })
  shareFeeRevenue: string;

  @ApiProperty({ description: 'Total number of participants across all markets' })
  totalParticipants: number;

  @ApiProperty({ description: 'Average market volume (USDC)' })
  avgMarketVolume: string;

  @ApiProperty({ description: 'Number of share holders (if shares unlocked)' })
  shareHolders: number;

  @ApiProperty({ description: 'Total shares issued (if shares unlocked)' })
  totalSharesIssued: string;
}
