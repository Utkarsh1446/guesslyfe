# GCP Deployment Guide

Complete guide for deploying the GuessLyfe backend to Google Cloud Platform.

## Table of Contents

- [Overview](#overview)
- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
- [Manual Deployment](#manual-deployment)
- [Terraform Deployment](#terraform-deployment)
- [CI/CD with GitHub Actions](#cicd-with-github-actions)
- [Database Setup](#database-setup)
- [Secret Management](#secret-management)
- [Monitoring and Logging](#monitoring-and-logging)
- [Troubleshooting](#troubleshooting)

## Overview

The GuessLyfe backend deploys to GCP using:

- **Cloud Run**: Serverless container platform
- **Cloud SQL**: Managed PostgreSQL database
- **Memorystore**: Managed Redis cache
- **Secret Manager**: Secure secrets storage
- **Artifact Registry**: Container image storage
- **VPC Connector**: Private network access

### Architecture

```
┌─────────────┐
│   Internet  │
└──────┬──────┘
       │
   ┌───▼────┐
   │  CDN   │ (Optional)
   └───┬────┘
       │
┌──────▼──────────┐
│   Cloud Run     │ (API)
│  guessly-api    │
└──┬──┬───────┬───┘
   │  │       │
   │  │       └──────┐
   │  │              │
┌──▼──▼────┐   ┌────▼─────────┐
│ Cloud SQL │   │ Memorystore  │
│(PostgreSQL)│   │   (Redis)    │
└───────────┘   └──────────────┘
```

## Prerequisites

### Required Tools

- [gcloud CLI](https://cloud.google.com/sdk/docs/install) - GCP command-line tool
- [Docker](https://docs.docker.com/get-docker/) - For building images
- [Terraform](https://www.terraform.io/downloads) (optional) - For IaC
- [Node.js 18+](https://nodejs.org/) - For local testing

### GCP Account Setup

1. **Create GCP Project**
   ```bash
   gcloud projects create guessly-prod --name="GuessLyfe Production"
   ```

2. **Set Billing Account**
   ```bash
   gcloud beta billing projects link guessly-prod \
     --billing-account=YOUR_BILLING_ACCOUNT_ID
   ```

3. **Set Default Project**
   ```bash
   gcloud config set project guessly-prod
   ```

4. **Enable Required APIs** (automated in setup scripts)

### Local Setup

```bash
# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Edit with your configuration
nano .env
```

## Quick Start

### Option 1: Automated Setup (Recommended)

```bash
# 1. Set up infrastructure
cd deploy
./setup-infrastructure.sh YOUR_PROJECT_ID us-central1

# 2. Set up secrets
./setup-secrets.sh YOUR_PROJECT_ID

# 3. Build and deploy
cd ..
gcloud builds submit --config cloudbuild.yaml
```

### Option 2: Terraform (Infrastructure as Code)

```bash
# 1. Initialize Terraform
cd terraform
terraform init

# 2. Create terraform.tfvars
cp terraform.tfvars.example terraform.tfvars
nano terraform.tfvars

# 3. Deploy infrastructure
terraform plan
terraform apply

# 4. Set up secrets
cd ../deploy
./setup-secrets.sh YOUR_PROJECT_ID
```

## Manual Deployment

### Step 1: Enable APIs

```bash
gcloud services enable cloudbuild.googleapis.com
gcloud services enable run.googleapis.com
gcloud services enable sql-component.googleapis.com
gcloud services enable sqladmin.googleapis.com
gcloud services enable redis.googleapis.com
gcloud services enable vpcaccess.googleapis.com
gcloud services enable secretmanager.googleapis.com
gcloud services enable artifactregistry.googleapis.com
```

### Step 2: Create Service Account

```bash
# Create service account
gcloud iam service-accounts create guessly-api \
  --display-name="GuessLyfe API"

# Grant roles
gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
  --member="serviceAccount:guessly-api@YOUR_PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/cloudsql.client"

gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
  --member="serviceAccount:guessly-api@YOUR_PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

### Step 3: Create Artifact Registry Repository

```bash
gcloud artifacts repositories create guessly \
  --repository-format=docker \
  --location=us-central1 \
  --description="Docker images for GuessLyfe"
```

### Step 4: Create Cloud SQL Instance

```bash
# Create instance
gcloud sql instances create guessly-db \
  --database-version=POSTGRES_15 \
  --tier=db-custom-2-7680 \
  --region=us-central1 \
  --network=default \
  --no-assign-ip \
  --backup

# Create database
gcloud sql databases create guessly \
  --instance=guessly-db

# Create user (use a secure password)
gcloud sql users create guessly \
  --instance=guessly-db \
  --password=YOUR_SECURE_PASSWORD
```

### Step 5: Create VPC Connector

```bash
gcloud compute networks vpc-access connectors create guessly-connector \
  --region=us-central1 \
  --network=default \
  --range=10.8.0.0/28 \
  --min-instances=2 \
  --max-instances=10
```

### Step 6: Create Memorystore (Redis)

```bash
gcloud redis instances create guessly-redis \
  --size=1 \
  --region=us-central1 \
  --redis-version=redis_7_0 \
  --tier=BASIC
```

### Step 7: Configure Secrets

```bash
# Use the setup script
./deploy/setup-secrets.sh YOUR_PROJECT_ID

# Or manually create secrets
echo -n "your-jwt-secret" | gcloud secrets create jwt-secret --data-file=-
echo -n "your-db-password" | gcloud secrets create db-password --data-file=-
# ... repeat for all secrets
```

### Step 8: Build and Push Docker Image

```bash
# Configure Docker auth
gcloud auth configure-docker us-central1-docker.pkg.dev

# Build image
docker build -t us-central1-docker.pkg.dev/YOUR_PROJECT_ID/guessly/guessly-api:latest .

# Push image
docker push us-central1-docker.pkg.dev/YOUR_PROJECT_ID/guessly/guessly-api:latest
```

### Step 9: Deploy to Cloud Run

```bash
# Get Redis host
REDIS_HOST=$(gcloud redis instances describe guessly-redis \
  --region=us-central1 \
  --format="value(host)")

# Deploy
gcloud run deploy guessly-api \
  --image=us-central1-docker.pkg.dev/YOUR_PROJECT_ID/guessly/guessly-api:latest \
  --region=us-central1 \
  --platform=managed \
  --allow-unauthenticated \
  --min-instances=1 \
  --max-instances=10 \
  --memory=2Gi \
  --cpu=2 \
  --timeout=300 \
  --concurrency=80 \
  --port=3000 \
  --add-cloudsql-instances=YOUR_PROJECT_ID:us-central1:guessly-db \
  --vpc-connector=guessly-connector \
  --vpc-egress=private-ranges-only \
  --set-secrets=JWT_SECRET=jwt-secret:latest,JWT_REFRESH_SECRET=jwt-refresh-secret:latest,DB_PASSWORD=db-password:latest,BLOCKCHAIN_PROVIDER_PRIVATE_KEY=blockchain-private-key:latest,TWITTER_CLIENT_ID=twitter-client-id:latest,TWITTER_CLIENT_SECRET=twitter-client-secret:latest,TWITTER_BEARER_TOKEN=twitter-bearer-token:latest,SENDGRID_API_KEY=sendgrid-api-key:latest,SENTRY_DSN=sentry-dsn:latest \
  --update-env-vars=NODE_ENV=production,PORT=3000,DB_HOST=/cloudsql/YOUR_PROJECT_ID:us-central1:guessly-db,DB_USERNAME=guessly,DB_DATABASE=guessly,REDIS_HOST=$REDIS_HOST,REDIS_PORT=6379 \
  --service-account=guessly-api@YOUR_PROJECT_ID.iam.gserviceaccount.com
```

## Terraform Deployment

### Initialize

```bash
cd terraform
terraform init
```

### Configure Variables

```bash
cp terraform.tfvars.example terraform.tfvars
nano terraform.tfvars
```

Edit `terraform.tfvars`:

```hcl
project_id = "guessly-prod"
container_image = "us-central1-docker.pkg.dev/guessly-prod/guessly/guessly-api:latest"
db_password = "your-secure-password"
min_instances = 1
max_instances = 10
```

### Deploy

```bash
# Preview changes
terraform plan

# Apply changes
terraform apply

# View outputs
terraform output
```

### Update Deployment

```bash
# Update variables in terraform.tfvars
terraform apply
```

### Destroy (if needed)

```bash
terraform destroy
```

## CI/CD with GitHub Actions

### Setup

1. **Create GCP Service Account for GitHub Actions**

```bash
gcloud iam service-accounts create github-actions \
  --display-name="GitHub Actions"

# Grant necessary roles
gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
  --member="serviceAccount:github-actions@YOUR_PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/run.admin"

gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
  --member="serviceAccount:github-actions@YOUR_PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/storage.admin"

gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
  --member="serviceAccount:github-actions@YOUR_PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/artifactregistry.admin"

# Create key
gcloud iam service-accounts keys create key.json \
  --iam-account=github-actions@YOUR_PROJECT_ID.iam.gserviceaccount.com
```

2. **Add GitHub Secrets**

Go to GitHub repository → Settings → Secrets and variables → Actions

Add the following secrets:
- `GCP_PROJECT_ID`: Your GCP project ID
- `GCP_SA_KEY`: Content of `key.json` file
- `REDIS_HOST`: Redis instance host

3. **Push to Main Branch**

```bash
git push origin main
```

The GitHub Actions workflow will automatically:
- Run tests
- Build Docker image
- Push to Artifact Registry
- Deploy to Cloud Run
- Run health checks

## Database Setup

### Migrations

```bash
# Connect to Cloud SQL
gcloud sql connect guessly-db --user=guessly

# Run migrations (from local with Cloud SQL Proxy)
npm run migration:run
```

### Cloud SQL Proxy (Local Development)

```bash
# Download proxy
curl -o cloud-sql-proxy https://storage.googleapis.com/cloud-sql-connectors/cloud-sql-proxy/v2.8.0/cloud-sql-proxy.linux.amd64
chmod +x cloud-sql-proxy

# Run proxy
./cloud-sql-proxy YOUR_PROJECT_ID:us-central1:guessly-db

# Connect from another terminal
psql "host=127.0.0.1 port=5432 dbname=guessly user=guessly"
```

### Backups

Automated backups are enabled by default at 3:00 AM daily.

Manual backup:
```bash
gcloud sql backups create \
  --instance=guessly-db \
  --description="Manual backup before deployment"
```

## Secret Management

### List Secrets

```bash
gcloud secrets list --filter="labels.app=guessly"
```

### Update Secret

```bash
echo -n "new-secret-value" | gcloud secrets versions add SECRET_NAME --data-file=-
```

### View Secret

```bash
gcloud secrets versions access latest --secret=SECRET_NAME
```

### Required Secrets

- `jwt-secret`: JWT access token secret
- `jwt-refresh-secret`: JWT refresh token secret
- `db-password`: Database password
- `blockchain-private-key`: Blockchain private key
- `twitter-client-id`: Twitter OAuth client ID
- `twitter-client-secret`: Twitter OAuth client secret
- `twitter-bearer-token`: Twitter API bearer token
- `sendgrid-api-key`: SendGrid API key for emails
- `sentry-dsn`: Sentry error tracking DSN
- `admin-password`: Admin dashboard password

## Monitoring and Logging

### View Logs

```bash
# Cloud Run logs
gcloud run services logs read guessly-api --region=us-central1

# Follow logs
gcloud run services logs tail guessly-api --region=us-central1

# Filter logs
gcloud run services logs read guessly-api \
  --region=us-central1 \
  --filter='severity=ERROR'
```

### Metrics

View metrics in Cloud Console:
- https://console.cloud.google.com/run/detail/us-central1/guessly-api/metrics

### Alerts

Set up alerts in Cloud Monitoring:
- Error rate > 5%
- Response time > 1s (p95)
- Instance count

### Health Checks

```bash
# Get service URL
SERVICE_URL=$(gcloud run services describe guessly-api \
  --region=us-central1 \
  --format='value(status.url)')

# Check health
curl $SERVICE_URL/api/v1/health
```

## Troubleshooting

### Deployment Fails

```bash
# Check build logs
gcloud builds list --limit=5

# View specific build
gcloud builds log BUILD_ID
```

### Service Won't Start

```bash
# Check Cloud Run logs
gcloud run services logs read guessly-api --region=us-central1 --limit=50

# Check service status
gcloud run services describe guessly-api --region=us-central1
```

### Database Connection Issues

```bash
# Test Cloud SQL connection
gcloud sql connect guessly-db --user=guessly

# Check Cloud SQL status
gcloud sql instances describe guessly-db
```

### Redis Connection Issues

```bash
# Get Redis info
gcloud redis instances describe guessly-redis --region=us-central1

# Test from Cloud Shell (in same VPC)
redis-cli -h REDIS_HOST -p 6379 ping
```

### Permission Errors

```bash
# Check service account permissions
gcloud projects get-iam-policy YOUR_PROJECT_ID \
  --flatten="bindings[].members" \
  --filter="bindings.members:serviceAccount:guessly-api@YOUR_PROJECT_ID.iam.gserviceaccount.com"
```

## Cost Optimization

### Development Environment

```bash
# Use smaller instances
--min-instances=0 \
--max-instances=1 \
--memory=512Mi \
--cpu=1 \
--tier=db-f1-micro \  # For Cloud SQL
--size=1 \  # For Redis
```

### Production Environment

```bash
# Scale based on load
--min-instances=1 \
--max-instances=100 \
--memory=2Gi \
--cpu=2 \
--tier=db-custom-4-15360 \  # For Cloud SQL
--tier=STANDARD_HA \  # For Redis
```

## Security Best Practices

1. **Use Secret Manager** for all sensitive data
2. **Enable VPC** for private network access
3. **Disable public IPs** for Cloud SQL
4. **Use least privilege** IAM roles
5. **Enable audit logs**
6. **Regular security updates**
7. **Enable Cloud Armor** for DDoS protection

## Next Steps

1. Set up custom domain
2. Configure Cloud CDN
3. Enable Cloud Armor
4. Set up monitoring alerts
5. Configure backups and disaster recovery
6. Performance testing and optimization
7. Security audit

## Resources

- [Cloud Run Documentation](https://cloud.google.com/run/docs)
- [Cloud SQL Documentation](https://cloud.google.com/sql/docs)
- [Memorystore Documentation](https://cloud.google.com/memorystore/docs)
- [Secret Manager Documentation](https://cloud.google.com/secret-manager/docs)
- [Terraform GCP Provider](https://registry.terraform.io/providers/hashicorp/google/latest/docs)

## Support

For issues or questions:
- GitHub Issues: https://github.com/guesslyfe/backend/issues
- Email: support@guesslyfe.com
