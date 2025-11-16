# Database Migrations Guide

Comprehensive guide for managing database migrations in the GuessLyfe backend using TypeORM.

## Table of Contents

- [Overview](#overview)
- [Quick Start](#quick-start)
- [Migration Commands](#migration-commands)
- [Creating Migrations](#creating-migrations)
- [Best Practices](#best-practices)
- [Seed Data](#seed-data)
- [Production Migrations](#production-migrations)
- [Rollback Procedures](#rollback-procedures)
- [Troubleshooting](#troubleshooting)

## Overview

The GuessLyfe backend uses TypeORM for database migrations, providing:

- **Version Control**: Track database schema changes
- **Reversibility**: Up and down migrations for rollbacks
- **Type Safety**: TypeScript-based migrations
- **Transaction Safety**: Atomic operations
- **Team Collaboration**: Shared schema evolution

### Migration Flow

```
Development → Staging → Production
     ↓           ↓          ↓
  Generate → Validate → Deploy
     ↓           ↓          ↓
    Test   → Health Check → Monitor
```

## Quick Start

### 1. Generate Migration

```bash
# Generate migration from entity changes
npm run migration:generate -- -n AddUserRole

# Or create empty migration
npm run migration:create -- src/database/migrations/AddUserRole
```

### 2. Review Migration

Edit the generated file in `src/database/migrations/`:

```typescript
export class AddUserRole1234567890 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "user"
            ADD COLUMN "role" VARCHAR(50) NOT NULL DEFAULT 'user'
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "user"
            DROP COLUMN "role"
        `);
    }
}
```

### 3. Run Migration

```bash
# Development
npm run migration:run

# Production
./scripts/migrate-production.sh
```

## Migration Commands

### Show Migrations

```bash
# Show all migrations and their status
npm run migration:show
```

Output example:
```
[X] InitialSchema1763107798553
[X] AddMissingOpinionMarketColumns1763108000000
[X] CreateNotificationsTable1763109000000
[ ] AddUserRole1234567890  # Pending
```

### Generate Migration

```bash
# Auto-generate from entity changes
npm run migration:generate -- -n MigrationName

# Examples
npm run migration:generate -- -n AddEmailVerification
npm run migration:generate -- -n UpdateMarketStatus
```

### Create Empty Migration

```bash
# Create manual migration
npm run migration:create -- src/database/migrations/MigrationName

# Example
npm run migration:create -- src/database/migrations/AddIndexes
```

### Run Migrations

```bash
# Run all pending migrations
npm run migration:run

# Run with transaction per migration
npm run migration:run -- -t each
```

### Revert Migration

```bash
# Revert last migration
npm run migration:revert

# Revert specific number of migrations
npm run migration:revert  # Run multiple times
```

## Creating Migrations

### Auto-Generated Migrations

**Step 1: Modify Entities**

```typescript
// src/database/entities/user.entity.ts
@Entity('user')
export class User {
    // ... existing columns

    @Column({ type: 'varchar', length: 50, default: 'user' })
    role: string;  // New column
}
```

**Step 2: Generate Migration**

```bash
npm run migration:generate -- -n AddUserRole
```

**Step 3: Review Generated Migration**

```typescript
// src/database/migrations/1234567890-AddUserRole.ts
export class AddUserRole1234567890 implements MigrationInterface {
    name = 'AddUserRole1234567890'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "user"
            ADD "role" character varying(50) NOT NULL DEFAULT 'user'
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "user"
            DROP COLUMN "role"
        `);
    }
}
```

### Manual Migrations

**When to Use:**
- Complex data transformations
- Multiple table changes
- Custom indexes
- Performance optimizations

**Example: Add Indexes**

```typescript
// src/database/migrations/1234567890-AddIndexes.ts
import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddIndexes1234567890 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        // Create index on frequently queried column
        await queryRunner.query(`
            CREATE INDEX "IDX_user_email"
            ON "user" ("email")
        `);

        // Create composite index
        await queryRunner.query(`
            CREATE INDEX "IDX_market_status_created"
            ON "opinion_market" ("status", "created_at")
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "IDX_user_email"`);
        await queryRunner.query(`DROP INDEX "IDX_market_status_created"`);
    }
}
```

**Example: Data Migration**

```typescript
// src/database/migrations/1234567890-MigrateUserData.ts
import { MigrationInterface, QueryRunner } from 'typeorm';

export class MigrateUserData1234567890 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        // Add new column
        await queryRunner.query(`
            ALTER TABLE "user"
            ADD COLUMN "full_name" VARCHAR(255)
        `);

        // Migrate existing data
        await queryRunner.query(`
            UPDATE "user"
            SET "full_name" = CONCAT("first_name", ' ', "last_name")
            WHERE "first_name" IS NOT NULL
            AND "last_name" IS NOT NULL
        `);

        // Drop old columns
        await queryRunner.query(`
            ALTER TABLE "user"
            DROP COLUMN "first_name",
            DROP COLUMN "last_name"
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Add old columns back
        await queryRunner.query(`
            ALTER TABLE "user"
            ADD COLUMN "first_name" VARCHAR(100),
            ADD COLUMN "last_name" VARCHAR(100)
        `);

        // Migrate data back
        await queryRunner.query(`
            UPDATE "user"
            SET "first_name" = SPLIT_PART("full_name", ' ', 1),
                "last_name" = SPLIT_PART("full_name", ' ', 2)
            WHERE "full_name" IS NOT NULL
        `);

        // Drop new column
        await queryRunner.query(`
            ALTER TABLE "user"
            DROP COLUMN "full_name"
        `);
    }
}
```

## Best Practices

### 1. Always Reversible

✅ **Good: Reversible**
```typescript
public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "user" ADD COLUMN "age" INTEGER`);
}

public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "user" DROP COLUMN "age"`);
}
```

❌ **Bad: Not Reversible**
```typescript
public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "user" ADD COLUMN "age" INTEGER`);
}

public async down(queryRunner: QueryRunner): Promise<void> {
    // Empty - can't rollback!
}
```

### 2. Use Transactions

✅ **Good: Transactional**
```typescript
public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.startTransaction();
    try {
        await queryRunner.query(`ALTER TABLE "user" ADD COLUMN "status" VARCHAR(20)`);
        await queryRunner.query(`UPDATE "user" SET "status" = 'active'`);
        await queryRunner.commitTransaction();
    } catch (err) {
        await queryRunner.rollbackTransaction();
        throw err;
    }
}
```

### 3. Handle Data Safely

✅ **Good: Safe Data Migration**
```typescript
// Add nullable column first
await queryRunner.query(`ALTER TABLE "user" ADD COLUMN "email" VARCHAR(255)`);

// Populate data
await queryRunner.query(`UPDATE "user" SET "email" = "username" || '@guesslyfe.com'`);

// Make non-nullable
await queryRunner.query(`ALTER TABLE "user" ALTER COLUMN "email" SET NOT NULL`);
```

❌ **Bad: Unsafe**
```typescript
// Might fail if existing data doesn't meet constraint
await queryRunner.query(`
    ALTER TABLE "user"
    ADD COLUMN "email" VARCHAR(255) NOT NULL
`);
```

### 4. Never Modify Existing Migrations

❌ **Never Do This**
```typescript
// Modifying an already-deployed migration
export class ExistingMigration123 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        // Changed this line after deployment - BAD!
        await queryRunner.query(`ALTER TABLE "user" ADD COLUMN "new_field" TEXT`);
    }
}
```

✅ **Instead, Create New Migration**
```typescript
// New migration to add the field
export class AddNewField456 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "user" ADD COLUMN "new_field" TEXT`);
    }
}
```

### 5. Test Before Production

```bash
# 1. Test on development
npm run migration:run
npm run migration:revert
npm run migration:run

