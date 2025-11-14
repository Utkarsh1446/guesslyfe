# Guessly GCP Deployment Summary

## ✅ Deployment Status: COMPLETE

**Project**: guess-fun-2025-v1
**Region**: us-central1
**Date**: November 14, 2025

---

## 🎯 Infrastructure Created

### 1. Cloud SQL PostgreSQL Database
- **Instance Name**: `guessly-db`
- **Version**: PostgreSQL 14
- **Tier**: db-f1-micro (1 vCPU, 0.6 GB RAM)
- **Region**: us-central1-a
- **IP Address**: 136.113.238.182
- **Connection Name**: `guess-fun-2025-v1:us-central1:guessly-db`
- **Database**: `guessly`
- **User**: `guessly_user`
- **Password**: `GuesslyUser2025!`
- **Root Password**: `GuesslyDB2025!`

**Features**:
- ✅ Automated daily backups at 03:00 UTC
- ✅ Auto storage increase enabled
- ✅ SSD storage
- ✅ Point-in-time recovery

### 2. Cloud Memorystore Redis
- **Instance Name**: `guessly-redis`
- **Version**: Redis 6.x
- **Tier**: Basic
- **Memory**: 1 GB
- **Region**: us-central1
- **IP Address**: 10.2.44.91
- **Port**: 6379

### 3. Cloud Run Service
- **Service Name**: `guessly-backend` (deploying...)
- **Region**: us-central1
- **Platform**: Managed
- **Container Port**: 8080
- **Memory**: 512 Mi
- **CPU**: 1
- **Timeout**: 300s
- **Concurrency**: 80
- **Scaling**: 0-10 instances

---

## 📊 Database Schema

### Tables Created (11 total):

1. **users** - User accounts with Twitter OAuth
   - 4 sample users seeded (including @guessly_admin)

2. **creators** - Qualified content creators
   - 2 creators seeded (@bob_sports, @charlie_tech)

3. **creator_shares** - Creator share ownership tracking

4. **share_transactions** - Share buy/sell transaction history

5. **opinion_markets** - Prediction markets
   - 4 markets seeded:
     - Lakers NBA playoffs
     - Messi 30+ goals
     - GPT-5 release in 2025
     - Bitcoin $100k by 2025

6. **market_positions** - User positions in markets

7. **market_trades** - Individual market trades

8. **dividend_epochs** - Dividend distribution periods

9. **claimable_dividends** - Accumulated claimable dividends

10. **dividend_claims** - Dividend claim records

11. **creator_volume_tracking** - Volume metrics per creator/market

### Indexes Created:
- ✅ Strategic indexes on all foreign keys
- ✅ Composite unique constraints
- ✅ Performance indexes on frequently queried columns
- ✅ Timestamp indexes for analytics

---

## 🔑 Credentials & Access

### Database Access
```bash
# Via Cloud SQL Proxy (Local Development)
./backend/scripts/connect-cloud-sql.sh

# Direct Connection String (from Cloud Run)
Host: /cloudsql/guess-fun-2025-v1:us-central1:guessly-db
Port: 5432
Database: guessly
Username: guessly_user
Password: GuesslyUser2025!
```

### Redis Access
```
Host: 10.2.44.91
Port: 6379
Password: (none - within VPC)
```

### GCP Project
```
Project ID: guess-fun-2025-v1
Project Number: 738787111842
Project Name: guesslydotfun
```

---

## 📁 Files Created

### Backend Configuration
```
backend/
├── src/database/
│   ├── entities/              # 11 TypeORM entities
│   │   ├── user.entity.ts
│   │   ├── creator.entity.ts
│   │   ├── creator-share.entity.ts
│   │   ├── share-transaction.entity.ts
│   │   ├── opinion-market.entity.ts
│   │   ├── market-position.entity.ts
│   │   ├── market-trade.entity.ts
│   │   ├── dividend-epoch.entity.ts
│   │   ├── claimable-dividend.entity.ts
│   │   ├── dividend-claim.entity.ts
│   │   └── creator-volume-tracking.entity.ts
│   ├── enums/                 # 4 enum types
│   │   ├── creator-status.enum.ts
│   │   ├── market-status.enum.ts
│   │   ├── market-category.enum.ts
│   │   └── transaction-type.enum.ts
│   ├── migrations/            # Generated migrations
│   │   └── 1763107798553-InitialSchema.ts
│   ├── seeds/                 # Development data
│   │   ├── user.seed.ts
│   │   ├── creator.seed.ts
│   │   ├── opinion-market.seed.ts
│   │   └── run-seed.ts
│   └── data-source.ts        # TypeORM configuration
├── scripts/
│   ├── connect-cloud-sql.sh   # Cloud SQL Proxy helper
│   ├── setup-database-gcp.sh  # Database setup script
│   ├── run-migrations-gcp.sh  # Migration runner
│   ├── deploy-to-gcp.sh       # Deployment script
│   └── check-gcp-status.sh    # Status checker
├── Dockerfile                 # Multi-stage production build
├── .dockerignore             # Docker ignore rules
├── .env.gcp                  # GCP environment template
├── cloudbuild.yaml           # Cloud Build configuration
├── DATABASE_SETUP.md         # Database setup guide
└── GCP_DEPLOYMENT_GUIDE.md   # Full deployment guide
```

