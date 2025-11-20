import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class UserResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  twitterId: string;

  @ApiProperty()
  twitterHandle: string;

  @ApiProperty()
  displayName: string;

  @ApiProperty()
  profilePictureUrl: string;

  @ApiPropertyOptional()
  bio: string | null;

  @ApiPropertyOptional()
  walletAddress: string | null;

  @ApiProperty()
  followerCount: number;

  @ApiProperty()
  followingCount: number;

  @ApiProperty()
  isAdmin: boolean;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  @ApiPropertyOptional()
  lastLoginAt: Date | null;

  @ApiPropertyOptional({ description: 'Whether user is a creator' })
  isCreator?: boolean;
}