# 2. Validate migration
./scripts/validate-migrations.sh

# 3. Test on staging (clone of production)
./scripts/migrate-production.sh --dry-run

# 4. Deploy to production
./scripts/migrate-production.sh
```

### 6. Document Breaking Changes

```typescript
/**
 * Migration: Remove deprecated `old_field` column
 *
 * BREAKING CHANGE: This migration removes the `old_field` column
 * from the `user` table. Make sure all code using this field
 * has been updated to use `new_field` instead.
 *
 * Related PR: #123
 * Deploy after: v2.0.0
 */
export class RemoveOldField1234567890 implements MigrationInterface {
    // ...
}
```

## Seed Data

Seed data for development and testing is located in `src/database/seeds/`.

### Run Seeds

```bash
# Run all seeds
npm run seed:run

# Or run individually
ts-node -r tsconfig-paths/register src/database/seeds/run-seed.ts
```

### Seed Files

```
src/database/seeds/
├── run-seed.ts          # Main seed runner
├── user.seed.ts         # User seed data
├── creator.seed.ts      # Creator seed data
└── opinion-market.seed.ts  # Market seed data
```

### Creating Custom Seeds

```typescript
// src/database/seeds/custom.seed.ts
import { DataSource } from 'typeorm';
import { User } from '../entities/user.entity';

