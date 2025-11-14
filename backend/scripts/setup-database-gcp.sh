#!/bin/bash

# Setup Cloud SQL database and run migrations
# Usage: ./scripts/setup-database-gcp.sh

set -e

PROJECT_ID="guess-fun-2025-v1"
SQL_INSTANCE="guessly-db"

echo "🗄️  Setting up Cloud SQL Database"
echo "=================================="
echo ""

# Create database and user
echo "📝 Creating database and user..."
gcloud sql databases create guessly \
    --instance=${SQL_INSTANCE} \
    --project=${PROJECT_ID} 2>/dev/null || echo "Database already exists"

# Note: User creation requires connecting to the database
echo ""
echo "⚠️  To create the user, run these SQL commands:"
echo ""
echo "gcloud sql connect ${SQL_INSTANCE} --user=postgres --project=${PROJECT_ID}"
echo ""
echo "Then execute:"
echo "CREATE USER guessly_user WITH ENCRYPTED PASSWORD 'GuesslyUser2025!';"
echo "GRANT ALL PRIVILEGES ON DATABASE guessly TO guessly_user;"
echo "ALTER DATABASE guessly OWNER TO guessly_user;"
echo "\\q"
echo ""
echo "After creating the user, run migrations using Cloud SQL Proxy:"
echo "./scripts/run-migrations-gcp.sh"
echo ""
