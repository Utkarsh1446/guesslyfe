/**
 * Logger Service
 *
 * Winston-based logging service with support for multiple transports,
 * log levels, and structured logging
 */

import { Injectable, LoggerService as NestLoggerService, Scope } from '@nestjs/common';
import * as winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import * as cls from 'cls-hooked';

// Create namespace for request tracking
const requestNamespace = cls.createNamespace('request');

@Injectable({ scope: Scope.TRANSIENT })
export class LoggerService implements NestLoggerService {
  private logger: winston.Logger;
  private context?: string;

  constructor(context?: string) {
    this.context = context;
    this.logger = this.createLogger();
  }

  /**
   * Create Winston logger instance
   */
  private createLogger(): winston.Logger {
    const isProduction = process.env.NODE_ENV === 'production';
    const isDevelopment = process.env.NODE_ENV === 'development';

    // Define log format
    const logFormat = winston.format.combine(
      winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
      winston.format.errors({ stack: true }),
      winston.format.metadata({ fillExcept: ['message', 'level', 'timestamp', 'label'] }),
    );

    // Transports array
    const transports: winston.transport[] = [];

    // Console transport
    if (isDevelopment || process.env.LOG_TO_CONSOLE !== 'false') {
      transports.push(
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.colorize({ all: true }),
            winston.format.printf(({ timestamp, level, message, context, requestId, ...meta }) => {
              const contextStr = context ? `[${context}]` : '';
              const requestIdStr = requestId ? `[${requestId}]` : '';
              const metaStr = Object.keys(meta).length ? `\n${JSON.stringify(meta, null, 2)}` : '';
              return `${timestamp} ${level} ${requestIdStr}${contextStr} ${message}${metaStr}`;
            }),
          ),
        }),
      );
    }

    // File transports for production
    if (isProduction || process.env.LOG_TO_FILE === 'true') {
      // Error log file
      transports.push(
        new DailyRotateFile({
          dirname: 'logs',
          filename: 'error-%DATE%.log',
          datePattern: 'YYYY-MM-DD',
          level: 'error',
          maxSize: '20m',
          maxFiles: '14d',
          format: winston.format.combine(
            logFormat,
            winston.format.json(),
          ),
        }),
      );

      // Combined log file
      transports.push(
        new DailyRotateFile({
          dirname: 'logs',
          filename: 'combined-%DATE%.log',
          datePattern: 'YYYY-MM-DD',
          maxSize: '20m',
          maxFiles: '14d',
          format: winston.format.combine(
            logFormat,
            winston.format.json(),
          ),
        }),
      );

      // Warning log file
      transports.push(
        new DailyRotateFile({
          dirname: 'logs',
          filename: 'warn-%DATE%.log',
          datePattern: 'YYYY-MM-DD',
          level: 'warn',
          maxSize: '20m',
          maxFiles: '14d',
          format: winston.format.combine(
            logFormat,
            winston.format.json(),
          ),
        }),
      );
    }

    return winston.createLogger({
      level: process.env.LOG_LEVEL || (isProduction ? 'info' : 'debug'),
      format: logFormat,
      transports,
      exitOnError: false,
    });
  }

  /**
   * Get request ID from CLS namespace
   */
  private getRequestId(): string | undefined {
    return requestNamespace.get('requestId');
  }

  /**
   * Build log metadata
   */
  private buildMetadata(meta?: Record<string, any>): Record<string, any> {
    const requestId = this.getRequestId();
    return {
      ...(this.context && { context: this.context }),
      ...(requestId && { requestId }),
      ...(meta && { ...meta }),
    };
  }

  /**
   * Log methods implementing NestLoggerService
   */
  log(message: string, context?: string): void;
  log(message: string, meta?: Record<string, any>): void;
  log(message: string, contextOrMeta?: string | Record<string, any>): void {
    const isContext = typeof contextOrMeta === 'string';
    this.logger.info(message, this.buildMetadata({
      ...(isContext ? { context: contextOrMeta } : contextOrMeta),
    }));
  }

  error(message: string, trace?: string, context?: string): void;
  error(message: string, error?: Error, meta?: Record<string, any>): void;
  error(
    message: string,
    traceOrError?: string | Error,
    contextOrMeta?: string | Record<string, any>,
  ): void {
    const isError = traceOrError instanceof Error;
    const isContext = typeof contextOrMeta === 'string';

    this.logger.error(message, this.buildMetadata({
      ...(isError && { error: traceOrError, stack: traceOrError.stack }),
      ...(typeof traceOrError === 'string' && { trace: traceOrError }),
      ...(isContext ? { context: contextOrMeta } : contextOrMeta),
    }));
  }

  warn(message: string, context?: string): void;
  warn(message: string, meta?: Record<string, any>): void;
  warn(message: string, contextOrMeta?: string | Record<string, any>): void {
    const isContext = typeof contextOrMeta === 'string';
    this.logger.warn(message, this.buildMetadata({
      ...(isContext ? { context: contextOrMeta } : contextOrMeta),
    }));
  }

  debug(message: string, context?: string): void;
  debug(message: string, meta?: Record<string, any>): void;
  debug(message: string, contextOrMeta?: string | Record<string, any>): void {
    const isContext = typeof contextOrMeta === 'string';
    this.logger.debug(message, this.buildMetadata({
      ...(isContext ? { context: contextOrMeta } : contextOrMeta),
    }));
  }

  verbose(message: string, context?: string): void;
  verbose(message: string, meta?: Record<string, any>): void;
  verbose(message: string, contextOrMeta?: string | Record<string, any>): void {
    const isContext = typeof contextOrMeta === 'string';
    this.logger.verbose(message, this.buildMetadata({
      ...(isContext ? { context: contextOrMeta } : contextOrMeta),
    }));
  }

  /**
   * Custom log methods with metadata
   */
  logInfo(message: string, meta?: Record<string, any>): void {
    this.logger.info(message, this.buildMetadata(meta));
  }

  logError(message: string, error?: Error, meta?: Record<string, any>): void {
    this.logger.error(message, this.buildMetadata({
      ...meta,
      ...(error && {
        error: {
          name: error.name,
          message: error.message,
          stack: error.stack,
        },
      }),
    }));
  }

  logWarn(message: string, meta?: Record<string, any>): void {
    this.logger.warn(message, this.buildMetadata(meta));
  }

  logDebug(message: string, meta?: Record<string, any>): void {
    this.logger.debug(message, this.buildMetadata(meta));
  }

  /**
   * Performance logging
   */
  logPerformance(operation: string, duration: number, meta?: Record<string, any>): void {
    const level = duration > 1000 ? 'warn' : 'info';
    this.logger.log({
      level,
      message: `Performance: ${operation}`,
      ...this.buildMetadata({
        ...meta,
        operation,
        duration: `${duration}ms`,
        slow: duration > 1000,
      }),
    });
  }

  /**
   * HTTP request logging
   */
  logRequest(
    method: string,
    url: string,
    statusCode: number,
    duration: number,
    meta?: Record<string, any>,
  ): void {
    const level = statusCode >= 500 ? 'error' : statusCode >= 400 ? 'warn' : 'info';
    this.logger.log({
      level,
      message: `${method} ${url} ${statusCode}`,
      ...this.buildMetadata({
        ...meta,
        http: {
          method,
          url,
          statusCode,
          duration: `${duration}ms`,
        },
      }),
    });
  }

  /**
   * Database query logging
   */
  logQuery(query: string, duration: number, params?: any[]): void {
    if (duration > 1000) {
      this.logger.warn('Slow database query detected', this.buildMetadata({
        query,
        duration: `${duration}ms`,
        params,
      }));
    } else if (process.env.LOG_QUERIES === 'true') {
      this.logger.debug('Database query', this.buildMetadata({
        query,
        duration: `${duration}ms`,
        params,
      }));
    }
  }

  /**
   * Create child logger with context
   */
  child(context: string): LoggerService {
    return new LoggerService(context);
  }

  /**
   * Set request ID in CLS namespace
   */
  static setRequestId(requestId: string): void {
    requestNamespace.run(() => {
      requestNamespace.set('requestId', requestId);
    });
  }

  /**
   * Run function with request context
   */
  static runWithRequestId<T>(requestId: string, fn: () => T): T {
    return requestNamespace.runAndReturn(() => {
      requestNamespace.set('requestId', requestId);
      return fn();
    });
  }
}

/**
 * Logger module for dependency injection
 */
import { Module, Global } from '@nestjs/common';

@Global()
@Module({
  providers: [LoggerService],
  exports: [LoggerService],
})
export class LoggerModule {}
