#!/bin/bash

# Script to run migrations on Cloud SQL
# Make sure Cloud SQL Proxy is running first

PROJECT_ID="guess-fun-2025-v1"
REGION="us-central1"
INSTANCE_NAME="guessly-db"

echo "Running migrations on Cloud SQL..."
echo "Make sure Cloud SQL Proxy is running in another terminal:"
echo "./scripts/connect-cloud-sql.sh"
echo ""

# Set environment variables for Cloud SQL connection
export DB_HOST=localhost
export DB_PORT=5432
export DB_USERNAME=guessly_user
export DB_PASSWORD=GuesslyUser2025!
export DB_DATABASE=guessly

# Run migrations
npm run migration:run
