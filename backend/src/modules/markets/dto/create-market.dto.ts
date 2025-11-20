import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsArray,
  ArrayMinSize,
  ArrayMaxSize,
  ValidateNested,
  IsInt,
  Min,
  Max,
  IsOptional,
  IsUrl,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MarketCategory } from '../../../database/enums';

export class CreateOutcomeDto {
  @ApiProperty({ description: 'Outcome text', example: 'Yes' })
  @IsString()
  @IsNotEmpty()
  text: string;

  @ApiProperty({
    description: 'Initial probability (0-100)',
    example: 50,
    minimum: 0,
    maximum: 100,
  })
  @IsInt()
  @Min(0)
  @Max(100)
  initialProbability: number;
}

export class CreateMarketDto {
  @ApiProperty({
    description: 'Market title',
    example: 'Will Bitcoin reach $100K by end of 2025?',
  })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({
    description: 'Detailed market description',
    example: 'This market will resolve to YES if Bitcoin reaches...',
  })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiProperty({
    description: 'Market category',
    enum: MarketCategory,
    example: MarketCategory.CRYPTO,
  })
  @IsEnum(MarketCategory)
  category: MarketCategory;

  @ApiProperty({
    description: 'Market outcomes (2-4 outcomes)',
    type: [CreateOutcomeDto],
    example: [
      { text: 'Yes', initialProbability: 60 },
      { text: 'No', initialProbability: 40 },
    ],
  })
  @IsArray()
  @ArrayMinSize(2)
  @ArrayMaxSize(4)
  @ValidateNested({ each: true })
  @Type(() => CreateOutcomeDto)
  outcomes: CreateOutcomeDto[];

  @ApiProperty({
    description: 'Market duration in seconds (6 hours to 7 days)',
    example: 86400,
    minimum: 21600,
    maximum: 604800,
  })
  @IsInt()
  @Min(21600) // 6 hours
  @Max(604800) // 7 days
  duration: number;

  @ApiPropertyOptional({
    description: 'Resolution criteria',
    example: 'This market resolves based on CoinGecko price data at UTC midnight on Dec 31, 2025',
  })
  @IsOptional()
  @IsString()
  resolutionCriteria?: string;

  @ApiPropertyOptional({
    description: 'Evidence links',
    type: [String],
    example: ['https://coingecko.com/en/coins/bitcoin'],
  })
  @IsOptional()
  @IsArray()
  @IsUrl({}, { each: true })
  evidenceLinks?: string[];

  @ApiPropertyOptional({
    description: 'Tags for categorization',
    type: [String],
    example: ['crypto', 'bitcoin', 'price-prediction'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}
