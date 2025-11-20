import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsNumber, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class PendingMarketsQueryDto {
  @ApiProperty({
    description: 'Filter overdue markets (>60 min past end)',
    required: false,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  overdue?: boolean;

  @ApiProperty({
    description: 'Page number',
    required: false,
    default: 1,
    minimum: 1,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  page?: number;

  @ApiProperty({
    description: 'Items per page',
    required: false,
    default: 20,
    minimum: 1,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  limit?: number;
}

export class PendingMarketDto {
  @ApiProperty({ description: 'Market ID' })
  id: string;

  @ApiProperty({ description: 'Market title' })
  title: string;

  @ApiProperty({
    description: 'Creator info',
    type: 'object',
    properties: {
      id: { type: 'string' },
      twitterHandle: { type: 'string' },
    },
  })
  creator: {
    id: string;
    twitterHandle: string;
  };

  @ApiProperty({ description: 'End time' })
  endTime: string;

  @ApiProperty({ description: 'Minutes past end time' })
  minutesPastEnd: number;

  @ApiProperty({ description: 'Total volume' })
  volume: number;

  @ApiProperty({ description: 'Total trades' })
  totalTrades: number;

  @ApiProperty({ description: 'Market status' })
  status: string;
}

export class PendingMarketsResponseDto {
  @ApiProperty({ type: [PendingMarketDto] })
  markets: PendingMarketDto[];

  @ApiProperty({
    description: 'Summary',
    type: 'object',
    properties: {
      total: { type: 'number' },
      overdue: { type: 'number' },
    },
  })
  summary: {
    total: number;
    overdue: number;
  };

  @ApiProperty({
    description: 'Pagination',
    type: 'object',
    properties: {
      page: { type: 'number' },
      limit: { type: 'number' },
      total: { type: 'number' },
      totalPages: { type: 'number' },
    },
  })
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
