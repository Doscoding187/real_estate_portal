# Partner Analytics Service - Quick Reference

## API Endpoints

### 1. Get Analytics Summary
```
GET /api/partner-analytics/:partnerId/summary?startDate=2024-01-01&endDate=2024-01-31
```

**Response:**
```json
{
  "success": true,
  "data": {
    "totalViews": 15420,
    "engagementRate": 12.5,
    "leadConversions": 45,
    "totalLeads": 67,
    "totalContent": 23,
    "averageQualityScore": 78.5
  }
}
```

### 2. Get Performance Trends
```
GET /api/partner-analytics/:partnerId/trends?period=daily&startDate=2024-01-01&endDate=2024-01-31
```

**Periods:** `daily`, `weekly`, `monthly`

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "date": "2024-01-01",
      "views": 450,
      "engagements": 56,
      "leads": 3
    }
  ]
}
```

### 3. Get Top Content
```
GET /api/partner-analytics/:partnerId/top-content?limit=10
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "contentId": "abc123",
      "title": "Modern 3BR in Sandton",
      "type": "card",
      "views": 2340,
      "engagements": 287,
      "engagementRate": 12.26,
      "qualityScore": 85.5,
      "createdAt": "2024-01-15T10:00:00Z"
    }
  ]
}
```

### 4. Get Conversion Funnel
```
GET /api/partner-analytics/:partnerId/funnel?startDate=2024-01-01&endDate=2024-01-31
```

**Response:**
```json
{
  "success": true,
  "data": {
    "totalViews": 15420,
    "totalEngagements": 1927,
    "totalLeads": 67,
    "viewToEngagementRate": 12.5,
    "engagementToLeadRate": 3.48,
    "overallConversionRate": 0.43
  }
}
```

### 5. Get Tier Benchmarks
```
GET /api/partner-analytics/benchmarks
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "tierId": 1,
      "tierName": "Property Professional",
      "averageViews": 12500,
      "averageEngagementRate": 11.2,
      "averageLeadConversion": 52
    }
  ]
}
```

### 6. Get Boost ROI
```
GET /api/partner-analytics/:partnerId/boost-roi
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "campaignId": "camp-123",
      "campaignName": "Campaign camp-123",
      "budget": 5000,
      "spent": 3450,
      "impressions": 34500,
      "clicks": 1725,
      "leads": 23,
      "costPerImpression": 0.10,
      "costPerClick": 2.00,
      "costPerLead": 150.00,
      "roi": 233.33
    }
  ]
}
```

### 7. Get Complete Dashboard
```
GET /api/partner-analytics/:partnerId/dashboard?period=weekly&startDate=2024-01-01&endDate=2024-01-31
```

**Response:** Combines all analytics in one call
```json
{
  "success": true,
  "data": {
    "summary": { /* ... */ },
    "trends": [ /* ... */ ],
    "topContent": [ /* ... */ ],
    "funnel": { /* ... */ },
    "benchmarks": [ /* ... */ ],
    "boostROI": [ /* ... */ ]
  }
}
```

## Service Functions

### Import
```typescript
import { partnerAnalyticsService } from './services/partnerAnalyticsService';
```

### Usage Examples

#### Get Summary
```typescript
const summary = await partnerAnalyticsService.getPartnerAnalyticsSummary(
  'partner-123',
  new Date('2024-01-01'),
  new Date('2024-01-31')
);
```

#### Get Trends
```typescript
const trends = await partnerAnalyticsService.getPerformanceTrends(
  'partner-123',
  'daily',
  new Date('2024-01-01'),
  new Date('2024-01-31')
);
```

#### Get Top Content
```typescript
const topContent = await partnerAnalyticsService.getContentRankedByPerformance(
  'partner-123',
  10
);
```

#### Get Funnel
```typescript
const funnel = await partnerAnalyticsService.getConversionFunnel(
  'partner-123',
  new Date('2024-01-01'),
  new Date('2024-01-31')
);
```

#### Get Benchmarks
```typescript
const benchmarks = await partnerAnalyticsService.getTierBenchmarks();
```

#### Get Boost ROI
```typescript
const roi = await partnerAnalyticsService.getBoostCampaignROI('partner-123');
```

## Key Metrics Explained

### Engagement Rate
```
(Saves + Shares + Clicks) / Total Views × 100
```

### View to Engagement Rate
```
Total Engagements / Total Views × 100
```

### Engagement to Lead Rate
```
Total Leads / Total Engagements × 100
```

### Overall Conversion Rate
```
Total Leads / Total Views × 100
```

### ROI Calculation
```
Revenue = Leads × R500 (average lead value)
ROI = ((Revenue - Spent) / Spent) × 100
```

### Cost Per Lead
```
Total Spent / Total Leads
```

### Cost Per Click
```
Total Spent / Total Clicks
```

## Date Filtering

All date parameters are optional. If omitted, returns all-time data.

**Format:** ISO 8601 date strings
```
2024-01-01
2024-01-31T23:59:59Z
```

## Performance Tips

### Caching Recommendations
```typescript
// Cache tier benchmarks (1 hour)
const benchmarks = await cache.get('tier_benchmarks', 
  () => partnerAnalyticsService.getTierBenchmarks(), 
  3600
);

// Cache partner summary (5 minutes)
const summary = await cache.get(`partner_summary_${partnerId}`, 
  () => partnerAnalyticsService.getPartnerAnalyticsSummary(partnerId), 
  300
);
```

### Query Optimization
- Always use date ranges for large datasets
- Limit top content queries to reasonable numbers (10-20)
- Consider pre-aggregating daily metrics for historical data

## Error Handling

All endpoints return consistent error format:
```json
{
  "success": false,
  "error": "Error message"
}
```

**Common Errors:**
- 400: Invalid parameters (missing dates, invalid period)
- 404: Partner not found
- 500: Server error

## Requirements Mapping

- **13.1**: `getPartnerAnalyticsSummary` - Total views, engagement rate, lead conversions
- **13.2**: `getPerformanceTrends` - Daily, weekly, monthly trends
- **13.3**: `getContentRankedByPerformance` - Content ranking by engagement
- **13.4**: `getConversionFunnel` - View → engagement → lead funnel
- **13.5**: `getTierBenchmarks` - Tier average comparisons
- **13.6**: `getBoostCampaignROI` - Boost campaign ROI metrics
