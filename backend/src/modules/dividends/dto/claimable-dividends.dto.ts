import { ApiProperty } from '@nestjs/swagger';

export class ClaimableDividendDto {
  @ApiProperty({ description: 'Creator ID', example: 'creator-uuid' })
  creatorId: string;

  @ApiProperty({ description: 'Creator Twitter handle', example: '@creator' })
  creatorHandle: string;

  @ApiProperty({ description: 'Claimable amount in USDC', example: 125.50 })
  amount: number;

  @ApiProperty({ description: 'Number of shares owned', example: 50 })
  sharesOwned: number;

  @ApiProperty({ description: 'Last epoch distributed', example: 5 })
  lastEpochDistributed: number;
}

export class ClaimableDividendsResponseDto {
  @ApiProperty({ description: 'Total claimable across all creators', example: 450.75 })
  totalClaimable: number;

  @ApiProperty({ description: 'Claimable dividends by creator', type: [ClaimableDividendDto] })
  dividends: ClaimableDividendDto[];

  @ApiProperty({ description: 'Number of creators with claimable dividends', example: 3 })
  creatorsCount: number;
}
