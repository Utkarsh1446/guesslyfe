import {
  IsInt,
  IsString,
  IsEnum,
  IsNotEmpty,
  Min,
  Max,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export enum TradeActionType {
  BUY = 'buy',
  SELL = 'sell',
}

export class TradeMarketDto {
  @ApiProperty({
    description: 'Outcome index to trade (0-3)',
    example: 0,
    minimum: 0,
    maximum: 3,
  })
  @IsInt()
  @Min(0)
  @Max(3)
  outcome: number;

  @ApiProperty({
    description: 'Amount in USDC',
    example: '100.00',
  })
  @IsString()
  @IsNotEmpty()
  amount: string;

  @ApiProperty({
    description: 'Trade action',
    enum: TradeActionType,
    example: TradeActionType.BUY,
  })
  @IsEnum(TradeActionType)
  action: TradeActionType;

  @ApiProperty({
    description: 'Maximum slippage tolerance (percentage, 0-100)',
    example: 2,
    minimum: 0,
    maximum: 100,
    default: 2,
  })
  @IsInt()
  @Min(0)
  @Max(100)
  slippage: number = 2;
}
