import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsUrl } from 'class-validator';

export class CompleteClaimDto {
  @ApiProperty({ description: 'Claim ID from initiate step', example: 'claim-uuid' })
  @IsString()
  claimId: string;

  @ApiProperty({ description: 'Tweet URL with claim announcement', example: 'https://twitter.com/user/status/1234567890' })
  @IsUrl()
  tweetUrl: string;
}

export class CompleteClaimResponseDto {
  @ApiProperty({ description: 'Success status', example: true })
  success: boolean;

  @ApiProperty({ description: 'Claim ID', example: 'claim-uuid' })
  claimId: string;

  @ApiProperty({ description: 'Amount claimed', example: 125.50 })
  amount: number;

  @ApiProperty({ description: 'Transaction hash', example: '0x123...' })
  txHash: string;

  @ApiProperty({ description: 'Verified tweet ID', example: '1234567890' })
  tweetId: string;

  @ApiProperty({ description: 'Claimed at timestamp', example: '2025-11-19T10:30:00Z' })
  claimedAt: string;

  @ApiProperty({ description: 'Message for user', example: 'Dividends successfully claimed! Funds will arrive shortly.' })
  message: string;
}
