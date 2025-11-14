import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsUrl, IsEthereumAddress, MaxLength, IsOptional } from 'class-validator';

export class CreateCreatorDto {
  @ApiProperty({ description: 'Creator wallet address (Base Sepolia)', example: '0x...' })
  @IsNotEmpty()
  @IsEthereumAddress()
  creatorAddress: string;

  @ApiPropertyOptional({ description: 'Creator bio/description', maxLength: 1000 })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  bio?: string;

  @ApiPropertyOptional({ description: 'Custom profile picture URL' })
  @IsOptional()
  @IsUrl()
  profilePictureUrl?: string;

  @ApiPropertyOptional({ description: 'Website URL' })
  @IsOptional()
  @IsUrl()
  websiteUrl?: string;
}
