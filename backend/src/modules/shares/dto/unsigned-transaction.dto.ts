import { ApiProperty } from '@nestjs/swagger';

/**
 * DTO for unsigned transaction that frontend will sign and submit
 */
export class UnsignedTransactionDto {
  @ApiProperty({ description: 'Target contract address' })
  to: string;

  @ApiProperty({ description: 'Encoded function call data' })
  data: string;

  @ApiProperty({ description: 'Value in wei (usually 0 for share trades)' })
  value: string;

  @ApiProperty({ description: 'Estimated gas limit' })
  gasLimit: string;

  @ApiProperty({ description: 'Human-readable transaction description' })
  description: string;

  constructor(partial: Partial<UnsignedTransactionDto>) {
    Object.assign(this, partial);
  }
}

/**
 * Response for buy shares request
 */
export class BuySharesResponseDto {
  @ApiProperty({ description: 'Unsigned transaction for user to sign', type: UnsignedTransactionDto })
  unsignedTx: UnsignedTransactionDto;

  @ApiProperty({ description: 'Estimated total cost in USDC' })
  estimatedCost: string;

  @ApiProperty({ description: 'Number of shares to be purchased' })
  shares: string;

  @ApiProperty({ description: 'Creator address' })
  creatorAddress: string;

  @ApiProperty({ description: 'Share contract address' })
  shareContractAddress: string;

  constructor(partial: Partial<BuySharesResponseDto>) {
    Object.assign(this, partial);
  }
}

/**
 * Response for sell shares request
 */
export class SellSharesResponseDto {
  @ApiProperty({ description: 'Unsigned transaction for user to sign', type: UnsignedTransactionDto })
  unsignedTx: UnsignedTransactionDto;

  @ApiProperty({ description: 'Estimated proceeds in USDC (after fees)' })
  estimatedProceeds: string;

  @ApiProperty({ description: 'Number of shares to be sold' })
  shares: string;

  @ApiProperty({ description: 'Creator address' })
  creatorAddress: string;

  @ApiProperty({ description: 'Share contract address' })
  shareContractAddress: string;

  constructor(partial: Partial<SellSharesResponseDto>) {
    Object.assign(this, partial);
  }
}
