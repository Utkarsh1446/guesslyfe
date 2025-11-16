# Monitoring and Alerting Guide

Comprehensive guide for monitoring and observability in the GuessLyfe production environment.

## Table of Contents

- [Overview](#overview)
- [Health Checks](#health-checks)
- [Metrics Collection](#metrics-collection)
- [Logging](#logging)
- [Alerting](#alerting)
- [Dashboards](#dashboards)
- [Uptime Monitoring](#uptime-monitoring)
- [Best Practices](#best-practices)

## Overview

The GuessLyfe monitoring stack provides comprehensive observability across all system components:

```
┌─────────────────────────────────────────────────────────┐
│                    Monitoring Stack                     │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Health Checks  →  /health, /health/detailed, /ready   │
│       ↓                                                 │
│  Metrics (Prometheus) → /metrics                        │
│       ↓                                                 │
│  GCP Cloud Monitoring → Dashboards & Alerts            │
│       ↓                                                 │
│  Structured Logging → GCP Cloud Logging                │
│       ↓                                                 │
│  Error Tracking → Sentry                               │
│       ↓                                                 │
│  Uptime Monitoring → UptimeRobot / Pingdom             │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### Monitoring Pillars

1. **Health Checks**: Real-time component status
2. **Metrics**: Performance and usage statistics
3. **Logging**: Detailed event tracking
4. **Alerting**: Proactive issue detection
5. **Tracing**: Request flow analysis (via Sentry)

## Health Checks

### Endpoints

#### Basic Health Check

```bash
GET /api/v1/health
```

**Purpose**: Quick status check for load balancers and uptime monitors

**Response**:
```json
{
  "status": "ok",
  "info": {
    "database": { "status": "up" },
    "memory_heap": { "status": "up" },
    "memory_rss": { "status": "up" },
    "storage": { "status": "up" }
  },
  "error": {},
  "details": { /* ... */ }
}
```

**Usage**:
- Load balancer health checks
- Basic uptime monitoring
- Quick status verification

#### Detailed Health Check

```bash
GET /api/v1/health/detailed
```

**Purpose**: Comprehensive component status for operations

**Response**:
```json
{
  "status": "healthy",  // or "degraded" or "unhealthy"
  "timestamp": "2025-01-16T10:30:00.000Z",
  "responseTime": "145ms",
  "uptime": "2456s",
  "environment": "production",
  "version": "1.0.0",
  "components": {
    "database": {
      "status": "healthy",
      "responseTime": "12ms",
      "version": "15.4",
      "pool": {
        "totalConnections": 10,
        "activeConnections": 3
      }
    },
    "redis": {
      "status": "healthy",
      "responseTime": "3ms",
      "version": "7.0.8",
      "memory": "2.5M"
    },
    "blockchain": {
      "status": "healthy",
      "responseTime": "234ms",
      "network": "base-mainnet",
      "latestBlock": 1234567
    },
    "memory": {
      "status": "healthy",
      "heap": {
        "used": "156MB",
        "total": "256MB",
        "limit": "384MB"
      },
      "rss": "312MB",
      "system": {
        "total": "2048MB",
        "free": "512MB",
        "used": "1536MB",
        "percentage": "75.00%"
      }
    },
    "process": {
      "status": "healthy",
      "uptime": "2456s",
      "pid": 1234,
      "nodeVersion": "v18.17.0",
      "platform": "linux",
      "cpu": {
        "cores": 2,
        "model": "Intel(R) Xeon(R) CPU @ 2.20GHz",
        "loadAverage": {
          "1min": "0.45",
          "5min": "0.52",
          "15min": "0.48"
        }
      }
    }
  }
}
```

**Usage**:
- Operational debugging
- Pre-deployment validation
- Capacity planning
- Incident investigation

#### Readiness Check

```bash
GET /api/v1/health/ready
```

**Purpose**: Kubernetes/Cloud Run readiness probe

**Response**:
```json
{
  "status": "ready",
  "timestamp": "2025-01-16T10:30:00.000Z"
}
```

**Usage**:
- Cloud Run readiness probe
- Kubernetes readiness probe
- Deployment verification

#### Liveness Check

```bash
GET /api/v1/health/live
```

**Purpose**: Kubernetes/Cloud Run liveness probe

**Response**:
```json
{
  "status": "alive",
  "timestamp": "2025-01-16T10:30:00.000Z"
}
```

**Usage**:
- Cloud Run liveness probe
- Kubernetes liveness probe
- Container health verification

### Health Check Configuration

**Location**: `backend/src/modules/health/health.controller.ts`

**Key Features**:
- All endpoints are public (no authentication required)
- Parallel component checks for fast response
- Detailed error information for debugging
- Swagger/OpenAPI documentation included

**Implementation Details**: See [health.controller.ts:64-121](../src/modules/health/health.controller.ts)

## Metrics Collection

### Prometheus Metrics

**Endpoint**: `/metrics`

**Format**: Prometheus-compatible text format

**Metrics Collected**:

#### HTTP Metrics

```
# Request count by endpoint, method, status code
http_requests_total{method="GET",path="/api/v1/markets",status_code="200"} 1234

# Request duration histogram (in seconds)
http_request_duration_seconds_bucket{le="0.05",method="GET",path="/api/v1/markets",status_code="200"} 980
http_request_duration_seconds_bucket{le="0.1",method="GET",path="/api/v1/markets",status_code="200"} 1150
http_request_duration_seconds_count{method="GET",path="/api/v1/markets",status_code="200"} 1234
http_request_duration_seconds_sum{method="GET",path="/api/v1/markets",status_code="200"} 45.67

# Error count
http_errors_total{method="POST",path="/api/v1/trades",status_code="500",error_type="server_error"} 12
```

#### Database Metrics

```
# Query duration histogram
db_query_duration_seconds{operation="SELECT",table="opinion_market"} 0.023

# Active connections
db_connections_active{state="active"} 5
db_connections_active{state="idle"} 3

# Query errors
db_query_errors_total{operation="INSERT",table="trade"} 2
```

#### Redis Metrics

```
# Command duration
redis_command_duration_seconds{command="GET"} 0.002

# Errors
redis_errors_total{command="SET"} 0
```

#### Blockchain Metrics

```
# RPC call duration
blockchain_rpc_duration_seconds{method="eth_call"} 0.234

# RPC errors
blockchain_rpc_errors_total{method="eth_sendTransaction"} 1
```

#### Queue Metrics

```
# Job processing duration
queue_processing_duration_seconds{queue="notifications",job="send_email"} 1.23
```

#### Business Metrics

```
# Markets created
markets_created_total{category="sports"} 42

# Trades executed
trades_executed_total{market_id="123",direction="buy"} 156

# Active users (last 24h)
active_users 1234
```

### Metrics Service

**Location**: `backend/src/common/monitoring/metrics.service.ts`

**Usage Example**:

```typescript
import { MetricsService } from '@/common/monitoring/metrics.service';

@Injectable()
export class TradeService {
  constructor(private metricsService: MetricsService) {}

  async executeTrade(marketId: string, direction: 'buy' | 'sell') {
    const startTime = Date.now();

    try {
      // Execute trade logic
      await this.doTrade();

      // Record success metric
      this.metricsService.incrementTradesExecuted(marketId, direction);
    } catch (error) {
      // Errors are automatically recorded by MetricsInterceptor
      throw error;
    } finally {
      // Record duration
      const duration = Date.now() - startTime;
      this.metricsService.recordQueueProcessing('trades', 'execute', duration);
    }
  }
}
```

### Automatic HTTP Metrics

HTTP metrics are automatically collected by the `MetricsInterceptor`:

**Location**: `backend/src/common/interceptors/metrics.interceptor.ts`

**Configuration**: Apply globally in `main.ts`:

```typescript
app.useGlobalInterceptors(new MetricsInterceptor(metricsService));
```

## Logging

### Structured Logging

All logs are structured in JSON format and sent to GCP Cloud Logging.

**Logger Service**: `backend/src/common/logging/logger.service.ts`

**Log Levels**:
- `error`: Errors requiring attention
- `warn`: Warnings that may need investigation
- `info`: Informational messages
- `debug`: Detailed debugging information

**Log Structure**:

```json
{
  "timestamp": "2025-01-16T10:30:00.123Z",
  "level": "error",
  "message": "Failed to execute trade",
  "context": "TradeService",
  "requestId": "550e8400-e29b-41d4-a716-446655440000",
  "userId": "user123",
  "error": {
    "message": "Insufficient funds",
    "stack": "Error: Insufficient funds\n    at TradeService.execute...",
    "code": "INSUFFICIENT_FUNDS"
  },
  "metadata": {
    "marketId": "market456",
    "amount": "100",
    "direction": "buy"
  }
}
```

### Usage Example

```typescript
import { LoggerService } from '@/common/logging/logger.service';

@Injectable()
export class TradeService {
  private readonly logger = new LoggerService(TradeService.name);

  async executeTrade(marketId: string, amount: string) {
    this.logger.logInfo('Starting trade execution', { marketId, amount });

    try {
      await this.doTrade();
      this.logger.logInfo('Trade executed successfully', { marketId });
    } catch (error) {
      this.logger.logError('Trade execution failed', error, { marketId, amount });
      throw error;
    }
  }
}
```

### Request Logging

All HTTP requests are automatically logged by the `RequestLoggerMiddleware`:

**Location**: `backend/src/common/middleware/request-logger.middleware.ts`

**Log Format**:

```json
{
  "timestamp": "2025-01-16T10:30:00.123Z",
  "level": "info",
  "message": "POST /api/v1/trades 201",
  "requestId": "550e8400-e29b-41d4-a716-446655440000",
  "method": "POST",
  "path": "/api/v1/trades",
  "statusCode": 201,
  "duration": "145ms",
  "userId": "user123",
  "ip": "203.0.113.42",
  "userAgent": "Mozilla/5.0..."
}
```

### Searching Logs

**GCP Console**:
```
# All errors
severity>=ERROR

# Errors for specific user
severity>=ERROR AND jsonPayload.userId="user123"

# Slow requests (>2s)
jsonPayload.duration_ms>2000

# Specific endpoint
jsonPayload.path="/api/v1/trades"

# By request ID (trace entire request)
jsonPayload.requestId="550e8400-e29b-41d4-a716-446655440000"
```

**gcloud CLI**:
```bash
# Last 50 errors
gcloud logging read "severity>=ERROR" --limit=50

# Errors in last hour
gcloud logging read "severity>=ERROR AND timestamp>\"2025-01-16T09:30:00Z\"" --limit=100

# Export to file
gcloud logging read "severity>=ERROR" --limit=1000 --format=json > errors.json
```

## Alerting

### Alert Policies

**Configuration**: `backend/deploy/gcp-alerts.yaml`

**Configured Alerts**:

| Alert | Threshold | Duration | Severity | Action |
|-------|-----------|----------|----------|--------|
| High Error Rate | >1% | 5 minutes | Warning | Email, Slack |
| High Response Time | >2s (p95) | 5 minutes | Warning | Email, Slack |
| Database Failures | >0 failures | 1 minute | Critical | Page on-call |
| Queue Delays | >5 minutes | 2 minutes | Warning | Email, Slack |
| High Memory | >80% | 5 minutes | Warning | Email, Slack |
| High Disk Usage | >80% | 5 minutes | Warning | Email, Slack |
| SSL Expiring | <14 days | 1 hour | Warning | Email |
| Frequent Restarts | >3 in 10min | 10 minutes | Warning | Email, Slack |

### Setting Up Alerts

1. **Create Notification Channels**

   ```bash
   # Email channel
   gcloud alpha monitoring channels create \
     --display-name="Ops Team Email" \
     --type=email \
     --channel-labels=email_address=ops@guesslyfe.com

   # Slack channel
   gcloud alpha monitoring channels create \
     --display-name="Slack Alerts" \
     --type=slack \
     --channel-labels=url=https://hooks.slack.com/services/YOUR/WEBHOOK/URL
   ```

2. **Apply Alert Policies**

   ```bash
   # Replace PROJECT_ID and CHANNEL_ID in gcp-alerts.yaml first

   # Create each alert policy
   gcloud alpha monitoring policies create \
     --policy-from-file=deploy/gcp-alerts.yaml
   ```

3. **Test Alerts**

   ```bash
   # Trigger test error rate alert
   # (Manually create errors in application)

   # Verify alert received via configured channels
   ```

### Alert Response

See [RUNBOOK.md](RUNBOOK.md) for detailed alert response procedures.

## Dashboards

### GCP Dashboard

**Configuration**: `backend/deploy/gcp-dashboard.json`

**Dashboard Sections**:

1. **Request Metrics**
   - Request rate (requests/second)
   - Error rate (%)
   - Response time percentiles (p50, p95, p99)

2. **System Metrics**
   - Active instances
   - Memory utilization (%)
   - CPU utilization (%)

3. **Database Metrics**
   - Active connections
   - Disk utilization (%)

4. **Error Logs**
   - Recent error logs panel

5. **Business Metrics**
   - Markets created (24h)
   - Trades executed (24h)
   - Active users (24h)

### Creating Dashboard

```bash
# Import dashboard configuration
gcloud monitoring dashboards create \
  --config-from-file=deploy/gcp-dashboard.json

# Get dashboard URL
gcloud monitoring dashboards list --format="table(name,displayName)"
```

**Access**: https://console.cloud.google.com/monitoring/dashboards

### Custom Dashboards

You can create custom dashboards in GCP Console:
1. Go to **Monitoring → Dashboards**
2. Click **Create Dashboard**
3. Add charts for your metrics
4. Save and share with team

## Uptime Monitoring

### External Monitoring

**Recommended Service**: UptimeRobot (free tier)

**Setup Guide**: See [uptime-monitoring-setup.md](../deploy/uptime-monitoring-setup.md)

**Configuration**:
- **Monitor**: https://api.guesslyfe.com/api/v1/health
- **Interval**: 5 minutes
- **Timeout**: 30 seconds
- **Expected Status**: 200
- **Alert After**: 2 failed checks (confirms real issue)

**Alert Channels**:
- Email: ops@guesslyfe.com
- Slack: #alerts channel
- PagerDuty: For critical 24/7 on-call

### Internal Monitoring

**GCP Uptime Checks**:

```bash
# Create uptime check
gcloud monitoring uptime create guesslyfe-api-health \
  --resource-type=uptime-url \
  --display-name="GuessLyfe API Health" \
  --check-interval=5m \
  --timeout=10s \
  --http-check-path=/api/v1/health \
  --http-check-port=443 \
  --use-ssl \
  --matcher-type=CONTAINS_STRING \
  --content-matcher="\"status\""
```

## Best Practices

### 1. Monitoring Hygiene

- **Review dashboards weekly**: Check for trends and anomalies
- **Update alert thresholds**: Adjust based on actual traffic patterns
- **Test alerts monthly**: Ensure notification channels work
- **Clean up old metrics**: Remove unused metrics to reduce noise

### 2. Alert Fatigue Prevention

- **Tune thresholds**: Avoid alerts for normal variance
- **Use duration**: Require sustained issues (not single spikes)
- **Graduated severity**: Warn before paging
- **Actionable alerts only**: Every alert should require action

### 3. Observability Culture

- **Log everything important**: Errors, state changes, external calls
- **Use request IDs**: Track requests across services
- **Add context**: Include user ID, market ID, etc. in logs
- **Structure logs**: Use JSON for searchability

### 4. Performance Monitoring

- **Track p95/p99**: Not just averages
- **Monitor dependencies**: Database, Redis, blockchain RPC
- **Set SLOs**: Define acceptable performance targets
- **Review regularly**: Weekly performance review meetings

### 5. Cost Optimization

- **Sample high-volume metrics**: Don't track every request at high scale
- **Use log sampling**: Sample debug logs, keep all errors
- **Retention policies**: Archive old logs to cheaper storage
- **Monitor monitoring costs**: Track Cloud Monitoring costs in budget

## Troubleshooting

### Common Issues

#### 1. Metrics Not Appearing

**Check**:
```bash
# Verify metrics endpoint works
curl https://api.guesslyfe.com/metrics

# Check if MetricsModule is imported
grep -r "MetricsModule" backend/src/

# Verify MetricsInterceptor is applied globally
grep -r "MetricsInterceptor" backend/src/main.ts
```

#### 2. Alerts Not Firing

**Check**:
- Notification channels configured correctly
- Alert policy conditions match actual metric names
- Thresholds are appropriate for current traffic
- Duration isn't too long

**Test**:
```bash
# List alert policies
gcloud alpha monitoring policies list

# Describe specific policy
gcloud alpha monitoring policies describe POLICY_ID
```

#### 3. Logs Not Showing in GCP

**Check**:
```bash
# Verify Winston GCP transport is configured
grep -r "LoggingWinston" backend/src/

# Check GCP project ID is correct
echo $GCP_PROJECT_ID

# Verify service account has logging.write permission
gcloud projects get-iam-policy PROJECT_ID
```

#### 4. High Cardinality Metrics

**Problem**: Too many unique label combinations causing performance issues

**Solution**: Normalize paths and IDs
```typescript
// MetricsService already does this in normalizePath()
private normalizePath(path: string): string {
  return path
    .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, ':id')
    .replace(/\/\d+/g, '/:id');
}
```

## Additional Resources

- [Production Runbook](RUNBOOK.md) - Incident response procedures
- [Error Handling Guide](ERROR_HANDLING.md) - Error tracking with Sentry
- [GCP Deployment Guide](GCP_DEPLOYMENT.md) - Infrastructure setup
- [Migrations Guide](MIGRATIONS.md) - Database change management

## Support

For monitoring setup assistance:
- Internal: #devops Slack channel
- GCP Support: Premium Support tickets
- Documentation: https://cloud.google.com/monitoring/docs

---

**Last Updated**: 2025-01-16
**Maintained By**: DevOps Team
**Review Frequency**: Monthly
