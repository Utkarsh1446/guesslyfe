# Production Runbook

Operational guide for GuessLyfe backend production environment. This runbook provides step-by-step procedures for common issues, emergencies, and routine maintenance.

## Table of Contents

- [Quick Reference](#quick-reference)
- [Emergency Contacts](#emergency-contacts)
- [System Architecture](#system-architecture)
- [Common Issues](#common-issues)
- [Emergency Procedures](#emergency-procedures)
- [Routine Maintenance](#routine-maintenance)
- [Monitoring & Alerts](#monitoring--alerts)
- [Rollback Procedures](#rollback-procedures)
- [Disaster Recovery](#disaster-recovery)

## Quick Reference

### Critical URLs

| Service | URL | Purpose |
|---------|-----|---------|
| **Production API** | https://api.guesslyfe.com | Main API endpoint |
| **Health Check** | https://api.guesslyfe.com/api/v1/health | Basic health status |
| **Detailed Health** | https://api.guesslyfe.com/api/v1/health/detailed | Component health |
| **API Docs** | https://api.guesslyfe.com/api/docs | Swagger documentation |
| **Metrics** | https://api.guesslyfe.com/metrics | Prometheus metrics |
| **GCP Console** | https://console.cloud.google.com | Infrastructure management |
| **Sentry** | https://sentry.io/organizations/guesslyfe | Error tracking |
| **Status Page** | https://status.guesslyfe.com | Public status |

### Quick Commands

```bash
# Check service status
gcloud run services describe guesslyfe-backend --region=us-central1

# View recent logs
gcloud logging read "resource.type=cloud_run_revision" --limit=50

# Check database status
gcloud sql instances describe guesslyfe-db

# Restart service (last resort)
gcloud run services update guesslyfe-backend --region=us-central1

# Run migrations
./scripts/migrate-production.sh

# Create database backup
./scripts/backup-database.sh emergency-backup
```

## Emergency Contacts

### On-Call Rotation

| Role | Name | Phone | Email | Slack |
|------|------|-------|-------|-------|
| **Primary On-Call** | TBD | +1-XXX-XXX-XXXX | oncall@guesslyfe.com | @oncall |
| **Secondary On-Call** | TBD | +1-XXX-XXX-XXXX | oncall-backup@guesslyfe.com | @oncall-backup |
| **Engineering Manager** | TBD | +1-XXX-XXX-XXXX | eng-manager@guesslyfe.com | @eng-manager |
| **CTO** | TBD | +1-XXX-XXX-XXXX | cto@guesslyfe.com | @cto |
| **DevOps Lead** | TBD | +1-XXX-XXX-XXXX | devops@guesslyfe.com | @devops |

### External Contacts

| Service | Contact | Purpose |
|---------|---------|---------|
| **GCP Support** | Premium Support Ticket | Infrastructure issues |
| **SendGrid** | support@sendgrid.com | Email delivery issues |
| **Alchemy (RPC)** | support@alchemy.com | Blockchain RPC issues |
| **Database Admin** | dba@guesslyfe.com | Critical DB issues |

### Escalation Path

```
1. Alert triggered → Primary On-Call (immediate)
   ↓ (no response in 15 minutes)
2. Secondary On-Call
   ↓ (issue not resolved in 30 minutes)
3. Engineering Manager
   ↓ (critical issue, >1 hour downtime)
4. CTO
```

## System Architecture

### Production Stack

```
User Request
    ↓
Cloud Load Balancer (HTTPS)
    ↓
Cloud Run (guesslyfe-backend)
    ├── Container (2 CPU, 2GB RAM, Node.js 18)
    ├── Autoscaling (1-10 instances)
    └── VPC Connector
        ↓
    ┌───┴────┐
    ↓        ↓
Cloud SQL   Memorystore
(PostgreSQL) (Redis)
    ↓
Blockchain RPC (Alchemy)
```

### Environment Variables

Critical environment variables (stored in Secret Manager):
- `DATABASE_URL`: PostgreSQL connection string
- `REDIS_URL`: Redis connection string
- `JWT_SECRET`: Authentication secret
- `BLOCKCHAIN_PRIVATE_KEY`: Contract interaction key
- `TWITTER_API_KEY`: Twitter integration
- `SENDGRID_API_KEY`: Email service
- `SENTRY_DSN`: Error tracking

## Common Issues

### 1. High Error Rate (>1%)

**Symptoms:**
- Alert: "High Error Rate (>1%)"
- 5xx errors in logs
- Users reporting failures

**Investigation:**

1. **Check Recent Errors**
   ```bash
   # View last 50 errors
   gcloud logging read "severity>=ERROR" --limit=50 --format=json

   # Check Sentry dashboard
   # URL: https://sentry.io/organizations/guesslyfe/issues/
   ```

2. **Identify Error Pattern**
   ```bash
   # Group errors by type
   gcloud logging read "severity=ERROR" --limit=100 --format=json | \
     jq '.[] | .jsonPayload.error' | sort | uniq -c | sort -rn
   ```

3. **Check Service Health**
   ```bash
   curl https://api.guesslyfe.com/api/v1/health/detailed
   ```

**Common Causes & Solutions:**

| Cause | Solution |
|-------|----------|
| Database connection failure | Check Cloud SQL status, restart service |
| Redis connection timeout | Check Memorystore status, verify VPC connector |
| Blockchain RPC errors | Check Alchemy status, implement retry logic |
| Out of memory | Scale up memory allocation |
| Bad deployment | Rollback to previous revision |

**Mitigation Steps:**

```bash
# If database issue
gcloud sql instances restart guesslyfe-db

# If service issue
gcloud run services update guesslyfe-backend --region=us-central1

# If bad deployment
gcloud run services update-traffic guesslyfe-backend \
  --region=us-central1 \
  --to-revisions=PREVIOUS_REVISION=100
```

### 2. High Response Time (>2s)

**Symptoms:**
- Alert: "High Response Time (>2s)"
- Users reporting slow performance
- Increased load times

**Investigation:**

1. **Check Current Performance**
   ```bash
   # View detailed health with response times
   curl https://api.guesslyfe.com/api/v1/health/detailed | jq

   # Check metrics
   curl https://api.guesslyfe.com/metrics | grep http_request_duration
   ```

2. **Identify Slow Endpoints**
   ```bash
   # Find slow requests in logs
   gcloud logging read "resource.type=cloud_run_revision AND jsonPayload.duration_ms>2000" \
     --limit=20 --format=json | jq '.[] | {path: .jsonPayload.path, duration: .jsonPayload.duration_ms}'
   ```

3. **Check Database Performance**
   ```bash
   # Connect to database
   gcloud sql connect guesslyfe-db --user=postgres

   # Check slow queries
   SELECT query, mean_exec_time, calls
   FROM pg_stat_statements
   ORDER BY mean_exec_time DESC
   LIMIT 10;

   # Check active connections
   SELECT count(*) FROM pg_stat_activity WHERE state = 'active';
   ```

**Common Causes & Solutions:**

| Cause | Solution |
|-------|----------|
| Slow database queries | Add indexes, optimize queries |
| High traffic | Scale up Cloud Run instances |
| Cold starts | Increase min instances |
| Memory pressure | Scale up memory allocation |
| External API timeouts | Implement caching, increase timeouts |
| Blockchain RPC slow | Use fallback RPC provider |

**Immediate Actions:**

```bash
# Scale up instances
gcloud run services update guesslyfe-backend \
  --region=us-central1 \
  --min-instances=3 \
  --max-instances=20

# Increase memory if needed
gcloud run services update guesslyfe-backend \
  --region=us-central1 \
  --memory=4Gi

# Scale up database
gcloud sql instances patch guesslyfe-db \
  --tier=db-custom-4-16384  # 4 CPU, 16GB RAM
```

### 3. Database Connection Failures

**Symptoms:**
- Alert: "Database Connection Failures"
- Errors: "Connection pool exhausted"
- 500 errors for all database operations

**Investigation:**

1. **Check Database Status**
   ```bash
   gcloud sql instances describe guesslyfe-db

   # Check if database is running
   gcloud sql instances list
   ```

2. **Check Connection Pool**
   ```bash
   # View health check
   curl https://api.guesslyfe.com/api/v1/health/detailed | \
     jq '.components.database'
   ```

3. **Check VPC Connector**
   ```bash
   gcloud compute networks vpc-access connectors describe \
     guesslyfe-vpc-connector --region=us-central1
   ```

**Solutions:**

```bash
# Restart database (last resort, causes downtime)
gcloud sql instances restart guesslyfe-db

# Restart service to reset connection pool
gcloud run services update guesslyfe-backend --region=us-central1

# Check for blocking queries
gcloud sql connect guesslyfe-db --user=postgres
SELECT pid, usename, state, query
FROM pg_stat_activity
WHERE state != 'idle'
ORDER BY query_start;

# Kill blocking query (if needed)
SELECT pg_terminate_backend(PID);
```

### 4. Redis Connection Issues

**Symptoms:**
- Slow response times
- Errors: "Redis connection timeout"
- Cache misses

**Investigation:**

```bash
# Check Memorystore status
gcloud redis instances describe guesslyfe-redis --region=us-central1

# Check health
curl https://api.guesslyfe.com/api/v1/health/detailed | jq '.components.redis'

# Check memory usage
gcloud redis instances describe guesslyfe-redis --region=us-central1 \
  | grep -A 5 "currentLocationId"
```

**Solutions:**

```bash
# Restart service to reset Redis connections
gcloud run services update guesslyfe-backend --region=us-central1

# Scale up Redis if needed
gcloud redis instances update guesslyfe-redis \
  --region=us-central1 \
  --size=5  # 5GB

# Failover to replica (if configured)
gcloud redis instances failover guesslyfe-redis --region=us-central1
```

### 5. Out of Memory (OOM Kills)

**Symptoms:**
- Alert: "High Memory Usage (>80%)"
- Instances restarting frequently
- Errors: "JavaScript heap out of memory"

**Investigation:**

```bash
# Check memory usage
curl https://api.guesslyfe.com/api/v1/health/detailed | jq '.components.memory'

# View logs for OOM kills
gcloud logging read "resource.type=cloud_run_revision AND textPayload:\"out of memory\"" \
  --limit=20
```

**Immediate Actions:**

```bash
# Scale up memory immediately
gcloud run services update guesslyfe-backend \
  --region=us-central1 \
  --memory=4Gi

# Increase max instances to distribute load
gcloud run services update guesslyfe-backend \
  --region=us-central1 \
  --max-instances=20
```

**Long-term Solutions:**
- Review code for memory leaks
- Implement heap snapshots for analysis
- Optimize caching strategy
- Reduce payload sizes

### 6. SSL Certificate Issues

**Symptoms:**
- Alert: "SSL Certificate Expiring (14 days)"
- Browser warnings about invalid certificate
- HTTPS connection failures

**Investigation:**

```bash
# Check certificate expiry
echo | openssl s_client -servername api.guesslyfe.com -connect api.guesslyfe.com:443 2>/dev/null | \
  openssl x509 -noout -dates

# Check Cloud Run domain mapping
gcloud run domain-mappings describe \
  --domain=api.guesslyfe.com \
  --region=us-central1
```

**Solutions:**

```bash
# For Cloud Run managed certificates (auto-renew)
# Just verify domain mapping is correct
gcloud run domain-mappings list --region=us-central1

# For custom certificates
# 1. Obtain new certificate
# 2. Update domain mapping
gcloud run domain-mappings update \
  --domain=api.guesslyfe.com \
  --region=us-central1 \
  --certificate=NEW_CERT_ID
```

## Emergency Procedures

### Total System Outage

**Severity: P0 - Critical**

**Immediate Actions (First 5 Minutes):**

1. **Acknowledge Incident**
   ```bash
   # Post in #incidents Slack channel
   # Message: "Incident acknowledged. Investigating. ETA: 15 minutes"
   ```

2. **Verify Outage Scope**
   ```bash
   # Check health endpoint
   curl -I https://api.guesslyfe.com/api/v1/health

   # Check from multiple locations
   # Use https://downforeveryoneorjustme.com/api.guesslyfe.com
   ```

3. **Check Service Status**
   ```bash
   gcloud run services describe guesslyfe-backend --region=us-central1
   ```

4. **Check Recent Deployments**
   ```bash
   # View recent revisions
   gcloud run revisions list \
     --service=guesslyfe-backend \
     --region=us-central1 \
     --limit=5
   ```

**Investigation (Next 10 Minutes):**

1. **Review Logs**
   ```bash
   # Last 100 error logs
   gcloud logging read "resource.type=cloud_run_revision AND severity>=ERROR" \
     --limit=100 --format=json | less
   ```

2. **Check Dependencies**
   ```bash
   # Database
   gcloud sql instances describe guesslyfe-db

   # Redis
   gcloud redis instances describe guesslyfe-redis --region=us-central1

   # VPC Connector
   gcloud compute networks vpc-access connectors describe \
     guesslyfe-vpc-connector --region=us-central1
   ```

**Resolution Steps:**

| Scenario | Action |
|----------|--------|
| **Bad deployment** | Rollback to previous revision (see [Rollback](#rollback-procedures)) |
| **Database down** | Restart Cloud SQL instance |
| **Redis down** | Restart Memorystore or failover |
| **VPC issue** | Recreate VPC connector |
| **Certificate issue** | Update domain mapping |
| **Unknown** | Restart service, escalate to engineering |

**Communication:**

1. **Internal** (Slack #incidents):
   - Initial: "Investigating production outage. ETA: 15 minutes"
   - Update every 10 minutes
   - Resolution: "Issue resolved. Root cause: [X]. Postmortem: [link]"

2. **External** (Status Page):
   - Update https://status.guesslyfe.com
   - Post incident notice
   - Update with resolution

### Data Corruption

**Severity: P0 - Critical**

**DO NOT:**
- Run any migrations
- Delete or modify production data
- Restart database without backup

**DO:**

1. **Stop Writes Immediately**
   ```bash
   # Scale down to 0 instances to prevent more writes
   gcloud run services update guesslyfe-backend \
     --region=us-central1 \
     --max-instances=0
   ```

2. **Create Emergency Backup**
   ```bash
   ./scripts/backup-database.sh emergency-corruption-backup
   ```

3. **Assess Damage**
   ```bash
   # Connect to database
   gcloud sql connect guesslyfe-db --user=postgres

   # Check affected tables
   # Review data integrity
   ```

4. **Notify Team**
   - Alert CTO and Engineering Manager immediately
   - Do not attempt recovery without approval

5. **Recovery Options**
   - Restore from latest backup
   - Manual data correction (if scope is small)
   - Rollback migration (if caused by migration)

### Security Breach

**Severity: P0 - Critical**

**Immediate Actions:**

1. **Isolate Affected Systems**
   ```bash
   # Rotate all secrets immediately
   ./deploy/setup-secrets.sh

   # Change database password
   gcloud sql users set-password postgres \
     --instance=guesslyfe-db \
     --password=NEW_SECURE_PASSWORD

   # Rotate JWT secret (will log out all users)
   # Update in Secret Manager
   ```

2. **Assess Breach Scope**
   - Review audit logs
   - Identify compromised data
   - Check for unauthorized access

3. **Notification**
   - Notify security team
   - Contact legal if user data compromised
   - Prepare breach notification if required

4. **Containment**
   ```bash
   # Block malicious IPs
   gcloud compute firewall-rules create block-malicious-ip \
     --action=DENY \
     --rules=all \
     --source-ranges=MALICIOUS_IP

   # Review Cloud Run ingress settings
   gcloud run services update guesslyfe-backend \
     --region=us-central1 \
     --ingress=internal-and-cloud-load-balancing
   ```

## Routine Maintenance

### Weekly Tasks

- [ ] Review Sentry error trends
- [ ] Check disk usage on Cloud SQL
- [ ] Review slow query log
- [ ] Verify backup success
- [ ] Check SSL certificate expiry
- [ ] Review cost dashboard

### Monthly Tasks

- [ ] Review and update dependencies
- [ ] Security audit
- [ ] Performance optimization review
- [ ] Disaster recovery test
- [ ] Review on-call rotation
- [ ] Update runbook if needed

### Quarterly Tasks

- [ ] Major dependency updates
- [ ] Infrastructure cost optimization
- [ ] Security penetration test
- [ ] Capacity planning review
- [ ] Postmortem review meeting

## Monitoring & Alerts

### Alert Severity Levels

| Level | Response Time | Examples |
|-------|---------------|----------|
| **P0 - Critical** | Immediate (page on-call) | Total outage, data corruption, security breach |
| **P1 - High** | 15 minutes | High error rate (>5%), database down |
| **P2 - Medium** | 1 hour | Elevated error rate (1-5%), slow response time |
| **P3 - Low** | Next business day | SSL expiring, disk usage warning |

### Alert Response Checklist

1. **Acknowledge** - Respond to alert within SLA
2. **Investigate** - Gather information using runbook
3. **Communicate** - Update #incidents channel
4. **Mitigate** - Take immediate action to reduce impact
5. **Resolve** - Fix root cause
6. **Document** - Create postmortem

## Rollback Procedures

### Rollback Cloud Run Deployment

```bash
# 1. List recent revisions
gcloud run revisions list \
  --service=guesslyfe-backend \
  --region=us-central1 \
  --limit=10

# 2. Identify last known good revision (e.g., guesslyfe-backend-00042-abc)

# 3. Rollback traffic to that revision
gcloud run services update-traffic guesslyfe-backend \
  --region=us-central1 \
  --to-revisions=guesslyfe-backend-00042-abc=100

# 4. Verify rollback
curl https://api.guesslyfe.com/api/v1/health

# 5. Check logs
gcloud logging read "resource.type=cloud_run_revision" --limit=20
```

### Rollback Database Migration

```bash
# 1. Create backup first!
./scripts/backup-database.sh pre-rollback

# 2. Revert last migration
npm run migration:revert

# 3. Verify database state
npm run migration:show

# 4. Restart service
gcloud run services update guesslyfe-backend --region=us-central1

# 5. Verify health
curl https://api.guesslyfe.com/api/v1/health/detailed
```

### Rollback from Backup

```bash
# 1. Find backup file
ls -lh backups/ | tail -10

# 2. Stop service to prevent writes
gcloud run services update guesslyfe-backend \
  --region=us-central1 \
  --max-instances=0

# 3. Restore database
gunzip -c backups/backup_TIMESTAMP.sql.gz | \
  PGPASSWORD=$DB_PASSWORD psql \
  -h $DB_HOST \
  -U $DB_USERNAME \
  $DB_DATABASE

# 4. Restart service
gcloud run services update guesslyfe-backend \
  --region=us-central1 \
  --max-instances=10

# 5. Verify data integrity
# Connect to database and spot-check data
```

## Disaster Recovery

### Recovery Time Objective (RTO)

| Scenario | Target RTO | Strategy |
|----------|------------|----------|
| Service outage | 5 minutes | Automated rollback |
| Database failure | 30 minutes | Restore from backup |
| Region failure | 2 hours | Multi-region deployment |
| Total data loss | 4 hours | Restore from backups |

### Recovery Point Objective (RPO)

- **Database**: 15 minutes (automated backups every 15 min)
- **Redis**: Best effort (cache, can rebuild)
- **User sessions**: Best effort (will require re-login)

### Disaster Scenarios

#### Scenario 1: GCP Region Failure

**Preparation:**
- Maintain multi-region backups
- Document cross-region deployment procedure

**Recovery Steps:**
1. Deploy to secondary region (us-east1)
2. Restore database from backup
3. Update DNS to point to new region
4. Verify functionality

#### Scenario 2: Database Corruption/Loss

**Recovery Steps:**
1. Identify last known good backup
2. Restore to new Cloud SQL instance
3. Verify data integrity
4. Update service to use new instance
5. Test thoroughly before going live

#### Scenario 3: Complete Infrastructure Loss

**Recovery Steps:**
1. Provision new GCP project
2. Run infrastructure setup: `./deploy/setup-infrastructure.sh`
3. Restore database from off-site backup
4. Deploy latest application version
5. Configure secrets and environment
6. Verify all functionality
7. Update DNS

## Additional Resources

- [Migrations Guide](MIGRATIONS.md)
- [Error Handling](ERROR_HANDLING.md)
- [Security Documentation](SECURITY.md)
- [GCP Deployment Guide](GCP_DEPLOYMENT.md)
- [Docker Guide](DOCKER.md)

## Postmortem Template

After every incident, create a postmortem document:

```markdown
# Postmortem: [Incident Title]

**Date**: YYYY-MM-DD
**Duration**: X hours
**Severity**: P0/P1/P2/P3
**Impact**: Number of users affected

## Summary
Brief description of what happened.

## Timeline (UTC)
- HH:MM - Alert triggered
- HH:MM - Incident acknowledged
- HH:MM - Root cause identified
- HH:MM - Mitigation deployed
- HH:MM - Incident resolved

## Root Cause
Technical explanation of what went wrong.

## Impact
- Users affected: X
- Revenue impact: $Y
- Downtime: Z minutes

## Resolution
What was done to fix the issue.

## Action Items
- [ ] Fix root cause permanently (Owner: @person, Due: DATE)
- [ ] Update monitoring (Owner: @person, Due: DATE)
- [ ] Update runbook (Owner: @person, Due: DATE)
- [ ] Training/onboarding update (Owner: @person, Due: DATE)

## Lessons Learned
What we learned and how to prevent this in the future.
```

---

**Last Updated**: 2025-01-16
**Maintained By**: DevOps Team
**Review Frequency**: Monthly or after major incidents
