import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsBoolean, IsNumber, IsOptional } from 'class-validator';

export class SuspendCreatorDto {
  @ApiProperty({ description: 'Reason for suspension', example: 'Violation of platform rules' })
  @IsString()
  reason: string;

  @ApiProperty({ description: 'Suspension duration', example: 'permanent' })
  @IsString()
  duration: string;

  @ApiProperty({ description: 'Additional notes', required: false })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class OverrideUnlockDto {
  @ApiProperty({ description: 'Reason for override', example: 'Special case / Partnership' })
  @IsString()
  reason: string;

  @ApiProperty({ description: 'Additional notes', required: false })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class RefundStakeDto {
  @ApiProperty({ description: 'Reason for refund', example: 'Market reached $10K volume' })
  @IsString()
  reason: string;

  @ApiProperty({ description: 'Transaction hash', example: '0x...' })
  @IsString()
  txHash: string;
}

export class BanUserDto {
  @ApiProperty({ description: 'Reason for ban', example: 'Spam / Abuse' })
  @IsString()
  reason: string;

  @ApiProperty({ description: 'Ban duration', example: 'permanent' })
  @IsString()
  duration: string;

  @ApiProperty({ description: 'Additional notes', required: false })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class ProcessRefundDto {
  @ApiProperty({ description: 'Refund amount in USDC', example: 100.0 })
  @IsNumber()
  amount: number;

  @ApiProperty({ description: 'Reason for refund', example: 'Market error / Platform issue' })
  @IsString()
  reason: string;

  @ApiProperty({ description: 'Transaction hash', example: '0x...' })
  @IsString()
  txHash: string;
}

export class PauseContractsDto {
  @ApiProperty({ description: 'Reason for pause', example: 'Security issue detected' })
  @IsString()
  reason: string;

  @ApiProperty({ description: 'Contracts to pause', example: ['all'] })
  @IsString({ each: true })
  contracts: string[];
}
