# GCP Deployment Guide for Guessly Backend

## Project Information
- **Project ID**: guess-fun-2025-v1
- **Project Number**: 738787111842
- **Project Name**: guesslydotfun
- **Region**: us-central1

## Infrastructure Overview

### Cloud SQL PostgreSQL
- **Instance Name**: guessly-db
- **Version**: PostgreSQL 14
- **Tier**: db-f1-micro (development)
- **Region**: us-central1
- **Connection Name**: guess-fun-2025-v1:us-central1:guessly-db
- **Root Password**: GuesslyDB2025!
- **Database**: guessly
- **User**: guessly_user
- **User Password**: GuesslyUser2025!

### Cloud Memorystore Redis
- **Instance Name**: guessly-redis
- **Version**: Redis 6.x
- **Tier**: Basic
- **Size**: 1 GB
- **Region**: us-central1

### Cloud Run
- **Service Name**: guessly-backend
- **Region**: us-central1
- **Platform**: Managed
- **Port**: 8080

## Setup Steps

### 1. Prerequisites
```bash
# Install gcloud CLI
brew install google-cloud-sdk

# Authenticate
gcloud auth login

# Set project
gcloud config set project guess-fun-2025-v1
```

### 2. Database Setup

#### Connect via Cloud SQL Proxy (for local development)
```bash
# Start Cloud SQL Proxy
./scripts/connect-cloud-sql.sh

# In another terminal, run migrations
./scripts/run-migrations-gcp.sh

# Run seeds
npm run seed:run
```

#### Connect via gcloud (quick queries)
```bash
# Connect to Cloud SQL
gcloud sql connect guessly-db --user=postgres --project=guess-fun-2025-v1

# Enter password when prompted: GuesslyDB2025!

# Create database and user
CREATE DATABASE guessly;
CREATE USER guessly_user WITH ENCRYPTED PASSWORD 'GuesslyUser2025!';
GRANT ALL PRIVILEGES ON DATABASE guessly TO guessly_user;
ALTER DATABASE guessly OWNER TO guessly_user;
\q
```

### 3. Run Migrations

#### Option A: Using Cloud SQL Proxy (Recommended)
```bash
# Terminal 1: Start proxy
./scripts/connect-cloud-sql.sh

# Terminal 2: Run migrations
./scripts/run-migrations-gcp.sh
```

#### Option B: Direct from Cloud Shell
```bash
# Set environment variables
export DB_HOST=/cloudsql/guess-fun-2025-v1:us-central1:guessly-db
export DB_USERNAME=guessly_user
export DB_PASSWORD=GuesslyUser2025!
export DB_DATABASE=guessly

# Run migrations
npm run migration:run

# Run seeds
npm run seed:run
```

### 4. Deploy Backend to Cloud Run

#### Option A: Using gcloud CLI
```bash
cd backend

# Build and deploy
gcloud run deploy guessly-backend \
  --source . \
  --region=us-central1 \
  --platform=managed \
  --allow-unauthenticated \
  --set-env-vars="NODE_ENV=production,PORT=8080,DB_HOST=/cloudsql/guess-fun-2025-v1:us-central1:guessly-db,DB_USERNAME=guessly_user,DB_PASSWORD=GuesslyUser2025!,DB_DATABASE=guessly" \
  --add-cloudsql-instances=guess-fun-2025-v1:us-central1:guessly-db \
  --project=guess-fun-2025-v1
```

#### Option B: Using Cloud Build
```bash
# Submit build
gcloud builds submit --config=cloudbuild.yaml --project=guess-fun-2025-v1
```

### 5. Get Redis IP Address

After Redis instance is created:
```bash
# Get Redis host IP
gcloud redis instances describe guessly-redis \
  --region=us-central1 \
  --format="value(host)" \
  --project=guess-fun-2025-v1
```

Update environment variables with the Redis IP address.

### 6. Set Environment Variables in Cloud Run

```bash
# Get the Cloud Run service
gcloud run services describe guessly-backend \
  --region=us-central1 \
  --platform=managed \
  --project=guess-fun-2025-v1

# Update environment variables
gcloud run services update guessly-backend \
  --region=us-central1 \
  --update-env-vars="REDIS_HOST=REDIS_IP_HERE,REDIS_PORT=6379" \
  --project=guess-fun-2025-v1
```

## Environment Variables

