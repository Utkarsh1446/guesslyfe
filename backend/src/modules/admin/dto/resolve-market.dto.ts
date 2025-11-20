import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsString, IsArray, IsOptional, Min, Max } from 'class-validator';

export class ResolveMarketDto {
  @ApiProperty({
    description: 'Winning outcome index (0, 1, etc.)',
    example: 0,
    minimum: 0,
  })
  @IsNumber()
  @Min(0)
  winningOutcome: number;

  @ApiProperty({
    description: 'Resolution explanation',
    example: 'Market resolved based on official data from CoinGecko',
    required: false,
  })
  @IsOptional()
  @IsString()
  resolutionNote?: string;

  @ApiProperty({
    description: 'Evidence links supporting resolution',
    type: [String],
    example: ['https://coingecko.com/...'],
    required: false,
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  evidenceLinks?: string[];
}

export class ResolveMarketResponseDto {
  @ApiProperty({ description: 'Success status', example: true })
  success: boolean;

  @ApiProperty({
    description: 'Market details',
    type: 'object',
    properties: {
      id: { type: 'string' },
      status: { type: 'string', example: 'resolved' },
      winningOutcome: { type: 'number' },
      resolutionTime: { type: 'string' },
    },
  })
  market: {
    id: string;
    status: string;
    winningOutcome: number;
    resolutionTime: string;
  };

  @ApiProperty({ description: 'Transaction hash', example: '0x...' })
  txHash: string;

  @ApiProperty({ description: 'Number of winners', example: 120 })
  winnersCount: number;

  @ApiProperty({ description: 'Total payout amount', example: 15000.0 })
  totalPayout: number;
}
