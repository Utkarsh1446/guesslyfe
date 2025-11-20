import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsString, IsPositive } from 'class-validator';

export class ExtendMarketDto {
  @ApiProperty({
    description: 'Additional hours to extend',
    example: 24,
    minimum: 1,
  })
  @IsNumber()
  @IsPositive()
  additionalHours: number;

  @ApiProperty({
    description: 'Reason for extension',
    example: 'Event postponed',
  })
  @IsString()
  reason: string;
}

export class ExtendMarketResponseDto {
  @ApiProperty({ description: 'Success status', example: true })
  success: boolean;

  @ApiProperty({
    description: 'Market details',
    type: 'object',
    properties: {
      id: { type: 'string' },
      oldEndTime: { type: 'string', example: '2025-01-01T00:00:00Z' },
      newEndTime: { type: 'string', example: '2025-01-02T00:00:00Z' },
    },
  })
  market: {
    id: string;
    oldEndTime: string;
    newEndTime: string;
  };
}
