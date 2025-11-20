import { IsOptional, IsEnum, IsString, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { MarketStatus, MarketCategory } from '../../../database/enums';

export enum MarketSortBy {
  CREATED_AT = 'createdAt',
  END_TIME = 'endTime',
  VOLUME = 'totalVolume',
  PARTICIPANTS = 'participantCount',
  TRADES = 'tradeCount',
}

export class MarketFiltersDto {
  @ApiPropertyOptional({
    description: 'Filter by status',
    enum: MarketStatus,
  })
  @IsOptional()
  @IsEnum(MarketStatus)
  status?: MarketStatus;

  @ApiPropertyOptional({
    description: 'Filter by category',
    enum: MarketCategory,
  })
  @IsOptional()
  @IsEnum(MarketCategory)
  category?: MarketCategory;

  @ApiPropertyOptional({
    description: 'Filter by creator ID',
  })
  @IsOptional()
  @IsString()
  creatorId?: string;

  @ApiPropertyOptional({
    description: 'Search in title and description',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    description: 'Sort by field',
    enum: MarketSortBy,
    default: MarketSortBy.CREATED_AT,
  })
  @IsOptional()
  @IsEnum(MarketSortBy)
  sort?: MarketSortBy;

  @ApiPropertyOptional({
    description: 'Sort order (ASC or DESC)',
    enum: ['ASC', 'DESC'],
    default: 'DESC',
  })
  @IsOptional()
  @IsEnum(['ASC', 'DESC'])
  order?: 'ASC' | 'DESC';

  @ApiPropertyOptional({
    description: 'Page number',
    default: 1,
    minimum: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({
    description: 'Items per page',
    default: 10,
    minimum: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number;
}
