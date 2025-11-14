import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsUrl, MaxLength, IsEthereumAddress } from 'class-validator';

export class UpdateUserDto {
  @ApiPropertyOptional({ description: 'User display name', maxLength: 100 })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  displayName?: string;

  @ApiPropertyOptional({ description: 'User bio/description', maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  bio?: string;

  @ApiPropertyOptional({ description: 'Profile picture URL' })
  @IsOptional()
  @IsUrl()
  profilePictureUrl?: string;

  @ApiPropertyOptional({ description: 'Wallet address for payments' })
  @IsOptional()
  @IsEthereumAddress()
  walletAddress?: string;
}
