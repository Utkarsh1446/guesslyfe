/**
 * Rate Limiting Configuration
 *
 * Configures rate limits for different endpoints
 */

import { ThrottlerModuleOptions } from '@nestjs/throttler';

export const throttlerConfig: ThrottlerModuleOptions = {
  throttlers: [
    {
      name: 'default',
      ttl: 60000, // 1 minute in milliseconds
      limit: 100, // 100 requests per minute (default)
    },
    {
      name: 'strict',
      ttl: 60000, // 1 minute
      limit: 10, // 10 requests per minute (strict endpoints)
    },
    {
      name: 'auth',
      ttl: 60000, // 1 minute
      limit: 5, // 5 requests per minute (auth endpoints)
    },
    {
      name: 'create',
      ttl: 3600000, // 1 hour
      limit: 10, // 10 requests per hour (create operations)
    },
    {
      name: 'trade',
      ttl: 60000, // 1 minute
      limit: 30, // 30 requests per minute (trading operations)
    },
  ],
};

/**
 * Custom rate limit configurations for specific use cases
 */
export const RateLimitConfig = {
  // Global default: 100 requests per 15 minutes
  global: {
    ttl: 900000, // 15 minutes
    limit: 100,
  },

  // Auth endpoints: 5 requests per minute
  auth: {
    ttl: 60000, // 1 minute
    limit: 5,
  },

  // Create market: 10 per hour per user
  createMarket: {
    ttl: 3600000, // 1 hour
    limit: 10,
  },

  // Trade endpoints: 30 per minute per user
  trade: {
    ttl: 60000, // 1 minute
    limit: 30,
  },

  // Public endpoints: 200 per 15 minutes
  public: {
    ttl: 900000, // 15 minutes
    limit: 200,
  },

  // Admin endpoints: No limit (handled by guard)
  admin: {
    ttl: 60000,
    limit: 1000, // Very high limit
  },
};
