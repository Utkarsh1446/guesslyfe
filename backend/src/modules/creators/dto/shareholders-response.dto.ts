import { ApiProperty } from '@nestjs/swagger';

export class ShareholderDto {
  @ApiProperty({ description: 'Holder wallet address' })
  address: string;

  @ApiProperty({ description: 'Twitter handle', nullable: true })
  twitterHandle: string | null;

  @ApiProperty({ description: 'Shares held' })
  sharesHeld: number;

  @ApiProperty({ description: 'Percent of total supply' })
  percentOfSupply: number;

  @ApiProperty({ description: 'Average buy price' })
  averageBuyPrice: number;

  @ApiProperty({ description: 'Current value' })
  currentValue: number;

  @ApiProperty({ description: 'Unrealized PnL' })
  unrealizedPnL: number;
}

export class ShareholdersResponseDto {
  @ApiProperty({ description: 'List of shareholders', type: [ShareholderDto] })
  shareholders: ShareholderDto[];

  @ApiProperty({ description: 'Total number of holders' })
  totalHolders: number;

  @ApiProperty({ description: 'Total supply' })
  totalSupply: number;

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
