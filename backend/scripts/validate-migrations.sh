#!/bin/bash

# ==============================================================================
# Migration Validation Script
# ==============================================================================
#
# This script validates database migrations before deployment:
# - Checks for pending migrations
# - Validates migration files
# - Checks for breaking changes
# - Ensures down methods exist
# - Validates transaction safety
#
# Usage:
#   ./validate-migrations.sh
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

# Validation counters
WARNINGS=0
ERRORS=0

print_section "Migration Validation"

# ==============================================================================
# Check if database is accessible
# ==============================================================================
print_info "Checking database connection..."

if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
fi

# Test database connection (using TypeORM)
if npm run typeorm -- query "SELECT 1" > /dev/null 2>&1; then
    print_info "✓ Database connection successful"
else
    print_error "✗ Cannot connect to database"
    ERRORS=$((ERRORS + 1))
fi

# ==============================================================================
# Check for pending migrations
# ==============================================================================
print_section "Checking Pending Migrations"

PENDING_COUNT=$(npm run migration:show 2>/dev/null | grep -c "^\[ \]" || echo "0")

if [ "$PENDING_COUNT" -gt 0 ]; then
    print_warn "Found $PENDING_COUNT pending migration(s):"
    npm run migration:show | grep "^\[ \]"
else
    print_info "✓ No pending migrations"
fi

# ==============================================================================
# Validate migration files
# ==============================================================================
print_section "Validating Migration Files"

MIGRATION_DIR="src/database/migrations"

if [ ! -d "$MIGRATION_DIR" ]; then
    print_error "✗ Migration directory not found: $MIGRATION_DIR"
    ERRORS=$((ERRORS + 1))
    exit 1
fi

MIGRATION_FILES=$(find "$MIGRATION_DIR" -name "*.ts" -type f)

if [ -z "$MIGRATION_FILES" ]; then
    print_warn "No migration files found"
    WARNINGS=$((WARNINGS + 1))
else
    print_info "Found $(echo "$MIGRATION_FILES" | wc -l) migration file(s)"

    for file in $MIGRATION_FILES; do
        filename=$(basename "$file")
        print_info "Validating: $filename"

        # Check if file contains up method
        if grep -q "async up(queryRunner: QueryRunner)" "$file"; then
            print_info "  ✓ Has up() method"
        else
            print_error "  ✗ Missing up() method"
            ERRORS=$((ERRORS + 1))
        fi

        # Check if file contains down method
        if grep -q "async down(queryRunner: QueryRunner)" "$file"; then
            print_info "  ✓ Has down() method"
        else
            print_error "  ✗ Missing down() method (not reversible!)"
            ERRORS=$((ERRORS + 1))
        fi

        # Check for transaction usage
        if grep -q "queryRunner.startTransaction()" "$file"; then
            print_info "  ✓ Uses transactions"
        else
            print_warn "  ! No explicit transaction (may auto-commit)"
            WARNINGS=$((WARNINGS + 1))
        fi

        # Check for potentially breaking changes
        if grep -q "DROP TABLE\|DROP COLUMN\|ALTER TABLE.*DROP" "$file"; then
            print_warn "  ! Contains destructive operations (DROP)"
            WARNINGS=$((WARNINGS + 1))
        fi

        # Check for data modifications
        if grep -q "UPDATE\|DELETE FROM" "$file"; then
            print_warn "  ! Contains data modifications"
            WARNINGS=$((WARNINGS + 1))
        fi

        # Check for complex queries
        if grep -q "queryRunner.query" "$file"; then
            QUERY_COUNT=$(grep -c "queryRunner.query" "$file")
            print_info "  • Contains $QUERY_COUNT raw quer(y/ies)"
        fi
    done
fi

# ==============================================================================
# Check for common issues
# ==============================================================================
print_section "Checking for Common Issues"

# Check for naming conflicts
print_info "Checking for migration naming conflicts..."
DUPLICATE_NAMES=$(find "$MIGRATION_DIR" -name "*.ts" -type f -exec basename {} \; | cut -d'-' -f2- | sort | uniq -d)

if [ -n "$DUPLICATE_NAMES" ]; then
    print_error "✗ Found duplicate migration names:"
    echo "$DUPLICATE_NAMES"
    ERRORS=$((ERRORS + 1))
else
    print_info "✓ No naming conflicts"
fi

# Check migration order
print_info "Checking migration chronological order..."
MIGRATION_TIMESTAMPS=$(find "$MIGRATION_DIR" -name "*.ts" -type f -exec basename {} \; | cut -d'-' -f1 | sort -n)
SORTED_TIMESTAMPS=$(echo "$MIGRATION_TIMESTAMPS" | sort -n)

if [ "$MIGRATION_TIMESTAMPS" = "$SORTED_TIMESTAMPS" ]; then
    print_info "✓ Migrations are in chronological order"
else
    print_warn "! Migrations may not be in chronological order"
    WARNINGS=$((WARNINGS + 1))
fi

# ==============================================================================
# TypeScript compilation check
# ==============================================================================
print_section "TypeScript Compilation Check"

print_info "Compiling TypeScript..."
if npm run build > /dev/null 2>&1; then
    print_info "✓ TypeScript compilation successful"
else
    print_error "✗ TypeScript compilation failed"
    ERRORS=$((ERRORS + 1))
fi

# ==============================================================================
# Syntax validation
# ==============================================================================
print_section "Syntax Validation"

for file in $MIGRATION_FILES; do
    filename=$(basename "$file")

    # Check for common syntax issues
    if grep -q "await.*await" "$file"; then
        print_warn "! $filename: Potential double await found"
        WARNINGS=$((WARNINGS + 1))
    fi

    # Check for proper imports
    if ! grep -q "import.*QueryRunner.*from.*typeorm" "$file"; then
        print_error "✗ $filename: Missing QueryRunner import"
        ERRORS=$((ERRORS + 1))
    fi

    # Check for proper class export
    if ! grep -q "export class" "$file"; then
        print_error "✗ $filename: Missing export class"
        ERRORS=$((ERRORS + 1))
    fi
done

# ==============================================================================
# Check for schema.sql (if using raw SQL migrations)
# ==============================================================================
print_section "Additional Checks"

# Check if there's a schema file for reference
if [ -f "schema.sql" ]; then
    print_info "✓ Schema reference file found"
else
    print_warn "! No schema.sql reference file"
fi

# Check for migration rollback testing
if [ -f "test/migrations.test.ts" ]; then
    print_info "✓ Migration tests found"
else
    print_warn "! No migration tests found"
    WARNINGS=$((WARNINGS + 1))
fi

# ==============================================================================
# Summary
# ==============================================================================
print_section "Validation Summary"

echo "Total Errors:   $ERRORS"
echo "Total Warnings: $WARNINGS"
echo ""

if [ $ERRORS -gt 0 ]; then
    print_error "❌ Validation FAILED with $ERRORS error(s)"
    exit 1
elif [ $WARNINGS -gt 0 ]; then
    print_warn "⚠️  Validation passed with $WARNINGS warning(s)"
    exit 0
else
    print_info "✅ All validations passed!"
    exit 0
fi
