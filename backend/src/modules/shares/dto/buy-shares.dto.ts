import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsEthereumAddress, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class BuySharesDto {
  @ApiProperty({ description: 'Creator wallet address', example: '0x...' })
  @IsNotEmpty()
  @IsEthereumAddress()
  creatorAddress: string;

  @ApiProperty({ description: 'Number of shares to buy (in whole units)', example: 10 })
  @IsNotEmpty()
  @Type(() => Number)
  @Min(1)
  amount: number;

  @ApiProperty({ description: 'Maximum price willing to pay in USDC (slippage protection)', example: '100.5' })
  @IsNotEmpty()
  @IsString()
  maxPrice: string;
}
