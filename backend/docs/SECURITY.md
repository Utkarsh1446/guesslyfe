# Security Guide

This document outlines the security measures implemented in the GuessLyfe backend to protect against common vulnerabilities and attacks.

## Table of Contents

- [Overview](#overview)
- [Rate Limiting](#rate-limiting)
- [Security Headers](#security-headers)
- [CORS Configuration](#cors-configuration)
- [Input Validation](#input-validation)
- [SQL Injection Prevention](#sql-injection-prevention)
- [XSS Prevention](#xss-prevention)
- [API Key Protection](#api-key-protection)
- [Authentication & Authorization](#authentication--authorization)
- [Security Best Practices](#security-best-practices)

## Overview

The GuessLyfe backend implements multiple layers of security to protect against common web vulnerabilities:

- ✅ **Rate Limiting** - Prevent abuse and DoS attacks
- ✅ **Security Headers** - Helmet middleware for HTTP headers
- ✅ **CORS** - Controlled cross-origin resource sharing
- ✅ **Input Validation** - class-validator + custom validators
- ✅ **Input Sanitization** - XSS protection
- ✅ **SQL Injection Prevention** - TypeORM parameterized queries
- ✅ **API Key Protection** - Environment variables + secrets management
- ✅ **Authentication** - JWT bearer tokens
- ✅ **Error Handling** - Sanitized error responses

## Rate Limiting

Rate limiting prevents abuse and protects against denial-of-service attacks.

### Configuration

Rate limits are defined in `src/common/config/throttler.config.ts`:

```typescript
// Global default: 100 requests per 15 minutes per IP
global: { ttl: 900000, limit: 100 }

// Auth endpoints: 5 requests per minute
auth: { ttl: 60000, limit: 5 }

// Create market: 10 per hour per user
createMarket: { ttl: 3600000, limit: 10 }

// Trade endpoints: 30 per minute per user
trade: { ttl: 60000, limit: 30 }
```

### Usage

Apply custom rate limits using decorators:

```typescript
import { AuthThrottle, TradeThrottle, CreateThrottle } from '@/common/decorators/throttle.decorator';

@Controller('auth')
export class AuthController {
  @AuthThrottle() // 5 requests per minute
  @Post('login')
  async login() {
    // ...
  }
}

@Controller('shares')
export class SharesController {
  @TradeThrottle() // 30 requests per minute
  @Post('buy')
  async buyShares() {
    // ...
  }
}

@Controller('markets')
export class MarketsController {
  @CreateThrottle() // 10 requests per hour
  @Post()
  async createMarket() {
    // ...
  }
}
```

### Skip Rate Limiting

Admin users and whitelisted IPs automatically bypass rate limits:

```typescript
// Via decorator
@SkipThrottle()
@Get('health')
async health() {
  // No rate limiting
}

// Via environment variable (whitelisted IPs)
RATE_LIMIT_WHITELIST_IPS=127.0.0.1,::1,10.0.0.1
```

### Custom Throttler Guard

The `CustomThrottlerGuard` extends the default behavior:

- Skips rate limiting for admin users (`user.role === 'admin'`)
- Skips rate limiting for whitelisted IPs
- Uses user ID for authenticated requests (instead of IP)
- Tracks requests per user instead of per IP

## Security Headers

Helmet middleware sets secure HTTP headers to prevent common attacks.

### Implemented Headers

```typescript
// Content Security Policy
contentSecurityPolicy: {
  defaultSrc: ["'self'"],
  scriptSrc: ["'self'"],
  styleSrc: ["'self'", "'unsafe-inline'"],
  imgSrc: ["'self'", "data:", "https:"],
  connectSrc: ["'self'"],
  fontSrc: ["'self'"],
  objectSrc: ["'none'"],
  mediaSrc: ["'self'"],
  frameSrc: ["'none'"],
}

// HTTP Strict Transport Security (HSTS)
hsts: {
  maxAge: 31536000, // 1 year
  includeSubDomains: true,
  preload: true,
}

// X-Frame-Options: DENY (prevent clickjacking)
frameguard: { action: 'deny' }

// X-Content-Type-Options: nosniff
noSniff: true

// Referrer-Policy
referrerPolicy: { policy: 'strict-origin-when-cross-origin' }

// Hide X-Powered-By header
hidePoweredBy: true
```

### Configuration

Security headers are configured in `src/common/config/security.config.ts` and applied in `main.ts`:

```typescript
import { helmetConfig } from './common/config/security.config';
app.use(helmet(helmetConfig));
```

## CORS Configuration

CORS (Cross-Origin Resource Sharing) controls which domains can access the API.

### Production Configuration

```typescript
CORS_ALLOWED_ORIGINS=https://app.guesslyfe.com,https://admin.guesslyfe.com
FRONTEND_URL=https://app.guesslyfe.com
ADMIN_DASHBOARD_URL=https://admin.guesslyfe.com
```

### Development Configuration

In development, CORS allows all origins for easier testing:

```typescript
// Development: Allow all origins
origin: true
```

### Allowed Methods & Headers

```typescript
methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS']
allowedHeaders: [
  'Content-Type',
  'Authorization',
  'X-Requested-With',
  'X-Request-ID',
  'Accept',
  'Origin',
]
exposedHeaders: ['X-Request-ID', 'X-RateLimit-Limit', 'X-RateLimit-Remaining']
credentials: true // Allow cookies
```

### Configuration

CORS is configured in `src/common/config/security.config.ts`:

```typescript
import { getAppCorsConfig } from './common/config/security.config';
app.enableCors(getAppCorsConfig());
```

## Input Validation

All user inputs are validated using class-validator and custom validators.

### Standard Validators

```typescript
import {
  IsString,
  IsNumber,
  IsEmail,
  MinLength,
  MaxLength,
  Min,
  Max,
  IsOptional,
} from 'class-validator';

export class CreateUserDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  @MaxLength(100)
  password: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  displayName?: string;
}
```

### Custom Validators

#### Ethereum Address

```typescript
import { IsEthereumAddress } from '@/common/validators/wallet-address.validator';

export class LinkWalletDto {
  @IsEthereumAddress()
  walletAddress: string; // Must be 0x followed by 40 hex characters
}
```

#### Twitter Handle

```typescript
import { IsTwitterHandle } from '@/common/validators/twitter-handle.validator';

export class VerifyCreatorDto {
  @IsTwitterHandle()
  twitterHandle: string; // 1-15 alphanumeric + underscore, not all numbers
}
```

#### BigInt String (for wei values)

```typescript
import { IsBigIntString } from '@/common/validators/custom-validators';

export class BuySharesDto {
  @IsBigIntString()
  amount: string; // Must be a valid positive integer string
}
```

#### Future Date

```typescript
import { IsFutureDate } from '@/common/validators/custom-validators';

export class CreateMarketDto {
  @IsFutureDate()
  endDate: Date; // Must be in the future
}
```

#### Secure URL (HTTPS only)

```typescript
import { IsSecureUrl } from '@/common/validators/custom-validators';

export class UpdateProfileDto {
  @IsSecureUrl()
  avatarUrl: string; // Must use HTTPS or IPFS protocol
}
```

### Validation Pipeline

The validation pipeline consists of two pipes:

1. **SanitizationPipe** - Removes potentially dangerous content (XSS)
2. **ValidationPipe** - Validates data against DTO schema

```typescript
app.useGlobalPipes(
  new SanitizationPipe(), // Sanitize first
  new ValidationPipe({
    whitelist: true, // Strip non-whitelisted properties
    forbidNonWhitelisted: true, // Throw error if non-whitelisted properties exist
    transform: true, // Transform to correct types
  }),
);
```

### Validation Best Practices

See `src/common/dto/validation-example.dto.ts` for comprehensive examples.

## SQL Injection Prevention

TypeORM prevents SQL injection through parameterized queries.

### ✅ SAFE: Using Query Builder (Parameterized)

```typescript
const users = await this.userRepository
  .createQueryBuilder('user')
  .where('user.email = :email', { email: userEmail })
  .getMany();
```

### ✅ SAFE: Using Repository Methods

```typescript
const user = await this.userRepository.findOne({
  where: { email: userEmail },
});
```

### ❌ UNSAFE: String Concatenation (NEVER DO THIS)

```typescript
// NEVER DO THIS - VULNERABLE TO SQL INJECTION!
const users = await this.userRepository
  .query(`SELECT * FROM users WHERE email = '${userEmail}'`);
```

### Best Practices

1. **ALWAYS** use parameterized queries with TypeORM query builder
2. **NEVER** concatenate user input into SQL strings
3. **ALWAYS** use repository methods when possible
4. **VALIDATE** all inputs before database operations

## XSS Prevention

Cross-Site Scripting (XSS) attacks are prevented through sanitization.

### Sanitization Pipe

The `SanitizationPipe` automatically removes dangerous content:

```typescript
// Removes:
- <script> tags
- <iframe> tags
- javascript: protocol
- Event handlers (onclick, onerror, etc.)

// Example:
Input:  "<script>alert('XSS')</script>Hello"
Output: "Hello"
```

### Content Security Policy

CSP headers prevent execution of inline scripts:

```typescript
contentSecurityPolicy: {
  scriptSrc: ["'self'"], // Only allow scripts from same origin
  objectSrc: ["'none'"],  // Disallow plugins
}
```

### Best Practices

1. **NEVER** render user input as HTML
2. **ALWAYS** escape user content in templates
3. **USE** CSP headers to restrict script execution
4. **SANITIZE** all user inputs before storage
5. **VALIDATE** URLs to ensure they use HTTPS

## API Key Protection

Sensitive API keys and secrets must be protected.

### Environment Variables

All secrets are stored in environment variables:

```bash
# ✅ CORRECT
JWT_SECRET=your-secret-key-here
TWITTER_CLIENT_SECRET=your-twitter-secret
SENDGRID_API_KEY=your-sendgrid-key
```

### .gitignore

Ensure `.env` files are not committed:

```bash
# .gitignore
.env
.env.local
.env.production
*.key
*.pem
```

### GCP Secret Manager (Production)

For production, use GCP Secret Manager:

```typescript
import { SecretManagerServiceClient } from '@google-cloud/secret-manager';

const client = new SecretManagerServiceClient();
const [version] = await client.accessSecretVersion({
  name: 'projects/PROJECT_ID/secrets/SECRET_NAME/versions/latest',
});
const secret = version.payload.data.toString();
```

### Environment Variables Setup

```bash
# Development
cp .env.example .env
# Edit .env with your values

# Production (GCP Cloud Run)
gcloud run services update guessly-api \
  --update-env-vars JWT_SECRET=your-secret \
  --update-secrets TWITTER_SECRET=twitter-secret:latest
```

### API Key Rotation

Rotate API keys regularly:

1. Generate new key in provider dashboard
2. Update environment variable
3. Deploy new version
4. Revoke old key after deployment

### Best Practices

1. **NEVER** commit secrets to git
2. **ALWAYS** use environment variables for secrets
3. **USE** GCP Secret Manager in production
4. **ROTATE** API keys regularly (every 90 days)
5. **LIMIT** key permissions to minimum required
6. **MONITOR** key usage and set up alerts
7. **REVOKE** compromised keys immediately

## Authentication & Authorization

JWT-based authentication with role-based access control.

### JWT Tokens

```typescript
// Generate token
const token = this.jwtService.sign({
  sub: user.id,
  email: user.email,
  role: user.role,
});

// Verify token
const payload = this.jwtService.verify(token);
```

### Protected Routes

```typescript
import { UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Get('profile')
async getProfile(@Request() req) {
  return req.user; // Authenticated user
}
```

### Role-Based Access

```typescript
import { Roles } from '@/common/decorators/roles.decorator';
import { RolesGuard } from '@/common/guards/roles.guard';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
@Delete('user/:id')
async deleteUser(@Param('id') id: string) {
  // Only admins can delete users
}
```

## Security Best Practices

### 1. Defense in Depth

Implement multiple layers of security:
- Rate limiting
- Input validation
- Output encoding
- Authentication
- Authorization
- Logging & monitoring

### 2. Principle of Least Privilege

- Grant minimum required permissions
- Use separate database users for different services
- Limit API key scopes

### 3. Secure Defaults

- Enable security features by default
- Disable unnecessary features
- Use secure configurations

### 4. Input Validation

- Validate ALL user inputs
- Whitelist allowed values (not blacklist)
- Use strong typing (TypeScript)
- Sanitize before storage

### 5. Error Handling

- Don't expose stack traces in production
- Sanitize error messages
- Log errors for debugging
- Return generic error messages to users

### 6. Logging & Monitoring

- Log all authentication attempts
- Log all authorization failures
- Monitor rate limit violations
- Set up alerts for suspicious activity

### 7. Dependencies

- Keep dependencies up to date
- Run `npm audit` regularly
- Review security advisories
- Use lock files (package-lock.json)

### 8. HTTPS Only

- Use HTTPS in production
- Redirect HTTP to HTTPS
- Set HSTS header
- Use secure cookies

### 9. Database Security

- Use parameterized queries
- Encrypt sensitive data
- Use connection pooling
- Limit database permissions

### 10. Testing

- Test security features
- Perform penetration testing
- Run security scanners
- Test error handling

## Environment Variables Reference

```bash
# Security Configuration
CORS_ALLOWED_ORIGINS=https://app.guesslyfe.com,https://admin.guesslyfe.com
RATE_LIMIT_WHITELIST_IPS=10.0.0.1,10.0.0.2
CSP_ENABLED=true

# Authentication
JWT_SECRET=<strong-random-secret>
JWT_EXPIRATION=7d
JWT_REFRESH_SECRET=<strong-random-secret>
JWT_REFRESH_EXPIRATION=30d

# API Keys (use Secret Manager in production)
TWITTER_CLIENT_SECRET=<twitter-secret>
SENDGRID_API_KEY=<sendgrid-key>
BLOCKCHAIN_PROVIDER_PRIVATE_KEY=<private-key>

# Error Tracking
SENTRY_DSN=<sentry-dsn>
SENTRY_ENABLED=true

# Alerts
ALERT_WEBHOOK_URL=<slack-webhook-url>
```

## Security Checklist

Before deploying to production:

- [ ] All secrets in environment variables (not hardcoded)
- [ ] `.env` files in `.gitignore`
- [ ] HTTPS enabled with valid certificate
- [ ] CORS configured for production domains only
- [ ] Rate limiting enabled
- [ ] Security headers configured (Helmet)
- [ ] Input validation on all endpoints
- [ ] SQL injection prevention (parameterized queries)
- [ ] XSS prevention (sanitization + CSP)
- [ ] Authentication required for protected routes
- [ ] Authorization checks for sensitive operations
- [ ] Error messages sanitized (no stack traces)
- [ ] Logging and monitoring configured
- [ ] Dependencies up to date (`npm audit`)
- [ ] API keys rotated
- [ ] Database backups enabled
- [ ] Security testing performed

## Reporting Security Issues

If you discover a security vulnerability, please email:

**security@guesslyfe.com**

Please include:
- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if any)

We will respond within 48 hours and work with you to address the issue.

## Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [NestJS Security](https://docs.nestjs.com/security/helmet)
- [TypeORM Security](https://typeorm.io/security)
- [Node.js Security Best Practices](https://nodejs.org/en/docs/guides/security/)
- [JWT Best Practices](https://tools.ietf.org/html/rfc8725)

## License

This security documentation is part of the GuessLyfe project and is licensed under MIT.
