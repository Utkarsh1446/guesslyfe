# Migration Guide

Complete guide for database migrations and version upgrades for the GuessLyfe platform.

## Table of Contents

- [Overview](#overview)
- [Database Migrations](#database-migrations)
- [Migration Best Practices](#migration-best-practices)
- [Common Migration Tasks](#common-migration-tasks)
- [Rollback Procedures](#rollback-procedures)
- [Data Migrations](#data-migrations)
- [Zero-Downtime Migrations](#zero-downtime-migrations)
- [Version Upgrades](#version-upgrades)
- [Troubleshooting](#troubleshooting)

---

## Overview

This guide covers two main types of migrations:

1. **Database Migrations**: Schema changes (tables, columns, indexes)
2. **Data Migrations**: Transforming or populating existing data
3. **Version Upgrades**: Upgrading application dependencies and infrastructure

---

## Database Migrations

### TypeORM Migration System

GuessLyfe uses TypeORM for database migrations. Migrations are version-controlled SQL scripts that modify the database schema.

### Migration Commands

```bash
# Generate migration from entity changes
npm run migration:generate -- -n MigrationName

# Create empty migration
npm run migration:create -- -n MigrationName

# Run pending migrations
npm run migration:run

# Revert last migration
npm run migration:revert

# Show migration status
npm run migration:show
```

### Migration Files

Migrations are stored in `src/migrations/`:

```
src/migrations/
├── 1700000000000-InitialSchema.ts
├── 1700100000000-AddIndexes.ts
├── 1700200000000-AddUserRoles.ts
└── 1700300000000-AddDividendTables.ts
```

### Migration File Structure

```typescript
import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddIndexes1700100000000 implements MigrationInterface {
  name = 'AddIndexes1700100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Forward migration (apply changes)
    await queryRunner.query(`
      CREATE INDEX idx_markets_category ON opinion_markets(category);
      CREATE INDEX idx_markets_status ON opinion_markets(status);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Reverse migration (rollback changes)
    await queryRunner.query(`
      DROP INDEX idx_markets_category;
      DROP INDEX idx_markets_status;
    `);
  }
}
```

---

## Migration Best Practices

### 1. Always Test Migrations

```bash
# Create test database
createdb guesslyfe_migration_test

# Set environment
export DB_NAME=guesslyfe_migration_test

# Run migration
npm run migration:run

# Verify schema
psql guesslyfe_migration_test -c "\d+ markets"

# Test rollback
npm run migration:revert

# Cleanup
dropdb guesslyfe_migration_test
```

### 2. Make Migrations Idempotent

Use `IF EXISTS` and `IF NOT EXISTS`:

```typescript
public async up(queryRunner: QueryRunner): Promise<void> {
  // Add column only if it doesn't exist
  await queryRunner.query(`
    ALTER TABLE users
    ADD COLUMN IF NOT EXISTS bio TEXT;
  `);

  // Create index only if it doesn't exist
  await queryRunner.query(`
    CREATE INDEX IF NOT EXISTS idx_users_email
    ON users(email);
  `);
}

public async down(queryRunner: QueryRunner): Promise<void> {
  // Drop only if exists
  await queryRunner.query(`
    DROP INDEX IF EXISTS idx_users_email;
  `);

  await queryRunner.query(`
    ALTER TABLE users
    DROP COLUMN IF EXISTS bio;
  `);
}
```

### 3. Use Transactions

```typescript
public async up(queryRunner: QueryRunner): Promise<void> {
  await queryRunner.startTransaction();

  try {
    await queryRunner.query(`ALTER TABLE users ADD COLUMN bio TEXT`);
    await queryRunner.query(`ALTER TABLE users ADD COLUMN website VARCHAR(255)`);

    await queryRunner.commitTransaction();
  } catch (error) {
    await queryRunner.rollbackTransaction();
    throw error;
  }
}
```

### 4. Add Comments

```typescript
public async up(queryRunner: QueryRunner): Promise<void> {
  // Add email column for user notifications
  await queryRunner.query(`
    ALTER TABLE users
    ADD COLUMN email VARCHAR(255);
  `);

  // Add index for faster email lookups
  await queryRunner.query(`
    CREATE INDEX idx_users_email ON users(email);
  `);

  // Add comment to column
  await queryRunner.query(`
    COMMENT ON COLUMN users.email IS 'User email for notifications';
  `);
}
```

### 5. Handle NULL Values

```typescript
public async up(queryRunner: QueryRunner): Promise<void> {
  // Add column as nullable first
  await queryRunner.query(`
    ALTER TABLE users
    ADD COLUMN email VARCHAR(255);
  `);

  // Set default values for existing rows
  await queryRunner.query(`
    UPDATE users
    SET email = CONCAT(wallet_address, '@temporary.guesslyfe.com')
    WHERE email IS NULL;
  `);

  // Make column NOT NULL
  await queryRunner.query(`
    ALTER TABLE users
    ALTER COLUMN email SET NOT NULL;
  `);
}
```

---

## Common Migration Tasks

### Adding a Column

```typescript
export class AddUserBio1700000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE users
      ADD COLUMN bio TEXT;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE users
      DROP COLUMN bio;
    `);
  }
}
```

### Removing a Column

```typescript
export class RemoveOldColumn1700000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Drop column
    await queryRunner.query(`
      ALTER TABLE users
      DROP COLUMN old_field;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Recreate column (data will be lost)
    await queryRunner.query(`
      ALTER TABLE users
      ADD COLUMN old_field VARCHAR(255);
    `);
  }
}
```

### Renaming a Column

```typescript
export class RenameColumn1700000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE users
      RENAME COLUMN old_name TO new_name;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE users
      RENAME COLUMN new_name TO old_name;
    `);
  }
}
```

### Adding an Index

```typescript
export class AddIndexes1700000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE INDEX idx_markets_category ON opinion_markets(category);
      CREATE INDEX idx_markets_status ON opinion_markets(status);
      CREATE INDEX idx_markets_end_date ON opinion_markets(end_date);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX idx_markets_category;
      DROP INDEX idx_markets_status;
      DROP INDEX idx_markets_end_date;
    `);
  }
}
```

### Creating a Table

```typescript
export class CreateDividendsTable1700000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE dividends (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        creator_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        period_start TIMESTAMP NOT NULL,
        period_end TIMESTAMP NOT NULL,
        total_amount DECIMAL(20, 6) NOT NULL,
        distributed BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );

      CREATE INDEX idx_dividends_creator ON dividends(creator_id);
      CREATE INDEX idx_dividends_period ON dividends(period_start, period_end);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE dividends;`);
  }
}
```

### Adding a Foreign Key

```typescript
export class AddForeignKey1700000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE trades
      ADD CONSTRAINT fk_trades_market
      FOREIGN KEY (market_id)
      REFERENCES opinion_markets(id)
      ON DELETE CASCADE;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE trades
      DROP CONSTRAINT fk_trades_market;
    `);
  }
}
```

---

## Rollback Procedures

### Reverting Last Migration

```bash
# Revert the most recent migration
npm run migration:revert