### Required for Production
```env
# Database
DB_HOST=/cloudsql/guess-fun-2025-v1:us-central1:guessly-db
DB_USERNAME=guessly_user
DB_PASSWORD=GuesslyUser2025!
DB_DATABASE=guessly

# Redis
REDIS_HOST=<from step 5>
REDIS_PORT=6379

# JWT Secrets (generate random strings)
JWT_SECRET=<generate-random-string>
JWT_REFRESH_SECRET=<generate-random-string>

# Twitter OAuth (get from Twitter Developer Portal)
TWITTER_CLIENT_ID=<your-twitter-client-id>
TWITTER_CLIENT_SECRET=<your-twitter-client-secret>
TWITTER_BEARER_TOKEN=<your-twitter-bearer-token>

# Blockchain (if deploying contracts)
BLOCKCHAIN_PROVIDER_PRIVATE_KEY=<your-private-key>
CONTRACT_FEE_COLLECTOR=<deployed-address>
CONTRACT_CREATOR_SHARE_FACTORY=<deployed-address>
CONTRACT_OPINION_MARKET=<deployed-address>
```

## Monitoring & Logs

### View Logs
```bash
# Cloud Run logs
gcloud run services logs tail guessly-backend \
  --region=us-central1 \
  --project=guess-fun-2025-v1

# Cloud SQL logs
gcloud sql operations list \
  --instance=guessly-db \
  --project=guess-fun-2025-v1
```

### Check Service Status
```bash
# Cloud Run status
gcloud run services describe guessly-backend \
  --region=us-central1 \
  --platform=managed \
  --project=guess-fun-2025-v1

# Cloud SQL status
gcloud sql instances describe guessly-db \
  --project=guess-fun-2025-v1

# Redis status
gcloud redis instances describe guessly-redis \
  --region=us-central1 \
  --project=guess-fun-2025-v1
```

## Troubleshooting

### Cloud SQL Connection Issues
1. Verify Cloud SQL Proxy is running
2. Check connection name: `guess-fun-2025-v1:us-central1:guessly-db`
3. Verify database credentials
4. Check Cloud SQL instance is running

### Cloud Run Deployment Issues
1. Check logs: `gcloud run services logs tail guessly-backend --region=us-central1`
2. Verify environment variables are set correctly
3. Check Cloud SQL instance is added to Cloud Run service
4. Verify Docker image builds successfully

### Redis Connection Issues
1. Verify Redis instance is in the same VPC as Cloud Run
2. Check Redis IP address is correct
3. Ensure VPC connector is configured for Cloud Run

## Cost Optimization

### Development
- Cloud SQL: db-f1-micro (~$7/month)
- Redis: Basic 1GB (~$48/month)
- Cloud Run: Pay per use (~$0-5/month for low traffic)

### Production Recommendations
- Cloud SQL: Upgrade to db-custom with appropriate CPU/RAM
- Redis: Standard tier for high availability
- Cloud Run: Set minimum instances for zero cold starts
- Enable Cloud CDN for static assets

## Security Checklist

- [ ] Rotate default passwords
- [ ] Set up Cloud SQL SSL connections
- [ ] Configure Cloud Armor for DDoS protection
- [ ] Enable Cloud SQL automatic backups (already configured)
- [ ] Set up Secret Manager for sensitive credentials
- [ ] Configure IAM roles with least privilege
- [ ] Enable VPC Service Controls
- [ ] Set up Cloud Audit Logs

## Backup & Recovery

### Cloud SQL Backups
```bash
# Create on-demand backup
gcloud sql backups create \
  --instance=guessly-db \
  --project=guess-fun-2025-v1

# List backups
gcloud sql backups list \
  --instance=guessly-db \
  --project=guess-fun-2025-v1

# Restore from backup
gcloud sql backups restore BACKUP_ID \
  --backup-instance=guessly-db \
  --backup-project=guess-fun-2025-v1
```

## Scaling

### Cloud Run Auto-scaling
```bash
# Update Cloud Run with custom scaling
gcloud run services update guessly-backend \
  --region=us-central1 \
  --min-instances=1 \
  --max-instances=10 \
  --concurrency=80 \
  --cpu=1 \
  --memory=512Mi \
  --project=guess-fun-2025-v1
```

### Cloud SQL Scaling
```bash
# Upgrade instance tier
gcloud sql instances patch guessly-db \
  --tier=db-custom-2-7680 \
  --project=guess-fun-2025-v1
```

## Next Steps

1. ✅ Cloud SQL instance created
2. ✅ Redis instance created
3. ⏳ Run database migrations
4. ⏳ Deploy backend to Cloud Run
5. ⏳ Configure custom domain
6. ⏳ Set up CI/CD with Cloud Build
7. ⏳ Deploy smart contracts
8. ⏳ Configure monitoring and alerts
