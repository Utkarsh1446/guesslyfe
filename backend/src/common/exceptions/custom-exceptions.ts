/**
 * Custom Exception Classes
 *
 * Domain-specific exceptions for better error handling and user feedback
 */

import { HttpException, HttpStatus } from '@nestjs/common';

/**
 * Base class for all custom exceptions
 */
export class AppException extends HttpException {
  constructor(
    message: string,
    statusCode: HttpStatus = HttpStatus.INTERNAL_SERVER_ERROR,
    public readonly errorCode?: string,
    public readonly details?: any,
  ) {
    super(
      {
        statusCode,
        message,
        errorCode,
        details,
        timestamp: new Date().toISOString(),
      },
      statusCode,
    );
  }
}

/**
 * Wallet-related exceptions
 */
export class WalletNotConnectedException extends AppException {
  constructor(message = 'Wallet not connected. Please connect your wallet to continue.') {
    super(message, HttpStatus.BAD_REQUEST, 'WALLET_NOT_CONNECTED');
  }
}

export class InvalidWalletAddressException extends AppException {
  constructor(address?: string) {
    super(
      `Invalid wallet address${address ? `: ${address}` : ''}`,
      HttpStatus.BAD_REQUEST,
      'INVALID_WALLET_ADDRESS',
      { address },
    );
  }
}

export class WalletAlreadyLinkedException extends AppException {
  constructor(walletAddress: string) {
    super(
      'This wallet address is already linked to another account',
      HttpStatus.CONFLICT,
      'WALLET_ALREADY_LINKED',
      { walletAddress },
    );
  }
}

/**
 * Twitter-related exceptions
 */
export class TwitterNotConnectedException extends AppException {
  constructor(message = 'Twitter account not connected') {
    super(message, HttpStatus.UNAUTHORIZED, 'TWITTER_NOT_CONNECTED');
  }
}

export class TwitterAuthFailedException extends AppException {
  constructor(reason?: string) {
    super(
      'Twitter authentication failed',
      HttpStatus.UNAUTHORIZED,
      'TWITTER_AUTH_FAILED',
      { reason },
    );
  }
}

export class TwitterAccountNotEligibleException extends AppException {
  constructor(reason: string, currentFollowers?: number, requiredFollowers?: number) {
    super(
      `Twitter account not eligible: ${reason}`,
      HttpStatus.BAD_REQUEST,
      'TWITTER_NOT_ELIGIBLE',
      {
        reason,
        currentFollowers,
        requiredFollowers,
      },
    );
  }
}

/**
 * Financial/Trading exceptions
 */
export class InsufficientFundsException extends AppException {
  constructor(required: string, available: string) {
    super(
      'Insufficient funds for this transaction',
      HttpStatus.BAD_REQUEST,
      'INSUFFICIENT_FUNDS',
      {
        required,
        available,
        shortfall: (BigInt(required) - BigInt(available)).toString(),
      },
    );
  }
}

export class InsufficientSharesException extends AppException {
  constructor(required: string, available: string) {
    super(
      'Insufficient shares for this transaction',
      HttpStatus.BAD_REQUEST,
      'INSUFFICIENT_SHARES',
      {
        required,
        available,
      },
    );
  }
}

export class PriceSlippageException extends AppException {
  constructor(expectedPrice: string, actualPrice: string, maxSlippage: string) {
    super(
      'Price slippage exceeds maximum allowed',
      HttpStatus.BAD_REQUEST,
      'PRICE_SLIPPAGE_EXCEEDED',
      {
        expectedPrice,
        actualPrice,
        maxSlippage,
      },
    );
  }
}

/**
 * Creator-related exceptions
 */
export class CreatorNotFoundException extends AppException {
  constructor(identifier: string) {
    super(
      `Creator not found: ${identifier}`,
      HttpStatus.NOT_FOUND,
      'CREATOR_NOT_FOUND',
      { identifier },
    );
  }
}

export class SharesNotUnlockedException extends AppException {
  constructor(creatorAddress: string, currentVolume: string, requiredVolume: string) {
    super(
      'Creator shares are not yet unlocked for trading',
      HttpStatus.FORBIDDEN,
      'SHARES_NOT_UNLOCKED',
      {
        creatorAddress,
        currentVolume,
        requiredVolume,
        progress: (Number(currentVolume) / Number(requiredVolume) * 100).toFixed(2) + '%',
      },
    );
  }
}

export class CreatorAlreadyExistsException extends AppException {
  constructor(identifier: string) {
    super(
      `Creator already exists: ${identifier}`,
      HttpStatus.CONFLICT,
      'CREATOR_ALREADY_EXISTS',
      { identifier },
    );
  }
}

/**
 * Market-related exceptions
 */
export class MarketNotFoundException extends AppException {
  constructor(marketId: string) {
    super(
      `Market not found: ${marketId}`,
      HttpStatus.NOT_FOUND,
      'MARKET_NOT_FOUND',
      { marketId },
    );
  }
}

export class MarketNotActiveException extends AppException {
  constructor(marketId: string, status: string) {
    super(
      'Market is not active for trading',
      HttpStatus.BAD_REQUEST,
      'MARKET_NOT_ACTIVE',
      { marketId, status },
    );
  }
}

