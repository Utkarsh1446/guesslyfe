# Uptime Monitoring Setup Guide

This guide walks you through setting up external uptime monitoring for the GuessLyfe production API.

## Table of Contents

- [Why External Uptime Monitoring?](#why-external-uptime-monitoring)
- [Option 1: UptimeRobot (Recommended)](#option-1-uptimerobot-recommended)
- [Option 2: Pingdom](#option-2-pingdom)
- [Option 3: GCP Uptime Checks](#option-3-gcp-uptime-checks)
- [Alert Configuration](#alert-configuration)
- [Testing](#testing)

## Why External Uptime Monitoring?

External uptime monitoring provides:
- **Independent verification**: Monitors from outside your infrastructure
- **Global perspective**: Checks from multiple geographic locations
- **Instant alerts**: Notifies team immediately when service is down
- **Historical data**: Tracks uptime percentage and incident history
- **Status pages**: Public-facing status for users

## Option 1: UptimeRobot (Recommended)

**Free tier**: 50 monitors, 5-minute check intervals

### Setup Steps

1. **Create Account**
   - Go to https://uptimerobot.com
   - Sign up with team email
   - Verify email address

2. **Create HTTP(S) Monitor**
   - Click "Add New Monitor"
   - **Monitor Type**: HTTP(s)
   - **Friendly Name**: GuessLyfe API - Production
   - **URL**: https://api.guesslyfe.com/api/v1/health
   - **Monitoring Interval**: 5 minutes
   - **Monitor Timeout**: 30 seconds

3. **Advanced Settings**
   - **HTTP Method**: GET
   - **Expected Status Code**: 200
   - **Keyword to Check**: `"status"` (optional - ensures valid JSON response)
   - **SSL Certificate Expiry Reminder**: 14 days before expiration

4. **Alert Contacts**
   - Click "Alert Contacts"
   - Add email: `ops@guesslyfe.com`
   - Add SMS (optional): Your phone number
   - Add Slack webhook (recommended):
     ```
     https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK
     ```
   - Add PagerDuty integration (for on-call):
     ```
     Integration Key: <from PagerDuty>
     ```

5. **Alert Settings**
   - **Alert When**: Down
   - **Send alerts after**: 2 minutes (1 failed check = immediate, 2+ = real issue)
   - **Re-alert if still down**: Every 30 minutes
   - **Alert when back up**: Yes

6. **Additional Monitors** (Optional but Recommended)
   - Detailed health: https://api.guesslyfe.com/api/v1/health/detailed
   - Readiness: https://api.guesslyfe.com/api/v1/health/ready
   - Homepage: https://guesslyfe.com
   - API Docs: https://api.guesslyfe.com/api/docs

### UptimeRobot API Integration

```bash
# Get monitor status via API
curl "https://api.uptimerobot.com/v2/getMonitors" \
  -H "Content-Type: application/json" \
  -d '{
    "api_key": "YOUR_API_KEY",
    "format": "json"
  }'
```

## Option 2: Pingdom

**Paid service**: More features, faster checks (1-minute intervals)

### Setup Steps

1. **Create Account**
   - Go to https://www.pingdom.com
   - Start free trial or purchase plan

2. **Create Uptime Check**
   - Click "Synthetics" → "Add New"
   - **Name**: GuessLyfe API Production
   - **URL**: https://api.guesslyfe.com/api/v1/health
   - **Check Interval**: 1 minute (or 5 minutes for cost savings)
   - **Check Type**: HTTP
   - **HTTP Method**: GET

3. **Advanced Options**
   - **Expected HTTP Code**: 200
   - **String to Expect**: `status`
   - **SSL Check**: Yes
   - **SSL Expiry Warning**: 14 days

4. **Check Locations**
   - Select multiple locations for global coverage:
     - North America: US East, US West
     - Europe: London, Frankfurt
     - Asia: Singapore, Tokyo

5. **Alert Configuration**
   - **Send alert when**: Down
   - **After failed checks**: 2 (confirms real outage)
   - **Notification integrations**:
     - Email: ops@guesslyfe.com
     - Slack: Connect your workspace
     - PagerDuty: Add integration key
     - SMS: Add phone numbers for critical alerts

6. **Public Status Page**
   - Create public status page: https://status.guesslyfe.com
   - Share with users for transparency

## Option 3: GCP Uptime Checks

**Free**: Integrated with GCP Cloud Monitoring

### Setup via Console

1. **Navigate to Uptime Checks**
   ```bash
   # Or use console: https://console.cloud.google.com/monitoring/uptime
   ```

2. **Create Uptime Check**
   - Click "Create Uptime Check"
   - **Title**: GuessLyfe API Health Check
   - **Protocol**: HTTPS
   - **Resource Type**: URL
   - **Hostname**: api.guesslyfe.com
   - **Path**: /api/v1/health
   - **Port**: 443

3. **Response Validation**
   - **Check Type**: Status Code
   - **Expected Status Code**: 200
   - **Response Content Match**: `"status"` (regex)

4. **Check Frequency**
   - **Check Frequency**: 5 minutes
   - **Regions**: Global (checks from multiple regions)

5. **Alert Policy**
   - Link to alert policy created in gcp-alerts.yaml
   - Or create new policy:
     - **Condition**: Uptime check fails
     - **Duration**: 2 minutes
     - **Notification Channel**: Email/SMS

### Setup via gcloud CLI

```bash
# Create uptime check
gcloud monitoring uptime create guesslyfe-api-health \
  --resource-type=uptime-url \
  --display-name="GuessLyfe API Health Check" \
  --check-interval=5m \
  --timeout=10s \
  --http-check-path=/api/v1/health \
  --http-check-port=443 \
  --use-ssl \
  --matcher-type=CONTAINS_STRING \
  --content-matcher="\"status\"" \
  --matcher-content-type=TEXT

# Create alert policy for uptime check
gcloud alpha monitoring policies create \
  --notification-channels=CHANNEL_ID \
  --display-name="API Down Alert" \
  --condition-display-name="Uptime check failed" \
  --condition-threshold-value=1 \
  --condition-threshold-duration=120s \
  --condition-filter='metric.type="monitoring.googleapis.com/uptime_check/check_passed" AND resource.type="uptime_url" AND metric.label.check_id="guesslyfe-api-health"'
```

## Alert Configuration

### Recommended Alert Thresholds

| Metric | Threshold | Action |
|--------|-----------|--------|
| **Down Duration** | >2 minutes | Page on-call engineer |
| **Response Time** | >5 seconds | Warning notification |
| **SSL Expiry** | <14 days | Email admin team |
| **Success Rate** | <99.5% over 24h | Review incident |

### Alert Routing

```yaml
# Example alert routing configuration
alerts:
  critical:  # Page on-call
    - Service completely down
    - Database unreachable
    - >50% error rate
    channels:
      - PagerDuty
      - SMS
      - Slack (#incidents)

  warning:   # Notify team
    - High response time (>2s)
    - Elevated error rate (1-5%)
    - Memory/CPU warning
    channels:
      - Email
      - Slack (#alerts)

  info:      # Log for review
    - SSL certificate renewal
    - Scheduled maintenance
    channels:
      - Email
      - Slack (#monitoring)
```

### Slack Integration

1. **Create Incoming Webhook**
   - Go to https://api.slack.com/apps
   - Create new app or select existing
   - Enable "Incoming Webhooks"
   - Add webhook to #alerts channel
   - Copy webhook URL

2. **Configure in UptimeRobot/Pingdom**
   - Paste webhook URL
   - Customize message format:
     ```json
     {
       "text": "🚨 *ALERT*: GuessLyfe API is DOWN!",
       "attachments": [{
         "color": "danger",
         "fields": [
           {"title": "Service", "value": "GuessLyfe API", "short": true},
           {"title": "Status", "value": "Down", "short": true},
           {"title": "URL", "value": "https://api.guesslyfe.com/api/v1/health"},
           {"title": "Time", "value": "{{DATETIME}}"}
         ]
       }]
     }
     ```

### PagerDuty Integration

1. **Create PagerDuty Service**
   - Go to https://app.pagerduty.com
   - Services → New Service
   - Name: GuessLyfe API Production
   - Integration: Generic Events API v2
   - Copy Integration Key

2. **Configure Escalation Policy**
   - Escalation Policy → New Policy
   - Level 1: On-call engineer (immediately)
   - Level 2: Engineering manager (after 15 minutes)
   - Level 3: CTO (after 30 minutes)

3. **Add Integration Key to Monitoring**
   - Add to UptimeRobot/Pingdom alert contacts
   - Or configure webhook:
     ```bash
     curl -X POST https://events.pagerduty.com/v2/enqueue \
       -H 'Content-Type: application/json' \
       -d '{
         "routing_key": "YOUR_INTEGRATION_KEY",
         "event_action": "trigger",
         "payload": {
           "summary": "GuessLyfe API is DOWN",
           "severity": "critical",
           "source": "UptimeRobot"
         }
       }'
     ```

## Testing

### Test Uptime Monitoring

1. **Simulate Downtime**
   ```bash
   # Temporarily stop Cloud Run service
   gcloud run services update guesslyfe-backend \
     --region=us-central1 \
     --min-instances=0 \
     --max-instances=0

   # Wait for downtime alert (should arrive within 2-5 minutes)

   # Restore service
   gcloud run services update guesslyfe-backend \
     --region=us-central1 \
     --min-instances=1 \
     --max-instances=10

   # Wait for recovery alert
   ```

2. **Test Alert Channels**
   - Verify email received
   - Check Slack message posted
   - Confirm PagerDuty incident created
   - Validate SMS delivered (if configured)

3. **Test Response Time Alerts**
   ```bash
   # Add artificial delay to health endpoint (in code)
   await new Promise(resolve => setTimeout(resolve, 6000));  // 6 second delay

   # Deploy and wait for slow response alert
   ```

4. **Verify SSL Monitoring**
   ```bash
   # Check SSL certificate expiry
   echo | openssl s_client -servername api.guesslyfe.com -connect api.guesslyfe.com:443 2>/dev/null | openssl x509 -noout -dates
   ```

## Best Practices

1. **Multiple Check Locations**: Use checks from different geographic regions to avoid false positives from regional outages

2. **Graduated Alerts**:
   - 1 failed check = log
   - 2 failed checks = warning notification
   - 3+ failed checks = page on-call

3. **Maintenance Windows**: Schedule maintenance windows in monitoring tool to suppress alerts during planned downtime

4. **Status Page**: Maintain public status page to proactively communicate with users

5. **Regular Testing**: Test alert channels monthly to ensure they work when needed

6. **Alert Fatigue**: Tune thresholds to avoid too many false alarms (leads to ignored alerts)

7. **Runbook Links**: Include links to runbooks in alert messages for quick remediation

## Costs

### UptimeRobot
- **Free**: 50 monitors, 5-minute intervals
- **Pro ($7/month)**: 1-minute intervals, SMS alerts, 100 monitors

### Pingdom
- **Starter ($10/month)**: 10 uptime checks, 1-minute intervals
- **Advanced ($53/month)**: 50 checks, multi-location, status page

### GCP Uptime Checks
- **Free**: Included with GCP Cloud Monitoring
- First 1 million API calls free per month

## Support

For issues with uptime monitoring setup:
- UptimeRobot: https://uptimerobot.com/support
- Pingdom: https://www.pingdom.com/support
- GCP: https://cloud.google.com/monitoring/uptime-checks

---

**Next Steps**: After setting up uptime monitoring, configure the [Production Runbook](../docs/RUNBOOK.md) for incident response procedures.
