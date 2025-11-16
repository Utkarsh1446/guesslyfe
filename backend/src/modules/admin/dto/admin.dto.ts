import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsBoolean, IsNumber, IsOptional, IsEnum, Min, Max, IsDate, IsArray } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * Market Resolution DTO
 */
export class ResolveMarketDto {
  @ApiProperty({
    description: 'Winning outcome (0 for NO, 1 for YES)',
    example: 1,
  })
  @IsNumber()
  @Min(0)
  @Max(1)
  outcome: number;

  @ApiPropertyOptional({
    description: 'Resolution details/reason',
    example: 'Event occurred as predicted',
  })
  @IsOptional()
  @IsString()
  reason?: string;

  @ApiPropertyOptional({
    description: 'Evidence URL',
    example: 'https://twitter.com/example/status/123456789',
  })
  @IsOptional()
  @IsString()
  evidenceUrl?: string;
}

/**
 * Dispute Market DTO
 */
export class DisputeMarketDto {
  @ApiProperty({
    description: 'Dispute reason',
    example: 'Ambiguous outcome criteria',
  })
  @IsString()
  reason: string;

  @ApiPropertyOptional({
    description: 'Suggested resolution',
    example: 'Refund all participants',
  })
  @IsOptional()
  @IsString()
  suggestedResolution?: string;
}

/**
 * Extend Market Duration DTO
 */
export class ExtendMarketDto {
  @ApiProperty({
    description: 'Additional hours to extend',
    example: 24,
  })
  @IsNumber()
  @Min(1)
  @Max(720) // Max 30 days
  hours: number;

  @ApiPropertyOptional({
    description: 'Reason for extension',
    example: 'Event postponed',
  })
  @IsOptional()
  @IsString()
  reason?: string;
}

/**
 * Cancel Market DTO
 */
export class CancelMarketDto {
  @ApiProperty({
    description: 'Cancellation reason',
    example: 'Event cancelled permanently',
  })
  @IsString()
  reason: string;

  @ApiProperty({
    description: 'Whether to process refunds',
    example: true,
  })
  @IsBoolean()
  refundParticipants: boolean;
}

/**
 * Approve Creator DTO
 */
