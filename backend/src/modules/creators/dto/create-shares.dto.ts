import { ApiProperty } from '@nestjs/swagger';

export class CreateSharesResponseDto {
  @ApiProperty({ description: 'Deployed share contract address' })
  shareContractAddress: string;

  @ApiProperty({ description: 'Transaction hash' })
  txHash: string;

  @ApiProperty({ description: 'Creator address' })
  creatorAddress: string;

  @ApiProperty({ description: 'Block number' })
  blockNumber: number;

  @ApiProperty({ description: 'Success status' })
  success: boolean;

  @ApiProperty({ description: 'Message' })
  message: string;
}
