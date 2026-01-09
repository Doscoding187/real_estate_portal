# Partner Analytics Service

Comprehensive analytics service for partner content performance tracking and reporting.

## Requirements Coverage

- **Requirement 13.1**: Calculate total views, engagement rate, lead conversions
- **Requirement 13.2**: Show daily, weekly, monthly performance trends
- **Requirement 13.3**: Rank partner's content pieces by engagement
- **Requirement 13.4**: Track view → engagement → lead funnel
- **Requirement 13.5**: Compare partner performance to tier averages
- **Requirement 13.6**: Calculate ROI for each boost campaign

## Core Functions

### 1. getPartnerAnalyticsSummary

Aggregates key performance metrics for a partner.

```typescript
const summary = await partnerAnalyticsService.getPartnerAnalyticsSummary(
  partnerId,
  startDate,  // optional
  endDate     // optional
);

// Returns:
{
  totalViews: number;
  engagementRate: number;
  leadConversions: number;
  totalLeads: number;
  totalContent: number;
  averageQualityScore: number;
}
```

**Metrics Calculated:**
- Total views across all partner content
- Engagement rate (saves, shares, clicks / views)
- Lead conversions (converted leads)
- Total leads generated
- Total content pieces
- Average quality score

### 2. getPerformanceTrends

Tracks performance metrics over time with daily, weekly, or monthly granularity.

```typescript
const trends = await partnerAnalyticsService.getPerformanceTrends(
  partnerId,
  'daily',    // 'daily' | 'weekly' | 'monthly'
  startDate,
  endDate
);

// Returns array of:
{
  date: string;
  views: number;
  engagements: number;
  leads: number;
}
```

**Trend Periods:**
- **Daily**: `%Y-%m-%d` format (e.g., "2024-01-15")
- **Weekly**: `%Y-%U` format (e.g., "2024-03" for week 3)
- **Monthly**: `%Y-%m` format (e.g., "2024-01")

**Use Cases:**
- Dashboard trend charts
- Performance comparison over time
- Identifying seasonal patterns
- Measuring campaign impact

### 3. getContentRankedByPerformance

Ranks partner content by engagement metrics.

```typescript
const topContent = await partnerAnalyticsService.getContentRankedByPerformance(
  partnerId,
  10  // limit (default: 10)
);

// Returns array of:
{
  contentId: string;
  title: string;
  type: 'video' | 'card' | 'short';
  views: number;
  engagements: number;
  engagementRate: number;
  qualityScore: number;
  createdAt: Date;
}
```

**Ranking Logic:**
- Primary sort: Total views (descending)
- Includes both explore_content and explore_shorts
- Calculates engagement rate per piece
- Includes quality scores

**Use Cases:**
- "Top Performing Content" widget
- Content optimization insights
- Best practices identification

### 4. getConversionFunnel

Tracks the complete user journey from view to lead.

```typescript
const funnel = await partnerAnalyticsService.getConversionFunnel(
  partnerId,
  startDate,  // optional
  endDate     // optional
);

// Returns:
{
  totalViews: number;
  totalEngagements: number;
  totalLeads: number;
  viewToEngagementRate: number;
  engagementToLeadRate: number;
  overallConversionRate: number;
}
```

**Funnel Stages:**
1. **Views**: Total content impressions
2. **Engagements**: Saves, shares, clicks
3. **Leads**: Quote requests, consultations, eligibility checks

**Conversion Rates:**
- View → Engagement: (engagements / views) × 100
- Engagement → Lead: (leads / engagements) × 100
- Overall: (leads / views) × 100

### 5. getTierBenchmarks

Compares performance across partner tiers.

```typescript
const benchmarks = await partnerAnalyticsService.getTierBenchmarks();

// Returns array of:
{
  tierId: number;
  tierName: string;
  averageViews: number;
  averageEngagementRate: number;
  averageLeadConversion: number;
}
```

**Tier Comparison:**
- Tier 1: Property Professional
- Tier 2: Home Service Provider
- Tier 3: Financial Partner
- Tier 4: Content Educator

