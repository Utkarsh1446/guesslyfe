#!/bin/bash

# Full deployment script for Guessly backend on GCP
# Usage: ./scripts/deploy-to-gcp.sh

set -e

PROJECT_ID="guess-fun-2025-v1"
REGION="us-central1"
SERVICE_NAME="guessly-backend"
SQL_INSTANCE="guessly-db"
SQL_CONNECTION="${PROJECT_ID}:${REGION}:${SQL_INSTANCE}"

echo "🚀 Deploying Guessly Backend to GCP"
echo "=================================="
echo ""

# Check if logged in
if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" | grep -q .; then
    echo "❌ Not logged into gcloud. Please run: gcloud auth login"
    exit 1
fi

# Set project
echo "📝 Setting project to ${PROJECT_ID}..."
gcloud config set project ${PROJECT_ID}

# Get Redis IP (if available)
echo ""
echo "🔍 Getting Redis IP address..."
REDIS_HOST=$(gcloud redis instances describe guessly-redis \
    --region=${REGION} \
    --format="value(host)" \
    --project=${PROJECT_ID} 2>/dev/null || echo "")

if [ -z "$REDIS_HOST" ]; then
    echo "⚠️  Redis instance not ready yet. Will use localhost as fallback."
    REDIS_HOST="localhost"
else
    echo "✅ Redis IP: ${REDIS_HOST}"
fi

# Build and deploy
echo ""
echo "🏗️  Building and deploying to Cloud Run..."
gcloud run deploy ${SERVICE_NAME} \
    --source . \
    --region=${REGION} \
    --platform=managed \
    --allow-unauthenticated \
    --port=8080 \
    --memory=512Mi \
    --cpu=1 \
    --timeout=300 \
    --concurrency=80 \
    --min-instances=0 \
    --max-instances=10 \
    --set-env-vars="NODE_ENV=production" \
    --set-env-vars="PORT=8080" \
    --set-env-vars="API_PREFIX=api/v1" \
    --set-env-vars="DB_HOST=/cloudsql/${SQL_CONNECTION}" \
    --set-env-vars="DB_PORT=5432" \
    --set-env-vars="DB_USERNAME=guessly_user" \
    --set-env-vars="DB_PASSWORD=GuesslyUser2025!" \
    --set-env-vars="DB_DATABASE=guessly" \
    --set-env-vars="DB_SYNCHRONIZE=false" \
    --set-env-vars="DB_LOGGING=false" \
    --set-env-vars="REDIS_HOST=${REDIS_HOST}" \
    --set-env-vars="REDIS_PORT=6379" \
    --set-env-vars="LOG_LEVEL=info" \
    --set-env-vars="THROTTLE_TTL=60" \
    --set-env-vars="THROTTLE_LIMIT=100" \
    --add-cloudsql-instances=${SQL_CONNECTION} \
    --project=${PROJECT_ID}

# Get service URL
SERVICE_URL=$(gcloud run services describe ${SERVICE_NAME} \
    --region=${REGION} \
    --format="value(status.url)" \
    --project=${PROJECT_ID})

echo ""
echo "✅ Deployment complete!"
echo "=================================="
echo ""
echo "🌐 Service URL: ${SERVICE_URL}"
echo "📊 Health check: ${SERVICE_URL}/health"
echo "📖 API docs: ${SERVICE_URL}/api"
echo ""
echo "📝 Next steps:"
echo "1. Set up custom domain (if needed)"
echo "2. Configure Twitter OAuth credentials"
echo "3. Add blockchain private keys for smart contracts"
echo "4. Set up monitoring and alerts"
echo ""
