/**
 * Request Logging Middleware
 *
 * Logs all incoming HTTP requests and their responses with timing information
 */

import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { LoggerService } from '../logging/logger.service';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class RequestLoggerMiddleware implements NestMiddleware {
  private readonly logger: LoggerService;
  private readonly excludePaths = [
    '/health',
    '/favicon.ico',
    '/robots.txt',
  ];

  constructor() {
    this.logger = new LoggerService('HTTP');
  }

  use(req: Request, res: Response, next: NextFunction): void {
    // Skip logging for excluded paths
    if (this.shouldSkipLogging(req.path)) {
      return next();
    }

    // Generate request ID if not present
    const requestId = (req.headers['x-request-id'] as string) || uuidv4();
    req.headers['x-request-id'] = requestId;

    // Set request ID in response headers
    res.setHeader('X-Request-ID', requestId);

    // Record start time
    const startTime = Date.now();

    // Log incoming request
    this.logRequest(req, requestId);

    // Capture original end method
    const originalEnd = res.end;
    const self = this;

    // Override res.end to log response
    res.end = function(...args: any[]): any {
      const duration = Date.now() - startTime;

      // Restore original end
      res.end = originalEnd;

      // Log response
      self.logResponse(req, res, duration, requestId);

      // Call original end with all arguments
      return (originalEnd as any).apply(res, args);
    };

    next();
  }

  /**
   * Check if path should be excluded from logging
   */
  private shouldSkipLogging(path: string): boolean {
    return this.excludePaths.some(excludePath => path.startsWith(excludePath));
  }

  /**
   * Log incoming request
   */
  private logRequest(req: Request, requestId: string): void {
    const user = (req as any).user;

    this.logger.logInfo('Incoming request', {
      requestId,
      method: req.method,
      url: req.url,
      path: req.path,
      query: Object.keys(req.query).length > 0 ? req.query : undefined,
      ip: req.ip || req.socket.remoteAddress,
      userAgent: req.headers['user-agent'],
      ...(user && {
        user: {
          id: user.id,
          handle: user.twitterHandle,
        },
      }),
    });
  }

  /**
   * Log response with timing
   */
  private logResponse(req: Request, res: Response, duration: number, requestId: string): void {
    const { statusCode } = res;
    const level = this.getLogLevel(statusCode, duration);

    const metadata = {
      requestId,
      method: req.method,
      url: req.url,
      statusCode,
      duration: `${duration}ms`,
      slow: duration > 1000,
      contentLength: res.getHeader('content-length'),
    };

    if (level === 'error') {
      this.logger.logError(`${req.method} ${req.path} ${statusCode}`, undefined, metadata);
    } else if (level === 'warn') {
      this.logger.logWarn(`${req.method} ${req.path} ${statusCode}`, metadata);
    } else {
      this.logger.logInfo(`${req.method} ${req.path} ${statusCode}`, metadata);
    }
  }

  /**
   * Determine log level based on status code and duration
   */
  private getLogLevel(statusCode: number, duration: number): 'error' | 'warn' | 'info' {
    if (statusCode >= 500) {
      return 'error';
    }
    if (statusCode >= 400 || duration > 1000) {
      return 'warn';
    }
    return 'info';
  }
}
