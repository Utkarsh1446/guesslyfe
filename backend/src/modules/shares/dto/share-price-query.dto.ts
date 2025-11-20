import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNumber, IsPositive, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';

export enum TradeAction {
  BUY = 'buy',
  SELL = 'sell',
}

export class SharePriceQueryDto {
  @ApiProperty({
    description: 'Action type: buy or sell',
    enum: TradeAction,
    example: 'buy',
  })
  @IsEnum(TradeAction)
  action: TradeAction;

  @ApiProperty({
    description: 'Number of shares',
    example: 10,
    minimum: 1,
  })
  @IsNumber()
  @IsPositive()
  @Type(() => Number)
  amount: number;
}

export class SharePriceResponseDto {
  @ApiProperty({ description: 'Trade action', enum: TradeAction })
  action: TradeAction;

  @ApiProperty({ description: 'Number of shares', example: 10 })
  amount: number;

  @ApiProperty({ description: 'Price per share in USDC', example: 2.5 })
  pricePerShare: number;

  @ApiProperty({ description: 'Total cost/proceeds in USDC', example: 25.0 })
  totalCost: number;

  @ApiProperty({ description: 'Trading fee', example: 0 })
  fee: number;

  @ApiProperty({ description: 'Price impact percentage', example: 0.5 })
  priceImpact: number;

  @ApiProperty({ description: 'Current supply', example: 500 })
  currentSupply: number;

  @ApiProperty({ description: 'New supply after trade', example: 510 })
  newSupply: number;
}
