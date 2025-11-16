import { ApiProperty } from '@nestjs/swagger';

export class VolumeProgressMarketDto {
  @ApiProperty({ description: 'Market ID' })
  marketId: string;

  @ApiProperty({ description: 'Market question' })
  question: string;

  @ApiProperty({ description: 'Volume from this market (USDC)' })
  volume: string;

  @ApiProperty({ description: 'Market status' })
  status: string;

  @ApiProperty({ description: 'Market creation date' })
  createdAt: Date;
}

export class VolumeProgressResponseDto {
  @ApiProperty({ description: 'Creator address' })
  creatorAddress: string;

  @ApiProperty({ description: 'Total volume across all markets (USDC)' })
  totalVolume: string;

  @ApiProperty({ description: 'Volume threshold to unlock shares (USDC)' })
  threshold: string;

  @ApiProperty({ description: 'Progress percentage (0-100)' })
  progress: number;

  @ApiProperty({ description: 'Remaining volume needed (USDC)' })
  remaining: string;

  @ApiProperty({ description: 'Are shares unlocked' })
  sharesUnlocked: boolean;

  @ApiProperty({ description: 'Breakdown by market' })
  markets: VolumeProgressMarketDto[];

  @ApiProperty({ description: 'Total number of markets created' })
  totalMarkets: number;
}