**Use Cases:**
- Partner performance benchmarking
- Tier upgrade recommendations
- Platform-wide analytics

### 6. getBoostCampaignROI

Calculates return on investment for boost campaigns.

```typescript
const roiData = await partnerAnalyticsService.getBoostCampaignROI(partnerId);

// Returns array of:
{
  campaignId: string;
  campaignName: string;
  budget: number;
  spent: number;
  impressions: number;
  clicks: number;
  leads: number;
  costPerImpression: number;
  costPerClick: number;
  costPerLead: number;
  roi: number;
}
```

**ROI Calculation:**
```
Revenue = leads × R500 (average lead value)
ROI = ((Revenue - Spent) / Spent) × 100
```

**Metrics:**
- **Cost Per Impression (CPI)**: Spent / Impressions
- **Cost Per Click (CPC)**: Spent / Clicks
- **Cost Per Lead (CPL)**: Spent / Leads
- **ROI**: Percentage return on investment

## Database Tables Used

### Primary Tables
- `explore_partners`: Partner information
- `explore_content`: Card-based content
- `explore_shorts`: Video shorts
- `explore_engagements`: User interactions
- `partner_leads`: Lead generation records
- `boost_campaigns`: Paid promotion campaigns
- `content_quality_scores`: Content quality metrics
- `partner_tiers`: Tier configuration

### Engagement Types
- `view`: Content impression
- `save`: User saved content
- `share`: User shared content
- `click`: User clicked CTA

### Lead Statuses
- `new`: Lead just created
- `contacted`: Partner reached out
- `converted`: Lead became customer
- `disputed`: Lead quality disputed
- `refunded`: Lead refunded

## Performance Considerations

### Query Optimization
- Uses indexed columns (partner_id, created_at)
- Aggregates at database level
- Limits result sets appropriately
- Caches tier benchmarks (infrequent changes)

### Recommended Caching
```typescript
// Cache tier benchmarks (1 hour)
const benchmarks = await cache.get('tier_benchmarks', async () => {
  return await partnerAnalyticsService.getTierBenchmarks();
}, 3600);

// Cache partner summary (5 minutes)
const summary = await cache.get(`partner_summary_${partnerId}`, async () => {
  return await partnerAnalyticsService.getPartnerAnalyticsSummary(partnerId);
}, 300);
```

### Large Dataset Handling
- Use date ranges to limit query scope
- Implement pagination for content rankings
- Consider pre-aggregating daily metrics

## Error Handling

All functions handle edge cases:
- Empty content arrays (returns zero metrics)
- Missing engagement data (defaults to 0)
- Division by zero (returns 0 for rates)
- Invalid date ranges (no filtering applied)

## Integration Example

```typescript
// Partner Dashboard API endpoint
app.get('/api/partners/:id/analytics', async (req, res) => {
  const { id } = req.params;
  const { period = 'week', startDate, endDate } = req.query;

  try {
    const [summary, trends, topContent, funnel, benchmarks, roi] = await Promise.all([
      partnerAnalyticsService.getPartnerAnalyticsSummary(id, startDate, endDate),
      partnerAnalyticsService.getPerformanceTrends(id, period, startDate, endDate),
      partnerAnalyticsService.getContentRankedByPerformance(id, 5),
      partnerAnalyticsService.getConversionFunnel(id, startDate, endDate),
      partnerAnalyticsService.getTierBenchmarks(),
      partnerAnalyticsService.getBoostCampaignROI(id)
    ]);

    res.json({
      success: true,
      data: {
        summary,
        trends,
        topContent,
        funnel,
        benchmarks,
        roi
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});
```

## Testing

### Unit Tests
- Test each function with mock data
- Verify calculation accuracy
- Test edge cases (empty data, zero values)
- Validate date filtering

### Integration Tests
- Test with real database
- Verify query performance
- Test concurrent requests
- Validate data consistency

### Property Tests
- Verify metrics always non-negative
- Ensure rates are 0-100%
- Validate trend data ordering
- Check ROI calculation accuracy
