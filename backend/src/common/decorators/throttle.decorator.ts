/**
 * Throttle Decorators
 *
 * Custom decorators for rate limiting
 */

import { SetMetadata } from '@nestjs/common';
import { Throttle as NestThrottle } from '@nestjs/throttler';

/**
 * Skip throttling for this endpoint
 */
export const SkipThrottle = () => SetMetadata('skipThrottle', true);

/**
 * Apply auth rate limit (5 requests per minute)
 */
export const AuthThrottle = () => NestThrottle({ default: { ttl: 60000, limit: 5 } });

/**
 * Apply trade rate limit (30 requests per minute)
 */
export const TradeThrottle = () => NestThrottle({ default: { ttl: 60000, limit: 30 } });

/**
 * Apply create rate limit (10 requests per hour)
 */
export const CreateThrottle = () => NestThrottle({ default: { ttl: 3600000, limit: 10 } });

/**
 * Apply strict rate limit (10 requests per minute)
 */
export const StrictThrottle = () => NestThrottle({ default: { ttl: 60000, limit: 10 } });

/**
 * Apply public rate limit (200 requests per 15 minutes)
 */
export const PublicThrottle = () => NestThrottle({ default: { ttl: 900000, limit: 200 } });

/**
 * Custom throttle with specific limits
 */
export const CustomThrottle = (ttl: number, limit: number) =>
  NestThrottle({ default: { ttl, limit } });
