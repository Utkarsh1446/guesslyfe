import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsNumber, Min, IsBoolean } from 'class-validator';

export class TradeMarketDto {
  @ApiProperty({ description: 'Market ID', example: '1' })
  @IsString()
  @IsNotEmpty()
  marketId: string;

  @ApiProperty({ description: 'Outcome to bet on (true = YES, false = NO)', example: true })
  @IsBoolean()
  outcome: boolean;

  @ApiProperty({ description: 'Amount to bet in USDC', example: 10 })
  @IsNumber()
  @Min(1)
  amount: number;

  @ApiProperty({ description: 'Maximum acceptable slippage in shares (for slippage protection)', example: '9.5' })
  @IsString()
  @IsNotEmpty()
  minShares: string;
}

export class TradeMarketResponseDto {
  @ApiProperty({ description: 'Unsigned transaction for user to sign' })
  unsignedTx: {
    to: string;
    data: string;
    value: string;
    gasLimit: string;
    description: string;
  };

  @ApiProperty({ description: 'Estimated shares to receive' })
  expectedShares: string;

  @ApiProperty({ description: 'Market ID' })
  marketId: string;

  @ApiProperty({ description: 'Outcome (true = YES, false = NO)' })
  outcome: boolean;

  @ApiProperty({ description: 'Bet amount in USDC' })
  amount: string;

  @ApiProperty({ description: 'Current probability before trade' })
  currentProbability: number;

  @ApiProperty({ description: 'New probability after trade' })
  newProbability: number;

  constructor(partial: Partial<TradeMarketResponseDto>) {
    Object.assign(this, partial);
  }
}

export class ClaimWinningsDto {
  @ApiProperty({ description: 'Market ID', example: '1' })
  @IsString()
  @IsNotEmpty()
  marketId: string;
}

export class ClaimWinningsResponseDto {
  @ApiProperty({ description: 'Unsigned transaction for user to sign' })
  unsignedTx: {
    to: string;
    data: string;
    value: string;
    gasLimit: string;
    description: string;
  };

  @ApiProperty({ description: 'Estimated winnings to claim in USDC' })
  winnings: string;

  @ApiProperty({ description: 'Market ID' })
  marketId: string;

  @ApiProperty({ description: 'Winning outcome' })
  winningOutcome: boolean;

  @ApiProperty({ description: 'User shares in winning outcome' })
  winningShares: string;

  constructor(partial: Partial<ClaimWinningsResponseDto>) {
    Object.assign(this, partial);
  }
}
