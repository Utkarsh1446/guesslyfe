import { ApiProperty } from '@nestjs/swagger';

export class MarketVolumeDto {
  @ApiProperty({ description: 'Market ID' })
  id: string;

  @ApiProperty({ description: 'Market title' })
  title: string;

  @ApiProperty({ description: 'Market volume' })
  volume: number;

  @ApiProperty({ description: 'Market status' })
  status: string;

  @ApiProperty({ description: 'Created at' })
  createdAt: string;
}

export class VolumeProgressResponseDto {
  @ApiProperty({ description: 'Creator ID' })
  creatorId: string;

  @ApiProperty({ description: 'Total volume across all markets' })
  totalVolume: number;

  @ApiProperty({ description: 'Volume threshold for shares unlock', example: 30000 })
  threshold: number;

  @ApiProperty({ description: 'Progress percentage', example: 83.33 })
  progress: number;

  @ApiProperty({ description: 'Remaining volume needed', example: 5000 })
  remaining: number;

  @ApiProperty({ description: 'Shares unlocked status' })
  sharesUnlocked: boolean;

  @ApiProperty({ description: 'Markets contributing to volume', type: [MarketVolumeDto] })
  markets: MarketVolumeDto[];
}
