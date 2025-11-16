import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class CheckEligibilityDto {
  @ApiProperty({ description: 'Twitter handle (without @)', example: 'elonmusk' })
  @IsString()
  @MinLength(1)
  twitterHandle: string;
}

export class EligibilityRequirementsDto {
  @ApiProperty({ description: 'Minimum follower count' })
  minFollowers: number;

  @ApiProperty({ description: 'Minimum post count' })
  minPosts: number;

  @ApiProperty({ description: 'Minimum engagement rate (%)' })
  minEngagementRate: number;
}

export class EligibilityCurrentStatsDto {
  @ApiProperty({ description: 'Current follower count' })
  followers: number;

  @ApiProperty({ description: 'Current post count' })
  posts: number;

  @ApiProperty({ description: 'Current engagement rate (%)' })
  engagementRate: number;
}

export class EligibilityResponseDto {
  @ApiProperty({ description: 'Whether the user is eligible' })
  eligible: boolean;

  @ApiProperty({ description: 'Creator tier (if eligible)', enum: ['BASIC', 'PREMIUM', 'ELITE'], nullable: true })
  tier: 'BASIC' | 'PREMIUM' | 'ELITE' | null;

  @ApiProperty({ description: 'Requirements for eligibility' })
  requirements: EligibilityRequirementsDto;

  @ApiProperty({ description: 'Current stats' })
  current: EligibilityCurrentStatsDto;

  @ApiProperty({ description: 'Reason for ineligibility (if not eligible)', nullable: true })
  reason?: string;
}
