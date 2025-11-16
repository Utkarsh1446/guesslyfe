import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { Request, Response } from 'express';
import * as Sentry from '@sentry/node';
import { LoggerService } from '../logging/logger.service';
import { AppException } from '../exceptions/custom-exceptions';

interface HttpExceptionResponse {
  statusCode: number;
  message: string | string[];
  error?: string;
  errorCode?: string;
  details?: any;
}

interface ErrorResponse {
  statusCode: number;
  timestamp: string;
  path: string;
  method: string;
  message: string | string[];
  error: string;
  errorCode?: string;
  details?: any;
  requestId?: string;
  stack?: string; // Only in development
}

@Injectable()
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger: LoggerService;
  private readonly isProduction = process.env.NODE_ENV === 'production';
  private readonly sentryEnabled = process.env.SENTRY_DSN && process.env.SENTRY_ENABLED !== 'false';

  constructor() {
    this.logger = new LoggerService('ExceptionFilter');
  }

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const { status, message, error, errorCode, details } = this.extractErrorInfo(exception);

    // Build error response
    const errorResponse: ErrorResponse = {
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
      message,
      error,
      ...(errorCode && { errorCode }),
      ...(details && { details }),
      ...(request.headers['x-request-id'] && { requestId: request.headers['x-request-id'] as string }),
    };

    // Include stack trace in development
    if (!this.isProduction && exception instanceof Error) {
      errorResponse.stack = exception.stack;
    }

    // Remove sensitive information in production
    if (this.isProduction) {
      this.sanitizeErrorResponse(errorResponse);
    }

    // Log error
    this.logError(exception, request, status);

    // Send to Sentry for server errors
    if (status >= 500 && this.sentryEnabled) {
      this.reportToSentry(exception, request);
    }

    // Send alert for critical errors
    if (status >= 500 && this.shouldAlert(exception)) {
      this.sendAlert(exception, request, status);
    }

    response.status(status).json(errorResponse);
  }

  /**
   * Extract error information from exception
   */
  private extractErrorInfo(exception: unknown): {
    status: number;
    message: string | string[];
    error: string;
    errorCode?: string;
    details?: any;
  } {
    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: string | string[] = 'Internal server error';
    let error = 'Internal Server Error';
    let errorCode: string | undefined;
    let details: any;

    if (exception instanceof AppException) {
      // Custom application exceptions
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse() as any;
      message = exceptionResponse.message || exception.message;
      error = exception.name;
      errorCode = exceptionResponse.errorCode;
      details = exceptionResponse.details;
    } else if (exception instanceof HttpException) {
      // Standard HTTP exceptions
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse() as HttpExceptionResponse;

      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
        error = exception.name;
      } else {
        message = exceptionResponse.message || exception.message;
        error = exceptionResponse.error || exception.name;
        errorCode = exceptionResponse.errorCode;
        details = exceptionResponse.details;
      }
    } else if (exception instanceof Error) {
      // Standard errors
      message = this.isProduction ? 'Internal server error' : exception.message;
      error = exception.name;
    } else {
      // Unknown exceptions
      message = 'An unexpected error occurred';
      error = 'UnknownError';
    }

    return { status, message, error, errorCode, details };
  }

  /**
   * Remove sensitive information from error response
   */
  private sanitizeErrorResponse(errorResponse: ErrorResponse): void {
    // Don't expose internal error messages in production for 500 errors
    if (errorResponse.statusCode >= 500 && typeof errorResponse.message === 'string') {
      if (!errorResponse.errorCode) {
        errorResponse.message = 'An internal server error occurred';
      }
    }

    // Remove sensitive details
    if (errorResponse.details) {
      const sensitiveKeys = ['password', 'token', 'secret', 'key', 'privateKey', 'apiKey'];
      sensitiveKeys.forEach(key => {
        if (errorResponse.details[key]) {
          errorResponse.details[key] = '[REDACTED]';
        }
      });
    }
  }

  /**
   * Log error with context
   */
  private logError(exception: unknown, request: Request, status: number): void {
    const user = (request as any).user;
    const requestId = request.headers['x-request-id'];

    const errorMeta = {
      statusCode: status,
      method: request.method,
      url: request.url,
      ip: request.ip,
      userAgent: request.headers['user-agent'],
      ...(user && { userId: user.id, userHandle: user.twitterHandle }),
      ...(requestId && { requestId }),
    };

    if (exception instanceof Error) {
      this.logger.logError(
        `${request.method} ${request.url} - ${status}`,
        exception,
        errorMeta,
      );
    } else {
      this.logger.error(
        `${request.method} ${request.url} - ${status}`,
        JSON.stringify(exception),
      );
    }
  }

  /**
   * Report error to Sentry
   */
  private reportToSentry(exception: unknown, request: Request): void {
    try {
      Sentry.withScope((scope) => {
        scope.setContext('http', {
          method: request.method,
          url: request.url,
          headers: this.sanitizeHeaders(request.headers),
          query: request.query,
          body: this.sanitizeBody(request.body),
        });

        const user = (request as any).user;
        if (user) {
          scope.setUser({
            id: user.id,
            username: user.twitterHandle,
          });
        }

        if (exception instanceof Error) {
          Sentry.captureException(exception);
        } else {
          Sentry.captureMessage(JSON.stringify(exception), 'error');
        }
      });
    } catch (sentryError) {
      this.logger.error('Failed to report to Sentry', sentryError as Error);
    }
  }

  /**
   * Sanitize headers for logging/reporting
   */
  private sanitizeHeaders(headers: any): any {
    const sanitized = { ...headers };
    const sensitiveHeaders = ['authorization', 'cookie', 'x-api-key'];

    sensitiveHeaders.forEach(header => {
      if (sanitized[header]) {
        sanitized[header] = '[REDACTED]';
      }
    });

    return sanitized;
  }

  /**
   * Sanitize request body for logging/reporting
   */
  private sanitizeBody(body: any): any {
    if (!body || typeof body !== 'object') {
      return body;
    }

    const sanitized = { ...body };
    const sensitiveFields = ['password', 'privateKey', 'secret', 'token', 'apiKey'];

    sensitiveFields.forEach(field => {
      if (sanitized[field]) {
        sanitized[field] = '[REDACTED]';
      }
    });

    return sanitized;
  }

  /**
   * Determine if error should trigger an alert
   */
  private shouldAlert(exception: unknown): boolean {
    // Alert on specific critical errors
    if (exception instanceof Error) {
      const criticalErrors = [
        'DatabaseConnectionError',
        'RedisConnectionError',
        'BlockchainConnectionError',
        'OutOfMemoryError',
      ];

      return criticalErrors.includes(exception.name);
    }

    return false;
  }

  /**
   * Send alert to admin (email/Slack/webhook)
   */
  private async sendAlert(exception: unknown, request: Request, status: number): Promise<void> {
    try {
      const alertWebhook = process.env.ALERT_WEBHOOK_URL;
      if (!alertWebhook) {
        return;
      }

      const errorMessage = exception instanceof Error ? exception.message : JSON.stringify(exception);
      const stack = exception instanceof Error ? exception.stack : undefined;

      const alertPayload = {
        type: 'critical_error',
        timestamp: new Date().toISOString(),
        error: {
          message: errorMessage,
          statusCode: status,
          stack,
        },
        request: {
          method: request.method,
          url: request.url,
          ip: request.ip,
        },
        environment: process.env.NODE_ENV,
      };

      // Send webhook (non-blocking)
      fetch(alertWebhook, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(alertPayload),
      }).catch(err => {
        this.logger.error('Failed to send alert webhook', err);
      });
    } catch (error) {
      this.logger.error('Failed to send alert', error as Error);
    }
  }
}
