import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNumber, IsPositive, IsOptional, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class BuySharesDto {
  @ApiProperty({
    description: 'Creator ID',
    example: 'uuid-here',
  })
  @IsString()
  creatorId: string;

  @ApiProperty({
    description: 'Number of shares to buy',
    example: 10,
    minimum: 1,
  })
  @IsNumber()
  @IsPositive()
  @Type(() => Number)
  amount: number;

  @ApiProperty({
    description: 'Maximum price willing to pay (slippage protection)',
    example: 26.0,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @IsPositive()
  @Type(() => Number)
  maxPrice?: number;

  @ApiProperty({
    description: 'Slippage tolerance percentage (0.1 = 0.1%)',
    example: 0.5,
    minimum: 0,
    maximum: 100,
    required: false,
    default: 0.5,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  @Type(() => Number)
  slippage?: number;
}

export class BuySharesResponseDto {
  @ApiProperty({ description: 'Success status', example: true })
  success: boolean;

  @ApiProperty({
    description: 'Unsigned transaction data',
    type: 'object',
    properties: {
      to: { type: 'string', example: '0x...' },
      data: { type: 'string', example: '0x...' },
      value: { type: 'string', example: '0' },
      gasLimit: { type: 'string', example: '200000' },
    },
  })
  unsignedTx: {
    to: string;
    data: string;
    value: string;
    gasLimit: string;
  };

  @ApiProperty({ description: 'Expected shares to receive', example: 10 })
  expectedShares: number;

  @ApiProperty({ description: 'Estimated cost in USDC', example: 25.0 })
  estimatedCost: number;

  @ApiProperty({ description: 'Trading fee', example: 0 })
  fee: number;
}
