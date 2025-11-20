import { IsOptional, IsString, IsEthereumAddress } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateUserDto {
  @ApiPropertyOptional({ description: 'User bio/description' })
  @IsOptional()
  @IsString()
  bio?: string;

  @ApiPropertyOptional({ description: 'Ethereum wallet address' })
  @IsOptional()
  @IsEthereumAddress()
  walletAddress?: string;
}
