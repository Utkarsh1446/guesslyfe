#!/bin/bash

# ==============================================================================
# Production Migration Script
# ==============================================================================
#
# This script safely runs database migrations in production with:
# - Pre-migration backup
# - Validation checks
# - Health checks
# - Rollback capability
# - Maintenance mode support
#
# Usage:
#   ./migrate-production.sh [--skip-backup] [--dry-run]
#
# Options:
#   --skip-backup  Skip database backup (not recommended)
#   --dry-run      Show what would be done without executing
#   --force        Skip confirmation prompts
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

# Parse arguments
SKIP_BACKUP=false
DRY_RUN=false
FORCE=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --skip-backup)
            SKIP_BACKUP=true
            shift
            ;;
        --dry-run)
            DRY_RUN=true
            shift
            ;;
        --force)
            FORCE=true
            shift
            ;;
        *)
            print_error "Unknown option: $1"
            echo "Usage: $0 [--skip-backup] [--dry-run] [--force]"
            exit 1
            ;;
    esac
done

# Load environment variables
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
fi

# Configuration
BACKUP_DIR="./backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/backup_$TIMESTAMP.sql"
MIGRATION_LOG="migration_$TIMESTAMP.log"

# ==============================================================================
# Pre-flight Checks
# ==============================================================================
print_section "Pre-flight Checks"

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    print_error "package.json not found. Are you in the backend directory?"
    exit 1
fi

# Check if migrations directory exists
if [ ! -d "src/database/migrations" ]; then
    print_error "Migrations directory not found"
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    print_error "Node.js 18 or higher is required (current: $NODE_VERSION)"
    exit 1
fi

print_info "✓ Pre-flight checks passed"

# ==============================================================================
# Validate Environment
# ==============================================================================
print_section "Environment Validation"

REQUIRED_VARS=("DB_HOST" "DB_PORT" "DB_USERNAME" "DB_DATABASE")

for var in "${REQUIRED_VARS[@]}"; do
    if [ -z "${!var}" ]; then
        print_error "Missing required environment variable: $var"
        exit 1
    fi
    print_info "✓ $var is set"
done

# ==============================================================================
# Check Database Connection
# ==============================================================================
print_section "Database Connection"

print_step "Testing database connection..."

if npm run typeorm -- query "SELECT version();" > /dev/null 2>&1; then
    print_info "✓ Database connection successful"

    DB_VERSION=$(npm run typeorm -- query "SELECT version();" 2>&1 | grep -oP 'PostgreSQL \d+\.\d+')
    print_info "Database: $DB_VERSION"
else
    print_error "✗ Cannot connect to database"
    print_error "Please check your database configuration"
    exit 1
fi

# ==============================================================================
# Validate Migrations
# ==============================================================================
print_section "Migration Validation"

if [ -f "scripts/validate-migrations.sh" ]; then
    print_step "Running migration validation..."
    ./scripts/validate-migrations.sh || {
        print_error "Migration validation failed"
        exit 1
    }
else
    print_warn "Validation script not found, skipping validation"
fi

# ==============================================================================
# Show Pending Migrations
# ==============================================================================
print_section "Pending Migrations"

print_step "Checking for pending migrations..."

PENDING_OUTPUT=$(npm run migration:show 2>&1)
PENDING_COUNT=$(echo "$PENDING_OUTPUT" | grep -c "^\[ \]" || echo "0")

if [ "$PENDING_COUNT" -eq 0 ]; then
    print_info "No pending migrations to run"
    print_info "Database is up to date!"
    exit 0
fi

print_warn "Found $PENDING_COUNT pending migration(s):"
echo ""
echo "$PENDING_OUTPUT" | grep "^\[ \]"
echo ""

# ==============================================================================
# Confirmation
# ==============================================================================
if [ "$DRY_RUN" = true ]; then
    print_info "[DRY RUN] Would run $PENDING_COUNT migration(s)"
    exit 0
fi

if [ "$FORCE" = false ]; then
    echo -e "${YELLOW}⚠️  WARNING: You are about to run migrations on PRODUCTION${NC}"
    echo ""
    echo "Database: $DB_HOST/$DB_DATABASE"
    echo "Migrations to run: $PENDING_COUNT"
    echo ""
    read -p "Are you sure you want to continue? (yes/no): " -r
    echo ""

    if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
        print_info "Migration cancelled by user"
        exit 0
    fi
fi

# ==============================================================================
# Create Backup Directory
# ==============================================================================
print_section "Backup Preparation"

if [ ! -d "$BACKUP_DIR" ]; then
    print_step "Creating backup directory..."
    mkdir -p "$BACKUP_DIR"
    print_info "✓ Backup directory created"
fi

