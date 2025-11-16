/**
 * Custom Throttler Guard
 *
 * Extends the default throttler guard to skip rate limiting for admin users
 */

import { Injectable, ExecutionContext } from '@nestjs/common';
import { ThrottlerGuard as NestThrottlerGuard } from '@nestjs/throttler';
import { Reflector } from '@nestjs/core';

@Injectable()
export class CustomThrottlerGuard extends NestThrottlerGuard {
  constructor(
    protected readonly options: any,
    protected readonly storageService: any,
    protected readonly reflector: Reflector,
  ) {
    super(options, storageService, reflector);
  }

  /**
   * Override to skip throttling for admin users and certain conditions
   */
  protected async shouldSkip(context: ExecutionContext): Promise<boolean> {
    // Check if throttling is disabled via decorator
    const skipThrottle = this.reflector.getAllAndOverride<boolean>('skipThrottle', [
      context.getHandler(),
      context.getClass(),
    ]);

    if (skipThrottle) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    // Skip rate limiting for admin users
    if (user?.role === 'admin' || user?.isAdmin) {
      return true;
    }

    // Skip rate limiting for whitelisted IPs (e.g., internal services)
    const whitelistedIPs = process.env.RATE_LIMIT_WHITELIST_IPS?.split(',') || [];
    const clientIP = this.getClientIP(request);

    if (whitelistedIPs.includes(clientIP)) {
      return true;
    }

    return false;
  }

  /**
   * Get client IP address from request
   */
  private getClientIP(request: any): string {
    return (
      request.headers['x-forwarded-for']?.split(',')[0].trim() ||
      request.headers['x-real-ip'] ||
      request.connection?.remoteAddress ||
      request.socket?.remoteAddress ||
      request.ip ||
      ''
    );
  }

  /**
   * Generate throttler key based on user or IP
   */
  protected async getTracker(req: any): Promise<string> {
    // Use user ID if authenticated, otherwise use IP
    if (req.user?.id) {
      return `user:${req.user.id}`;
    }

    return this.getClientIP(req);
  }
}
