import { ApiProperty } from '@nestjs/swagger';

export class ShareTransactionDto {
  @ApiProperty({ description: 'Transaction ID', example: 'uuid-here' })
  id: string;

  @ApiProperty({
    description: 'Transaction type',
    enum: ['BUY', 'SELL'],
    example: 'BUY',
  })
  type: string;

  @ApiProperty({ description: 'Buyer address', example: '0x...', nullable: true })
  buyer: string | null;

  @ApiProperty({ description: 'Seller address', example: '0x...', nullable: true })
  seller: string | null;

  @ApiProperty({ description: 'Number of shares', example: 10 })
  shares: number;

  @ApiProperty({ description: 'Price per share', example: 2.5 })
  pricePerShare: number;

  @ApiProperty({ description: 'Total amount', example: 25.0 })
  totalAmount: number;

  @ApiProperty({ description: 'Trading fee', example: 0 })
  fee: number;

  @ApiProperty({
    description: 'Transaction hash',
    example: '0x...',
    nullable: true,
  })
  txHash: string | null;

  @ApiProperty({ description: 'Timestamp', example: '2025-01-01T12:00:00Z' })
  timestamp: string;
}

export class PaginationDto {
  @ApiProperty({ description: 'Current page', example: 1 })
  page: number;

  @ApiProperty({ description: 'Items per page', example: 20 })
  limit: number;

  @ApiProperty({ description: 'Total items', example: 100 })
  total: number;

  @ApiProperty({ description: 'Total pages', example: 5 })
  totalPages: number;
}

export class ShareTransactionListResponseDto {
  @ApiProperty({
    description: 'Array of transactions',
    type: [ShareTransactionDto],
  })
  transactions: ShareTransactionDto[];

  @ApiProperty({
    description: 'Pagination info',
    type: PaginationDto,
  })
  pagination: PaginationDto;
}
