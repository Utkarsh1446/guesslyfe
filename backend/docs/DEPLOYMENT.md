# Production Deployment Guide

Complete step-by-step guide for deploying GuessLyfe to production on Google Cloud Platform.

## Table of Contents

- [Pre-Deployment Checklist](#pre-deployment-checklist)
- [Architecture Overview](#architecture-overview)
- [Prerequisites](#prerequisites)
- [GCP Project Setup](#gcp-project-setup)
- [Database Setup](#database-setup)
- [Redis Setup](#redis-setup)
- [Secret Management](#secret-management)
- [Container Build and Registry](#container-build-and-registry)
- [Cloud Run Deployment](#cloud-run-deployment)
- [Load Balancer and SSL](#load-balancer-and-ssl)
- [Monitoring and Alerting](#monitoring-and-alerting)
- [Database Migrations](#database-migrations)
- [Post-Deployment Verification](#post-deployment-verification)
- [Scaling Configuration](#scaling-configuration)
- [Rollback Procedures](#rollback-procedures)
- [Cost Optimization](#cost-optimization)

---

## Pre-Deployment Checklist

Before deploying to production, ensure all items are completed:

### Code Quality
- [ ] All tests pass (`npm run test`, `npm run test:e2e`)
- [ ] Code coverage >90% (`npm run test:cov`)
- [ ] No security vulnerabilities (`npm audit`, `snyk test`)
- [ ] TypeScript compiles without errors (`npm run build`)
- [ ] ESLint passes (`npm run lint`)
- [ ] Code reviewed and approved

### Configuration
- [ ] Environment variables documented in `.env.production.example`
- [ ] Production secrets generated (JWT keys, API keys)
- [ ] Admin wallet addresses configured
- [ ] CORS origins configured
- [ ] Rate limits configured for production
- [ ] Database connection pool sized appropriately

### Infrastructure
- [ ] GCP project created and configured
- [ ] Domain name registered and DNS configured
- [ ] SSL certificate obtained
- [ ] Database provisioned (Cloud SQL)
- [ ] Redis provisioned (Memorystore)
- [ ] Container registry set up (Artifact Registry)
- [ ] Service accounts created with appropriate permissions

### Monitoring
- [ ] GCP monitoring enabled
- [ ] Alert policies configured
- [ ] Uptime checks configured
- [ ] Error tracking set up (Sentry/GCP Error Reporting)
- [ ] Logging configured (Cloud Logging)
- [ ] Dashboard created

### Security
- [ ] Security headers enabled
- [ ] CSP policy configured
- [ ] Rate limiting enabled
- [ ] WAF rules configured (Cloud Armor)
- [ ] DDoS protection enabled
- [ ] Secrets stored securely (Secret Manager)
- [ ] Least privilege IAM roles assigned

### Blockchain
- [ ] Smart contracts deployed to mainnet
- [ ] Contract addresses configured
- [ ] RPC endpoints configured (production)
- [ ] Blockchain monitoring enabled
- [ ] Gas price alerts configured

### Documentation
- [ ] README.md updated
- [ ] API documentation complete (Swagger)
- [ ] Runbook created (RUNBOOK.md)
- [ ] Migration guide created
- [ ] Architecture diagram updated

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        Internet                                  │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         │ HTTPS (443)
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                   Cloud Load Balancer                            │
│              (SSL Termination + CDN)                             │
└────────────────────────┬────────────────────────────────────────┘
                         │
        ┌────────────────┼────────────────┐
        │                │                │
        ▼                ▼                ▼
┌─────────────┐  ┌─────────────┐  ┌─────────────┐
│  Cloud Run  │  │  Cloud Run  │  │  Cloud Run  │
│  Instance 1 │  │  Instance 2 │  │  Instance 3 │
│  (NestJS)   │  │  (NestJS)   │  │  (NestJS)   │
└──────┬──────┘  └──────┬──────┘  └──────┬──────┘
       │                │                │
       └────────────────┼────────────────┘
                        │
        ┌───────────────┼───────────────┐
        │               │               │
        ▼               ▼               ▼
┌─────────────┐  ┌─────────────┐  ┌─────────────┐
│  Cloud SQL  │  │ Memorystore │  │   Secret    │
│ (PostgreSQL)│  │   (Redis)   │  │   Manager   │
└─────────────┘  └─────────────┘  └─────────────┘
        │
        │
        ▼
┌─────────────────────────────────────────────────────────────────┐
│                   Cloud Monitoring & Logging                     │
│              (Metrics, Logs, Traces, Alerts)                     │
└─────────────────────────────────────────────────────────────────┘
```

---

## Prerequisites

### Local Tools

```bash
# Install gcloud CLI
curl https://sdk.cloud.google.com | bash
exec -l $SHELL

# Install Docker
# macOS:
brew install docker
# Ubuntu:
sudo apt-get update
sudo apt-get install docker.io

# Install kubectl
gcloud components install kubectl

# Install Cloud SQL Proxy (for database migrations)
curl -o cloud-sql-proxy https://storage.googleapis.com/cloud-sql-connectors/cloud-sql-proxy/v2.7.0/cloud-sql-proxy.darwin.amd64
chmod +x cloud-sql-proxy
sudo mv cloud-sql-proxy /usr/local/bin/
```

### GCP Permissions

Ensure you have the following IAM roles:
- `roles/run.admin` - Cloud Run administration
- `roles/sql.admin` - Cloud SQL administration
- `roles/redis.admin` - Redis administration
- `roles/secretmanager.admin` - Secret Manager administration
- `roles/artifactregistry.admin` - Artifact Registry administration
- `roles/iam.serviceAccountAdmin` - Service account management
- `roles/monitoring.admin` - Monitoring configuration

---

## GCP Project Setup

### 1. Create GCP Project

```bash
# Set project variables
export PROJECT_ID="guesslyfe-prod"
export REGION="us-central1"
export ZONE="us-central1-a"

# Create project
gcloud projects create $PROJECT_ID --name="GuessLyfe Production"

# Set as active project
gcloud config set project $PROJECT_ID

# Link billing account (replace with your billing account ID)
export BILLING_ACCOUNT_ID="YOUR-BILLING-ACCOUNT-ID"
gcloud billing projects link $PROJECT_ID --billing-account=$BILLING_ACCOUNT_ID
```

### 2. Enable Required APIs

```bash
# Enable all required GCP APIs
gcloud services enable \
  run.googleapis.com \
  sql-component.googleapis.com \
  sqladmin.googleapis.com \
  redis.googleapis.com \
  secretmanager.googleapis.com \
  artifactregistry.googleapis.com \
  compute.googleapis.com \
  monitoring.googleapis.com \
  logging.googleapis.com \
  cloudtrace.googleapis.com \
  clouderrorreporting.googleapis.com \
  cloudprofiler.googleapis.com \
  servicenetworking.googleapis.com \
  vpcaccess.googleapis.com
```

### 3. Create Service Account

```bash
# Create service account for Cloud Run
export SERVICE_ACCOUNT_NAME="guesslyfe-api"
export SERVICE_ACCOUNT_EMAIL="${SERVICE_ACCOUNT_NAME}@${PROJECT_ID}.iam.gserviceaccount.com"

gcloud iam service-accounts create $SERVICE_ACCOUNT_NAME \
  --display-name="GuessLyfe API Service Account"

# Grant necessary roles
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:${SERVICE_ACCOUNT_EMAIL}" \
  --role="roles/cloudsql.client"

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:${SERVICE_ACCOUNT_EMAIL}" \
  --role="roles/secretmanager.secretAccessor"

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:${SERVICE_ACCOUNT_EMAIL}" \
  --role="roles/monitoring.metricWriter"

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:${SERVICE_ACCOUNT_EMAIL}" \
  --role="roles/logging.logWriter"
```

---

## Database Setup

### 1. Create Cloud SQL Instance

```bash
# Set database variables
export DB_INSTANCE_NAME="guesslyfe-db"
export DB_NAME="guesslyfe_production"
export DB_USER="guesslyfe_api"

# Generate strong database password
export DB_PASSWORD=$(openssl rand -base64 32 | tr -d '\n')

# Create Cloud SQL PostgreSQL instance
gcloud sql instances create $DB_INSTANCE_NAME \
  --database-version=POSTGRES_15 \
  --tier=db-custom-2-7680 \
  --region=$REGION \
  --network=default \
  --availability-type=REGIONAL \
  --backup \
  --backup-start-time=03:00 \
  --maintenance-window-day=SUN \
  --maintenance-window-hour=04 \
  --database-flags=max_connections=200

# Create database
gcloud sql databases create $DB_NAME \
  --instance=$DB_INSTANCE_NAME

# Create user
gcloud sql users create $DB_USER \
  --instance=$DB_INSTANCE_NAME \
  --password=$DB_PASSWORD

# Get connection name
export DB_CONNECTION_NAME=$(gcloud sql instances describe $DB_INSTANCE_NAME \
  --format='value(connectionName)')

echo "Database Connection Name: $DB_CONNECTION_NAME"
echo "Database Password: $DB_PASSWORD"
echo "IMPORTANT: Save these values securely!"
```

### 2. Configure Database Connection

```bash
# Store database password in Secret Manager
echo -n "$DB_PASSWORD" | gcloud secrets create db-password \
  --data-file=- \
  --replication-policy="automatic"

# Grant Cloud Run service account access
gcloud secrets add-iam-policy-binding db-password \
  --member="serviceAccount:${SERVICE_ACCOUNT_EMAIL}" \
  --role="roles/secretmanager.secretAccessor"
```

### 3. Enable Private IP (Recommended)

```bash
# Allocate IP range for VPC peering
gcloud compute addresses create google-managed-services-default \
  --global \
  --purpose=VPC_PEERING \
  --prefix-length=16 \
  --network=default

# Create VPC peering
gcloud services vpc-peerings connect \
  --service=servicenetworking.googleapis.com \
  --ranges=google-managed-services-default \
  --network=default

# Update Cloud SQL instance to use private IP
gcloud sql instances patch $DB_INSTANCE_NAME \
  --network=default \
  --no-assign-ip
```

### 4. Create VPC Connector (for Cloud Run to access private services)

```bash
# Create VPC connector
gcloud compute networks vpc-access connectors create guesslyfe-connector \
  --region=$REGION \
  --network=default \
  --range=10.8.0.0/28 \
  --min-instances=2 \
  --max-instances=10
```

---

## Redis Setup

### 1. Create Memorystore Instance

```bash
# Create Redis instance
gcloud redis instances create guesslyfe-redis \
  --size=5 \
  --region=$REGION \
  --redis-version=redis_7_0 \
  --tier=STANDARD_HA \
  --network=default

# Get Redis host and port
export REDIS_HOST=$(gcloud redis instances describe guesslyfe-redis \
  --region=$REGION \
  --format='value(host)')

export REDIS_PORT=$(gcloud redis instances describe guesslyfe-redis \
  --region=$REGION \
  --format='value(port)')

echo "Redis Host: $REDIS_HOST"
echo "Redis Port: $REDIS_PORT"
```

---

## Secret Management

### 1. Generate Production Secrets

```bash
# Generate JWT secrets
export JWT_SECRET=$(openssl rand -base64 64 | tr -d '\n')
export JWT_REFRESH_SECRET=$(openssl rand -base64 64 | tr -d '\n')

# Generate encryption key
export ENCRYPTION_KEY=$(openssl rand -base64 32 | tr -d '\n')

# Generate session secret
export SESSION_SECRET=$(openssl rand -base64 32 | tr -d '\n')
```

### 2. Store Secrets in Secret Manager

```bash
# JWT Secret
echo -n "$JWT_SECRET" | gcloud secrets create jwt-secret \
  --data-file=- \
  --replication-policy="automatic"

# JWT Refresh Secret
echo -n "$JWT_REFRESH_SECRET" | gcloud secrets create jwt-refresh-secret \
  --data-file=- \
  --replication-policy="automatic"

# Encryption Key
echo -n "$ENCRYPTION_KEY" | gcloud secrets create encryption-key \
  --data-file=- \
  --replication-policy="automatic"

# Session Secret
echo -n "$SESSION_SECRET" | gcloud secrets create session-secret \
  --data-file=- \
  --replication-policy="automatic"

# Blockchain Private Key (if needed)
# IMPORTANT: Use a dedicated wallet for the API, never use personal wallets
read -s -p "Enter Blockchain Provider Private Key: " BLOCKCHAIN_PRIVATE_KEY
echo
echo -n "$BLOCKCHAIN_PRIVATE_KEY" | gcloud secrets create blockchain-private-key \
  --data-file=- \
  --replication-policy="automatic"

# Grant access to all secrets
for secret in jwt-secret jwt-refresh-secret encryption-key session-secret blockchain-private-key db-password
do
  gcloud secrets add-iam-policy-binding $secret \
    --member="serviceAccount:${SERVICE_ACCOUNT_EMAIL}" \
    --role="roles/secretmanager.secretAccessor"
done
```

---

## Container Build and Registry

### 1. Create Artifact Registry Repository

```bash
# Create Docker repository
gcloud artifacts repositories create guesslyfe-repo \
  --repository-format=docker \
  --location=$REGION \
  --description="GuessLyfe Docker images"

# Configure Docker authentication
gcloud auth configure-docker ${REGION}-docker.pkg.dev
```

### 2. Build and Push Container

```bash
# Set image variables
export IMAGE_NAME="guesslyfe-api"
export IMAGE_TAG="v1.0.0"
export IMAGE_URL="${REGION}-docker.pkg.dev/${PROJECT_ID}/guesslyfe-repo/${IMAGE_NAME}:${IMAGE_TAG}"

# Build Docker image
docker build -t $IMAGE_URL \
  --platform linux/amd64 \
  -f Dockerfile.production \
  .

# Push to Artifact Registry
docker push $IMAGE_URL

# Tag as latest
docker tag $IMAGE_URL "${REGION}-docker.pkg.dev/${PROJECT_ID}/guesslyfe-repo/${IMAGE_NAME}:latest"
docker push "${REGION}-docker.pkg.dev/${PROJECT_ID}/guesslyfe-repo/${IMAGE_NAME}:latest"
```

### 3. Create Production Dockerfile

Create `Dockerfile.production`:

```dockerfile
# Multi-stage build for production
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig*.json ./

# Install dependencies (including dev dependencies for build)
RUN npm ci

# Copy source code
COPY src ./src

# Build application
RUN npm run build

# Production stage
FROM node:18-alpine

WORKDIR /app

# Install only production dependencies
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

# Copy built application from builder
COPY --from=builder /app/dist ./dist

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nestjs -u 1001

# Change ownership
RUN chown -R nestjs:nodejs /app

# Switch to non-root user
USER nestjs

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start application
CMD ["node", "dist/main.js"]
```

---

## Cloud Run Deployment

### 1. Create Environment Configuration

Create `.env.production`:

```bash
# Application
NODE_ENV=production
PORT=3000
API_URL=https://api.guesslyfe.com
FRONTEND_URL=https://guesslyfe.com

# Database (will be overridden by secrets)
DB_HOST=/cloudsql/$DB_CONNECTION_NAME
DB_PORT=5432
DB_NAME=$DB_NAME
DB_USERNAME=$DB_USER
DB_LOGGING=false
DB_SSL=true
DB_POOL_MIN=2
DB_POOL_MAX=10

# Redis
REDIS_HOST=$REDIS_HOST
REDIS_PORT=$REDIS_PORT
REDIS_DB=0
REDIS_TTL=3600

# Security
CORS_ALLOWED_ORIGINS=https://guesslyfe.com,https://www.guesslyfe.com
SECURITY_HEADERS_ENABLED=true
CSP_ENABLED=true

# Rate Limiting
RATE_LIMIT_ENABLED=true
RATE_LIMIT_GLOBAL_LIMIT=100
RATE_LIMIT_GLOBAL_WINDOW_MS=900000

# Monitoring
GCP_LOGGING_ENABLED=true
GCP_MONITORING_ENABLED=true
GCP_TRACING_ENABLED=true
LOG_LEVEL=info

# Blockchain
BLOCKCHAIN_NETWORK=baseMainnet
BLOCKCHAIN_RPC_URL=https://mainnet.base.org

# Features
SWAGGER_ENABLED=false
```

### 2. Deploy to Cloud Run

```bash
# Deploy Cloud Run service
gcloud run deploy guesslyfe-api \
  --image=$IMAGE_URL \
  --platform=managed \
  --region=$REGION \
  --service-account=$SERVICE_ACCOUNT_EMAIL \
  --vpc-connector=guesslyfe-connector \
  --vpc-egress=all-traffic \
  --add-cloudsql-instances=$DB_CONNECTION_NAME \
  --set-env-vars="NODE_ENV=production,PORT=3000,DB_HOST=/cloudsql/$DB_CONNECTION_NAME,DB_NAME=$DB_NAME,DB_USERNAME=$DB_USER,REDIS_HOST=$REDIS_HOST,REDIS_PORT=$REDIS_PORT" \
  --set-secrets="DB_PASSWORD=db-password:latest,JWT_SECRET=jwt-secret:latest,JWT_REFRESH_SECRET=jwt-refresh-secret:latest,ENCRYPTION_KEY=encryption-key:latest,BLOCKCHAIN_PROVIDER_PRIVATE_KEY=blockchain-private-key:latest" \
  --allow-unauthenticated \
  --memory=2Gi \
  --cpu=2 \
  --min-instances=1 \
  --max-instances=10 \
  --concurrency=80 \
  --timeout=300 \
  --port=3000

# Get Cloud Run URL
export CLOUD_RUN_URL=$(gcloud run services describe guesslyfe-api \
  --region=$REGION \
  --format='value(status.url)')

echo "Cloud Run URL: $CLOUD_RUN_URL"
```

### 3. Configure Auto-Scaling

```bash
# Update scaling configuration
gcloud run services update guesslyfe-api \
  --region=$REGION \
  --min-instances=2 \
  --max-instances=20 \
  --cpu-throttling \
  --execution-environment=gen2
```

---

## Load Balancer and SSL

### 1. Reserve Static IP

```bash
# Reserve global static IP
gcloud compute addresses create guesslyfe-ip \
  --global \
  --ip-version=IPV4

# Get IP address
export STATIC_IP=$(gcloud compute addresses describe guesslyfe-ip \
  --global \
  --format='value(address)')

echo "Static IP: $STATIC_IP"
echo "Configure your DNS A record to point to: $STATIC_IP"
```

### 2. Create Network Endpoint Group

```bash
# Create serverless NEG for Cloud Run
gcloud compute network-endpoint-groups create guesslyfe-neg \
  --region=$REGION \
  --network-endpoint-type=serverless \
  --cloud-run-service=guesslyfe-api
```

### 3. Create Backend Service

```bash
# Create backend service
gcloud compute backend-services create guesslyfe-backend \
  --global \
  --enable-cdn \
  --cache-mode=CACHE_ALL_STATIC

# Add NEG to backend service
gcloud compute backend-services add-backend guesslyfe-backend \
  --global \
  --network-endpoint-group=guesslyfe-neg \
  --network-endpoint-group-region=$REGION
```

### 4. Create URL Map

```bash
# Create URL map
gcloud compute url-maps create guesslyfe-urlmap \
  --default-service=guesslyfe-backend
```

### 5. Obtain SSL Certificate

**Option A: Google-Managed SSL Certificate (Recommended)**

```bash
# Create managed SSL certificate
gcloud compute ssl-certificates create guesslyfe-ssl \
  --domains=api.guesslyfe.com \
  --global

# Note: DNS must be configured before certificate provisioning
```

**Option B: Upload Custom SSL Certificate**

```bash
# Upload your own certificate
gcloud compute ssl-certificates create guesslyfe-ssl \
  --certificate=/path/to/cert.pem \
  --private-key=/path/to/key.pem \
  --global
```

### 6. Create HTTPS Load Balancer

```bash
# Create target HTTPS proxy
gcloud compute target-https-proxies create guesslyfe-https-proxy \
  --ssl-certificates=guesslyfe-ssl \
  --url-map=guesslyfe-urlmap

# Create forwarding rule
gcloud compute forwarding-rules create guesslyfe-https-rule \
  --global \
  --target-https-proxy=guesslyfe-https-proxy \
  --address=guesslyfe-ip \
  --ports=443

# Create HTTP to HTTPS redirect
gcloud compute url-maps import guesslyfe-urlmap \
  --global \
  --source=/dev/stdin <<EOF
name: guesslyfe-urlmap
defaultService: https://www.googleapis.com/compute/v1/projects/$PROJECT_ID/global/backendServices/guesslyfe-backend
hostRules:
- hosts:
  - api.guesslyfe.com
  pathMatcher: path-matcher-1
pathMatchers:
- name: path-matcher-1
  defaultService: https://www.googleapis.com/compute/v1/projects/$PROJECT_ID/global/backendServices/guesslyfe-backend
EOF
```

### 7. Configure DNS

Add the following DNS records:

```
A     api.guesslyfe.com    $STATIC_IP
AAAA  api.guesslyfe.com    (IPv6 if needed)
```

Wait for DNS propagation (can take up to 48 hours, usually much faster).

### 8. Verify SSL Certificate Provisioning

```bash
# Check certificate status
gcloud compute ssl-certificates describe guesslyfe-ssl \
  --global \
  --format='value(managed.status)'

# Should show "ACTIVE" when ready
```

---

## Monitoring and Alerting

### 1. Apply Alert Policies

```bash
# Import alert policies from configuration
gcloud alpha monitoring policies create --policy-from-file=deploy/gcp-alerts.yaml
```

### 2. Create Uptime Check

```bash
# Create uptime check
gcloud monitoring uptime create guesslyfe-health-check \
  --resource-type=url \
  --host=api.guesslyfe.com \
  --path=/health \
  --check-interval=60s \
  --timeout=10s
```

### 3. Import Dashboard

```bash
# Import monitoring dashboard
gcloud monitoring dashboards create --config-from-file=deploy/gcp-dashboard.json
```

### 4. Configure Log-Based Metrics

```bash
# Create log-based metric for 5xx errors
gcloud logging metrics create api_5xx_errors \
  --description="API 5xx Errors" \
  --log-filter='resource.type="cloud_run_revision"
httpRequest.status>=500'

# Create log-based metric for slow requests
gcloud logging metrics create api_slow_requests \
  --description="API Slow Requests" \
  --log-filter='resource.type="cloud_run_revision"
httpRequest.latency>"2s"' \
  --value-extractor='EXTRACT(httpRequest.latency)'
```

---

## Database Migrations

### 1. Connect to Cloud SQL

```bash
# Start Cloud SQL Proxy
cloud-sql-proxy $DB_CONNECTION_NAME &

# Set connection environment variables
export DATABASE_URL="postgresql://${DB_USER}:${DB_PASSWORD}@127.0.0.1:5432/${DB_NAME}"
```

### 2. Run Migrations

```bash
# Run TypeORM migrations
npm run migration:run

# Or run SQL migrations directly
psql $DATABASE_URL -f migrations/001-initial-schema.sql
psql $DATABASE_URL -f migrations/002-add-indexes.sql
```

### 3. Verify Migration

```bash
# Connect to database
psql $DATABASE_URL

# Check tables
\dt

# Check indexes
\di

# Exit
\q
```

### 4. Create Backup Before Migration

```bash
# Create on-demand backup
gcloud sql backups create \
  --instance=$DB_INSTANCE_NAME \
  --description="Pre-deployment backup $(date +%Y-%m-%d)"

# List backups
gcloud sql backups list --instance=$DB_INSTANCE_NAME
```

---

## Post-Deployment Verification

### 1. Health Check

```bash
# Check basic health
curl https://api.guesslyfe.com/health

# Expected response:
# {"status":"ok","timestamp":"...","uptime":123}

# Check detailed health
curl https://api.guesslyfe.com/health/detailed

# Expected response:
# {"status":"healthy","components":{"database":"healthy",...}}
```

### 2. API Tests

```bash
# Test public endpoints
curl https://api.guesslyfe.com/markets

# Test authentication
TOKEN=$(curl -X POST https://api.guesslyfe.com/auth/login \
  -H "Content-Type: application/json" \
  -d '{"address":"0x...","signature":"0x..."}' \
  | jq -r '.accessToken')

curl https://api.guesslyfe.com/users/me \
  -H "Authorization: Bearer $TOKEN"
```

### 3. WebSocket Test

```javascript
// Test WebSocket connection
const io = require('socket.io-client');
const socket = io('wss://api.guesslyfe.com', {
  auth: { token: 'YOUR_JWT_TOKEN' }
});

socket.on('connect', () => {
  console.log('Connected!');
  socket.emit('subscribe', { room: 'global', id: 'all' });
});

socket.on('connect_error', (err) => {
  console.error('Connection error:', err);
});
```

### 4. Monitor Logs

```bash
# Stream Cloud Run logs
gcloud run services logs tail guesslyfe-api \
  --region=$REGION

# View error logs only
gcloud logging read "resource.type=cloud_run_revision AND severity>=ERROR" \
  --limit=50 \
  --format=json
```

### 5. Check Metrics

```bash
# View request count
gcloud monitoring time-series list \
  --filter='metric.type="run.googleapis.com/request_count"' \
  --format=json

# View request latencies
gcloud monitoring time-series list \
  --filter='metric.type="run.googleapis.com/request_latencies"' \
  --format=json
```

---

## Scaling Configuration

### CPU-Based Auto-Scaling

```bash
# Update Cloud Run service with CPU-based scaling
gcloud run services update guesslyfe-api \
  --region=$REGION \
  --cpu=2 \
  --memory=2Gi \
  --concurrency=80 \
  --min-instances=2 \
  --max-instances=20
```

### Request-Based Auto-Scaling

Cloud Run automatically scales based on:
- Request rate (new instance when current instances at 80% concurrency)
- CPU utilization
- Memory utilization

### Database Scaling

```bash
# Scale up Cloud SQL instance
gcloud sql instances patch $DB_INSTANCE_NAME \
  --tier=db-custom-4-15360

# Increase connection pool in application
# Update environment variable: DB_POOL_MAX=20
```

### Redis Scaling

```bash
# Scale up Redis instance
gcloud redis instances update guesslyfe-redis \
  --size=10 \
  --region=$REGION
```

---

## Rollback Procedures

### Quick Rollback (Previous Version)

```bash
# List revisions
gcloud run revisions list --service=guesslyfe-api --region=$REGION

# Rollback to previous revision
gcloud run services update-traffic guesslyfe-api \
  --region=$REGION \
  --to-revisions=PREVIOUS_REVISION=100
```

### Rollback to Specific Version

```bash
# Deploy specific image version
export ROLLBACK_IMAGE_TAG="v0.9.0"
export ROLLBACK_IMAGE_URL="${REGION}-docker.pkg.dev/${PROJECT_ID}/guesslyfe-repo/${IMAGE_NAME}:${ROLLBACK_IMAGE_TAG}"

gcloud run deploy guesslyfe-api \
  --image=$ROLLBACK_IMAGE_URL \
  --region=$REGION
```

### Database Rollback

```bash
# List backups
gcloud sql backups list --instance=$DB_INSTANCE_NAME

# Restore from backup
export BACKUP_ID="1234567890"

# Create new instance from backup (safer than in-place restore)
gcloud sql instances clone $DB_INSTANCE_NAME ${DB_INSTANCE_NAME}-restored \
  --backup-id=$BACKUP_ID

# Update Cloud Run to use restored instance
# Then delete old instance after verification
```

### Emergency Stop

```bash
# Scale to zero instances (stops serving traffic)
gcloud run services update guesslyfe-api \
  --region=$REGION \
  --min-instances=0 \
  --max-instances=0

# Or delete the Cloud Run service entirely
gcloud run services delete guesslyfe-api --region=$REGION
```

---

## Cost Optimization

### Estimated Monthly Costs

```
Cloud Run (2-10 instances):        $150-400
Cloud SQL (db-custom-2-7680):      $280
Memorystore Redis (5GB Standard): $180
Cloud Storage (100GB):              $2
Cloud Load Balancer:                $20
Networking (1TB egress):           $120
Monitoring & Logging:               $50
Total:                             $802-1,052/month
```

### Cost Optimization Tips

1. **Use Minimum Instances Wisely**
   ```bash
   # Use min-instances=1 during low traffic periods
   gcloud run services update guesslyfe-api \
     --min-instances=1 \
     --max-instances=10
   ```

2. **Enable Cloud CDN**
   - Already enabled on load balancer
   - Caches static responses (reduces Cloud Run requests)

3. **Optimize Database**
   ```bash
   # Use smaller tier during development
   gcloud sql instances patch $DB_INSTANCE_NAME --tier=db-f1-micro

   # Use single zone for non-critical environments
   gcloud sql instances patch $DB_INSTANCE_NAME --availability-type=ZONAL
   ```

4. **Set Log Retention**
   ```bash
   # Reduce log retention to 30 days
   gcloud logging buckets update _Default \
     --location=global \
     --retention-days=30
   ```

5. **Use Committed Use Discounts**
   - Purchase 1-year or 3-year commitments for Cloud SQL and Memorystore
   - Save up to 57% on compute resources

6. **Monitor Costs**
   ```bash
   # Set budget alert
   gcloud billing budgets create \
     --billing-account=$BILLING_ACCOUNT_ID \
     --display-name="GuessLyfe Monthly Budget" \
     --budget-amount=1000USD \
     --threshold-rule=percent=90 \
     --threshold-rule=percent=100
   ```

---

## Continuous Deployment

### GitHub Actions Workflow

Create `.github/workflows/deploy-production.yml`:

```yaml
name: Deploy to Production

on:
  push:
    branches: [main]
    tags: ['v*']

env:
  PROJECT_ID: guesslyfe-prod
  REGION: us-central1
  SERVICE_NAME: guesslyfe-api

jobs:
  deploy:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - name: Authenticate to Google Cloud
        uses: google-github-actions/auth@v1
        with:
          credentials_json: ${{ secrets.GCP_SA_KEY }}

      - name: Set up Cloud SDK
        uses: google-github-actions/setup-gcloud@v1

      - name: Configure Docker
        run: gcloud auth configure-docker ${{ env.REGION }}-docker.pkg.dev

      - name: Build and Push Image
        run: |
          IMAGE_TAG=${GITHUB_SHA::8}
          IMAGE_URL="${{ env.REGION }}-docker.pkg.dev/${{ env.PROJECT_ID }}/guesslyfe-repo/${{ env.SERVICE_NAME }}:${IMAGE_TAG}"

          docker build -t $IMAGE_URL -f Dockerfile.production .
          docker push $IMAGE_URL

          # Tag as latest
          docker tag $IMAGE_URL "${{ env.REGION }}-docker.pkg.dev/${{ env.PROJECT_ID }}/guesslyfe-repo/${{ env.SERVICE_NAME }}:latest"
          docker push "${{ env.REGION }}-docker.pkg.dev/${{ env.PROJECT_ID }}/guesslyfe-repo/${{ env.SERVICE_NAME }}:latest"

          echo "IMAGE_URL=$IMAGE_URL" >> $GITHUB_ENV

      - name: Deploy to Cloud Run
        run: |
          gcloud run deploy ${{ env.SERVICE_NAME }} \
            --image=${{ env.IMAGE_URL }} \
            --region=${{ env.REGION }} \
            --platform=managed

      - name: Run Smoke Tests
        run: |
          SERVICE_URL=$(gcloud run services describe ${{ env.SERVICE_NAME }} \
            --region=${{ env.REGION }} \
            --format='value(status.url)')

          # Health check
          curl -f $SERVICE_URL/health || exit 1

          # API test
          curl -f $SERVICE_URL/markets || exit 1
```

---

## Security Hardening

### Cloud Armor (WAF)

```bash
# Create Cloud Armor security policy
gcloud compute security-policies create guesslyfe-waf \
  --description="WAF for GuessLyfe API"

# Add rate limiting rule
gcloud compute security-policies rules create 1000 \
  --security-policy=guesslyfe-waf \
  --expression="true" \
  --action=rate-based-ban \
  --rate-limit-threshold-count=1000 \
  --rate-limit-threshold-interval-sec=60 \
  --ban-duration-sec=600 \
  --conform-action=allow \
  --exceed-action=deny-429

# Block specific countries (example: block high-risk regions)
gcloud compute security-policies rules create 2000 \
  --security-policy=guesslyfe-waf \
  --expression="origin.region_code == 'CN' || origin.region_code == 'RU'" \
  --action=deny-403

# Attach to backend service
gcloud compute backend-services update guesslyfe-backend \
  --security-policy=guesslyfe-waf \
  --global
```

### DDoS Protection

```bash
# Enable Cloud Armor DDoS protection (already included with Cloud Load Balancer)
# Configure adaptive protection
gcloud compute security-policies update guesslyfe-waf \
  --enable-layer7-ddos-defense \
  --layer7-ddos-defense-rule-visibility=STANDARD
```

---

## Troubleshooting

### Common Issues

**Issue: Cloud Run service not accessible**
```bash
# Check service status
gcloud run services describe guesslyfe-api --region=$REGION

# Check logs
gcloud run services logs tail guesslyfe-api --region=$REGION

# Verify IAM permissions
gcloud run services get-iam-policy guesslyfe-api --region=$REGION
```

**Issue: Database connection failures**
```bash
# Verify Cloud SQL instance is running
gcloud sql instances describe $DB_INSTANCE_NAME

# Test connection with Cloud SQL Proxy
cloud-sql-proxy $DB_CONNECTION_NAME

# Check VPC connector
gcloud compute networks vpc-access connectors describe guesslyfe-connector \
  --region=$REGION
```

**Issue: SSL certificate not provisioning**
```bash
# Check certificate status
gcloud compute ssl-certificates describe guesslyfe-ssl --global

# Verify DNS is properly configured
nslookup api.guesslyfe.com

# Check domain ownership verification
gcloud compute ssl-certificates describe guesslyfe-ssl \
  --global \
  --format='yaml(managed.domainStatus)'
```

**Issue: High latency**
```bash
# Check Cloud Run metrics
gcloud monitoring time-series list \
  --filter='metric.type="run.googleapis.com/request_latencies"'

# Check database connection pool
# Increase DB_POOL_MAX if needed

# Enable Cloud CDN if not already enabled
gcloud compute backend-services update guesslyfe-backend \
  --enable-cdn \
  --global
```

---

## Support and Maintenance

### Regular Maintenance Tasks

**Weekly:**
- Review error logs
- Check alert notifications
- Monitor costs
- Review security scan results

**Monthly:**
- Update dependencies (`npm audit`, `npm update`)
- Review and optimize database queries
- Review and clean up old logs
- Analyze usage patterns and optimize scaling

**Quarterly:**
- Security audit
- Performance review and optimization
- Cost optimization review
- Disaster recovery drill

### Getting Help

- **Documentation**: See [RUNBOOK.md](./RUNBOOK.md) for operational procedures
- **Logs**: Check Cloud Logging for detailed error information
- **Monitoring**: Review dashboards in Cloud Monitoring
- **Support**: Contact GCP Support for infrastructure issues

---

## Conclusion

This deployment guide provides a complete, production-ready setup for GuessLyfe on Google Cloud Platform. Follow all steps carefully, and refer to the [RUNBOOK.md](./RUNBOOK.md) for ongoing operations.

**Key Takeaways:**
- Always test in staging before production
- Monitor costs regularly
- Keep secrets secure in Secret Manager
- Enable monitoring and alerting from day one
- Have rollback procedures ready
- Document any customizations

For questions or issues, consult:
- [DEVELOPMENT.md](./DEVELOPMENT.md) - Local development setup
- [TESTING.md](./TESTING.md) - Testing procedures
- [RUNBOOK.md](./RUNBOOK.md) - Operations guide
- [ARCHITECTURE.md](./ARCHITECTURE.md) - System architecture

---

**Last Updated**: 2024-11-16
**Version**: 1.0.0
