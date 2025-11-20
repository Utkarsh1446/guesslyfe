import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNumber, IsPositive, IsOptional, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class SellSharesDto {
  @ApiProperty({
    description: 'Creator ID',
    example: 'uuid-here',
  })
  @IsString()
  creatorId: string;

  @ApiProperty({
    description: 'Number of shares to sell',
    example: 10,
    minimum: 1,
  })
  @IsNumber()
  @IsPositive()
  @Type(() => Number)
  amount: number;

  @ApiProperty({
    description: 'Minimum price willing to accept (slippage protection)',
    example: 23.0,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @IsPositive()
  @Type(() => Number)
  minPrice?: number;

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

export class SellSharesResponseDto {
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

  @ApiProperty({ description: 'Expected proceeds in USDC', example: 23.75 })
  expectedProceeds: number;

  @ApiProperty({ description: 'Total trading fee', example: 1.25 })
  fee: number;

  @ApiProperty({
    description: 'Fee breakdown',
    type: 'object',
    properties: {
      platform: { type: 'number', example: 0.625 },
      shareholders: { type: 'number', example: 0.625 },
    },
  })
  feeBreakdown: {
    platform: number;
    shareholders: number;
  };
}
