#!/bin/bash

# Check status of all GCP resources
# Usage: ./scripts/check-gcp-status.sh

PROJECT_ID="guess-fun-2025-v1"
REGION="us-central1"

echo "🔍 Checking GCP Resources Status"
echo "=================================="
echo "Project: ${PROJECT_ID}"
echo "Region: ${REGION}"
echo ""

# Cloud SQL Status
echo "📊 Cloud SQL Instance: guessly-db"
echo "-----------------------------------"
gcloud sql instances describe guessly-db \
    --project=${PROJECT_ID} \
    --format="table(state,ipAddresses[0].ipAddress,databaseVersion,settings.tier)" 2>/dev/null || echo "❌ Not created yet"
echo ""

# Redis Status
echo "📊 Redis Instance: guessly-redis"
echo "-----------------------------------"
gcloud redis instances describe guessly-redis \
    --region=${REGION} \
    --project=${PROJECT_ID} \
    --format="table(state,host,port,memorySizeGb)" 2>/dev/null || echo "❌ Not created yet"
echo ""

# Cloud Run Status
echo "📊 Cloud Run Service: guessly-backend"
echo "-----------------------------------"
gcloud run services describe guessly-backend \
    --region=${REGION} \
    --platform=managed \
    --project=${PROJECT_ID} \
    --format="table(status.url,status.conditions[0].status)" 2>/dev/null || echo "❌ Not deployed yet"
echo ""

# Enabled APIs
echo "📊 Enabled APIs"
echo "-----------------------------------"
gcloud services list --enabled --project=${PROJECT_ID} \
    --format="table(config.name)" \
    --filter="config.name:(sqladmin OR run OR redis OR cloudbuild)" | head -10
echo ""

echo "✅ Status check complete"
