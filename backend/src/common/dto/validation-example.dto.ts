/**
 * DTO Validation Examples
 *
 * This file demonstrates best practices for DTO validation using class-validator
 * and custom validators.
 *
 * IMPORTANT: All DTOs should follow these patterns for security and data integrity.
 */

import {
  IsString,
  IsNumber,
  IsBoolean,
  IsOptional,
  IsEnum,
  IsDate,
  MinLength,
  MaxLength,
  Min,
  Max,
  IsUrl,
  IsEmail,
  Matches,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEthereumAddress } from '../validators/wallet-address.validator';
import { IsTwitterHandle } from '../validators/twitter-handle.validator';
import {
  IsBigIntString,
  IsPercentage,
  IsFutureDate,
  IsAfter,
  IsSecureUrl,
  IsMarketOutcome,
  IsNonEmptyString,
} from '../validators/custom-validators';

/**
 * Example: Create Market DTO with comprehensive validation
 */
export class CreateMarketExampleDto {
  @ApiProperty({
    description: 'Market question (must be clear and specific)',
    example: 'Will Bitcoin reach $100,000 by the end of 2025?',
    minLength: 10,
    maxLength: 200,
  })
  @IsNonEmptyString()
  @MinLength(10, { message: 'Question must be at least 10 characters long' })
  @MaxLength(200, { message: 'Question cannot exceed 200 characters' })
  question: string;

