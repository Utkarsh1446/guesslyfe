import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class DisputeMarketDto {
  @ApiProperty({
    description: 'Reason for dispute',
    example: 'Unclear resolution criteria',
  })
  @IsString()
  reason: string;

  @ApiProperty({
    description: 'Additional notes',
    example: 'Need to review with creator',
    required: false,
  })
  @IsString()
  notes?: string;
}

export class DisputeMarketResponseDto {
  @ApiProperty({ description: 'Success status', example: true })
  success: boolean;

  @ApiProperty({
    description: 'Market details',
    type: 'object',
    properties: {
      id: { type: 'string' },
      status: { type: 'string', example: 'disputed' },
    },
  })
  market: {
    id: string;
    status: string;
  };
}
