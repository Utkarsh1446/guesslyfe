#!/bin/bash

# ==============================================================================
# GCP Infrastructure Setup Script
# ==============================================================================
#
# This script sets up all GCP infrastructure for the GuessLyfe API:
# - Cloud SQL (PostgreSQL)
# - Memorystore (Redis)
# - VPC Connector
# - Service Account
# - Artifact Registry
# - Enable APIs
#
# Prerequisites:
# - gcloud CLI installed and authenticated
# - Proper IAM permissions (Owner or Editor)
#
# Usage:
#   ./setup-infrastructure.sh [PROJECT_ID] [REGION]
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

# Configuration
PROJECT_ID=${1:-$(gcloud config get-value project)}
REGION=${2:-"us-central1"}
ZONE="${REGION}-a"

# Validate project ID
if [ -z "$PROJECT_ID" ]; then
    print_error "Project ID not set. Please provide it as argument or set it in gcloud config."
    exit 1
fi

print_info "Setting up infrastructure for project: $PROJECT_ID"
print_info "Region: $REGION"
print_info "Zone: $ZONE"

# Set project
gcloud config set project "$PROJECT_ID"

# ==============================================================================
# Enable APIs
# ==============================================================================
print_section "Enabling Required APIs"

APIS=(
    "cloudbuild.googleapis.com"
    "run.googleapis.com"
    "sql-component.googleapis.com"
    "sqladmin.googleapis.com"
    "redis.googleapis.com"
    "vpcaccess.googleapis.com"
    "secretmanager.googleapis.com"
    "artifactregistry.googleapis.com"
    "compute.googleapis.com"
    "servicenetworking.googleapis.com"
)

for api in "${APIS[@]}"; do
    print_info "Enabling $api..."
    gcloud services enable "$api" --project="$PROJECT_ID"
done

# ==============================================================================
# Create Service Account
# ==============================================================================
print_section "Creating Service Account"

SERVICE_ACCOUNT_NAME="guessly-api"
SERVICE_ACCOUNT_EMAIL="${SERVICE_ACCOUNT_NAME}@${PROJECT_ID}.iam.gserviceaccount.com"

if gcloud iam service-accounts describe "$SERVICE_ACCOUNT_EMAIL" --project="$PROJECT_ID" &>/dev/null; then
    print_warn "Service account already exists: $SERVICE_ACCOUNT_EMAIL"
else
    print_info "Creating service account: $SERVICE_ACCOUNT_NAME"
    gcloud iam service-accounts create "$SERVICE_ACCOUNT_NAME" \
        --project="$PROJECT_ID" \
        --display-name="GuessLyfe API Service Account" \
        --description="Service account for GuessLyfe API Cloud Run service"
fi

# Grant necessary roles
print_info "Granting IAM roles to service account..."

ROLES=(
    "roles/cloudsql.client"
    "roles/secretmanager.secretAccessor"
    "roles/logging.logWriter"
    "roles/cloudtrace.agent"
)

for role in "${ROLES[@]}"; do
    print_info "Granting $role..."
    gcloud projects add-iam-policy-binding "$PROJECT_ID" \
        --member="serviceAccount:$SERVICE_ACCOUNT_EMAIL" \
        --role="$role" \
        --condition=None \
        2>/dev/null || print_warn "Failed to grant $role (might already have it)"
done

# ==============================================================================
# Create Artifact Registry Repository
# ==============================================================================
print_section "Setting up Artifact Registry"

REPOSITORY_NAME="guessly"

if gcloud artifacts repositories describe "$REPOSITORY_NAME" \
    --location="$REGION" --project="$PROJECT_ID" &>/dev/null; then
    print_warn "Artifact Registry repository already exists: $REPOSITORY_NAME"
else
    print_info "Creating Artifact Registry repository: $REPOSITORY_NAME"
    gcloud artifacts repositories create "$REPOSITORY_NAME" \
        --repository-format=docker \
        --location="$REGION" \
        --project="$PROJECT_ID" \
        --description="Docker images for GuessLyfe API"
fi

# ==============================================================================
# Create Cloud SQL Instance
# ==============================================================================
print_section "Setting up Cloud SQL (PostgreSQL)"

SQL_INSTANCE_NAME="guessly-db"
DB_VERSION="POSTGRES_15"
DB_TIER="db-f1-micro"  # Change to db-custom-2-7680 for production

if gcloud sql instances describe "$SQL_INSTANCE_NAME" --project="$PROJECT_ID" &>/dev/null; then
    print_warn "Cloud SQL instance already exists: $SQL_INSTANCE_NAME"
else
    print_info "Creating Cloud SQL instance: $SQL_INSTANCE_NAME"
    print_warn "This will take several minutes..."

    gcloud sql instances create "$SQL_INSTANCE_NAME" \
        --database-version="$DB_VERSION" \
        --tier="$DB_TIER" \
        --region="$REGION" \
        --project="$PROJECT_ID" \
        --network=default \
        --no-assign-ip \
        --backup \
        --backup-start-time=03:00 \
        --maintenance-window-day=SUN \
        --maintenance-window-hour=4 \
        --labels=app=guessly,component=database
fi

# Create database
print_info "Creating database: guessly"
gcloud sql databases create guessly \
    --instance="$SQL_INSTANCE_NAME" \
    --project="$PROJECT_ID" \
    2>/dev/null || print_warn "Database might already exist"

# Create database user
print_info "Creating database user: guessly"

# Generate random password if not in secrets
if gcloud secrets describe "db-password" --project="$PROJECT_ID" &>/dev/null; then
    DB_PASSWORD=$(gcloud secrets versions access latest --secret="db-password" --project="$PROJECT_ID")
