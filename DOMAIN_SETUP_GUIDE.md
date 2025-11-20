# Domain Setup Guide for api.guessly.fun

This guide explains how to configure the custom domain `api.guessly.fun` for the Guessly Backend API.

## Current Setup

- **Cloud Run Service:** `guessly-backend`
- **Region:** `us-central1`
- **Current URL:** `https://guessly-backend-738787111842.us-central1.run.app`
- **Target Domain:** `api.guessly.fun`

## Prerequisites

1. Access to DNS management for `guessly.fun` domain
2. Google Cloud project with Cloud Run service deployed
3. gcloud CLI installed and authenticated

## Setup Steps

### Step 1: Verify Domain Ownership

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Navigate to **Cloud Run** → **Domain Mappings**
3. Click **ADD MAPPING**
4. Enter domain: `api.guessly.fun`
5. Select service: `guessly-backend`
6. Follow the verification steps (add TXT record to your DNS)

### Step 2: Add DNS Records

Once domain ownership is verified, add these DNS records to your domain registrar:

#### CNAME Record
```
Type: CNAME
Name: api
Value: ghs.googlehosted.com
TTL: 3600 (or your default)
```

**OR** if you're using Cloud DNS:

```bash
gcloud dns record-sets transaction start --zone=guessly-fun-zone
gcloud dns record-sets transaction add ghs.googlehosted.com. \
  --name=api.guessly.fun. \
  --ttl=300 \
  --type=CNAME \
  --zone=guessly-fun-zone
gcloud dns record-sets transaction execute --zone=guessly-fun-zone
```

### Step 3: Map Domain via gcloud CLI

```bash
# Map the domain to Cloud Run service
gcloud run domain-mappings create \
  --service=guessly-backend \
  --domain=api.guessly.fun \
  --region=us-central1
```

### Step 4: Wait for SSL Certificate Provisioning

Google Cloud automatically provisions and manages SSL certificates for custom domains. This process can take:
- **DNS propagation:** 5-30 minutes
- **SSL certificate:** 15-60 minutes

Check status:
```bash
gcloud run domain-mappings describe api.guessly.fun
```

### Step 5: Update Backend Configuration

Once the domain is active, update the backend environment variables:

#### Update `.env.production`

```bash
# CORS - Add new domain
CORS_ORIGIN=https://api.guessly.fun,https://guesslydotfun.com,https://www.guesslydotfun.com

# Twitter Callback - Update if needed
TWITTER_CALLBACK_URL=https://api.guessly.fun/api/v1/auth/twitter/callback
```

#### Redeploy Backend

```bash
cd backend
gcloud run deploy guessly-backend \
  --source . \
  --region us-central1 \
  --env-vars-file .env.production
```

## Verification

After setup is complete, verify the domain is working:

```bash
# Test health endpoint
curl https://api.guessly.fun/api/v1/health

# Expected response:
# {"status":"ok","info":{...},"error":{},"details":{...}}

# Test version endpoint
curl https://api.guessly.fun/api/v1/version

# Access Swagger docs
# https://api.guessly.fun/docs
```

## Alternative: Using Load Balancer (For More Control)

If you need more advanced features (e.g., rate limiting, caching, custom headers), you can set up a Load Balancer:

### 1. Create Serverless NEG (Network Endpoint Group)

```bash
gcloud compute network-endpoint-groups create guessly-backend-neg \
  --region=us-central1 \
  --network-endpoint-type=serverless \
  --cloud-run-service=guessly-backend
```

### 2. Create Backend Service

```bash
gcloud compute backend-services create guessly-backend-service \
  --global \
  --load-balancing-scheme=EXTERNAL_MANAGED

gcloud compute backend-services add-backend guessly-backend-service \
  --global \
  --network-endpoint-group=guessly-backend-neg \
  --network-endpoint-group-region=us-central1
```

### 3. Create URL Map

```bash
gcloud compute url-maps create guessly-lb \
  --default-service=guessly-backend-service
```

### 4. Create SSL Certificate

```bash
gcloud compute ssl-certificates create guessly-cert \
  --domains=api.guessly.fun \
  --global
```

### 5. Create HTTPS Proxy

```bash
gcloud compute target-https-proxies create guessly-https-proxy \
  --ssl-certificates=guessly-cert \
  --url-map=guessly-lb
```

### 6. Create Forwarding Rule

```bash
gcloud compute forwarding-rules create guessly-https-forwarding-rule \
  --global \
  --target-https-proxy=guessly-https-proxy \
  --ports=443
```

### 7. Get the IP Address

```bash
gcloud compute forwarding-rules describe guessly-https-forwarding-rule --global

# Note the IP address, then add A record to DNS:
# Type: A
# Name: api
# Value: <IP_ADDRESS>
```

## Troubleshooting

### Domain not resolving
- Check DNS propagation: `dig api.guessly.fun` or use https://dnschecker.org
- Verify CNAME record points to `ghs.googlehosted.com`
- Wait up to 48 hours for full DNS propagation (usually much faster)

### SSL Certificate Issues
- Check certificate status: `gcloud run domain-mappings describe api.guessly.fun`
- Ensure DNS records are correctly configured
- Wait for automatic certificate provisioning (can take up to 1 hour)

### CORS Errors
- Ensure `CORS_ORIGIN` in `.env.production` includes the new domain
- Redeploy the backend service after updating environment variables

### 404 or Service Not Found
- Verify the domain mapping: `gcloud run domain-mappings list`
- Check service is running: `gcloud run services list --region=us-central1`
- Ensure service is publicly accessible (already configured with `allUsers` role)

## Post-Setup Checklist

- [ ] Domain ownership verified in Google Cloud Console
- [ ] DNS CNAME record added (api → ghs.googlehosted.com)
- [ ] Domain mapping created in Cloud Run
- [ ] SSL certificate provisioned and active
- [ ] Backend environment variables updated with new domain
- [ ] Backend redeployed with updated configuration
- [ ] API accessible via `https://api.guessly.fun/api/v1/health`
- [ ] Swagger docs accessible at `https://api.guessly.fun/docs`
- [ ] Update API documentation with new domain
- [ ] Update any external integrations or clients using the API

## Additional Configuration

### Update Swagger Base URL

Once the domain is active, update the Swagger configuration in `backend/src/main.ts`:

```typescript
const config = new DocumentBuilder()
  .setTitle('Guessly API')
  .setDescription('Guessly Prediction Market Platform - Backend API')
  .setVersion('1.0')
  .addServer('https://api.guessly.fun/api/v1', 'Production')
  .addServer('http://localhost:3000/api/v1', 'Development')
  .addBearerAuth()
  // ... rest of configuration
```

### Health Check Endpoints

The following endpoints should be accessible:
- `https://api.guessly.fun/api/v1/health` - Health check
- `https://api.guessly.fun/api/v1/version` - API version
- `https://api.guessly.fun/docs` - Swagger documentation

## Support

For additional help:
- [Cloud Run Custom Domains Documentation](https://cloud.google.com/run/docs/mapping-custom-domains)
- [Google Cloud DNS Documentation](https://cloud.google.com/dns/docs)
- [SSL Certificate Troubleshooting](https://cloud.google.com/load-balancing/docs/ssl-certificates/troubleshooting)
