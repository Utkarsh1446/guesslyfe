#!/bin/bash

# ==============================================================================
# GCP Secret Manager Setup Script
# ==============================================================================
#
# This script creates all secrets in GCP Secret Manager for the GuessLyfe API.
#
# Prerequisites:
# - gcloud CLI installed and authenticated
# - Secret Manager API enabled
# - Proper IAM permissions
#
# Usage:
#   ./setup-secrets.sh [PROJECT_ID]
#
# ==============================================================================

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
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

# Get project ID
PROJECT_ID=${1:-$(gcloud config get-value project)}

if [ -z "$PROJECT_ID" ]; then
    print_error "Project ID not set. Please provide it as argument or set it in gcloud config."
    exit 1
fi

print_info "Setting up secrets for project: $PROJECT_ID"

# Function to create secret
create_secret() {
    local secret_name=$1
    local secret_value=$2
    local description=$3

    if gcloud secrets describe "$secret_name" --project="$PROJECT_ID" &>/dev/null; then
        print_warn "Secret $secret_name already exists. Creating new version..."
        echo -n "$secret_value" | gcloud secrets versions add "$secret_name" \
            --project="$PROJECT_ID" \
            --data-file=-
    else
        print_info "Creating secret: $secret_name"
        echo -n "$secret_value" | gcloud secrets create "$secret_name" \
            --project="$PROJECT_ID" \
            --replication-policy="automatic" \
            --data-file=- \
            --labels=app=guessly,component=api

        if [ -n "$description" ]; then
            gcloud secrets update "$secret_name" \
                --project="$PROJECT_ID" \
                --update-labels=description="$description"
        fi
    fi
}

# Function to prompt for secret value
prompt_secret() {
    local secret_name=$1
    local description=$2
    local secret_value

    echo ""
    print_info "Setting up: $secret_name"
    echo "Description: $description"
    read -sp "Enter value (hidden): " secret_value
    echo ""

    if [ -z "$secret_value" ]; then
        print_warn "Empty value provided. Skipping $secret_name"
        return 1
    fi

    create_secret "$secret_name" "$secret_value" "$description"
    return 0
}

# Function to create secret from env variable
create_from_env() {
    local secret_name=$1
    local env_var=$2
    local description=$3

    if [ -z "${!env_var}" ]; then
        print_warn "$env_var not set in environment. Skipping $secret_name"
        return 1
    fi

    create_secret "$secret_name" "${!env_var}" "$description"
    return 0
}

# Check if .env file exists
if [ -f .env ]; then
    print_info "Found .env file. Loading variables..."
    export $(cat .env | grep -v '^#' | xargs)
fi

print_info "Creating secrets in GCP Secret Manager..."
echo ""

# ==============================================================================
# Database Secrets
# ==============================================================================
print_info "=== Database Secrets ==="

prompt_secret "db-password" "PostgreSQL database password"

# ==============================================================================
# JWT Secrets
# ==============================================================================
print_info "=== JWT Secrets ==="

prompt_secret "jwt-secret" "JWT access token secret (use strong random string)"
prompt_secret "jwt-refresh-secret" "JWT refresh token secret (use strong random string)"

# ==============================================================================
# Blockchain Secrets
# ==============================================================================
print_info "=== Blockchain Secrets ==="

prompt_secret "blockchain-private-key" "Private key for blockchain transactions (0x...)"

# ==============================================================================
# Twitter API Secrets
# ==============================================================================
print_info "=== Twitter API Secrets ==="

prompt_secret "twitter-client-id" "Twitter OAuth 2.0 Client ID"
prompt_secret "twitter-client-secret" "Twitter OAuth 2.0 Client Secret"
prompt_secret "twitter-bearer-token" "Twitter API Bearer Token"

# ==============================================================================
# SendGrid Secrets
# ==============================================================================
print_info "=== SendGrid Secrets ==="

prompt_secret "sendgrid-api-key" "SendGrid API key for email notifications"

# ==============================================================================
# Sentry Secrets
# ==============================================================================
print_info "=== Sentry Secrets ==="

prompt_secret "sentry-dsn" "Sentry DSN for error tracking"

# ==============================================================================
# Admin Secrets
# ==============================================================================
print_info "=== Admin Secrets ==="

prompt_secret "admin-password" "Admin dashboard password"

# ==============================================================================
# Grant Access to Cloud Run Service Account
# ==============================================================================
print_info "=== Granting Secret Access ==="

SERVICE_ACCOUNT="guessly-api@${PROJECT_ID}.iam.gserviceaccount.com"

print_info "Granting access to service account: $SERVICE_ACCOUNT"

# List of all secrets
SECRETS=(
    "db-password"
    "jwt-secret"
    "jwt-refresh-secret"
    "blockchain-private-key"
    "twitter-client-id"
    "twitter-client-secret"
    "twitter-bearer-token"
    "sendgrid-api-key"
    "sentry-dsn"
    "admin-password"
)

for secret in "${SECRETS[@]}"; do
    if gcloud secrets describe "$secret" --project="$PROJECT_ID" &>/dev/null; then
        print_info "Granting access to $secret"
        gcloud secrets add-iam-policy-binding "$secret" \
            --project="$PROJECT_ID" \
            --member="serviceAccount:$SERVICE_ACCOUNT" \
            --role="roles/secretmanager.secretAccessor" \
            --condition=None \
            2>/dev/null || print_warn "Failed to grant access to $secret (might already have access)"
    fi
done

# ==============================================================================
# Summary
# ==============================================================================
print_info "=== Setup Complete ==="
echo ""
echo "Created secrets:"
gcloud secrets list --project="$PROJECT_ID" --filter="labels.app=guessly" --format="table(name,createTime)"

echo ""
print_info "Next steps:"
echo "1. Verify all secrets are created: gcloud secrets list --project=$PROJECT_ID"
echo "2. Update cloudbuild.yaml with your project ID"
echo "3. Deploy application: gcloud builds submit --config cloudbuild.yaml"
echo ""
