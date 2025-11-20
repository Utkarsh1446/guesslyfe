import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MarketStatus, MarketCategory } from '../../../database/enums';
import { OutcomeResponseDto } from './outcome-response.dto';

export class MarketCreatorDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  twitterHandle: string;

  @ApiPropertyOptional()
  user?: {
    displayName: string;
    profilePictureUrl: string;
  };
}

export class MarketResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  title: string;

  @ApiProperty()
  description: string;

  @ApiProperty({ enum: MarketCategory })
  category: MarketCategory;

  @ApiProperty({ enum: MarketStatus })
  status: MarketStatus;

  @ApiPropertyOptional()
  contractAddress?: string;

  @ApiPropertyOptional()
  txHash?: string;

  @ApiProperty()
  creatorId: string;

  @ApiPropertyOptional({ type: MarketCreatorDto })
  creator?: MarketCreatorDto;

  @ApiProperty()
  endTime: string;

  @ApiProperty()
  duration: number;

  @ApiPropertyOptional()
  resolutionCriteria?: string;

  @ApiPropertyOptional({ type: [String] })
  evidenceLinks?: string[];

  @ApiPropertyOptional({ type: [String] })
  tags?: string[];

  @ApiProperty()
  totalVolume: string;

  @ApiProperty()
  totalLiquidity: string;

  @ApiProperty()
  participantCount: number;

  @ApiProperty()
  tradeCount: number;

  @ApiPropertyOptional()
  winningOutcomeIndex?: number;

  @ApiPropertyOptional()
  resolvedAt?: string;

  @ApiProperty()
  createdAt: string;

  @ApiProperty()
  updatedAt: string;

  @ApiPropertyOptional({ type: [OutcomeResponseDto] })
  outcomes?: OutcomeResponseDto[];
}

export class MarketListResponseDto {
  @ApiProperty({ type: [MarketResponseDto] })
  markets: MarketResponseDto[];

  @ApiProperty()
  total: number;

  @ApiProperty()
  page: number;

  @ApiProperty()
  limit: number;

  @ApiProperty()
  totalPages: number;
}

export class CreateMarketResponseDto {
  @ApiProperty()
  marketId: string;

  @ApiPropertyOptional()
  contractAddress?: string;

  @ApiPropertyOptional()
  txHash?: string;

  @ApiProperty({ type: MarketResponseDto })
  market: MarketResponseDto;
}
