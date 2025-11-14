import { IsEthereumAddress, IsNotEmpty } from 'class-validator';

export class LinkWalletDto {
  @IsNotEmpty()
  @IsEthereumAddress()
  walletAddress: string;
}