export class ApproveCreatorDto {
  @ApiPropertyOptional({
    description: 'Approval notes',
    example: 'Verified Twitter account with good reputation',
  })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({
    description: 'Special permissions granted',
    example: ['featured_markets', 'higher_limits'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  permissions?: string[];
}

/**
 * Reject Creator DTO
 */
export class RejectCreatorDto {
  @ApiProperty({
    description: 'Rejection reason',
    example: 'Insufficient social media presence',
  })
  @IsString()
  reason: string;

  @ApiPropertyOptional({
    description: 'Can reapply after days',
    example: 30,
  })
  @IsOptional()
  @IsNumber()
  canReapplyAfterDays?: number;
}

/**
 * Suspend Creator DTO
 */
export class SuspendCreatorDto {
  @ApiProperty({
    description: 'Suspension reason',
    example: 'Violation of community guidelines',
  })
  @IsString()
  reason: string;

  @ApiProperty({
    description: 'Suspension duration in days (0 for permanent)',
    example: 7,
  })
  @IsNumber()
  @Min(0)
  durationDays: number;

  @ApiPropertyOptional({
    description: 'Suspend existing markets',
    example: false,
  })
  @IsOptional()
  @IsBoolean()
  suspendExistingMarkets?: boolean;
}

/**
 * Refund Stake DTO
 */
export class RefundStakeDto {
  @ApiPropertyOptional({
    description: 'Refund reason',
    example: 'Platform error',
  })
  @IsOptional()
  @IsString()
  reason?: string;

  @ApiProperty({
    description: 'Amount to refund in wei (0 for full stake)',
    example: 0,
  })
  @IsNumber()
  @Min(0)
  amount: number;
}

/**
 * Search Users DTO
 */
export class SearchUsersDto {
  @ApiPropertyOptional({
    description: 'Search query (wallet address, Twitter handle, etc.)',
    example: '0x1234...',
  })
  @IsOptional()
  @IsString()
  query?: string;

  @ApiPropertyOptional({
    description: 'Filter by role',
    example: 'creator',
  })
  @IsOptional()
  @IsString()
  role?: string;

  @ApiPropertyOptional({
    description: 'Filter by status',
    example: 'active',
  })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({
    description: 'Page number',
    example: 1,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({
    description: 'Items per page',
    example: 20,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number;
}

/**
 * Ban User DTO
 */
export class BanUserDto {
  @ApiProperty({
    description: 'Ban reason',
    example: 'Fraudulent activity detected',
  })
  @IsString()
  reason: string;

  @ApiProperty({
    description: 'Ban duration in days (0 for permanent)',
    example: 0,
  })
  @IsNumber()
  @Min(0)
  durationDays: number;

  @ApiPropertyOptional({
    description: 'Freeze user funds',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  freezeFunds?: boolean;
}

/**
 * Process Refund DTO
 */
export class ProcessRefundDto {
  @ApiProperty({
    description: 'Refund amount in wei',
    example: '1000000000000000000',
  })
  @IsString()
  amount: string;

  @ApiProperty({
    description: 'Refund reason',
    example: 'Market cancelled due to platform error',
  })
  @IsString()
  reason: string;

  @ApiPropertyOptional({
    description: 'Related market ID',
    example: 'market123',
  })
  @IsOptional()
  @IsString()
  marketId?: string;
}

/**
 * Trigger Job DTO
 */
export class TriggerJobDto {
  @ApiPropertyOptional({
    description: 'Job parameters',
    example: { marketId: 'market123' },
  })
  @IsOptional()
  params?: Record<string, any>;

  @ApiPropertyOptional({
    description: 'Force execution even if already running',
    example: false,
  })
  @IsOptional()
  @IsBoolean()
  force?: boolean;
}

/**
 * Get Logs Filter DTO
 */
export class GetLogsFilterDto {
  @ApiPropertyOptional({
    description: 'Log level',
    example: 'error',
  })
  @IsOptional()
  @IsString()
  level?: string;

  @ApiPropertyOptional({
    description: 'Start date',
    example: '2025-01-01T00:00:00Z',
  })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  startDate?: Date;

  @ApiPropertyOptional({
    description: 'End date',
    example: '2025-01-31T23:59:59Z',
  })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  endDate?: Date;

  @ApiPropertyOptional({
    description: 'Limit results',
    example: 100,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(1000)
  limit?: number;
}

/**
 * Emergency Pause DTO
 */
export class EmergencyPauseDto {
  @ApiProperty({
    description: 'Pause reason',
    example: 'Critical security vulnerability detected',
  })
  @IsString()
  reason: string;

  @ApiProperty({
    description: 'Contract to pause',
    example: 'OpinionMarket',
    enum: ['OpinionMarket', 'CreatorShareFactory', 'FeeCollector', 'All'],
  })
  @IsEnum(['OpinionMarket', 'CreatorShareFactory', 'FeeCollector', 'All'])
  contract: string;

  @ApiPropertyOptional({
    description: 'Notify users via email/notifications',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  notifyUsers?: boolean;
}

/**
 * Analytics Date Range DTO
 */
export class AnalyticsDateRangeDto {
  @ApiPropertyOptional({
    description: 'Start date',
    example: '2025-01-01',
  })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  startDate?: Date;

  @ApiPropertyOptional({
    description: 'End date',
    example: '2025-01-31',
  })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  endDate?: Date;

  @ApiPropertyOptional({
    description: 'Granularity',
    example: 'day',
    enum: ['hour', 'day', 'week', 'month'],
  })
  @IsOptional()
  @IsEnum(['hour', 'day', 'week', 'month'])
  granularity?: string;
}