  @ApiPropertyOptional({
    description: 'Additional description or context',
    example: 'This market will resolve based on CoinMarketCap data',
    maxLength: 1000,
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @ApiProperty({
    description: 'Market end date (must be in the future)',
    example: '2025-12-31T23:59:59Z',
  })
  @Type(() => Date)
  @IsDate()
  @IsFutureDate({ message: 'End date must be in the future' })
  endDate: Date;

  @ApiProperty({
    description: 'Initial liquidity in wei (USDC)',
    example: '1000000000000000000', // 1 USDC (6 decimals)
  })
  @IsBigIntString()
  @Min(0)
  initialLiquidity: string;

  @ApiPropertyOptional({
    description: 'Market category',
    example: 'CRYPTO',
    enum: ['CRYPTO', 'POLITICS', 'SPORTS', 'ENTERTAINMENT', 'OTHER'],
  })
  @IsOptional()
  @IsEnum(['CRYPTO', 'POLITICS', 'SPORTS', 'ENTERTAINMENT', 'OTHER'])
  category?: string;

  @ApiPropertyOptional({
    description: 'Market image URL (must be HTTPS)',
    example: 'https://example.com/image.png',
  })
  @IsOptional()
  @IsSecureUrl()
  imageUrl?: string;

  @ApiPropertyOptional({
    description: 'Tags for market categorization',
    example: ['bitcoin', 'cryptocurrency', 'price-prediction'],
    type: [String],
  })
  @IsOptional()
  @IsString({ each: true })
  @MaxLength(20, { each: true })
  tags?: string[];
}

/**
 * Example: Trade Shares DTO
 */
export class TradeSharesExampleDto {
  @ApiProperty({
    description: 'Creator wallet address',
    example: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
  })
  @IsEthereumAddress()
  creatorAddress: string;

  @ApiProperty({
    description: 'Number of shares to trade (in wei)',
    example: '1000000000000000000', // 1 share (18 decimals)
  })
  @IsBigIntString()
  @Min(0)
  amount: string;

  @ApiPropertyOptional({
    description: 'Maximum slippage tolerance (percentage)',
    example: 2.5,
    minimum: 0,
    maximum: 100,
  })
  @IsOptional()
  @IsPercentage()
  slippage?: number;
}

/**
 * Example: Update User Profile DTO
 */
export class UpdateUserProfileExampleDto {
  @ApiPropertyOptional({
    description: 'Display name',
    example: 'John Doe',
    minLength: 2,
    maxLength: 50,
  })
  @IsOptional()
  @IsNonEmptyString()
  @MinLength(2)
  @MaxLength(50)
  displayName?: string;

  @ApiPropertyOptional({
    description: 'Bio/description',
    example: 'Crypto enthusiast and prediction market trader',
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  bio?: string;

  @ApiPropertyOptional({
    description: 'Profile picture URL (must be HTTPS)',
    example: 'https://example.com/avatar.png',
  })
  @IsOptional()
  @IsSecureUrl()
  avatarUrl?: string;

  @ApiPropertyOptional({
    description: 'Email address for notifications',
    example: 'user@example.com',
  })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({
    description: 'Email notification preferences',
  })
  @IsOptional()
  @IsBoolean()
  emailNotifications?: boolean;
}

/**
 * Example: Link Wallet DTO
 */
export class LinkWalletExampleDto {
  @ApiProperty({
    description: 'Ethereum wallet address to link',
    example: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
  })
  @IsEthereumAddress()
  walletAddress: string;

  @ApiProperty({
    description: 'Signature to prove wallet ownership',
    example: '0x...',
  })
  @IsString()
  @Matches(/^0x[a-fA-F0-9]{130}$/, {
    message: 'Invalid signature format',
  })
  signature: string;

  @ApiProperty({
    description: 'Nonce used for signature',
    example: '1234567890',
  })
  @IsString()
  nonce: string;
}

/**
 * Example: Resolve Market DTO
 */
export class ResolveMarketExampleDto {
  @ApiProperty({
    description: 'Market outcome (YES or NO)',
    example: 'YES',
    enum: ['YES', 'NO'],
  })
  @IsMarketOutcome()
  outcome: string;

  @ApiPropertyOptional({
    description: 'Resolution notes or proof',
    example: 'Market resolved based on CoinMarketCap data showing BTC at $105,000',
    maxLength: 1000,
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  resolutionNotes?: string;

  @ApiPropertyOptional({
    description: 'Proof URL (e.g., screenshot, article)',
    example: 'https://example.com/proof.png',
  })
  @IsOptional()
  @IsSecureUrl()
  proofUrl?: string;
}

/**
 * Example: Nested DTO Validation
 */
export class AddressDto {
  @ApiProperty({
    description: 'Ethereum address',
    example: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
  })
  @IsEthereumAddress()
  address: string;
}

export class BatchOperationExampleDto {
  @ApiProperty({
    description: 'List of addresses to process',
    type: [AddressDto],
  })
  @ValidateNested({ each: true })
  @Type(() => AddressDto)
  addresses: AddressDto[];

  @ApiProperty({
    description: 'Operation type',
    example: 'AIRDROP',
    enum: ['AIRDROP', 'DISTRIBUTE', 'CLAIM'],
  })
  @IsEnum(['AIRDROP', 'DISTRIBUTE', 'CLAIM'])
  operation: string;
}

/**
 * Example: Date Range Validation
 */
export class DateRangeExampleDto {
  @ApiProperty({
    description: 'Start date',
    example: '2025-01-01T00:00:00Z',
  })
  @Type(() => Date)
  @IsDate()
  startDate: Date;

  @ApiProperty({
    description: 'End date (must be after start date)',
    example: '2025-12-31T23:59:59Z',
  })
  @Type(() => Date)
  @IsDate()
  @IsAfter('startDate', { message: 'End date must be after start date' })
  endDate: Date;
}

/**
 * Example: Twitter Handle Validation
 */
export class VerifyCreatorExampleDto {
  @ApiProperty({
    description: 'Twitter handle (with or without @)',
    example: '@elonmusk',
  })
  @IsTwitterHandle()
  twitterHandle: string;

  @ApiPropertyOptional({
    description: 'Additional verification data',
  })
  @IsOptional()
  @IsString()
  verificationCode?: string;
}

/**
 * DTO Validation Best Practices:
 *
 * 1. ALWAYS use class-validator decorators on ALL DTO properties
 * 2. Use @IsOptional() for optional fields
 * 3. Add min/max length constraints for strings
 * 4. Add min/max value constraints for numbers
 * 5. Use custom validators for domain-specific types (Ethereum addresses, Twitter handles, etc.)
 * 6. Use @ValidateNested() for nested objects
 * 7. Use @Type() from class-transformer for date/number transformations
 * 8. Add meaningful validation error messages
 * 9. Use @ApiProperty() for Swagger documentation
 * 10. Use enums for fixed value sets
 * 11. Validate URLs to use only HTTPS protocol
 * 12. Sanitize strings to prevent XSS attacks (handled by SanitizationPipe)
 * 13. Use BigInt strings (IsBigIntString) for wei values to prevent precision loss
 * 14. Validate date ranges (start before end)
 * 15. Never trust user input - validate everything!
 */
