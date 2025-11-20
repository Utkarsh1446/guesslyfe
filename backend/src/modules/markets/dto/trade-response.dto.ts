import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum TradeActionResponse {
  BUY = 'buy',
  SELL = 'sell',
}

export class TradeResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  marketId: string;

  @ApiProperty()
  userId: string;

  @ApiProperty()
  outcomeId: string;

  @ApiProperty()
  walletAddress: string;

  @ApiProperty({ enum: TradeActionResponse })
  action: TradeActionResponse;

  @ApiProperty()
  shares: string;

  @ApiProperty()
  amount: string;

  @ApiProperty()
  price: string;

  @ApiProperty()
  fee: string;

  @ApiPropertyOptional()
  txHash?: string;

  @ApiPropertyOptional()
  blockNumber?: string;

  @ApiPropertyOptional()
  blockTimestamp?: string;

  @ApiProperty()
  createdAt: string;
}

export class TradeListResponseDto {
  @ApiProperty({ type: [TradeResponseDto] })
  trades: TradeResponseDto[];

  @ApiProperty()
  total: number;

  @ApiProperty()
  page: number;

  @ApiProperty()
  limit: number;
}

export class UnsignedTransactionResponseDto {
  @ApiProperty()
  unsignedTx: {
    to: string;
    data: string;
    value: string;
  };

  @ApiProperty()
  expectedShares: string;

  @ApiProperty()
  fee: string;

  @ApiProperty()
  priceImpact: string;
}
