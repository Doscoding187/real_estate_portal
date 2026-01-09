# Bundle Attribution Service

## Overview

The Bundle Attribution Service tracks user engagements with bundle partners to measure bundle effectiveness and attribute conversions back to the bundle that introduced the partner. This enables data-driven decisions about bundle composition and partner performance.

## Key Features

- **Bundle View Tracking**: Record when users view bundle pages
- **Partner Engagement Tracking**: Track clicks and profile views from bundles
- **Lead Attribution**: Connect leads back to the bundle that generated them
- **Conversion Metrics**: Calculate bundle and partner conversion rates
- **Performance Analytics**: Identify top-performing bundles and partners

## Requirements Validation

- **Requirement 12.3**: Track user engagements with bundle partners

## Event Types

### 1. Bundle View
User views a bundle page

```typescript
await bundleAttributionService.trackBundleView({
  bundleId: 'bundle-123',
  userId: 'user-456',
  metadata: { source: 'homepage', device: 'mobile' }
});
```

### 2. Partner Click
User clicks on a partner card within a bundle

```typescript
await bundleAttributionService.trackPartnerEngagement({
  bundleId: 'bundle-123',
  partnerId: 'partner-789',
  userId: 'user-456',
  eventType: 'partner_click',
  contentId: 'content-101',
  metadata: { category: 'Finance' }
});
```

### 3. Profile View
User views a partner's full profile from a bundle

```typescript
await bundleAttributionService.trackPartnerEngagement({
  bundleId: 'bundle-123',
  partnerId: 'partner-789',
  userId: 'user-456',
  eventType: 'profile_view'
});
```

### 4. Lead Generated
User submits a lead to a bundle partner

```typescript
await bundleAttributionService.trackLeadAttribution({
  bundleId: 'bundle-123',
  partnerId: 'partner-789',
  userId: 'user-456',
  leadId: 'lead-202',
  eventType: 'lead_generated'
});
```

### 5. Lead Converted
Partner successfully converts a lead from a bundle

```typescript
await bundleAttributionService.trackLeadAttribution({
  bundleId: 'bundle-123',
  partnerId: 'partner-789',
  userId: 'user-456',
  leadId: 'lead-202',
  eventType: 'lead_converted'
});
```

## Analytics & Metrics

### Bundle Metrics

Get comprehensive metrics for a bundle:

```typescript
const metrics = await bundleAttributionService.getBundleMetrics('bundle-123');

// Returns:
{
  bundleId: 'bundle-123',
  bundleName: 'First-Time Buyer Bundle',
  totalViews: 1250,
  uniqueUsers: 890,
  partnerClicks: 450,
  profileViews: 180,
  leadsGenerated: 45,
  leadsConverted: 12,
  conversionRate: 26.67,
  partnerBreakdown: [
    {
      partnerId: 'partner-789',
      companyName: 'ABC Finance',
      category: 'Finance',
      clicks: 200,
      profileViews: 80,
      leadsGenerated: 20,
      leadsConverted: 6,
      conversionRate: 30.00
    },
    // ... more partners
  ]
}
```

### Partner Metrics Across Bundles

See how a partner performs across all bundles they're in:

```typescript
const metrics = await bundleAttributionService.getPartnerMetricsAcrossBundles('partner-789');

// Returns:
{
  totalBundles: 3,
  totalClicks: 450,
  totalProfileViews: 180,
  totalLeadsGenerated: 45,
  totalLeadsConverted: 12,
  conversionRate: 26.67,
  bundleBreakdown: [
    {
      bundleId: 'bundle-123',
      bundleName: 'First-Time Buyer Bundle',
      clicks: 200,
      leadsGenerated: 20
    },
    // ... more bundles
  ]
}
```

### User Bundle History

Track which bundles a user has engaged with:

```typescript
const history = await bundleAttributionService.getUserBundleHistory('user-456');

// Returns:
[
  {
    bundleId: 'bundle-123',
    bundleName: 'First-Time Buyer Bundle',
    viewedAt: Date,
    partnersEngaged: 3,
    leadsGenerated: 1
  },
  // ... more bundles
]
```

### Top Performing Bundles

Identify bundles with the highest conversion rates:

```typescript
const topBundles = await bundleAttributionService.getTopPerformingBundles(10);

// Returns:
[
  {
    bundleId: 'bundle-123',
    bundleName: 'First-Time Buyer Bundle',
    views: 1250,
    leadsGenerated: 45,
    leadsConverted: 12,
    conversionRate: 26.67
  },
  // ... more bundles
]
```

## Frontend Integration

### Track Bundle View

```typescript
// When user lands on bundle page
useEffect(() => {
  fetch(`/api/bundles/${bundleId}/track/view`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userId: currentUser.id,
      metadata: { source: 'search', device: 'desktop' }
    })
  });
}, [bundleId]);
```

### Track Partner Click

```typescript
const handlePartnerClick = async (partnerId: string) => {
  await fetch(`/api/bundles/${bundleId}/track/partner-engagement`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      partnerId,
      userId: currentUser.id,
      eventType: 'partner_click',
      metadata: { category: partner.category }
    })
  });
  
  // Navigate to partner content
  navigate(`/partners/${partnerId}`);
};
```

### Track Lead Generation

