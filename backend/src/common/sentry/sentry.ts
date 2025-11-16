/**
 * Sentry Initialization
 *
 * Configures Sentry error tracking and performance monitoring
 */

import * as Sentry from '@sentry/node';
import {
  httpIntegration,
  expressIntegration,
  postgresIntegration,
  redisIntegration,
} from '@sentry/node';

/**
 * Initialize Sentry
 */
export function initSentry(): void {
  const sentryDsn = process.env.SENTRY_DSN;
  const sentryEnabled = process.env.SENTRY_ENABLED !== 'false';

  if (!sentryDsn) {
    console.log('Sentry DSN not configured. Sentry will not be initialized.');
    return;
  }

  if (!sentryEnabled) {
    console.log('Sentry is disabled via SENTRY_ENABLED environment variable.');
    return;
  }

  try {
    Sentry.init({
      dsn: sentryDsn,
      environment: process.env.NODE_ENV || 'development',
      release: process.env.APP_VERSION || '0.1.0',

      // Performance Monitoring
      tracesSampleRate: parseFloat(process.env.SENTRY_TRACES_SAMPLE_RATE || '0.1'), // 10% of transactions

      // Integrations
      integrations: [
        // Automatically instrument Node.js libraries and frameworks
        httpIntegration(),
        expressIntegration(),
        postgresIntegration(),
        redisIntegration(),
      ],

      // Before send hook to filter/modify events
      beforeSend(event, hint) {
        // Don't send certain errors to Sentry
        const error = hint.originalException;

        if (error instanceof Error) {
          // Don't report validation errors
          if (error.name === 'ValidationError') {
            return null;
          }

          // Don't report 404 errors
          if (error.message && error.message.includes('not found')) {
            return null;
          }

          // Don't report rate limit errors
          if (error.name === 'ThrottlerException') {
            return null;
          }
        }

        // Sanitize sensitive data
        if (event.request) {
          // Remove sensitive headers
          if (event.request.headers) {
            delete event.request.headers['authorization'];
            delete event.request.headers['cookie'];
            delete event.request.headers['x-api-key'];
          }

          // Remove sensitive query parameters
          if (event.request.query_string && typeof event.request.query_string === 'string') {
            const sanitizedQuery = event.request.query_string
              .replace(/([?&])(token|key|password|secret)=[^&]*/gi, '$1$2=[REDACTED]');
            event.request.query_string = sanitizedQuery;
          }

          // Sanitize request data
          if (event.request.data) {
            const data = typeof event.request.data === 'string'
              ? JSON.parse(event.request.data)
              : event.request.data;

            const sensitiveFields = ['password', 'privateKey', 'secret', 'token', 'apiKey'];
            sensitiveFields.forEach(field => {
              if (data[field]) {
                data[field] = '[REDACTED]';
              }
            });

            event.request.data = data;
          }
        }

        // Add custom tags
        event.tags = {
          ...event.tags,
          node_version: process.version,
        };

        return event;
      },

      // Before breadcrumb hook to filter/modify breadcrumbs
      beforeBreadcrumb(breadcrumb, hint) {
        // Don't log health check requests
        if (breadcrumb.category === 'http' && breadcrumb.data?.url?.includes('/health')) {
          return null;
        }

        // Sanitize HTTP breadcrumbs
        if (breadcrumb.category === 'http' && breadcrumb.data) {
          if (breadcrumb.data.url) {
            breadcrumb.data.url = breadcrumb.data.url.replace(
              /([?&])(token|key|password|secret)=[^&]*/gi,
              '$1$2=[REDACTED]',
            );
          }
        }

        return breadcrumb;
      },

      // Ignore certain errors
      ignoreErrors: [
        'ECONNRESET',
        'ECONNREFUSED',
        'ETIMEDOUT',
        'ENOTFOUND',
        'Non-Error promise rejection captured',
      ],

      // Debug mode in development
      debug: process.env.NODE_ENV === 'development' && process.env.SENTRY_DEBUG === 'true',
    });

    console.log(`Sentry initialized successfully (Environment: ${process.env.NODE_ENV})`);
  } catch (error) {
    console.error('Failed to initialize Sentry:', error);
  }
}

/**
 * Set user context in Sentry
 */
export function setSentryUser(userId: string, username?: string, email?: string): void {
  Sentry.setUser({
    id: userId,
    username,
    email,
  });
}

/**
 * Clear user context in Sentry
 */
export function clearSentryUser(): void {
  Sentry.setUser(null);
}

/**
 * Add breadcrumb to Sentry
 */
export function addSentryBreadcrumb(
  message: string,
  category: string,
  level: Sentry.SeverityLevel = 'info',
  data?: Record<string, any>,
): void {
  Sentry.addBreadcrumb({
    message,
    category,
    level,
    data,
    timestamp: Date.now() / 1000,
  });
}

/**
 * Capture exception in Sentry
 */
export function captureSentryException(error: Error, context?: Record<string, any>): void {
  Sentry.withScope((scope) => {
    if (context) {
      Object.entries(context).forEach(([key, value]) => {
        scope.setContext(key, value);
      });
    }
    Sentry.captureException(error);
  });
}

/**
 * Capture message in Sentry
 */
export function captureSentryMessage(
  message: string,
  level: Sentry.SeverityLevel = 'info',
  context?: Record<string, any>,
): void {
  Sentry.withScope((scope) => {
    if (context) {
      Object.entries(context).forEach(([key, value]) => {
        scope.setContext(key, value);
      });
    }
    Sentry.captureMessage(message, level);
  });
}

/**
 * Start Sentry span for performance monitoring
 */
export function startSentrySpan(name: string, operation: string): void {
  Sentry.startSpan(
    {
      name,
      op: operation,
    },
    (span) => {
      // Span context - use this to track operations
      return span;
    },
  );
}

/**
 * Flush Sentry events
 */
export async function flushSentry(timeout = 2000): Promise<boolean> {
  return Sentry.flush(timeout);
}

/**
 * Close Sentry
 */
export async function closeSentry(timeout = 2000): Promise<boolean> {
  return Sentry.close(timeout);
}
