import { ApiProperty } from '@nestjs/swagger';

export class ClaimHistoryItemDto {
  @ApiProperty({ description: 'Claim ID', example: 'claim-uuid' })
  id: string;

  @ApiProperty({ description: 'Creator info' })
  creator: {
    id: string;
    twitterHandle: string;
  };

  @ApiProperty({ description: 'Amount claimed', example: 125.50 })
  amount: number;

  @ApiProperty({ description: 'Tweet URL', example: 'https://twitter.com/user/status/1234567890' })
  tweetUrl: string;

  @ApiProperty({ description: 'Transaction hash', example: '0x123...' })
  txHash: string;

  @ApiProperty({ description: 'Verified status', example: true })
  verified: boolean;

  @ApiProperty({ description: 'Claimed at timestamp', example: '2025-11-19T10:30:00Z' })
  claimedAt: string;
}

export class ClaimHistoryResponseDto {
  @ApiProperty({ description: 'Claim history', type: [ClaimHistoryItemDto] })
  claims: ClaimHistoryItemDto[];

  @ApiProperty({ description: 'Summary statistics' })
  summary: {
    totalClaimed: number;
    claimsCount: number;
    lastClaimDate: string | null;
  };

  @ApiProperty({ description: 'Pagination' })
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
