import { ApiProperty } from '@nestjs/swagger';

export class EligibilityRequirementDto {
  @ApiProperty({ description: 'Required value' })
  required: number;

  @ApiProperty({ description: 'Current value' })
  current: number;

  @ApiProperty({ description: 'Requirement met' })
  met: boolean;
}

export class AlternativeStakeDto {
  @ApiProperty({ description: 'Stake amount in USDC', example: 100 })
  amount: number;

  @ApiProperty({ description: 'Is stake refundable', example: true })
  refundable: boolean;
}

export class EligibilityCheckResponseDto {
  @ApiProperty({ description: 'Is user eligible', example: true })
  eligible: boolean;

  @ApiProperty({ description: 'Requirements bypassed', example: false })
  bypassed: boolean;

  @ApiProperty({ description: 'Follower tier', example: '50K-500K', nullable: true })
  tier: string | null;

  @ApiProperty({
    description: 'Requirements breakdown',
  })
  requirements: {
    followerCount: EligibilityRequirementDto;
    engagementRate: EligibilityRequirementDto;
    postCount30d: EligibilityRequirementDto;
  };

  @ApiProperty({
    description: 'Alternative stake option',
    type: AlternativeStakeDto,
    nullable: true,
  })
  alternativeStake: AlternativeStakeDto | null;
}
