import { ApiProperty } from '@nestjs/swagger';

export class OutcomeResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  marketId: string;

  @ApiProperty()
  outcomeIndex: number;

  @ApiProperty()
  text: string;

  @ApiProperty()
  initialProbability: string;

  @ApiProperty()
  currentProbability: string;

  @ApiProperty()
  totalShares: string;

  @ApiProperty()
  totalStaked: string;

  @ApiProperty()
  createdAt: string;

  @ApiProperty()
  updatedAt: string;
}
