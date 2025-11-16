# Error Handling and Logging Guide

This guide documents the comprehensive error handling and logging system implemented in the GuessLyfe backend.

## Table of Contents

- [Overview](#overview)
- [Custom Exceptions](#custom-exceptions)
- [Logging Service](#logging-service)
- [Global Exception Filter](#global-exception-filter)
- [Request Logging](#request-logging)
- [Performance Monitoring](#performance-monitoring)
- [Sentry Integration](#sentry-integration)
- [Best Practices](#best-practices)

## Overview

The error handling system consists of several components working together:

1. **Custom Exception Classes** - Domain-specific exceptions with error codes
2. **LoggerService** - Winston-based logging with multiple transports
3. **AllExceptionsFilter** - Global exception handler
4. **RequestLoggerMiddleware** - Request/response logging
5. **PerformanceInterceptor** - Performance tracking
6. **Sentry Integration** - Error tracking and monitoring

## Custom Exceptions

All custom exceptions extend the `AppException` base class, which provides:
- HTTP status codes
- Error codes for client identification
- Additional details/context
- Timestamp

### Base Exception

```typescript
import { AppException } from '@/common/exceptions/custom-exceptions';

throw new AppException(
  'Something went wrong',
  HttpStatus.BAD_REQUEST,
  'CUSTOM_ERROR_CODE',
  { additionalInfo: 'details' }
);
```

### Available Exception Classes

#### Wallet Exceptions

```typescript
// Wallet not connected
throw new WalletNotConnectedException();

// Invalid wallet address
throw new InvalidWalletAddressException('0xinvalid');

// Wallet already linked to another account
throw new WalletAlreadyLinkedException('0xabcd...');
```

#### Twitter Exceptions

```typescript
// Twitter not connected
throw new TwitterNotConnectedException();

// Twitter authentication failed
throw new TwitterAuthFailedException('Invalid credentials');

// Twitter account not eligible
throw new TwitterAccountNotEligibleException(
  'Insufficient followers',
  100,
  1000
);
```

#### Financial/Trading Exceptions

```typescript
// Insufficient funds
throw new InsufficientFundsException(
  '1000000000000000000', // required
  '500000000000000000'   // available
);

// Insufficient shares
throw new InsufficientSharesException(
  '100', // required
  '50'   // available
);

// Price slippage exceeded
throw new PriceSlippageException(
  '1000000000000000000', // expected
  '1050000000000000000', // actual
  '0.02'                 // max 2%
);
```

#### Creator Exceptions

```typescript
// Creator not found
throw new CreatorNotFoundException('twitter_handle');

// Shares not unlocked
throw new SharesNotUnlockedException(
  '0xabcd...', // creator address
  '50000',     // current volume
  '100000'     // required volume
);

// Creator already exists
throw new CreatorAlreadyExistsException('twitter_handle');
```

#### Market Exceptions

```typescript
// Market not found
throw new MarketNotFoundException('market-id-123');

// Market not active
throw new MarketNotActiveException('market-id-123', 'resolved');

// Market already resolved
throw new MarketAlreadyResolvedException('market-id-123');

// Market not ended yet
throw new MarketNotEndedException('market-id-123', new Date('2025-12-31'));
```

#### Dividend Exceptions

```typescript
// Dividend epoch not found
throw new DividendEpochNotFoundException('epoch-id-123');

// Dividend already claimed
throw new DividendAlreadyClaimedException('epoch-id-123', '0xuser...');

// No dividends available
throw new NoDividendsAvailableException('epoch-id-123', '0xuser...');
```

#### Blockchain Exceptions

```typescript
// Transaction failed
throw new BlockchainTransactionFailedException(
  'Gas estimation failed',
  '0xtxhash...'
);

// Contract interaction failed
throw new ContractInteractionException(
  'SharesContract',
  'buyShares',
  'Insufficient allowance'
);

// Gas estimation failed
throw new GasEstimationException('Transaction would revert');
```

#### Other Exceptions

```typescript
// Rate limit exceeded
throw new RateLimitExceededException(100, '15 minutes', 900);

// Validation failed
throw new ValidationException({
  email: ['Must be a valid email'],
  password: ['Must be at least 8 characters']
});

// Resource not found
throw new ResourceNotFoundException('User', 'user-id-123');

// Resource already exists
throw new ResourceAlreadyExistsException('User', 'user@example.com');

// Unauthorized
throw new UnauthorizedException('Invalid credentials');

// Forbidden
throw new ForbiddenException('Access denied', 'admin-panel');

// External service error
throw new ExternalServiceException('Twitter API', 'Rate limit exceeded');

// Twitter API error
throw new TwitterAPIException('User not found', 404);

// Blockchain RPC error
throw new BlockchainRPCException('Connection timeout');
```

## Logging Service

The `LoggerService` is a Winston-based logger with support for multiple log levels and transports.

### Basic Usage

```typescript
import { LoggerService } from '@/common/logging/logger.service';

@Injectable()
export class MyService {
  private readonly logger = new LoggerService(MyService.name);

  someMethod() {
    this.logger.log('Simple log message');
    this.logger.error('Error message', new Error('Something failed'));
    this.logger.warn('Warning message');
    this.logger.debug('Debug message');
    this.logger.verbose('Verbose message');
  }
}
```

### Logging with Metadata

```typescript
// Info with metadata
this.logger.logInfo('User created', {
  userId: user.id,
  email: user.email,
  role: user.role
});

// Warning with metadata
this.logger.logWarn('Slow query detected', {
  query: 'SELECT * FROM users',
  duration: '2500ms',
  threshold: '1000ms'
});

// Error with metadata
this.logger.logError('Payment failed', error, {
  userId: user.id,
  amount: payment.amount,
  currency: 'USD'
});
```

### Performance Logging

```typescript
this.logger.logPerformance('database-query', 1500, {
  query: 'SELECT * FROM users',
  rows: 1000
});
```

### Database Query Logging

```typescript
this.logger.logQuery('SELECT * FROM users WHERE id = $1', ['123'], 50);
```

### HTTP Request Logging

```typescript
this.logger.logHttp('GET', '/api/users', 200, 150, {
  userId: 'user-123',
  ip: '192.168.1.1'
});
```

### Context Setting

```typescript
// Set context for this logger instance
this.logger.setContext('AuthService');

// All subsequent logs will include this context
this.logger.log('User logged in'); // [AuthService] User logged in
```

### Log Levels

- **error**: Errors that need immediate attention
- **warn**: Warning conditions (slow queries, deprecated features)
- **info**: General informational messages
- **debug**: Detailed debugging information
- **verbose**: Very detailed information

Set log level via environment variable:
```env
LOG_LEVEL=debug  # error | warn | info | debug | verbose
```

### Transports

#### Console Transport
Always enabled. Includes colorized output in development.

#### File Transports (Production Only)
- `logs/error-YYYY-MM-DD.log` - Error logs
- `logs/combined-YYYY-MM-DD.log` - All logs
- Daily rotation with 14-day retention
- Max file size: 20MB

#### GCP Cloud Logging (Production Only)
When `GCP_PROJECT_ID` is set:
```env
GCP_PROJECT_ID=my-project-id
GCP_LOGGING_ENABLED=true
```

## Global Exception Filter

The `AllExceptionsFilter` catches all exceptions and:
1. Formats consistent error responses
2. Logs errors with context
3. Sends 5xx errors to Sentry
4. Triggers alerts for critical errors
5. Sanitizes sensitive data in production

### Error Response Format

```json
{
  "statusCode": 400,
  "timestamp": "2025-01-15T10:30:00.000Z",
  "path": "/api/users/123",
  "method": "POST",
  "message": "Validation failed",
  "error": "ValidationException",
  "errorCode": "VALIDATION_FAILED",
  "details": {
    "errors": {
      "email": ["Must be a valid email"]
    }
  },
  "requestId": "550e8400-e29b-41d4-a716-446655440000"
}
```

### Sensitive Data Sanitization

The filter automatically redacts:
- Passwords
- Tokens
- API keys
- Private keys
- Secrets

In production, 5xx error messages are replaced with generic messages unless they have an error code.

## Request Logging

The `RequestLoggerMiddleware` logs all HTTP requests and responses.

### Request Logs

```
[RequestLogger] POST /api/users - User: user@example.com (192.168.1.1)
```

### Response Logs

```
[RequestLogger] POST /api/users 201 - 150ms
```

### Log Levels

- **error**: Status >= 500
- **warn**: Status >= 400 or duration > 1000ms
- **info**: All other requests

### Request ID Tracking

Every request gets a unique ID for tracing:
- Generated as UUID v4
- Available in `X-Request-ID` header
- Tracked via CLS (Continuation-Local Storage)
- Included in all logs for that request

## Performance Monitoring

The `PerformanceInterceptor` tracks endpoint performance.

### Slow Endpoint Detection

Logs warnings for endpoints exceeding threshold:
```env
SLOW_ENDPOINT_THRESHOLD_MS=1000  # Default: 1 second
```

Example log:
```
[PerformanceInterceptor] Slow endpoint detected
{
  endpoint: "UserController.getUser",
  method: "GET",
  duration: "2500ms",
  threshold: "1000ms"
}
```

### Performance Summaries

Logged every 5 minutes with statistics:
- Average response time
- p95 latency
- p99 latency
- Request count

Example:
```
Performance Summary:
UserController.getUser - avg: 120ms, p95: 450ms, p99: 800ms, count: 1000
UserController.createUser - avg: 250ms, p95: 900ms, p99: 1500ms, count: 500
```

## Sentry Integration

Sentry provides error tracking and performance monitoring.

### Configuration

```env
SENTRY_DSN=https://abc123@sentry.io/project-id
SENTRY_ENABLED=true
SENTRY_TRACES_SAMPLE_RATE=0.1  # 10% of transactions
SENTRY_DEBUG=false
APP_VERSION=1.0.0
```

### Features

#### Error Tracking
- Automatic capture of 5xx errors
- Stack traces
- Request context
- User context

#### Performance Monitoring
- 10% of transactions tracked (configurable)
- Database queries
- HTTP requests
- Redis operations

#### Data Sanitization
- Authorization headers removed
- Cookies removed
- Query parameters sanitized
- Request body sanitized

#### Filtered Errors
Not sent to Sentry:
- Validation errors (4xx)
- 404 errors
- Rate limit errors
- Health check requests

### Manual Usage

```typescript
import {
  captureSentryException,
  captureSentryMessage,
  setSentryUser,
  addSentryBreadcrumb
} from '@/common/sentry/sentry';

// Capture exception
try {
  // risky operation
} catch (error) {
  captureSentryException(error, {
    operation: 'payment-processing',
    userId: user.id
  });
}

// Capture message
captureSentryMessage('Payment processed successfully', 'info', {
  amount: 100,
  currency: 'USD'
});

// Set user context
setSentryUser(user.id, user.username, user.email);

// Add breadcrumb
addSentryBreadcrumb('User clicked checkout', 'user-action', 'info', {
  cartTotal: 100
});
```

## Best Practices

### 1. Use Specific Exceptions

❌ **Bad**
```typescript
throw new Error('User not found');
```

✅ **Good**
```typescript
throw new ResourceNotFoundException('User', userId);
```

### 2. Include Context in Errors

❌ **Bad**
```typescript
throw new InsufficientFundsException(required, available);
```

✅ **Good**
```typescript
this.logger.logWarn('Insufficient funds detected', {
  userId: user.id,
  required,
  available,
  operation: 'buyShares'
});
throw new InsufficientFundsException(required, available);
```

### 3. Log Before Critical Operations

```typescript
async buyShares(userId: string, amount: string) {
  this.logger.logInfo('Starting share purchase', {
    userId,
    amount,
    operation: 'buyShares'
  });

  try {
    const result = await this.sharesService.buy(userId, amount);

    this.logger.logInfo('Share purchase completed', {
      userId,
      amount,
      txHash: result.transactionHash
    });

    return result;
  } catch (error) {
    this.logger.logError('Share purchase failed', error, {
      userId,
      amount
    });
    throw error;
  }
}
```

### 4. Use Appropriate Log Levels

```typescript
// Error - Requires immediate attention
this.logger.error('Database connection failed', error);

// Warn - Should be investigated
this.logger.warn('Slow database query detected', { duration: '2500ms' });

// Info - General information
this.logger.log('User logged in successfully');

// Debug - Detailed debugging info
this.logger.debug('Cache miss', { key: 'user:123' });

// Verbose - Very detailed tracing
this.logger.verbose('Processing request step 3 of 10');
```

### 5. Don't Log Sensitive Data

❌ **Bad**
```typescript
this.logger.log('User credentials', {
  password: user.password,
  privateKey: user.privateKey
});
```

✅ **Good**
```typescript
this.logger.log('User authenticated', {
  userId: user.id,
  method: 'password'
});
```

### 6. Handle Async Errors

```typescript
async processPayment(payment: Payment) {
  try {
    await this.paymentService.process(payment);
  } catch (error) {
    this.logger.logError('Payment processing failed', error, {
      paymentId: payment.id,
      amount: payment.amount
    });

    // Re-throw or handle appropriately
    throw new PaymentProcessingException(error.message);
  }
}
```

### 7. Use Performance Logging

```typescript
async getUserOrders(userId: string) {
  const startTime = Date.now();

  const orders = await this.orderRepository.find({ userId });

  const duration = Date.now() - startTime;
  this.logger.logPerformance('getUserOrders', duration, {
    userId,
    orderCount: orders.length
  });

  return orders;
}
```

### 8. Validate and Log

```typescript
async createUser(dto: CreateUserDto) {
  // Validate
  if (!this.isValidEmail(dto.email)) {
    this.logger.logWarn('Invalid email provided', {
      email: dto.email,
      operation: 'createUser'
    });
    throw new ValidationException({
      email: ['Must be a valid email']
    });
  }

  // Process
  const user = await this.userRepository.create(dto);

  this.logger.logInfo('User created', {
    userId: user.id,
    email: user.email
  });

  return user;
}
```

## Environment Variables

```env
# Logging Configuration
LOG_LEVEL=info                        # error | warn | info | debug | verbose
LOG_TO_CONSOLE=true                   # Console logging
LOG_TO_FILE=false                     # File logging (auto-enabled in production)
LOG_QUERIES=false                     # Log database queries

# GCP Cloud Logging
GCP_PROJECT_ID=                       # GCP project ID
GCP_LOGGING_ENABLED=false             # Enable GCP logging

# Sentry Configuration
SENTRY_DSN=                           # Sentry DSN
SENTRY_ENABLED=true                   # Enable Sentry
SENTRY_TRACES_SAMPLE_RATE=0.1         # Sample rate (0.0 - 1.0)
SENTRY_DEBUG=false                    # Sentry debug mode
APP_VERSION=0.1.0                     # Application version

# Performance Monitoring
SLOW_ENDPOINT_THRESHOLD_MS=1000       # Slow endpoint threshold

# Alerts
ALERT_WEBHOOK_URL=                    # Webhook for critical errors
```

## Testing Error Handling

### Unit Tests

```typescript
describe('UserService', () => {
  it('should throw ResourceNotFoundException when user not found', async () => {
    await expect(
      service.getUser('invalid-id')
    ).rejects.toThrow(ResourceNotFoundException);
  });

  it('should log error when user creation fails', async () => {
    const loggerSpy = jest.spyOn(logger, 'logError');

    await expect(
      service.createUser(invalidDto)
    ).rejects.toThrow();

    expect(loggerSpy).toHaveBeenCalledWith(
      expect.stringContaining('User creation failed'),
      expect.any(Error),
      expect.objectContaining({ email: invalidDto.email })
    );
  });
});
```

### E2E Tests

```typescript
describe('POST /api/users', () => {
  it('should return 400 with error code for validation errors', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/users')
      .send({ email: 'invalid' })
      .expect(400);

    expect(response.body).toMatchObject({
      statusCode: 400,
      errorCode: 'VALIDATION_FAILED',
      message: expect.any(String),
      details: expect.objectContaining({
        errors: expect.any(Object)
      })
    });
  });
});
```

## Troubleshooting

### Logs Not Appearing

1. Check `LOG_LEVEL` environment variable
2. Ensure logger is properly initialized
3. Check console suppression in test environment

### Sentry Not Receiving Errors

1. Verify `SENTRY_DSN` is set correctly
2. Check `SENTRY_ENABLED=true`
3. Ensure error is 5xx (4xx not sent to Sentry)
4. Check if error is in filtered list

### Performance Metrics Missing

1. Verify `PerformanceInterceptor` is registered globally
2. Check if endpoint is reached (controller method executed)
3. Wait for 5-minute summary interval

### Request ID Not in Logs

1. Ensure `RequestLoggerMiddleware` is applied
2. Check CLS namespace is active
3. Verify async context is preserved

## Summary

The error handling and logging system provides:
- ✅ Consistent error responses
- ✅ Comprehensive logging with context
- ✅ Performance monitoring
- ✅ Error tracking with Sentry
- ✅ Request tracing with unique IDs
- ✅ Sensitive data sanitization
- ✅ Critical error alerts
- ✅ Production-ready configuration

For questions or issues, refer to the source code:
- `src/common/exceptions/custom-exceptions.ts`
- `src/common/logging/logger.service.ts`
- `src/common/filters/http-exception.filter.ts`
- `src/common/middleware/request-logger.middleware.ts`
- `src/common/interceptors/performance.interceptor.ts`
- `src/common/sentry/sentry.ts`
