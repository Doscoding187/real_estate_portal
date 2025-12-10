# Google Places API Monitoring - Quick Reference

## Quick Start

### 1. Run Migration
```bash
npm run tsx scripts/run-google-places-monitoring-migration.ts
```

### 2. Register Router (add to server/routers.ts or main server file)
```typescript
import googlePlacesMonitoringRouter from './googlePlacesMonitoringRouter';

app.use('/api/google-places-monitoring', googlePlacesMonitoringRouter);
```

### 3. Add Dashboard Route (add to client routing)
```typescript
import GooglePlacesMonitoringDashboard from '@/pages/GooglePlacesMonitoringDashboard';

// In your routes:
<Route path="/google-places-monitoring" element={<GooglePlacesMonitoringDashboard />} />
```

## API Endpoints

### Get Statistics
```bash
GET /api/google-places-monitoring/statistics
```

**Response:**
```json
{
  "today": {
    "totalRequests": 1234,
    "successfulRequests": 1200,
    "failedRequests": 34,
    "autocompleteRequests": 800,
    "placeDetailsRequests": 400,
    "averageResponseTime": 245,
    "totalCost": 12.45,
    "errorRate": 2.75
  },
  "currentHour": {
    "totalRequests": 45,
    "successRate": 97.8,
    "averageResponseTime": 230
  },
  "topErrors": [
    {
      "error": "Rate limit exceeded",
      "count": 12,
      "lastOccurrence": "2024-01-15T10:30:00Z"
    }
  ],
  "costProjection": {
    "dailyProjected": 15.20,
    "monthlyProjected": 456.00
  }
}
```

### Get Active Alerts
```bash
GET /api/google-places-monitoring/alerts
```

### Resolve Alert
```bash
POST /api/google-places-monitoring/alerts/:id/resolve
```

### Get Configuration
```bash
GET /api/google-places-monitoring/config
```

### Update Configuration
```bash
PUT /api/google-places-monitoring/config
Content-Type: application/json

{
  "dailyRequestLimit": 15000,
  "usageAlertThreshold": 0.8,
  "errorRateThreshold": 0.05,
  "responseTimeThreshold": 3000,
  "costAlertThreshold": 100
}
```

### Get Historical Data
```bash
GET /api/google-places-monitoring/historical?days=30
```

### Health Check
```bash
GET /api/google-places-monitoring/health
```

## Database Tables

### google_places_api_logs
Individual API request logs
```sql
SELECT * FROM google_places_api_logs 
WHERE timestamp >= DATE_SUB(NOW(), INTERVAL 1 HOUR)
ORDER BY timestamp DESC;
```

### google_places_api_daily_summary
Aggregated daily statistics
```sql
SELECT * FROM google_places_api_daily_summary 
ORDER BY date DESC 
LIMIT 30;
```

### google_places_api_alerts
Active and resolved alerts
```sql
SELECT * FROM google_places_api_alerts 
WHERE resolved_at IS NULL;
```

### google_places_api_config
Configuration settings
```sql
SELECT * FROM google_places_api_config;
```

## Alert Types

| Type | Default Threshold | Severity |
|------|------------------|----------|
| Usage Threshold | 80% of daily limit | Warning → Critical at 95% |
| Error Rate | 5% | Warning → Critical at 10% |
| Response Time | 3000ms | Warning → Critical at 6000ms |
| Cost Threshold | $100/day | Warning |

## Cost Calculation

| Request Type | Cost per 1,000 |
|-------------|----------------|
| Autocomplete | $2.83 |
| Place Details | $17.00 |
| Geocoding | $5.00 |

## Monitoring Best Practices

### Daily
- ✅ Check active alerts
- ✅ Review cost projections
- ✅ Monitor error rates

### Weekly
- ✅ Analyze top errors
- ✅ Review usage trends
- ✅ Adjust thresholds if needed

### Monthly
- ✅ Review cost vs. budget
- ✅ Optimize API usage patterns
- ✅ Archive old logs

## Common Queries

### Today's Usage
```sql
SELECT 
  total_requests,
  successful_requests,
  failed_requests,
  total_cost_usd,
  average_response_time_ms
FROM google_places_api_daily_summary
WHERE date = CURDATE();
```

### Error Rate Trend
```sql
SELECT 
  date,
  (failed_requests / total_requests * 100) as error_rate_percent
FROM google_places_api_daily_summary
WHERE date >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
ORDER BY date;
```

### Cost Trend
```sql
SELECT 
  date,
  total_cost_usd,
  total_requests
FROM google_places_api_daily_summary
WHERE date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
ORDER BY date;
```

### Most Common Errors
```sql
SELECT 
  error_message,
  COUNT(*) as count,
  MAX(timestamp) as last_occurrence
FROM google_places_api_logs
WHERE success = 0 
  AND timestamp >= DATE_SUB(NOW(), INTERVAL 7 DAY)
GROUP BY error_message
ORDER BY count DESC
LIMIT 10;
```

### Session Token Usage
```sql
SELECT 
  session_token,
  COUNT(*) as request_count,
  MIN(timestamp) as session_start,
  MAX(timestamp) as session_end
FROM google_places_api_logs
WHERE session_token IS NOT NULL
  AND timestamp >= DATE_SUB(NOW(), INTERVAL 1 HOUR)
GROUP BY session_token
ORDER BY request_count DESC;
```

## Troubleshooting

### No Data in Dashboard
1. Check if migration ran successfully
2. Verify API calls are being made
3. Check browser console for errors
4. Verify API endpoints are accessible

### Alerts Not Triggering
1. Check configuration thresholds
2. Verify usage exceeds thresholds
3. Check for existing unresolved alerts (only one per type per day)
4. Review database logs

### High Costs
1. Review request breakdown by type
2. Check for unnecessary Place Details calls
3. Verify caching is working
4. Consider increasing debounce delay
5. Review session token usage

### Slow Response Times
1. Check Google Places API status
2. Review network connectivity
3. Check database performance
4. Verify caching is enabled
5. Consider geographic proximity to Google servers

## Environment Variables

```env
# Google Places API
GOOGLE_PLACES_API_KEY=your_api_key_here
GOOGLE_PLACES_COUNTRY_RESTRICTION=ZA
AUTOCOMPLETE_DEBOUNCE_MS=300
AUTOCOMPLETE_CACHE_TTL_SECONDS=300
```

## Performance Tips

1. **Enable Caching**: Reduces duplicate API calls
2. **Use Session Tokens**: Optimizes billing
3. **Debounce Input**: Reduces autocomplete calls
4. **Monitor Thresholds**: Catch issues early
5. **Review Top Errors**: Fix common problems
6. **Optimize Queries**: Use indexes for fast lookups

## Support

For issues or questions:
1. Check this quick reference
2. Review TASK_20_API_MONITORING_COMPLETE.md
3. Check Google Places API documentation
4. Review application logs
5. Contact system administrator
