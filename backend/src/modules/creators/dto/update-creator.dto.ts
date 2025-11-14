import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsUrl, MaxLength } from 'class-validator';

export class UpdateCreatorDto {
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