export async function seedCustomData(dataSource: DataSource) {
    const userRepository = dataSource.getRepository(User);

    const users = [
        {
            wallet_address: '0x1234...',
            username: 'testuser1',
            email: 'test1@example.com',
        },
        // ... more users
    ];

    await userRepository.save(users);
    console.log(`✓ Seeded ${users.length} users`);
}
```

### Production Seeds

⚠️ **Warning:** Never run seeds in production! Seeds are for development/testing only.

## Production Migrations

### Pre-Deployment Checklist

- [ ] All migrations tested on development
- [ ] Migrations validated with `validate-migrations.sh`
- [ ] Tested on staging (production clone)
- [ ] Database backup created
- [ ] Rollback plan documented
- [ ] Team notified of deployment window
- [ ] Maintenance mode enabled (if needed)

### Production Migration Script

```bash
# Full production migration with backup
./scripts/migrate-production.sh

# Skip backup (not recommended)
./scripts/migrate-production.sh --skip-backup

# Dry run (show what would happen)
./scripts/migrate-production.sh --dry-run

# Force (skip confirmations)
./scripts/migrate-production.sh --force
```

### Script Features

- ✅ Pre-flight checks (Node version, database connection)
- ✅ Automatic database backup
- ✅ Migration validation
- ✅ Transaction safety
- ✅ Post-migration health checks
- ✅ Detailed logging
- ✅ Rollback instructions
- ✅ Old backup cleanup

### Manual Production Migration

```bash
# 1. Create backup
./scripts/backup-database.sh pre-migration

# 2. Run migrations
npm run migration:run

# 3. Verify
npm run migration:show

# 4. Health check
curl https://api.guesslyfe.com/api/v1/health
```

## Rollback Procedures

### Rollback Last Migration

```bash
# Development
npm run migration:revert

# Production
./scripts/migrate-production.sh  # Will offer rollback on failure

# Or manually
npm run migration:revert
```

### Restore from Backup

```bash
# 1. Find backup
ls -lh backups/

# 2. Restore
gunzip -c backups/backup_20250101_120000.sql.gz | \
    PGPASSWORD=$DB_PASSWORD psql \
    -h $DB_HOST \
    -U $DB_USERNAME \
    $DB_DATABASE
```

### Emergency Rollback

**Scenario: Migration deployed but causing issues**

```bash
# 1. Enable maintenance mode
# (Application-specific)

# 2. Revert migration
npm run migration:revert

# 3. Verify database state
npm run migration:show

# 4. Restart application

# 5. Verify health
curl https://api.guesslyfe.com/api/v1/health