```typescript
const handleLeadSubmit = async (leadData: LeadData) => {
  // Create lead
  const lead = await createLead(leadData);
  
  // Track attribution
  await fetch(`/api/bundles/${bundleId}/track/lead`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      partnerId: leadData.partnerId,
      userId: currentUser.id,
      leadId: lead.id,
      eventType: 'lead_generated'
    })
  });
};
```

## Database Schema

```sql
CREATE TABLE bundle_attributions (
  id VARCHAR(36) PRIMARY KEY,
  bundle_id VARCHAR(36) NOT NULL,
  partner_id VARCHAR(36),
  user_id VARCHAR(36) NOT NULL,
  event_type ENUM('bundle_view', 'partner_click', 'profile_view', 'lead_generated', 'lead_converted') NOT NULL,
  content_id VARCHAR(36),
  lead_id VARCHAR(36),
  metadata JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_attribution_bundle (bundle_id),
  INDEX idx_attribution_partner (partner_id),
  INDEX idx_attribution_user (user_id),
  INDEX idx_attribution_event (event_type),
  INDEX idx_attribution_created (created_at),
  FOREIGN KEY (bundle_id) REFERENCES marketplace_bundles(id) ON DELETE CASCADE,
  FOREIGN KEY (partner_id) REFERENCES explore_partners(id) ON DELETE CASCADE
);
```

## Use Cases

### 1. Bundle Performance Dashboard

Display bundle effectiveness metrics to admins:

```typescript
const BundlePerformanceDashboard = () => {
  const [metrics, setMetrics] = useState<BundleAttributionMetrics | null>(null);
  
  useEffect(() => {
    fetch(`/api/bundles/${bundleId}/metrics`)
      .then(r => r.json())
      .then(setMetrics);
  }, [bundleId]);
  
  return (
    <div>
      <h2>{metrics?.bundleName}</h2>
      <MetricCard label="Total Views" value={metrics?.totalViews} />
      <MetricCard label="Unique Users" value={metrics?.uniqueUsers} />
      <MetricCard label="Conversion Rate" value={`${metrics?.conversionRate}%`} />
      
      <h3>Partner Performance</h3>
      {metrics?.partnerBreakdown.map(partner => (
        <PartnerMetricRow key={partner.partnerId} partner={partner} />
      ))}
    </div>
  );
};
```

### 2. Partner Bundle Analytics

Show partners how their bundle inclusions are performing:

```typescript
const PartnerBundleAnalytics = ({ partnerId }: { partnerId: string }) => {
  const [metrics, setMetrics] = useState(null);
  
  useEffect(() => {
    fetch(`/api/partners/${partnerId}/bundle-metrics`)
      .then(r => r.json())
      .then(setMetrics);
  }, [partnerId]);
  
  return (
    <div>
      <h2>Your Bundle Performance</h2>
      <p>You're featured in {metrics?.totalBundles} bundles</p>
      <p>Total Clicks: {metrics?.totalClicks}</p>
      <p>Conversion Rate: {metrics?.conversionRate}%</p>
      
      <h3>Bundle Breakdown</h3>
      {metrics?.bundleBreakdown.map(bundle => (
        <BundleRow key={bundle.bundleId} bundle={bundle} />
      ))}
    </div>
  );
};
```

### 3. User Recommendations

Recommend bundles based on user's previous engagements:

```typescript
const getRecommendedBundles = async (userId: string) => {
  const history = await bundleAttributionService.getUserBundleHistory(userId);
  
  // Find bundles user viewed but didn't generate leads from
  const viewedButNotConverted = history.filter(h => 
    h.partnersEngaged > 0 && h.leadsGenerated === 0
  );
  
  // Recommend similar bundles
  return getSimilarBundles(viewedButNotConverted);
};
```

## Error Handling

### Missing Required Fields

```typescript
// Returns 400 Bad Request
{
  error: 'Missing required fields',
  required: ['partnerId', 'userId', 'eventType']
}
```

### Invalid Event Type

```typescript
// Returns 400 Bad Request
{
  error: 'Invalid eventType. Must be "partner_click" or "profile_view"'
}
```

### Bundle Not Found

```typescript
// Returns 404 Not Found
{
  error: 'Bundle not found'
}
```

## Testing

### Unit Tests

```typescript
describe('BundleAttributionService', () => {
  it('should track bundle view', async () => {
    await bundleAttributionService.trackBundleView({
      bundleId: 'test-bundle',
      userId: 'test-user'
    });
    
    const metrics = await bundleAttributionService.getBundleMetrics('test-bundle');
    expect(metrics.totalViews).toBe(1);
  });
  
  it('should calculate conversion rate correctly', async () => {
    // Track 10 leads generated, 3 converted
    // Conversion rate should be 30%
    const metrics = await bundleAttributionService.getBundleMetrics(bundleId);
    expect(metrics.conversionRate).toBe(30.00);
  });
});
```

## Related Services

- **MarketplaceBundleService**: Manages bundle creation and partner inclusion
- **LeadGenerationService**: Creates leads that get attributed to bundles
- **PartnerService**: Manages partner profiles shown in bundles

## Next Steps

1. Add real-time analytics dashboard
2. Implement A/B testing for bundle compositions
3. Add predictive analytics for bundle performance
4. Create automated alerts for underperforming bundles
