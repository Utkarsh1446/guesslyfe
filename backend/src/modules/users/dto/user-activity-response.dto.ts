import { ApiProperty } from '@nestjs/swagger';

export enum ActivityType {
  SHARE_BUY = 'SHARE_BUY',
  SHARE_SELL = 'SHARE_SELL',
  MARKET_TRADE = 'MARKET_TRADE',
  MARKET_CLAIM = 'MARKET_CLAIM',
  CREATOR_APPROVED = 'CREATOR_APPROVED',
}

export class UserActivityDto {
  @ApiProperty({ description: 'Activity ID' })
  id: string;

  @ApiProperty({ description: 'Activity type', enum: ActivityType })
  type: string;

  @ApiProperty({ description: 'Activity description' })
  description: string;

  @ApiProperty({ description: 'Amount involved' })
  amount: number;

  @ApiProperty({ description: 'Timestamp' })
  timestamp: string;
}

export class UserActivityResponseDto {
  @ApiProperty({ type: [UserActivityDto] })
  activities: UserActivityDto[];

  @ApiProperty({
    description: 'Pagination',
    type: 'object',
    properties: {
      page: { type: 'number' },
      limit: { type: 'number' },
      total: { type: 'number' },
    },
  })
  pagination: {
    page: number;
    limit: number;
    total: number;
  };
}
