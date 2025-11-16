#!/bin/bash

# ==============================================================================
# Environment Setup Script
# ==============================================================================
#
# Interactive script to help set up environment configuration for GuessLyfe.
# This script will:
# - Create .env file from template
# - Generate secure random secrets
# - Guide through required configuration
# - Validate the final configuration
#
# Usage:
#   ./scripts/setup-env.sh
#   ./scripts/setup-env.sh production
#
# ==============================================================================

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
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

print_step() {
    echo -e "${MAGENTA}[STEP]${NC} $1"
}

# ==============================================================================
# Configuration
# ==============================================================================

ENV=${1:-development}
ENV_FILE=".env"

if [ "$ENV" = "production" ]; then
    ENV_FILE=".env.production"
elif [ "$ENV" = "test" ]; then
    ENV_FILE=".env.test"
elif [ "$ENV" = "development" ]; then
    ENV_FILE=".env"
fi

print_section "GuessLyfe Environment Setup - $ENV"

print_info "This script will help you set up your environment configuration."
print_info "Environment file: $ENV_FILE"
echo ""

# ==============================================================================
# Check for existing file
# ==============================================================================

if [ -f "$ENV_FILE" ]; then
    print_warn "File $ENV_FILE already exists!"
    read -p "Do you want to overwrite it? (yes/no): " -r
    echo ""

    if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
        print_info "Exiting without changes."
        exit 0
    fi

    # Backup existing file
    BACKUP_FILE="${ENV_FILE}.backup.$(date +%Y%m%d_%H%M%S)"
    cp "$ENV_FILE" "$BACKUP_FILE"
    print_info "Backed up existing file to: $BACKUP_FILE"
fi

# ==============================================================================
# Select template
# ==============================================================================

print_section "Step 1: Select Template"

TEMPLATE_FILE=""

if [ "$ENV" = "production" ]; then
    TEMPLATE_FILE=".env.production.example"
elif [ "$ENV" = "test" ]; then
    TEMPLATE_FILE=".env.test"
elif [ "$ENV" = "development" ]; then
    TEMPLATE_FILE=".env.development"
else
    TEMPLATE_FILE=".env.example"
fi

if [ ! -f "$TEMPLATE_FILE" ]; then
    print_error "Template file not found: $TEMPLATE_FILE"
    print_error "Please ensure template files exist in the backend directory."
    exit 1
fi

print_info "Using template: $TEMPLATE_FILE"

# Copy template
cp "$TEMPLATE_FILE" "$ENV_FILE"
print_info "Created $ENV_FILE from template"

# ==============================================================================
# Helper Functions
# ==============================================================================

# Generate random secret
generate_secret() {
    openssl rand -base64 ${1:-64} | tr -d '\n'
}

# Update value in .env file
update_env_value() {
    local key=$1
    local value=$2

    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        sed -i '' "s|^${key}=.*|${key}=${value}|" "$ENV_FILE"
    else
        # Linux
        sed -i "s|^${key}=.*|${key}=${value}|" "$ENV_FILE"
    fi
}

# ==============================================================================
# Generate Secrets
# ==============================================================================

print_section "Step 2: Generate Secure Secrets"

if [ "$ENV" != "test" ]; then
    print_step "Generating JWT secrets..."

    JWT_SECRET=$(generate_secret 64)
    JWT_REFRESH_SECRET=$(generate_secret 64)

    update_env_value "JWT_SECRET" "$JWT_SECRET"
    update_env_value "JWT_REFRESH_SECRET" "$JWT_REFRESH_SECRET"

    print_info "✓ Generated JWT secrets"

    if [ "$ENV" = "production" ]; then
        print_step "Generating admin API key..."
        ADMIN_API_KEY=$(generate_secret 32)
        update_env_value "ADMIN_API_KEY" "$ADMIN_API_KEY"
        print_info "✓ Generated admin API key"
    fi
else
    print_info "Skipping secret generation for test environment"
fi

# ==============================================================================
# Collect User Input
# ==============================================================================

print_section "Step 3: Configure Required Values"

if [ "$ENV" != "test" ]; then
    # Database configuration
    print_step "Database Configuration"

    read -p "Database host [localhost]: " db_host
    db_host=${db_host:-localhost}
    update_env_value "DB_HOST" "$db_host"

    read -p "Database name [guessly]: " db_name
    db_name=${db_name:-guessly}
    update_env_value "DB_DATABASE" "$db_name"

    read -p "Database username [postgres]: " db_user
    db_user=${db_user:-postgres}
    update_env_value "DB_USERNAME" "$db_user"

    if [ "$ENV" = "production" ]; then
        read -sp "Database password: " db_password
        echo ""
        if [ -z "$db_password" ]; then
            print_warn "No password provided, generating secure password..."
            db_password=$(generate_secret 24)
            print_info "Generated password: $db_password"
            print_warn "Save this password securely!"
        fi
        update_env_value "DB_PASSWORD" "$db_password"
    fi

    print_info "✓ Database configured"

    # Redis configuration
    print_step "Redis Configuration"

    read -p "Redis host [localhost]: " redis_host
    redis_host=${redis_host:-localhost}
    update_env_value "REDIS_HOST" "$redis_host"

    print_info "✓ Redis configured"

    # Blockchain configuration
    print_step "Blockchain Configuration"

    if [ "$ENV" = "production" ]; then
        print_info "Blockchain network for production:"
        echo "  1) Base Mainnet (recommended for production)"
        echo "  2) Base Sepolia (testnet)"
        read -p "Select network [1]: " network_choice
        network_choice=${network_choice:-1}

        if [ "$network_choice" = "1" ]; then
            update_env_value "BLOCKCHAIN_NETWORK" "baseMainnet"
            update_env_value "BLOCKCHAIN_CHAIN_ID" "8453"
            print_info "Using Base Mainnet"

            read -p "Alchemy API key (or press Enter to skip): " alchemy_key
            if [ -n "$alchemy_key" ]; then
                rpc_url="https://base-mainnet.g.alchemy.com/v2/$alchemy_key"
                update_env_value "BLOCKCHAIN_RPC_URL" "$rpc_url"
                print_info "✓ Configured Alchemy RPC"
            fi
        else
            update_env_value "BLOCKCHAIN_NETWORK" "baseSepolia"
            update_env_value "BLOCKCHAIN_CHAIN_ID" "84532"
            print_info "Using Base Sepolia"
        fi

        print_warn "IMPORTANT: You need to set BLOCKCHAIN_PROVIDER_PRIVATE_KEY"
        print_warn "For security, do this manually in $ENV_FILE or Secret Manager"
    fi

    print_info "✓ Blockchain configured"

    # Frontend URL
    print_step "Frontend Configuration"

    if [ "$ENV" = "production" ]; then
        read -p "Frontend URL (e.g., https://app.guesslyfe.com): " frontend_url
        if [ -n "$frontend_url" ]; then
            update_env_value "FRONTEND_URL" "$frontend_url"
            update_env_value "CORS_ALLOWED_ORIGINS" "$frontend_url"
            print_info "✓ Frontend URL configured"
        fi
    fi
