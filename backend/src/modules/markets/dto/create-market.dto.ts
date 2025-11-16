import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsNumber, Min, Max, IsArray, ArrayMinSize, ArrayMaxSize, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class OutcomeDto {
  @ApiProperty({ description: 'Outcome text (e.g., "YES" or "NO")', example: 'YES' })
  @IsString()
  @IsNotEmpty()
  text: string;

  @ApiProperty({ description: 'Initial probability (0-100)', example: 50 })
  @IsNumber()
  @Min(0)
  @Max(100)
  initialProbability: number;
}

export class CreateMarketDto {
  @ApiProperty({ description: 'Market question/title', example: 'Will BTC reach $100k by end of 2025?' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({ description: 'Detailed market description' })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiProperty({ description: 'Market category', example: 'Crypto' })
  @IsString()
  @IsNotEmpty()
  category: string;

  @ApiProperty({ description: 'Market outcomes (2-4 outcomes)', type: [OutcomeDto] })
  @IsArray()
  @ArrayMinSize(2)
  @ArrayMaxSize(4)
  @ValidateNested({ each: true })
  @Type(() => OutcomeDto)
  outcomes: OutcomeDto[];

  @ApiProperty({ description: 'Duration in seconds (21600-604800 = 6h-7d)', example: 86400 })
  @IsNumber()
  @Min(21600) // 6 hours
  @Max(604800) // 7 days
  duration: number;

  @ApiPropertyOptional({ description: 'Resolution criteria' })
  @IsString()
  resolutionCriteria?: string;

  @ApiPropertyOptional({ description: 'Evidence links (JSON string array)' })
  @IsString()
  evidenceLinks?: string;

  @ApiPropertyOptional({ description: 'Tags (comma-separated)' })
  @IsString()
  tags?: string;
}

export class CreateMarketResponseDto {
  @ApiProperty({ description: 'Market ID' })
  marketId: string;

  @ApiProperty({ description: 'Market contract address' })
  contractAddress: string;

  @ApiProperty({ description: 'Transaction hash' })
  txHash: string;

  @ApiProperty({ description: 'Block number' })
  blockNumber: number;

  @ApiProperty({ description: 'Market end time' })
  endTime: Date;

  @ApiProperty({ description: 'Success status' })
  success: boolean;

  @ApiProperty({ description: 'Message' })
  message: string;

  constructor(partial: Partial<CreateMarketResponseDto>) {
    Object.assign(this, partial);
  }
}
