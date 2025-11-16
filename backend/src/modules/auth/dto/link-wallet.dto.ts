import { IsEthereumAddress, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LinkWalletDto {
  @ApiProperty({
    description: 'Ethereum wallet address to link to user account',
    example: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
    type: String,
    required: true,
  })
  @IsNotEmpty()
  @IsEthereumAddress()
  walletAddress: string;
}