export class MarketAlreadyResolvedException extends AppException {
  constructor(marketId: string) {
    super(
      'Market has already been resolved',
      HttpStatus.BAD_REQUEST,
      'MARKET_ALREADY_RESOLVED',
      { marketId },
    );
  }
}

export class MarketNotEndedException extends AppException {
  constructor(marketId: string, endTime: Date) {
    super(
      'Market has not ended yet',
      HttpStatus.BAD_REQUEST,
      'MARKET_NOT_ENDED',
      {
        marketId,
        endTime: endTime.toISOString(),
        remainingTime: endTime.getTime() - Date.now(),
      },
    );
  }
}

/**
 * Dividend-related exceptions
 */
export class DividendEpochNotFoundException extends AppException {
  constructor(epochId: string) {
    super(
      `Dividend epoch not found: ${epochId}`,
      HttpStatus.NOT_FOUND,
      'DIVIDEND_EPOCH_NOT_FOUND',
      { epochId },
    );
  }
}

export class DividendAlreadyClaimedException extends AppException {
  constructor(epochId: string, userAddress: string) {
    super(
      'Dividends for this epoch have already been claimed',
      HttpStatus.CONFLICT,
      'DIVIDEND_ALREADY_CLAIMED',
      { epochId, userAddress },
    );
  }
}

export class NoDividendsAvailableException extends AppException {
  constructor(epochId: string, userAddress: string) {
    super(
      'No dividends available to claim for this epoch',
      HttpStatus.BAD_REQUEST,
      'NO_DIVIDENDS_AVAILABLE',
      { epochId, userAddress },
    );
  }
}

/**
 * Blockchain-related exceptions
 */
export class BlockchainTransactionFailedException extends AppException {
  constructor(reason: string, txHash?: string) {
    super(
      `Blockchain transaction failed: ${reason}`,
      HttpStatus.INTERNAL_SERVER_ERROR,
      'BLOCKCHAIN_TX_FAILED',
      { reason, txHash },
    );
  }
}

export class ContractInteractionException extends AppException {
  constructor(contractName: string, method: string, reason: string) {
    super(
      `Contract interaction failed: ${contractName}.${method}`,
      HttpStatus.INTERNAL_SERVER_ERROR,
      'CONTRACT_INTERACTION_FAILED',
      { contractName, method, reason },
    );
  }
}

export class GasEstimationException extends AppException {
  constructor(reason: string) {
    super(
      'Failed to estimate gas for transaction',
      HttpStatus.INTERNAL_SERVER_ERROR,
      'GAS_ESTIMATION_FAILED',
      { reason },
    );
  }
}

/**
 * Rate limiting exceptions
 */
export class RateLimitExceededException extends AppException {
  constructor(limit: number, window: string, retryAfter: number) {
    super(
      `Rate limit exceeded. Maximum ${limit} requests per ${window}`,
      HttpStatus.TOO_MANY_REQUESTS,
      'RATE_LIMIT_EXCEEDED',
      {
        limit,
        window,
        retryAfter,
      },
    );
  }
}

/**
 * Validation exceptions
 */
export class ValidationException extends AppException {
  constructor(errors: Record<string, string[]>) {
    super(
      'Validation failed',
      HttpStatus.BAD_REQUEST,
      'VALIDATION_FAILED',
      { errors },
    );
  }
}

/**
 * Resource exceptions
 */
export class ResourceNotFoundException extends AppException {
  constructor(resource: string, identifier: string) {
    super(
      `${resource} not found: ${identifier}`,
      HttpStatus.NOT_FOUND,
      'RESOURCE_NOT_FOUND',
      { resource, identifier },
    );
  }
}

export class ResourceAlreadyExistsException extends AppException {
  constructor(resource: string, identifier: string) {
    super(
      `${resource} already exists: ${identifier}`,
      HttpStatus.CONFLICT,
      'RESOURCE_ALREADY_EXISTS',
      { resource, identifier },
    );
  }
}

/**
 * Permission exceptions
 */
export class UnauthorizedException extends AppException {
  constructor(message = 'Unauthorized access') {
    super(message, HttpStatus.UNAUTHORIZED, 'UNAUTHORIZED');
  }
}

export class ForbiddenException extends AppException {
  constructor(message = 'Access forbidden', resource?: string) {
    super(
      message,
      HttpStatus.FORBIDDEN,
      'FORBIDDEN',
      { resource },
    );
  }
}

/**
 * External service exceptions
 */
export class ExternalServiceException extends AppException {
  constructor(serviceName: string, reason: string) {
    super(
      `External service error: ${serviceName}`,
      HttpStatus.SERVICE_UNAVAILABLE,
      'EXTERNAL_SERVICE_ERROR',
      { serviceName, reason },
    );
  }
}

export class TwitterAPIException extends AppException {
  constructor(reason: string, statusCode?: number) {
    super(
      `Twitter API error: ${reason}`,
      HttpStatus.SERVICE_UNAVAILABLE,
      'TWITTER_API_ERROR',
      { serviceName: 'Twitter API', reason, statusCode },
    );
  }
}

export class BlockchainRPCException extends ExternalServiceException {
  constructor(reason: string) {
    super('Blockchain RPC', reason);
  }
}
