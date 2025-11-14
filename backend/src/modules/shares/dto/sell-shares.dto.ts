import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsEthereumAddress, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class SellSharesDto {
  @ApiProperty({ description: 'Creator wallet address', example: '0x...' })
  @IsNotEmpty()
  @IsEthereumAddress()
  creatorAddress: string;

  @ApiProperty({ description: 'Number of shares to sell (in whole units)', example: 5 })
  @IsNotEmpty()
  @Type(() => Number)
  @Min(1)
  amount: number;

  @ApiProperty({ description: 'Minimum price willing to accept in USDC (slippage protection)', example: '95.0' })
  @IsNotEmpty()
  @IsString()
  minPrice: string;
}
