import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { OutcomeResponseDto } from './outcome-response.dto';

export class PositionResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  marketId: string;

  @ApiProperty()
  userId: string;

  @ApiProperty()
  outcomeId: string;

  @ApiPropertyOptional({ type: OutcomeResponseDto })
  outcome?: OutcomeResponseDto;

  @ApiProperty()
  walletAddress: string;

  @ApiProperty()
  shares: string;

  @ApiProperty()
  costBasis: string;

  @ApiProperty()
  averagePrice: string;

  @ApiProperty()
  realizedPnl: string;

  @ApiProperty()
  claimed: boolean;

  @ApiPropertyOptional()
  claimedAmount?: string;

  @ApiPropertyOptional()
  claimedAt?: string;

  @ApiProperty()
  createdAt: string;

  @ApiProperty()
  updatedAt: string;
}

export class UserPositionsResponseDto {
  @ApiProperty({ type: [PositionResponseDto] })
  positions: PositionResponseDto[];

  @ApiProperty()
  totalValue: string;

  @ApiProperty()
  totalCostBasis: string;

  @ApiProperty()
  unrealizedPnl: string;

  @ApiProperty()
  realizedPnl: string;
}
