#!/bin/bash

# ==============================================================================
# Database Backup Script
# ==============================================================================
#
# This script creates a backup of the PostgreSQL database with compression.
#
# Usage:
#   ./backup-database.sh [backup-name]
#
# Examples:
#   ./backup-database.sh                    # Auto-generated name
#   ./backup-database.sh pre-migration      # Custom name
#
# ==============================================================================

set -e  # Exit on error

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

print_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Load environment variables
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
fi

# Configuration
BACKUP_DIR="./backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_NAME=${1:-"backup"}
BACKUP_FILE="$BACKUP_DIR/${BACKUP_NAME}_$TIMESTAMP.sql"

# Validate environment variables
if [ -z "$DB_HOST" ] || [ -z "$DB_USERNAME" ] || [ -z "$DB_DATABASE" ]; then
    print_error "Missing database configuration. Check your .env file."
    exit 1
fi

# Create backup directory
if [ ! -d "$BACKUP_DIR" ]; then
    mkdir -p "$BACKUP_DIR"
    print_info "Created backup directory: $BACKUP_DIR"
fi

# Check if pg_dump is available
if ! command -v pg_dump &> /dev/null; then
    print_error "pg_dump not found. Please install PostgreSQL client tools."
    exit 1
fi

# Create backup
print_info "Creating database backup..."
print_info "Database: $DB_HOST/$DB_DATABASE"
print_info "Output: $BACKUP_FILE"

PGPASSWORD=$DB_PASSWORD pg_dump \
    -h "$DB_HOST" \
    -p "${DB_PORT:-5432}" \
    -U "$DB_USERNAME" \
    -d "$DB_DATABASE" \
    --no-owner \
    --no-acl \
    -F p \
    > "$BACKUP_FILE" 2>&1

if [ $? -eq 0 ]; then
    BACKUP_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
    print_info "✓ Backup created successfully ($BACKUP_SIZE)"
else
    print_error "✗ Backup failed"
    exit 1
fi

# Compress backup
print_info "Compressing backup..."
gzip "$BACKUP_FILE"

COMPRESSED_SIZE=$(du -h "$BACKUP_FILE.gz" | cut -f1)
print_info "✓ Backup compressed ($COMPRESSED_SIZE)"
print_info "Final file: ${BACKUP_FILE}.gz"

# Cleanup old backups (keep last 10)
BACKUP_COUNT=$(find "$BACKUP_DIR" -name "*.sql.gz" | wc -l)

if [ "$BACKUP_COUNT" -gt 10 ]; then
    print_info "Cleaning up old backups (keeping last 10)..."
    OLD_BACKUPS=$(find "$BACKUP_DIR" -name "*.sql.gz" | sort | head -n -10)
    for backup in $OLD_BACKUPS; do
        rm "$backup"
        print_info "Removed: $(basename $backup)"
    done
fi

# Summary
echo ""
print_info "Backup completed successfully!"
echo ""
echo "To restore this backup:"
echo "  gunzip -c ${BACKUP_FILE}.gz | PGPASSWORD=\$DB_PASSWORD psql -h \$DB_HOST -U \$DB_USERNAME \$DB_DATABASE"
echo ""

exit 0