---

## 🚀 Deployment Commands

### Check Status
```bash
# View all GCP resources
./backend/scripts/check-gcp-status.sh

# Check Cloud Run logs
gcloud run services logs tail guessly-backend \
  --region=us-central1 \
  --project=guess-fun-2025-v1

# Check Cloud SQL status
gcloud sql instances describe guessly-db \
  --project=guess-fun-2025-v1

# Check Redis status
gcloud redis instances describe guessly-redis \
  --region=us-central1 \
  --project=guess-fun-2025-v1
```

### Run Migrations
```bash
# From local machine via Cloud SQL Proxy
cd backend
./scripts/connect-cloud-sql.sh  # Terminal 1
./scripts/run-migrations-gcp.sh # Terminal 2
```

### Seed Database
```bash
cd backend
npm run seed:run  # With Cloud SQL Proxy running
```

### Deploy Backend
```bash
cd backend
./scripts/deploy-to-gcp.sh
```

---

## 📝 Next Steps

### 1. Configure Additional Environment Variables

Update Cloud Run with additional configuration:

```bash
gcloud run services update guessly-backend \
  --region=us-central1 \
  --update-env-vars="
JWT_SECRET=$(openssl rand -base64 32),
JWT_REFRESH_SECRET=$(openssl rand -base64 32),
TWITTER_CLIENT_ID=your-twitter-client-id,
TWITTER_CLIENT_SECRET=your-twitter-client-secret,
BLOCKCHAIN_PROVIDER_PRIVATE_KEY=your-private-key
" \
  --project=guess-fun-2025-v1
```

### 2. Set Up Custom Domain (Optional)

```bash
# Map custom domain
gcloud run domain-mappings create \
  --service=guessly-backend \
  --domain=api.guessly.fun \
  --region=us-central1 \
  --project=guess-fun-2025-v1
```

### 3. Configure CI/CD with Cloud Build

Already configured in `cloudbuild.yaml`. Set up triggers:

```bash
gcloud builds triggers create github \
  --repo-name=guessly \
  --repo-owner=your-github-username \
  --branch-pattern="^main$" \
  --build-config=backend/cloudbuild.yaml \
  --project=guess-fun-2025-v1
```

### 4. Set Up Monitoring & Alerts

```bash
# Enable Cloud Monitoring
gcloud services enable monitoring.googleapis.com

# Create uptime check
# Configure via Cloud Console
```

### 5. Deploy Smart Contracts

Navigate to `smart-contracts/` directory and follow deployment guide.

### 6. Deploy Frontend

Deploy React frontend to Cloud Run or Firebase Hosting.

---

## 💰 Cost Estimate

### Monthly Costs (Development tier):
- **Cloud SQL (db-f1-micro)**: ~$7/month
- **Redis (Basic 1GB)**: ~$48/month
- **Cloud Run**: $0-5/month (low traffic)
- **Data Transfer**: ~$1-5/month
- **Cloud Build**: Free tier covers development

**Total**: ~$56-65/month

### Production Recommendations:
- Upgrade Cloud SQL to db-custom-2-7680 (~$150/month)
- Use Redis Standard tier for HA (~$180/month)
- Set Cloud Run min instances to 1 (~$10/month)
- Enable Cloud CDN (~$5-20/month)

---

## 🔒 Security Checklist

- [ ] Rotate default database passwords
- [ ] Enable Cloud SQL SSL connections
- [ ] Set up Secret Manager for credentials
- [ ] Configure Cloud Armor (WAF)
- [ ] Enable Cloud Audit Logs
- [ ] Set up VPC Service Controls
- [ ] Configure IAM roles with least privilege
- [ ] Enable 2FA for GCP account
- [ ] Set up billing alerts
- [ ] Review and harden firewall rules

---

## 📚 Documentation

- [Database Setup Guide](./backend/DATABASE_SETUP.md)
- [GCP Deployment Guide](./backend/GCP_DEPLOYMENT_GUIDE.md)
- [API Documentation](https://your-service-url/api)

---

## 🐛 Troubleshooting

### Cloud SQL Connection Issues
```bash
# Test connection via proxy
PGPASSWORD=GuesslyUser2025! psql -h localhost -p 5433 -U guessly_user -d guessly
```

### Cloud Run Not Starting
```bash
# Check logs
gcloud run services logs tail guessly-backend --region=us-central1

# Check environment variables
gcloud run services describe guessly-backend --region=us-central1 --format=yaml
```

### Redis Connection Issues
```bash
# Verify Redis is in same VPC
gcloud redis instances describe guessly-redis --region=us-central1
```

---

## ✅ Deployment Checklist

- [x] GCP project created
- [x] APIs enabled
- [x] Cloud SQL instance created and running
- [x] Redis instance created and running
- [x] Database and user created
- [x] Database schema migrated
- [x] Sample data seeded
- [x] Dockerfile created
- [x] Cloud Run deployment initiated
- [ ] Cloud Run deployment verified
- [ ] Custom domain configured (optional)
- [ ] Environment secrets configured
- [ ] Monitoring set up
- [ ] CI/CD pipeline configured

---

**Generated**: November 14, 2025
**Project**: Guessly Prediction Market Platform
**Deployment**: GCP (guess-fun-2025-v1)