# Check status
npm run migration:show
```

### Reverting Multiple Migrations

```bash
# Revert last 3 migrations
npm run migration:revert
npm run migration:revert
npm run migration:revert

# Or create a script
for i in {1..3}; do npm run migration:revert; done
```

### Emergency Rollback

If a migration fails in production:

```bash
# 1. Stop the application
kubectl scale deployment guesslyfe-api --replicas=0
# or for Cloud Run:
gcloud run services update guesslyfe-api --min-instances=0 --max-instances=0

# 2. Connect to database
gcloud sql connect $DB_INSTANCE --user=postgres

# 3. Manually revert changes
DROP INDEX idx_problematic_index;
ALTER TABLE users DROP COLUMN problematic_column;

# 4. Update migrations table to mark as reverted
DELETE FROM migrations WHERE name = 'ProblematicMigration1700000000000';

# 5. Restart application with previous version
gcloud run deploy guesslyfe-api --image=previous-version
```

---

## Data Migrations

### Backfilling Data

```typescript
export class BackfillUserRoles1700000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add role column
    await queryRunner.query(`
      ALTER TABLE users
      ADD COLUMN role VARCHAR(20) DEFAULT 'user';
    `);

    // Backfill existing users with 'user' role
    await queryRunner.query(`
      UPDATE users
      SET role = 'user'
      WHERE role IS NULL;
    `);

    // Set specific users as admins
    await queryRunner.query(`
      UPDATE users
      SET role = 'admin'
      WHERE wallet_address IN (
        '0x1234...',
        '0x5678...'
      );
    `);

    // Make column NOT NULL
    await queryRunner.query(`
      ALTER TABLE users
      ALTER COLUMN role SET NOT NULL;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE users
      DROP COLUMN role;
    `);
  }
}
```

### Transforming Data

```typescript
export class NormalizeCategories1700000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Normalize category values
    await queryRunner.query(`
      UPDATE opinion_markets
      SET category = LOWER(TRIM(category));
    `);

    // Fix specific misspellings
    await queryRunner.query(`
      UPDATE opinion_markets
      SET category = 'crypto'
      WHERE category IN ('cryptocurrency', 'bitcoin', 'ethereum');
    `);

    await queryRunner.query(`
      UPDATE opinion_markets
      SET category = 'sports'
      WHERE category IN ('sport', 'athletics');
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Data migrations are often irreversible
    console.log('Cannot reverse data transformation');
  }
}
```

### Migrating to New Schema

```typescript
export class MigrateToNewPositionsTable1700000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create new table
    await queryRunner.query(`
      CREATE TABLE positions_new (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL,
        market_id UUID NOT NULL,
        outcome SMALLINT NOT NULL,
        shares DECIMAL(20, 6) NOT NULL,
        average_price DECIMAL(10, 6) NOT NULL,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(user_id, market_id, outcome)
      );
    `);

    // Migrate data from old table
    await queryRunner.query(`
      INSERT INTO positions_new (user_id, market_id, outcome, shares, average_price)
      SELECT
        user_id,
        market_id,
        outcome,
        SUM(shares) as shares,
        AVG(price) as average_price
      FROM positions_old
      GROUP BY user_id, market_id, outcome;
    `);

    // Rename tables
    await queryRunner.query(`ALTER TABLE positions DROP CONSTRAINT IF EXISTS positions_pkey;`);
    await queryRunner.query(`ALTER TABLE positions RENAME TO positions_old_backup;`);
    await queryRunner.query(`ALTER TABLE positions_new RENAME TO positions;`);

    // Create indexes
    await queryRunner.query(`
      CREATE INDEX idx_positions_user ON positions(user_id);
      CREATE INDEX idx_positions_market ON positions(market_id);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE positions RENAME TO positions_new;
      ALTER TABLE positions_old_backup RENAME TO positions;
    `);
  }
}
```

---

## Zero-Downtime Migrations

For production systems, use these strategies to avoid downtime:

### 1. Expand-Contract Pattern

**Phase 1: Expand (add new column)**
```typescript
export class AddNewEmailColumn1700000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add new column (nullable)
    await queryRunner.query(`
      ALTER TABLE users
      ADD COLUMN email_new VARCHAR(255);
    `);

    // Copy data from old column
    await queryRunner.query(`
      UPDATE users
      SET email_new = email;
    `);
  }
}
```

**Phase 2: Dual Write (application writes to both)**
```typescript
// In application code
await this.userRepository.update(userId, {
  email: newEmail,        // Old column
  email_new: newEmail,    // New column
});
```

**Phase 3: Contract (remove old column)**
```typescript
export class RemoveOldEmailColumn1700100000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Rename new column to old name
    await queryRunner.query(`
      ALTER TABLE users
      DROP COLUMN email,
      RENAME COLUMN email_new TO email;
    `);
  }
}
```

### 2. Online Schema Changes

For large tables, use `pg_repack` or `CREATE INDEX CONCURRENTLY`:

```sql
-- Add index without locking table
CREATE INDEX CONCURRENTLY idx_markets_category ON opinion_markets(category);

-- Add column with default (PostgreSQL 11+)
ALTER TABLE users ADD COLUMN bio TEXT DEFAULT '';
```

### 3. Blue-Green Deployment

1. Deploy new version (green) alongside old version (blue)
2. Run migrations on green database
3. Test green version
4. Switch traffic to green
5. Keep blue as backup

---

## Version Upgrades

### Node.js Version Upgrade

```bash
# 1. Update package.json engines
{
  "engines": {
    "node": ">=18.0.0",
    "npm": ">=9.0.0"
  }
}

# 2. Update Dockerfile
FROM node:18-alpine

# 3. Update CI/CD
- uses: actions/setup-node@v3
  with:
    node-version: '18'

# 4. Test locally
nvm install 18
nvm use 18
npm ci
npm test

# 5. Deploy
```

### PostgreSQL Version Upgrade

```bash
# 1. Create backup
pg_dump guesslyfe_production > backup.sql

# 2. Create new instance with new version
gcloud sql instances create guesslyfe-db-pg15 \
  --database-version=POSTGRES_15

# 3. Restore data
psql -h new-instance guesslyfe < backup.sql

# 4. Test application with new database
# Update connection string temporarily

# 5. Switch to new database
# Update production connection string

# 6. Delete old instance after verification
```

### NestJS Framework Upgrade

```bash
# 1. Check current version
npm list @nestjs/core

# 2. Update dependencies
npm update @nestjs/core @nestjs/common @nestjs/platform-express

# 3. Check breaking changes
# Read migration guide: https://docs.nestjs.com/migration-guide

# 4. Update code as needed
# Fix deprecations, update syntax

# 5. Test thoroughly
npm test
npm run test:e2e

# 6. Deploy
```

---

## Troubleshooting

### Migration Fails with "relation already exists"

```bash
# Check if migration already ran
psql $DB_URL -c "SELECT * FROM migrations ORDER BY timestamp DESC LIMIT 5;"

# If migration is in table but didn't complete:
# 1. Manually fix database
# 2. Mark migration as complete
INSERT INTO migrations (timestamp, name) VALUES (1700000000000, 'MigrationName1700000000000');
```

### Migration Fails Midway

```bash
# 1. Check database state
psql $DB_URL -c "\d+ table_name"

# 2. Manually clean up partial changes
ALTER TABLE users DROP COLUMN IF EXISTS partial_column;

# 3. Delete migration record
DELETE FROM migrations WHERE name = 'FailedMigration1700000000000';

# 4. Fix migration code

# 5. Retry
npm run migration:run
```

### Can't Rollback Migration

```bash
# If down() method is missing or fails:

# 1. Manually revert changes
psql $DB_URL

DROP INDEX idx_problematic;
ALTER TABLE users DROP COLUMN problematic;

# 2. Remove from migrations table
DELETE FROM migrations WHERE name = 'ProblematicMigration1700000000000';
```

### Foreign Key Constraint Violation

```bash
# Temporarily disable constraints
SET session_replication_role = replica;

# Run migration
npm run migration:run

# Re-enable constraints
SET session_replication_role = DEFAULT;

# Verify data integrity
SELECT * FROM users WHERE id NOT IN (SELECT DISTINCT user_id FROM trades);
```

---

## Migration Checklist

### Before Migration

- [ ] Backup database
- [ ] Test migration on copy of production database
- [ ] Verify down() method works
- [ ] Check for foreign key constraints
- [ ] Review migration for performance impact
- [ ] Plan rollback strategy
- [ ] Schedule maintenance window (if needed)
- [ ] Notify team/users

### During Migration

- [ ] Monitor migration progress
- [ ] Watch for errors in logs
- [ ] Check database CPU/memory
- [ ] Verify application health

### After Migration

- [ ] Verify schema changes applied
- [ ] Test application functionality
- [ ] Check application logs for errors
- [ ] Monitor performance metrics
- [ ] Verify data integrity
- [ ] Update documentation

---

## Resources

- [TypeORM Migrations Documentation](https://typeorm.io/migrations)
- [PostgreSQL ALTER TABLE](https://www.postgresql.org/docs/current/sql-altertable.html)
- [Zero-Downtime Deployments](https://documentation.platformsh.com/development/zero-downtime.html)
- [Database Reliability Engineering](https://www.oreilly.com/library/view/database-reliability-engineering/9781491925935/)

---

**Last Updated**: 2024-11-16
**Version**: 1.0.0
