import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CreatorStatus } from '../../../database/enums';

export class CreatorResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  userId: string;

  @ApiProperty()
  twitterId: string;

  @ApiProperty()
  twitterHandle: string;

  @ApiProperty()
  followerCount: number;

  @ApiProperty()
  engagementRate: number;

  @ApiProperty()
  postCount30d: number;

  @ApiPropertyOptional()
  qualifiedAt: Date | null;

  @ApiProperty()
  stakePaid: boolean;

  @ApiPropertyOptional()
  stakeAmount: number | null;

  @ApiProperty()
  stakeReturned: boolean;

  @ApiProperty()
  totalMarketVolume: number;

  @ApiProperty()
  sharesUnlocked: boolean;

  @ApiPropertyOptional()
  sharesUnlockedAt: Date | null;

  @ApiPropertyOptional()
  shareContractAddress: string | null;

  @ApiProperty()
  totalShares: number;

  @ApiProperty({ enum: CreatorStatus })
  status: CreatorStatus;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
