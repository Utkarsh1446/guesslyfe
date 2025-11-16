# Environment Configuration Guide

Comprehensive guide for configuring environment variables in the GuessLyfe backend.

## Table of Contents

- [Overview](#overview)
- [Environment Files](#environment-files)
- [Quick Start](#quick-start)
- [Configuration Reference](#configuration-reference)
- [Environment-Specific Setup](#environment-specific-setup)
- [Security Best Practices](#security-best-practices)
- [Validation](#validation)
- [Troubleshooting](#troubleshooting)

## Overview

The GuessLyfe backend uses environment variables for configuration, allowing different settings for development, testing, staging, and production environments.

### Principles

1. **Environment-First**: All configuration through environment variables
2. **No Secrets in Code**: Never commit sensitive values
3. **Validation**: Automated validation of required variables
4. **Documentation**: Every variable is documented
5. **Sensible Defaults**: Development-friendly defaults

### Environment Files

| File | Purpose | Committed |
|------|---------|-----------|
| `.env.example` | Template with all variables | ✅ Yes |
| `.env.development` | Development defaults | ✅ Yes |
| `.env.production.example` | Production template | ✅ Yes |
| `.env.test` | Test environment | ✅ Yes |
| `.env` | Your local configuration | ❌ **NO** |
| `.env.local` | Local overrides | ❌ **NO** |
| `.env.production` | Production secrets | ❌ **NO** |

## Quick Start

### For Local Development

1. **Copy the example file**:
   ```bash
   cp .env.example .env
   ```

2. **Or use the development template**:
   ```bash
   cp .env.development .env
   ```

3. **Fill in required values**:
   ```bash
   # Edit .env file
   vi .env

   # At minimum, set:
   # - Database credentials
   # - JWT secret
   # - Blockchain RPC URL (if using blockchain features)
   ```

4. **Validate configuration**:
   ```bash
   ./scripts/validate-env.sh
   ```

5. **Start the application**:
   ```bash
   npm run start:dev
   ```

### For Production

1. **Copy production template**:
   ```bash
   cp .env.production.example .env.production
   ```

2. **Fill in ALL production values** with secure credentials

3. **Store in GCP Secret Manager**:
   ```bash
   ./deploy/setup-secrets.sh
   ```

4. **Validate**:
   ```bash
   ./scripts/validate-env.sh production
   ```

5. **Deploy**:
   ```bash
   ./deploy/deploy-to-gcp.sh
   ```

## Configuration Reference

### Application Configuration

#### NODE_ENV
- **Description**: Node.js environment
- **Values**: `development`, `production`, `test`, `staging`
- **Default**: `development`
- **Required**: Yes

```bash
NODE_ENV=production
```

#### PORT
- **Description**: HTTP server port
- **Default**: `3000`
- **Required**: Yes
- **Production**: Usually `8080` for Cloud Run

```bash
PORT=3000
```

#### API_PREFIX
- **Description**: API route prefix
- **Default**: `api/v1`
- **Required**: Yes

```bash
API_PREFIX=api/v1
# API will be available at http://localhost:3000/api/v1/*
```

### Database Configuration

#### DB_HOST
- **Description**: PostgreSQL host
- **Development**: `localhost`
- **Production**: `/cloudsql/PROJECT_ID:REGION:INSTANCE_NAME` (Cloud SQL socket)
- **Required**: Yes

```bash
# Development
DB_HOST=localhost

# Production (Cloud SQL)
DB_HOST=/cloudsql/guesslyfe-prod:us-central1:guesslyfe-db
```

#### DB_PASSWORD
- **Description**: Database password
- **Security**: Must be strong in production (16+ characters)
- **Required**: Yes

```bash
# Generate secure password
DB_PASSWORD=$(openssl rand -base64 24)
```

### Redis Configuration

#### REDIS_HOST
- **Description**: Redis/Memorystore host
- **Development**: `localhost`
- **Production**: Private IP from Memorystore
- **Required**: Yes

```bash
# Development
REDIS_HOST=localhost

# Production (Memorystore)
REDIS_HOST=10.x.x.x
```

### JWT Authentication

#### JWT_SECRET
- **Description**: Secret key for signing JWT tokens
- **Security**: **CRITICAL** - Must be long and random in production
- **Minimum Length**: 64 characters for production
- **Required**: Yes

```bash
# Generate secure JWT secret
JWT_SECRET=$(openssl rand -base64 64)
```

**Security Requirements**:
- Use different secrets for development and production
- Never reuse secrets across environments
- Rotate regularly (every 90 days recommended)
- Store in Secret Manager, not in code

#### JWT_EXPIRATION
- **Description**: Access token expiration time
- **Format**: Time string (e.g., `15m`, `1h`, `7d`)
- **Recommended**: `1h` for production, `7d` for development
- **Required**: Yes

```bash
# Production (short-lived for security)
JWT_EXPIRATION=1h

# Development (long-lived for convenience)
JWT_EXPIRATION=7d
```

### Blockchain Configuration

#### BLOCKCHAIN_NETWORK
- **Description**: Blockchain network name
- **Values**: `baseSepolia` (testnet), `baseMainnet` (production)
- **Required**: Yes

```bash
# Development/Testing
BLOCKCHAIN_NETWORK=baseSepolia

# Production
BLOCKCHAIN_NETWORK=baseMainnet
```

#### BLOCKCHAIN_RPC_URL
- **Description**: Blockchain RPC endpoint
- **Providers**: Alchemy, Infura, QuickNode, or public endpoints
- **Required**: Yes

```bash
# Alchemy (recommended for production)
BLOCKCHAIN_RPC_URL=https://base-mainnet.g.alchemy.com/v2/YOUR_API_KEY

# Public endpoint (rate-limited)
BLOCKCHAIN_RPC_URL=https://mainnet.base.org
```

**Getting an Alchemy API Key**:
1. Sign up at https://www.alchemy.com/
2. Create a new app
3. Select "Base" network
4. Copy the API key
5. Use in RPC URL: `https://base-mainnet.g.alchemy.com/v2/YOUR_KEY`

#### BLOCKCHAIN_PROVIDER_PRIVATE_KEY
- **Description**: Private key for contract interactions
- **Security**: **CRITICAL** - Store in Secret Manager
- **Format**: 64 hex characters (without 0x prefix)
- **Required**: Yes (for contract interactions)

```bash
# WRONG - never do this!
BLOCKCHAIN_PROVIDER_PRIVATE_KEY=0x1234...

# CORRECT - no 0x prefix
BLOCKCHAIN_PROVIDER_PRIVATE_KEY=1234abcd...
```

**Security**:
- **NEVER** commit private keys to git
- Use a dedicated wallet for the application
- Fund with only necessary amounts
- Set up alerts for unusual activity
- Rotate keys if compromised

### Third-Party Services

#### Twitter API

Get credentials from: https://developer.twitter.com/

```bash
TWITTER_CLIENT_ID=your-client-id
TWITTER_CLIENT_SECRET=your-client-secret
TWITTER_BEARER_TOKEN=your-bearer-token
TWITTER_CALLBACK_URL=https://api.guesslyfe.com/api/v1/auth/twitter/callback
```

#### SendGrid (Email)

Get API key from: https://app.sendgrid.com/settings/api_keys

```bash
SENDGRID_API_KEY=SG.xxxxxxxxxxxx
SENDGRID_FROM_EMAIL=noreply@guesslyfe.com
SENDGRID_FROM_NAME=GuessLyfe
```

**Email Templates**:
```bash
# Create dynamic templates in SendGrid first
SENDGRID_TEMPLATE_WELCOME=d-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
SENDGRID_TEMPLATE_TRADE_CONFIRMATION=d-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

#### Sentry (Error Tracking)

Get DSN from: https://sentry.io/settings/projects/

```bash
SENTRY_DSN=https://xxxxxxxxxxxxx@xxxxx.ingest.sentry.io/xxxxxxx
SENTRY_ENABLED=true
SENTRY_ENVIRONMENT=production
SENTRY_TRACES_SAMPLE_RATE=0.1
```

### Security Configuration

#### CORS_ALLOWED_ORIGINS
- **Description**: Allowed CORS origins (comma-separated)
- **Development**: Can include `localhost`
- **Production**: Only production domains, **NO wildcards**

```bash
# Development
CORS_ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001

# Production - SPECIFIC DOMAINS ONLY
CORS_ALLOWED_ORIGINS=https://guesslyfe.com,https://www.guesslyfe.com,https://app.guesslyfe.com
```

**Common Mistakes**:
```bash
# WRONG - wildcard in production
CORS_ALLOWED_ORIGINS=*

# WRONG - localhost in production
CORS_ALLOWED_ORIGINS=http://localhost:3000,https://guesslyfe.com

# CORRECT - production domains only
CORS_ALLOWED_ORIGINS=https://guesslyfe.com,https://app.guesslyfe.com
```

#### Rate Limiting

```bash
# Global rate limit (requests per minute)
THROTTLE_TTL=60
THROTTLE_LIMIT=100

# Specific endpoint limits
RATE_LIMIT_AUTH_TTL=60000          # 1 minute
RATE_LIMIT_AUTH_LIMIT=5            # 5 login attempts per minute

RATE_LIMIT_CREATE_MARKET_TTL=3600000  # 1 hour
RATE_LIMIT_CREATE_MARKET_LIMIT=10     # 10 markets per hour

RATE_LIMIT_TRADE_TTL=60000         # 1 minute
RATE_LIMIT_TRADE_LIMIT=30          # 30 trades per minute
```

### Monitoring

```bash
# Prometheus metrics
METRICS_ENABLED=true
METRICS_PATH=/metrics

# Slow request alerting
SLOW_REQUEST_THRESHOLD=2000  # 2 seconds
```

### Feature Flags

```bash
# Enable/disable features
FEATURE_MARKET_CREATION=true
FEATURE_TRADING=true
FEATURE_SOCIAL=true
FEATURE_NOTIFICATIONS=true
FEATURE_REFERRALS=false
BETA_FEATURES_ENABLED=false
```

## Environment-Specific Setup

### Development Environment

**File**: `.env.development`

**Characteristics**:
- Relaxed rate limits
- Debug logging enabled
- All features enabled for testing
- Local database and Redis
- Swagger enabled
- Hot reload enabled

**Quick Setup**:
```bash
# Use development template
cp .env.development .env

# Start local database
docker-compose up -d postgres redis

# Run migrations
npm run migration:run

# Start development server
npm run start:dev
```

### Test Environment

**File**: `.env.test`

**Characteristics**:
- Separate test database
- Mocked external services
- Minimal logging
- Fast execution settings
- All rate limits disabled

**Setup**:
```bash
# Create test database
createdb guesslyfe_test

# Run tests
npm test

# E2E tests
npm run test:e2e
```

### Production Environment

**File**: `.env.production` (never committed)

**Characteristics**:
- Maximum security
- Strict rate limits
- Production logging (info/warn/error only)
- GCP Cloud Logging enabled
- Swagger **disabled**
- Debug **disabled**

**Checklist Before Production**:
- [ ] All secrets are strong and unique
- [ ] JWT secrets are 64+ characters
- [ ] Database password is strong
- [ ] Private keys are secure
- [ ] CORS is strict (no wildcards)
- [ ] Swagger is disabled
- [ ] Debug is off
- [ ] GCP logging is enabled
- [ ] Sentry is configured
- [ ] All secrets in Secret Manager
- [ ] Validation passes: `./scripts/validate-env.sh production`

## Security Best Practices

### 1. Never Commit Secrets

**Add to `.gitignore`**:
```
.env
.env.local
.env.production
.env.*.local
```

**Verify**:
```bash
# Check if .env is tracked by git
git ls-files .env

# If it shows up, remove it
git rm --cached .env
```

### 2. Use Strong Secrets

**Generate Secrets**:
```bash
# 64-byte random secret (base64)
openssl rand -base64 64

# Using Node.js
node -e "console.log(require('crypto').randomBytes(64).toString('base64'))"

# UUID
uuidgen
```

### 3. Rotate Secrets Regularly

**Recommended Schedule**:
- JWT secrets: Every 90 days
- Database passwords: Every 180 days
- API keys: When compromised or annually
- Private keys: Only when compromised (maintain backup)

### 4. Use Secret Manager in Production

**Store in GCP Secret Manager**:
```bash
# Store all secrets
./deploy/setup-secrets.sh

# Access in Cloud Run (automatic)
# Secrets are injected as environment variables
```

### 5. Principle of Least Privilege

- Use dedicated service accounts
- Grant minimum necessary permissions
- Use read-only keys where possible
- Separate dev/staging/prod credentials

### 6. Audit Access

```bash
# Check who can access secrets
gcloud secrets get-iam-policy SECRET_NAME

# Audit logs
gcloud logging read "resource.type=secret" --limit=100
```

## Validation

### Automatic Validation

The validation script checks:
- Required variables are set
- Values match expected formats
- Secrets are strong enough
- Security settings are appropriate for environment
- URLs are valid
- Production-specific requirements

**Run Validation**:
```bash
# Validate current environment
./scripts/validate-env.sh

# Validate specific environment
./scripts/validate-env.sh production

# Output
# ========================================
# Environment Validation - production
# ========================================
#
# [INFO] ✓ NODE_ENV is set
# [INFO] ✓ PORT is set
# ...
# [ERROR] JWT_SECRET is too short (32 chars, minimum 64)
# [WARN] SWAGGER_ENABLED should be false in production
# ...
#
# Environment: production
# Total Checks: 87
# Errors: 3
# Warnings: 5
#
# ❌ Validation FAILED with 3 error(s)
```

### Manual Validation

**Check for Placeholder Values**:
```bash
# Find placeholder values
grep -r "REPLACE" .env
grep -r "your-" .env
grep -r "change-this" .env
```

**Test Database Connection**:
```bash
npm run typeorm -- query "SELECT 1"
```

**Test Redis Connection**:
```bash
redis-cli -h $REDIS_HOST -p $REDIS_PORT PING
```

## Troubleshooting

### Application Won't Start

**Check Environment File**:
```bash
# Verify .env exists
ls -la .env

# Check for syntax errors
cat .env | grep -v '^#' | grep -v '^$'
```

**Validate Configuration**:
```bash
./scripts/validate-env.sh
```

### Database Connection Errors

**Error**: `Connection timeout`

**Solutions**:
```bash
# Check database is running
pg_isready -h $DB_HOST -p $DB_PORT

# Test connection
psql -h $DB_HOST -p $DB_PORT -U $DB_USERNAME -d $DB_DATABASE

# Check Cloud SQL Proxy (if using GCP)
./cloud-sql-proxy PROJECT:REGION:INSTANCE
```

### Redis Connection Errors

**Error**: `Redis connection refused`

**Solutions**:
```bash
# Check Redis is running
redis-cli -h $REDIS_HOST -p $REDIS_PORT PING

# Check password (if set)
redis-cli -h $REDIS_HOST -p $REDIS_PORT -a $REDIS_PASSWORD PING
```

### JWT Token Errors

**Error**: `jwt malformed`

**Solutions**:
- Verify `JWT_SECRET` is set
- Check secret hasn't changed (invalidates existing tokens)
- Ensure secret is the same across all instances

### CORS Errors

**Error**: `Access-Control-Allow-Origin`

**Solutions**:
```bash
# Check CORS_ALLOWED_ORIGINS includes requesting origin
echo $CORS_ALLOWED_ORIGINS

# Add origin
CORS_ALLOWED_ORIGINS=https://app.guesslyfe.com,https://new-origin.com
```

### Environment Variables Not Loading

**Check Load Order**:
1. `.env.local` (if exists)
2. `.env.{NODE_ENV}.local` (if exists)
3. `.env.{NODE_ENV}` (if exists)
4. `.env`

**Force Reload**:
```bash
# Clear any cached env vars
unset $(grep -v '^#' .env | sed -E 's/(.*)=.*/\1/' | xargs)

# Reload
export $(cat .env | grep -v '^#' | xargs)
```

## Additional Resources

- [NestJS Configuration](https://docs.nestjs.com/techniques/configuration)
- [dotenv Documentation](https://github.com/motdotla/dotenv)
- [GCP Secret Manager](https://cloud.google.com/secret-manager/docs)
- [Security Best Practices](SECURITY.md)
- [GCP Deployment Guide](GCP_DEPLOYMENT.md)

## Support

For environment configuration issues:
- Check this documentation first
- Run validation: `./scripts/validate-env.sh`
- Review example files: `.env.example`, `.env.development`, `.env.production.example`
- Internal: #devops Slack channel
- GCP Issues: Premium Support tickets

---

**Last Updated**: 2025-01-16
**Maintained By**: DevOps Team
**Review Frequency**: Monthly or when adding new variables
