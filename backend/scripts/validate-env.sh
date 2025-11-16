#!/bin/bash

# ==============================================================================
# Environment Variables Validation Script
# ==============================================================================
#
# This script validates that all required environment variables are set
# and have appropriate values for the current environment.
#
# Usage:
#   ./scripts/validate-env.sh
#   ./scripts/validate-env.sh production
#
# ==============================================================================

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Functions
print_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_section() {
    echo -e "\n${BLUE}========================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}========================================${NC}\n"
}

# Validation counters
ERRORS=0
WARNINGS=0
CHECKS=0

# Environment to validate (default: from NODE_ENV or 'development')
ENV=${1:-${NODE_ENV:-development}}

print_section "Environment Validation - $ENV"

# ==============================================================================
# Load environment variables
# ==============================================================================

if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
    print_info ".env file loaded"
else
    print_warn ".env file not found, using system environment variables"
fi

# ==============================================================================
# Helper Functions
# ==============================================================================

# Check if variable is set
check_var() {
    local var_name=$1
    local var_value="${!var_name}"
    local required=${2:-false}
    local description=$3

    CHECKS=$((CHECKS + 1))

    if [ -z "$var_value" ]; then
        if [ "$required" = "true" ]; then
            print_error "$var_name is not set - $description"
            ERRORS=$((ERRORS + 1))
            return 1
        else
            print_warn "$var_name is not set (optional) - $description"
            WARNINGS=$((WARNINGS + 1))
            return 0
        fi
    else
        print_info "✓ $var_name is set"
        return 0
    fi
}

# Check if variable matches pattern
check_pattern() {
    local var_name=$1
    local pattern=$2
    local var_value="${!var_name}"
    local description=$3

    CHECKS=$((CHECKS + 1))

    if [ -z "$var_value" ]; then
        print_warn "$var_name is not set, skipping pattern check"
        return 0
    fi

    if [[ ! $var_value =~ $pattern ]]; then
        print_error "$var_name does not match pattern: $pattern - $description"
        ERRORS=$((ERRORS + 1))
        return 1
    else
        print_info "✓ $var_name matches pattern"
        return 0
    fi
}

