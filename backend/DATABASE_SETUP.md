# Database Setup Guide

This guide will help you set up the PostgreSQL database for the Guessly backend application.

## Prerequisites

- PostgreSQL 14+ installed
- Redis installed
- Node.js 18+ installed

## Database Structure

The application uses TypeORM with the following entities:

1. **User** - User accounts with Twitter authentication
2. **Creator** - Qualified creators who can create markets
3. **CreatorShare** - Share holdings for creators
4. **ShareTransaction** - Share buy/sell transactions
5. **OpinionMarket** - Prediction markets created by creators
6. **MarketPosition** - User positions in markets
7. **MarketTrade** - Individual trades in markets
8. **DividendEpoch** - Time periods for dividend collection
9. **ClaimableDividend** - Dividends available to claim
10. **DividendClaim** - Dividend claim records
11. **CreatorVolumeTracking** - Volume tracking per creator/market

## Setup Steps

### 1. Install PostgreSQL

macOS (Homebrew):
```bash
brew install postgresql@14
brew services start postgresql@14
```

Ubuntu/Debian:
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
```

### 2. Create Database and User

```bash
# Connect to PostgreSQL
psql postgres

# Create database and user
CREATE DATABASE guessly;
CREATE USER guessly_user WITH ENCRYPTED PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE guessly TO guessly_user;

# Exit psql
\q
```

### 3. Configure Environment Variables

Update your `.env` file with the database credentials:

```env
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=guessly_user
DB_PASSWORD=your_secure_password
DB_DATABASE=guessly
DB_SYNCHRONIZE=false
DB_LOGGING=true
```

**Important:** Never set `DB_SYNCHRONIZE=true` in production!

### 4. Install Dependencies

```bash
npm install
```

### 5. Generate and Run Migrations

Generate migration from entities:
```bash
npm run migration:generate src/database/migrations/InitialSchema
```

Run migrations:
```bash
npm run migration:run
```

### 6. Seed Development Data

```bash
npm run seed:run
```

This will create:
- 4 sample users (including an admin user)
- 2 qualified creators
- 4 sample opinion markets

## Migration Commands

### Generate Migration
Automatically generates a migration based on entity changes:
```bash
npm run migration:generate src/database/migrations/MigrationName
```

### Create Empty Migration
Creates an empty migration file for custom SQL:
```bash
npm run migration:create src/database/migrations/MigrationName
```

### Run Migrations
Executes all pending migrations:
```bash
npm run migration:run
```

### Revert Migration
Reverts the last executed migration:
```bash
npm run migration:revert
```

### Show Migration Status
Shows which migrations have been run:
```bash
npm run migration:show
```

## Entity Relationships

```
User (1) ──── (1) Creator
                │
                ├── (many) CreatorShare
                ├── (many) ShareTransaction
                ├── (many) OpinionMarket
                │            │
                │            ├── (many) MarketPosition
                │            ├── (many) MarketTrade
                │            └── (many) CreatorVolumeTracking
                │
                ├── (many) DividendEpoch
                ├── (many) DividendClaim
                └── (many) CreatorVolumeTracking
```

## Index Strategy

The following indexes are created for optimal performance:

- **User**: `twitterId`, `twitterHandle`, `walletAddress`
- **Creator**: `twitterHandle`, `totalMarketVolume`, `sharesUnlocked`
- **CreatorShare**: `creatorId`, `holderAddress`
- **ShareTransaction**: `creatorId`, `buyerAddress`, `sellerAddress`, `txHash`, `timestamp`
- **OpinionMarket**: `creatorId`, `endTime`, `status`, `volume`, `createdAt`
- **MarketPosition**: `marketId`, `userAddress`
- **MarketTrade**: `marketId`, `userAddress`, `txHash`, `timestamp`
- **DividendEpoch**: `creatorId`
- **ClaimableDividend**: `userAddress`, `creatorId`
- **DividendClaim**: `userAddress`, `creatorId`, `claimedAt`
- **CreatorVolumeTracking**: `creatorId`, `marketId`

## Troubleshooting

### Connection Errors

If you get connection errors:
1. Check PostgreSQL is running: `brew services list` (macOS) or `sudo systemctl status postgresql` (Linux)
2. Verify credentials in `.env`
3. Check PostgreSQL logs for authentication issues

### Migration Errors

If migrations fail:
1. Check database connection
2. Verify all entities are properly imported
3. Review migration SQL for conflicts
4. Use `migration:revert` to undo problematic migrations

### Seeding Errors

If seeding fails:
1. Ensure migrations have been run
2. Check for unique constraint violations
3. Clear existing data if reseeding

## Production Considerations

1. **Never use `DB_SYNCHRONIZE=true`** - Use migrations instead
2. **Set up database backups** - Regular automated backups
3. **Use connection pooling** - Configure `max` connections in TypeORM
4. **Monitor query performance** - Use `DB_LOGGING=true` to identify slow queries
5. **Secure credentials** - Use environment variables and secrets management
6. **Set up read replicas** - For scaling read operations
7. **Enable SSL** - For encrypted database connections

## Useful PostgreSQL Commands

```bash
# Connect to database
psql -U guessly_user -d guessly

# List all tables
\dt

# Describe table structure
\d table_name

# View all indexes
\di

# Check database size
SELECT pg_size_pretty(pg_database_size('guessly'));

# View active connections
SELECT * FROM pg_stat_activity WHERE datname = 'guessly';
```