# 6. Disable maintenance mode
```

## Troubleshooting

### Migration Fails

**Problem:** Migration fails midway

```bash
# Check migration status
npm run migration:show

# Check database logs
# Review migration log file
cat migration_TIMESTAMP.log

# Rollback if needed
npm run migration:revert
```

**Problem:** Migration already ran

```
QueryFailedError: relation "column_name" already exists
```

**Solution:**
```typescript
// Make migration idempotent
public async up(queryRunner: QueryRunner): Promise<void> {
    // Check if column exists
    const hasColumn = await queryRunner.hasColumn('table_name', 'column_name');

    if (!hasColumn) {
        await queryRunner.query(`
            ALTER TABLE "table_name"
            ADD COLUMN "column_name" VARCHAR(255)
        `);
    }
}
```

### TypeORM Connection Issues

**Problem:** Cannot connect to database

```bash
# Check environment variables
cat .env | grep DB_

# Test connection
npm run typeorm -- query "SELECT 1"

# Check Cloud SQL Proxy (if using GCP)
./cloud-sql-proxy PROJECT:REGION:INSTANCE
```

### Migration Order Issues

**Problem:** Migrations run out of order

**Solution:** Migrations are executed by timestamp. Always use:
```bash
npm run migration:generate -- -n Name  # Generates with current timestamp
```

Never manually modify timestamps!

### Lock Conflicts

**Problem:** Migration locked by another process

```sql
-- Check for locks
SELECT * FROM pg_locks WHERE locktype = 'relation';

-- Kill blocking process (if safe)
SELECT pg_terminate_backend(pid)
FROM pg_stat_activity
WHERE state = 'idle in transaction';
```

## Advanced Topics

### Migrations in CI/CD

```yaml
# .github/workflows/deploy.yml
- name: Run Migrations
  run: |
    # Validate first
    ./scripts/validate-migrations.sh

    # Run with force flag (no prompts)
    ./scripts/migrate-production.sh --force
```

### Zero-Downtime Migrations

**Strategy 1: Backward Compatible Changes**

```typescript
// Phase 1: Add new column (nullable)
export class AddNewColumn1 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "user"
            ADD COLUMN "new_email" VARCHAR(255)
        `);
    }
}

// Deploy application code that writes to both columns

// Phase 2: Migrate data
export class MigrateData2 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            UPDATE "user"
            SET "new_email" = "old_email"
            WHERE "new_email" IS NULL
        `);
    }
}

// Phase 3: Make not null and remove old column
export class Cleanup3 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "user"
            ALTER COLUMN "new_email" SET NOT NULL,
            DROP COLUMN "old_email"
        `);
    }
}
```

**Strategy 2: Blue-Green Deployment**

1. Deploy new version (green) with migration
2. Run migrations on green database
3. Switch traffic to green
4. Keep blue as rollback

### Performance Considerations

```typescript
// ❌ Slow: Full table scan
await queryRunner.query(`
    UPDATE "user" SET "status" = 'active'
`);

// ✅ Fast: Batched updates
const batchSize = 1000;
let offset = 0;

while (true) {
    const result = await queryRunner.query(`
        UPDATE "user"
        SET "status" = 'active'
        WHERE "id" IN (
            SELECT "id" FROM "user"
            WHERE "status" IS NULL
            LIMIT ${batchSize} OFFSET ${offset}
        )
    `);

    if (result.affectedRows === 0) break;
    offset += batchSize;
}
```

## Resources

- [TypeORM Migrations Documentation](https://typeorm.io/migrations)
- [PostgreSQL ALTER TABLE](https://www.postgresql.org/docs/current/sql-altertable.html)
- [Database Refactoring Best Practices](https://www.martinfowler.com/articles/evodb.html)

## Support

For issues or questions:
- GitHub Issues: https://github.com/guesslyfe/backend/issues
- Email: support@guesslyfe.com
- Documentation: https://docs.guesslyfe.com

## License

This documentation is part of the GuessLyfe project and is licensed under MIT.