# Check if variable is a valid URL
check_url() {
    local var_name=$1
    local var_value="${!var_name}"
    local required=${2:-false}

    if [ -z "$var_value" ]; then
        if [ "$required" = "true" ]; then
            check_var "$var_name" true "Valid URL required"
        fi
        return 0
    fi

    CHECKS=$((CHECKS + 1))

    if [[ ! $var_value =~ ^https?:// ]]; then
        print_error "$var_name is not a valid URL: $var_value"
        ERRORS=$((ERRORS + 1))
        return 1
    else
        print_info "✓ $var_name is a valid URL"
        return 0
    fi
}

# Check if variable is numeric
check_numeric() {
    local var_name=$1
    local var_value="${!var_name}"
    local required=${2:-false}

    if [ -z "$var_value" ]; then
        if [ "$required" = "true" ]; then
            check_var "$var_name" true "Numeric value required"
        fi
        return 0
    fi

    CHECKS=$((CHECKS + 1))

    if ! [[ $var_value =~ ^[0-9]+$ ]]; then
        print_error "$var_name is not numeric: $var_value"
        ERRORS=$((ERRORS + 1))
        return 1
    else
        print_info "✓ $var_name is numeric"
        return 0
    fi
}

# Check if secret is strong enough
check_secret_strength() {
    local var_name=$1
    local var_value="${!var_name}"
    local min_length=${2:-32}

    if [ -z "$var_value" ]; then
        return 0
    fi

    CHECKS=$((CHECKS + 1))

    local length=${#var_value}

    if [ $length -lt $min_length ]; then
        print_error "$var_name is too short ($length chars, minimum $min_length)"
        ERRORS=$((ERRORS + 1))
        return 1
    fi

    # Check for common weak values
    if [[ "$var_value" == *"change-this"* ]] || \
       [[ "$var_value" == *"your-"* ]] || \
       [[ "$var_value" == *"REPLACE"* ]] || \
       [[ "$var_value" == "secret" ]] || \
       [[ "$var_value" == "password" ]]; then
        print_error "$var_name contains placeholder value (not secure!)"
        ERRORS=$((ERRORS + 1))
        return 1
    fi

    print_info "✓ $var_name is strong enough"
    return 0
}

# ==============================================================================
# Required Variables for All Environments
# ==============================================================================
print_section "Core Application Variables"

check_var "NODE_ENV" true "Environment name (development, production, etc.)"
check_var "PORT" true "Server port"
check_var "API_PREFIX" true "API URL prefix"
check_numeric "PORT" true

# ==============================================================================
# Database Configuration
# ==============================================================================
print_section "Database Configuration"

check_var "DB_HOST" true "Database host"
check_var "DB_PORT" true "Database port"
check_var "DB_DATABASE" true "Database name"
check_var "DB_USERNAME" true "Database username"
check_var "DB_PASSWORD" true "Database password"
check_numeric "DB_PORT" true
check_numeric "DB_POOL_MIN" false
check_numeric "DB_POOL_MAX" false

if [ "$ENV" = "production" ]; then
    check_secret_strength "DB_PASSWORD" 16
fi

# ==============================================================================
# Redis Configuration
# ==============================================================================
print_section "Redis Configuration"

check_var "REDIS_HOST" true "Redis host"
check_var "REDIS_PORT" true "Redis port"
check_numeric "REDIS_PORT" true
check_numeric "REDIS_DB" false

# ==============================================================================
# JWT Authentication
# ==============================================================================
print_section "JWT Authentication"

check_var "JWT_SECRET" true "JWT secret key"
check_var "JWT_EXPIRATION" true "JWT token expiration"
check_var "JWT_REFRESH_SECRET" true "JWT refresh secret"

if [ "$ENV" = "production" ]; then
    check_secret_strength "JWT_SECRET" 64
    check_secret_strength "JWT_REFRESH_SECRET" 64

    # Check that JWT secrets are different
    if [ "$JWT_SECRET" = "$JWT_REFRESH_SECRET" ]; then
        print_error "JWT_SECRET and JWT_REFRESH_SECRET must be different"
        ERRORS=$((ERRORS + 1))
    fi
fi

# ==============================================================================
# Blockchain Configuration
# ==============================================================================
print_section "Blockchain Configuration"

check_var "BLOCKCHAIN_NETWORK" true "Blockchain network name"
check_var "BLOCKCHAIN_RPC_URL" true "Blockchain RPC URL"
check_url "BLOCKCHAIN_RPC_URL" true
check_var "BLOCKCHAIN_CHAIN_ID" true "Chain ID"
check_numeric "BLOCKCHAIN_CHAIN_ID" true

# Warn if using production network in development
if [ "$ENV" = "development" ] && [[ "$BLOCKCHAIN_NETWORK" == *"Mainnet"* ]]; then
    print_warn "Using mainnet in development environment - are you sure?"
    WARNINGS=$((WARNINGS + 1))
fi

# Check private key in production
if [ "$ENV" = "production" ]; then
    check_var "BLOCKCHAIN_PROVIDER_PRIVATE_KEY" true "Blockchain private key"

    if [ -n "$BLOCKCHAIN_PROVIDER_PRIVATE_KEY" ]; then
        # Warn if private key starts with 0x (should not)
        if [[ "$BLOCKCHAIN_PROVIDER_PRIVATE_KEY" == 0x* ]]; then
            print_warn "BLOCKCHAIN_PROVIDER_PRIVATE_KEY should not include '0x' prefix"
            WARNINGS=$((WARNINGS + 1))
        fi

        # Check length (should be 64 hex characters)
        local key_length=${#BLOCKCHAIN_PROVIDER_PRIVATE_KEY}
        if [ $key_length -ne 64 ]; then
            print_error "BLOCKCHAIN_PROVIDER_PRIVATE_KEY should be 64 characters (currently $key_length)"
            ERRORS=$((ERRORS + 1))
        fi
    fi
fi

# ==============================================================================
# Smart Contract Addresses
# ==============================================================================
print_section "Smart Contract Addresses"

check_pattern "CONTRACT_OPINION_MARKET" "^0x[a-fA-F0-9]{40}$" "Valid Ethereum address"
check_pattern "CONTRACT_USDC" "^0x[a-fA-F0-9]{40}$" "Valid Ethereum address"

# ==============================================================================
# Third-Party Services
# ==============================================================================
print_section "Third-Party Services"

# Twitter (optional but check if set)
if [ -n "$TWITTER_CLIENT_ID" ]; then
    check_var "TWITTER_CLIENT_SECRET" true "Twitter client secret required if client ID is set"
fi

# SendGrid (optional but recommended for notifications)
if [ "$FEATURE_NOTIFICATIONS" = "true" ]; then
    check_var "SENDGRID_API_KEY" false "SendGrid API key for email notifications"
    check_var "SENDGRID_FROM_EMAIL" false "SendGrid from email address"
fi

# Sentry (recommended for production)
if [ "$ENV" = "production" ] && [ "$SENTRY_ENABLED" = "true" ]; then
    check_var "SENTRY_DSN" true "Sentry DSN for error tracking"
    check_url "SENTRY_DSN" true
fi

# ==============================================================================
# Security Configuration
# ==============================================================================
print_section "Security Configuration"

# CORS
check_var "CORS_ALLOWED_ORIGINS" true "Allowed CORS origins"

if [ "$ENV" = "production" ]; then
    # Check for wildcard CORS in production
    if [[ "$CORS_ALLOWED_ORIGINS" == *"*"* ]]; then
        print_error "CORS_ALLOWED_ORIGINS should not use wildcard (*) in production"
        ERRORS=$((ERRORS + 1))
    fi

    # Check for localhost in production CORS
    if [[ "$CORS_ALLOWED_ORIGINS" == *"localhost"* ]]; then
        print_warn "CORS_ALLOWED_ORIGINS contains localhost in production"
        WARNINGS=$((WARNINGS + 1))
    fi

    # Check that security features are enabled
    if [ "$SECURITY_HEADERS_ENABLED" != "true" ]; then
        print_error "SECURITY_HEADERS_ENABLED should be true in production"
        ERRORS=$((ERRORS + 1))
    fi

    if [ "$CSP_ENABLED" != "true" ]; then
        print_warn "CSP_ENABLED should be true in production"
        WARNINGS=$((WARNINGS + 1))
    fi
fi

# ==============================================================================
# Production-Specific Checks
# ==============================================================================
if [ "$ENV" = "production" ]; then
    print_section "Production-Specific Checks"

    # Swagger should be disabled
    if [ "$SWAGGER_ENABLED" = "true" ]; then
        print_warn "SWAGGER_ENABLED should be false in production (security risk)"
        WARNINGS=$((WARNINGS + 1))
    fi

    # Debug should be disabled
    if [ "$DEBUG" = "true" ]; then
        print_error "DEBUG should be false in production"
        ERRORS=$((ERRORS + 1))
    fi

    # Hot reload should be disabled
    if [ "$HOT_RELOAD" = "true" ]; then
        print_error "HOT_RELOAD should be false in production"
        ERRORS=$((ERRORS + 1))
    fi

    # Seed database should be disabled
    if [ "$SEED_DATABASE" = "true" ]; then
        print_error "SEED_DATABASE should be false in production"
        ERRORS=$((ERRORS + 1))
    fi

    # Log level should not be debug
    if [ "$LOG_LEVEL" = "debug" ]; then
        print_warn "LOG_LEVEL should be 'info' or 'warn' in production, not 'debug'"
        WARNINGS=$((WARNINGS + 1))
    fi

    # GCP logging should be enabled
    if [ "$GCP_LOGGING_ENABLED" != "true" ]; then
        print_warn "GCP_LOGGING_ENABLED should be true in production"
        WARNINGS=$((WARNINGS + 1))
    fi

    # Check admin credentials are not default
    if [ "$ADMIN_PASSWORD" = "admin" ] || [ "$ADMIN_PASSWORD" = "admin123" ]; then
        print_error "ADMIN_PASSWORD is set to default value - change it!"
        ERRORS=$((ERRORS + 1))
    fi
fi

# ==============================================================================
# Environment-Specific URLs
# ==============================================================================
print_section "URL Configuration"

check_url "FRONTEND_URL" true
check_url "BLOCKCHAIN_RPC_URL" true

if [ "$ENV" = "production" ]; then
    # Check that frontend URL is HTTPS
    if [[ ! "$FRONTEND_URL" =~ ^https:// ]]; then
        print_error "FRONTEND_URL should use HTTPS in production"
        ERRORS=$((ERRORS + 1))
    fi
fi

# ==============================================================================
# Summary
# ==============================================================================
print_section "Validation Summary"

echo "Environment: $ENV"
echo "Total Checks: $CHECKS"
echo "Errors:       $ERRORS"
echo "Warnings:     $WARNINGS"
echo ""

if [ $ERRORS -gt 0 ]; then
    print_error "❌ Validation FAILED with $ERRORS error(s)"
    echo ""
    echo "Please fix the errors above before starting the application."
    echo "See docs/ENVIRONMENT.md for detailed configuration guide."
    exit 1
elif [ $WARNINGS -gt 0 ]; then
    print_warn "⚠️  Validation passed with $WARNINGS warning(s)"
    echo ""
    echo "The application can start, but you should review the warnings."
    exit 0
else
    print_info "✅ All validations passed!"
    echo ""
    echo "Environment is properly configured."
    exit 0
fi