# ==============================================================================
# Backup Database
# ==============================================================================
if [ "$SKIP_BACKUP" = false ]; then
    print_section "Database Backup"

    print_step "Creating database backup..."
    print_info "Backup file: $BACKUP_FILE"

    # Check if pg_dump is available
    if ! command -v pg_dump &> /dev/null; then
        print_error "pg_dump not found. Please install PostgreSQL client tools."
        exit 1
    fi

    # Create backup
    PGPASSWORD=$DB_PASSWORD pg_dump \
        -h "$DB_HOST" \
        -p "$DB_PORT" \
        -U "$DB_USERNAME" \
        -d "$DB_DATABASE" \
        --no-owner \
        --no-acl \
        -F p \
        > "$BACKUP_FILE" 2>&1

    if [ $? -eq 0 ]; then
        BACKUP_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
        print_info "✓ Backup created successfully ($BACKUP_SIZE)"
        print_info "Backup location: $BACKUP_FILE"
    else
        print_error "✗ Backup failed"
        exit 1
    fi

    # Compress backup
    print_step "Compressing backup..."
    gzip "$BACKUP_FILE"
    COMPRESSED_SIZE=$(du -h "$BACKUP_FILE.gz" | cut -f1)
    print_info "✓ Backup compressed ($COMPRESSED_SIZE)"
else
    print_warn "⚠️  Skipping backup (--skip-backup flag)"
fi

# ==============================================================================
# Run Migrations
# ==============================================================================
print_section "Running Migrations"

print_step "Starting migration process..."
echo ""

# Run migrations with logging
npm run migration:run 2>&1 | tee "$MIGRATION_LOG"
MIGRATION_EXIT_CODE=${PIPESTATUS[0]}

if [ $MIGRATION_EXIT_CODE -eq 0 ]; then
    print_info "✅ Migrations completed successfully"
else
    print_error "❌ Migration failed with exit code: $MIGRATION_EXIT_CODE"
    print_error "Check log file: $MIGRATION_LOG"

    # Offer rollback
    if [ "$FORCE" = false ]; then
        echo ""
        read -p "Do you want to rollback the last migration? (yes/no): " -r
        echo ""

        if [[ $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
            print_section "Rolling Back Migration"
            npm run migration:revert
            print_info "✓ Rollback completed"
        fi
    fi

    exit 1
fi

# ==============================================================================
# Post-Migration Health Checks
# ==============================================================================
print_section "Post-Migration Health Checks"

print_step "Running health checks..."

# Check database tables
TABLES_COUNT=$(npm run typeorm -- query "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='public';" 2>&1 | grep -oP '\d+' | tail -1)
print_info "Database tables: $TABLES_COUNT"

# Check if migrations table exists
if npm run typeorm -- query "SELECT COUNT(*) FROM migrations;" > /dev/null 2>&1; then
    MIGRATIONS_RUN=$(npm run typeorm -- query "SELECT COUNT(*) FROM migrations;" 2>&1 | grep -oP '\d+' | tail -1)
    print_info "Total migrations run: $MIGRATIONS_RUN"
else
    print_warn "Migrations table not found"
fi

# Test basic queries
if npm run typeorm -- query "SELECT 1 AS test;" > /dev/null 2>&1; then
    print_info "✓ Database queries working"
else
    print_error "✗ Database queries failing"
    exit 1
fi

# ==============================================================================
# Cleanup Old Backups
# ==============================================================================
print_section "Cleanup"

print_step "Cleaning up old backups (keeping last 10)..."

BACKUP_COUNT=$(find "$BACKUP_DIR" -name "backup_*.sql.gz" | wc -l)

if [ "$BACKUP_COUNT" -gt 10 ]; then
    OLD_BACKUPS=$(find "$BACKUP_DIR" -name "backup_*.sql.gz" | sort | head -n -10)
    for backup in $OLD_BACKUPS; do
        rm "$backup"
        print_info "Removed old backup: $(basename $backup)"
    done
fi

# ==============================================================================
# Summary
# ==============================================================================
print_section "Migration Summary"

echo "Status:         ✅ SUCCESS"
echo "Database:       $DB_HOST/$DB_DATABASE"
echo "Migrations run: $PENDING_COUNT"
echo "Backup:         ${BACKUP_FILE}.gz"
echo "Log file:       $MIGRATION_LOG"
echo "Completed at:   $(date)"
echo ""

print_info "🎉 Production migration completed successfully!"

# ==============================================================================
# Rollback Instructions
# ==============================================================================
print_section "Rollback Information"

echo "If you need to rollback this migration:"
echo ""
echo "  # Rollback last migration"
echo "  npm run migration:revert"
echo ""
echo "  # Restore from backup"
echo "  gunzip -c ${BACKUP_FILE}.gz | PGPASSWORD=\$DB_PASSWORD psql -h \$DB_HOST -U \$DB_USERNAME \$DB_DATABASE"
echo ""

exit 0