fi

# ==============================================================================
# Production-Specific Configuration
# ==============================================================================

if [ "$ENV" = "production" ]; then
    print_section "Step 4: Production Security Settings"

    # Disable development features
    print_step "Disabling development features..."
    update_env_value "SWAGGER_ENABLED" "false"
    update_env_value "DEBUG" "false"
    update_env_value "HOT_RELOAD" "false"
    update_env_value "SEED_DATABASE" "false"
    update_env_value "LOG_LEVEL" "info"
    print_info "✓ Development features disabled"

    # Enable production features
    print_step "Enabling production features..."
    update_env_value "GCP_LOGGING_ENABLED" "true"
    update_env_value "SECURITY_HEADERS_ENABLED" "true"
    update_env_value "CSP_ENABLED" "true"
    update_env_value "COMPRESSION_ENABLED" "true"
    print_info "✓ Production features enabled"

    # Prompt for optional services
    print_step "Optional Services Configuration"

    read -p "Configure SendGrid for emails? (yes/no): " setup_sendgrid
    if [[ $setup_sendgrid =~ ^[Yy][Ee][Ss]$ ]]; then
        read -p "SendGrid API key: " sendgrid_key
        if [ -n "$sendgrid_key" ]; then
            update_env_value "SENDGRID_API_KEY" "$sendgrid_key"

            read -p "From email address: " from_email
            if [ -n "$from_email" ]; then
                update_env_value "SENDGRID_FROM_EMAIL" "$from_email"
            fi

            print_info "✓ SendGrid configured"
        fi
    fi

    read -p "Configure Sentry for error tracking? (yes/no): " setup_sentry
    if [[ $setup_sentry =~ ^[Yy][Ee][Ss]$ ]]; then
        read -p "Sentry DSN: " sentry_dsn
        if [ -n "$sentry_dsn" ]; then
            update_env_value "SENTRY_DSN" "$sentry_dsn"
            update_env_value "SENTRY_ENABLED" "true"
            update_env_value "SENTRY_ENVIRONMENT" "production"
            print_info "✓ Sentry configured"
        fi
    fi
fi

# ==============================================================================
# Validation
# ==============================================================================

print_section "Step 5: Validate Configuration"

if [ -f "scripts/validate-env.sh" ]; then
    print_step "Running validation..."

    # Export environment variables for validation
    export $(cat "$ENV_FILE" | grep -v '^#' | xargs)

    if ./scripts/validate-env.sh "$ENV"; then
        print_info "✓ Validation passed!"
    else
        print_warn "Validation found issues. Please review and fix."
    fi
else
    print_warn "Validation script not found, skipping validation"
fi

# ==============================================================================
# Summary
# ==============================================================================

print_section "Setup Complete!"

echo "Environment file created: $ENV_FILE"
echo ""

if [ "$ENV" = "production" ]; then
    print_warn "IMPORTANT: Production Setup Checklist"
    echo ""
    echo "  [ ] Review $ENV_FILE and fill in all required values"
    echo "  [ ] Set BLOCKCHAIN_PROVIDER_PRIVATE_KEY securely"
    echo "  [ ] Configure smart contract addresses"
    echo "  [ ] Set up Twitter API credentials (if using)"
    echo "  [ ] Store secrets in GCP Secret Manager: ./deploy/setup-secrets.sh"
    echo "  [ ] Test database connection"
    echo "  [ ] Test Redis connection"
    echo "  [ ] Run validation: ./scripts/validate-env.sh production"
    echo "  [ ] Review docs/ENVIRONMENT.md for details"
    echo ""
    print_warn "NEVER commit $ENV_FILE to version control!"
elif [ "$ENV" = "development" ]; then
    print_info "Next Steps:"
    echo ""
    echo "  1. Review and update $ENV_FILE as needed"
    echo "  2. Start local services: docker-compose up -d"
    echo "  3. Run migrations: npm run migration:run"
    echo "  4. Start development server: npm run start:dev"
    echo ""
    print_info "Optional: Create .env.local for personal overrides (gitignored)"
fi

print_info "For detailed configuration guide, see: docs/ENVIRONMENT.md"

exit 0
