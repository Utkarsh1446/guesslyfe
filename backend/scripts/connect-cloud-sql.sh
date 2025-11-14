#!/bin/bash

# Script to connect to Cloud SQL using Cloud SQL Proxy
# Usage: ./scripts/connect-cloud-sql.sh

PROJECT_ID="guess-fun-2025-v1"
REGION="us-central1"
INSTANCE_NAME="guessly-db"
CONNECTION_NAME="${PROJECT_ID}:${REGION}:${INSTANCE_NAME}"

echo "Starting Cloud SQL Proxy for ${CONNECTION_NAME}..."
echo "Database will be available at localhost:5432"
echo ""

# Download cloud-sql-proxy if not exists
if [ ! -f "./cloud-sql-proxy" ]; then
    echo "Downloading Cloud SQL Proxy..."
    curl -o cloud-sql-proxy https://storage.googleapis.com/cloud-sql-connectors/cloud-sql-proxy/v2.8.0/cloud-sql-proxy.darwin.arm64
    chmod +x cloud-sql-proxy
fi

# Start the proxy
./cloud-sql-proxy --port 5432 ${CONNECTION_NAME}
