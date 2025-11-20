import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsBoolean } from 'class-validator';

export class CancelMarketDto {
  @ApiProperty({
    description: 'Reason for cancellation',
    example: 'Creator request / Invalid market',
  })
  @IsString()
  reason: string;

  @ApiProperty({
    description: 'Whether to refund users',
    example: true,
    default: true,
  })
  @IsBoolean()
  refundUsers: boolean;
}

export class CancelMarketResponseDto {
  @ApiProperty({ description: 'Success status', example: true })
  success: boolean;

  @ApiProperty({
    description: 'Market details',
    type: 'object',
    properties: {
      id: { type: 'string' },
      status: { type: 'string', example: 'cancelled' },
    },
  })
  market: {
    id: string;
    status: string;
  };

  @ApiProperty({ description: 'Number of refunded users', example: 120 })
  refundedUsers: number;

  @ApiProperty({ description: 'Total refunded amount', example: 15000.0 })
  totalRefunded: number;

  @ApiProperty({ description: 'Transaction hash', example: '0x...' })
  txHash: string;
}