else
    DB_PASSWORD=$(openssl rand -base64 32)
    print_info "Generated database password. Save this password:"
    echo "$DB_PASSWORD"
fi

gcloud sql users create guessly \
    --instance="$SQL_INSTANCE_NAME" \
    --password="$DB_PASSWORD" \
    --project="$PROJECT_ID" \
    2>/dev/null || print_warn "User might already exist"

# Get connection name
SQL_CONNECTION_NAME=$(gcloud sql instances describe "$SQL_INSTANCE_NAME" \
    --project="$PROJECT_ID" \
    --format="value(connectionName)")

print_info "Cloud SQL Connection Name: $SQL_CONNECTION_NAME"

# ==============================================================================
# Create VPC Network (if not using default)
# ==============================================================================
print_section "Setting up VPC Network"

NETWORK_NAME="default"  # Use default network or create custom

# Check if using custom network
if [ "$NETWORK_NAME" != "default" ]; then
    if gcloud compute networks describe "$NETWORK_NAME" --project="$PROJECT_ID" &>/dev/null; then
        print_warn "VPC network already exists: $NETWORK_NAME"
    else
        print_info "Creating VPC network: $NETWORK_NAME"
        gcloud compute networks create "$NETWORK_NAME" \
            --project="$PROJECT_ID" \
            --subnet-mode=custom
    fi
fi

# ==============================================================================
# Create VPC Connector
# ==============================================================================
print_section "Setting up VPC Connector"

VPC_CONNECTOR_NAME="guessly-connector"
VPC_IP_RANGE="10.8.0.0/28"  # /28 provides 16 IPs (minimum for connector)

if gcloud compute networks vpc-access connectors describe "$VPC_CONNECTOR_NAME" \
    --region="$REGION" --project="$PROJECT_ID" &>/dev/null; then
    print_warn "VPC Connector already exists: $VPC_CONNECTOR_NAME"
else
    print_info "Creating VPC Connector: $VPC_CONNECTOR_NAME"
    print_warn "This will take several minutes..."

    gcloud compute networks vpc-access connectors create "$VPC_CONNECTOR_NAME" \
        --region="$REGION" \
        --project="$PROJECT_ID" \
        --network="$NETWORK_NAME" \
        --range="$VPC_IP_RANGE" \
        --min-instances=2 \
        --max-instances=10 \
        --machine-type=f1-micro
fi

# ==============================================================================
# Create Memorystore (Redis)
# ==============================================================================
print_section "Setting up Memorystore (Redis)"

REDIS_INSTANCE_NAME="guessly-redis"
REDIS_TIER="BASIC"  # or STANDARD_HA for production
REDIS_SIZE="1"      # GB
REDIS_VERSION="redis_7_0"

if gcloud redis instances describe "$REDIS_INSTANCE_NAME" \
    --region="$REGION" --project="$PROJECT_ID" &>/dev/null; then
    print_warn "Redis instance already exists: $REDIS_INSTANCE_NAME"
else
    print_info "Creating Redis instance: $REDIS_INSTANCE_NAME"
    print_warn "This will take several minutes..."

    gcloud redis instances create "$REDIS_INSTANCE_NAME" \
        --size="$REDIS_SIZE" \
        --region="$REGION" \
        --project="$PROJECT_ID" \
        --network="projects/$PROJECT_ID/global/networks/$NETWORK_NAME" \
        --redis-version="$REDIS_VERSION" \
        --tier="$REDIS_TIER" \
        --labels=app=guessly,component=cache
fi

# Get Redis host
REDIS_HOST=$(gcloud redis instances describe "$REDIS_INSTANCE_NAME" \
    --region="$REGION" \
    --project="$PROJECT_ID" \
    --format="value(host)")

REDIS_PORT=$(gcloud redis instances describe "$REDIS_INSTANCE_NAME" \
    --region="$REGION" \
    --project="$PROJECT_ID" \
    --format="value(port)")

print_info "Redis Host: $REDIS_HOST"
print_info "Redis Port: $REDIS_PORT"

# ==============================================================================
# Summary
# ==============================================================================
print_section "Setup Complete!"

echo ""
echo "Infrastructure Summary:"
echo "======================="
echo ""
echo "Service Account:"
echo "  Email: $SERVICE_ACCOUNT_EMAIL"
echo ""
echo "Artifact Registry:"
echo "  Repository: $REPOSITORY_NAME"
echo "  Location: $REGION"
echo "  URL: $REGION-docker.pkg.dev/$PROJECT_ID/$REPOSITORY_NAME"
echo ""
echo "Cloud SQL:"
echo "  Instance: $SQL_INSTANCE_NAME"
echo "  Connection: $SQL_CONNECTION_NAME"
echo "  Database: guessly"
echo "  User: guessly"
echo ""
echo "VPC Connector:"
echo "  Name: $VPC_CONNECTOR_NAME"
echo "  Region: $REGION"
echo "  IP Range: $VPC_IP_RANGE"
echo ""
echo "Memorystore (Redis):"
echo "  Instance: $REDIS_INSTANCE_NAME"
echo "  Host: $REDIS_HOST"
echo "  Port: $REDIS_PORT"
echo ""
echo "Next Steps:"
echo "==========="
echo "1. Run ./setup-secrets.sh to configure secrets"
echo "2. Update cloudbuild.yaml with your settings"
echo "3. Update .env file with Redis host: $REDIS_HOST"
echo "4. Deploy: gcloud builds submit --config cloudbuild.yaml"
echo ""
