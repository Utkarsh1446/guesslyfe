import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class InitiateClaimDto {
  @ApiProperty({ description: 'Creator ID to claim dividends from', example: 'creator-uuid' })
  @IsString()
  creatorId: string;
}

export class InitiateClaimResponseDto {
  @ApiProperty({ description: 'Claim ID for tracking', example: 'claim-uuid' })
  claimId: string;

  @ApiProperty({ description: 'Amount to be claimed', example: 125.50 })
  amount: number;

  @ApiProperty({ description: 'Required tweet text', example: 'Claiming $125.50 in dividends from @creator! 🎉 #Guessly' })
  requiredTweetText: string;

  @ApiProperty({ description: 'Expiration time for claim', example: '2025-11-20T10:30:00Z' })
  expiresAt: string;

  @ApiProperty({ description: 'Instructions for user', example: 'Post the provided text as a tweet and submit the tweet URL in the next step.' })
  instructions: string;
}
