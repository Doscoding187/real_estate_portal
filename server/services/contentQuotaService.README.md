# Content Quota Service

Tracks progress toward launch content quotas and provides detailed reporting on content inventory for the Explore Partner Marketplace cold start.

## Requirements

- **16.3**: Track progress toward 200+ content pieces
- **16.5**: Monitor quota fulfillment across all content categories

## Content Quotas

| Quota Category | Required Count | Content Types |
|---------------|----------------|---------------|
| property_tours | 50 | property_tour, development_showcase, agent_walkthrough |
| neighbourhood_guides | 30 | neighbourhood_guide, area_overview |
| expert_tips | 50 | expert_tip, how_to, educational |
| market_insights | 20 | market_insight, market_analysis, price_trends |
| service_showcases | 30 | service_showcase, service_demo |
| inspiration_pieces | 20 | inspiration, design_showcase, trend |

**Total Required**: 200+ pieces

## Usage Examples

### Get Quota Progress

```typescript
import { contentQuotaService } from './contentQuotaService';

const progress = await contentQuotaService.getQuotaProgress();

progress.forEach(quota => {
  console.log(`${quota.contentType}: ${quota.currentCount}/${quota.requiredCount}`);
  console.log(`  Progress: ${quota.percentComplete}%`);
  console.log(`  Status: ${quota.isMet ? '✓ Met' : `✗ ${quota.remaining} remaining`}`);
});
```

### Get Inventory Report

```typescript
const report = await contentQuotaService.getInventoryReport();

console.log(`Total Content: ${report.totalContent}/${report.totalRequired}`);
console.log(`Overall Progress: ${report.overallProgress}%`);
console.log(`Launch Ready: ${report.isLaunchReady ? 'Yes' : 'No'}`);
console.log(`Quotas Met: ${report.breakdown.met}/${report.breakdown.total}`);

if (!report.isLaunchReady) {
  const unmet = report.quotas.filter(q => !q.isMet);
  console.log('\nUnmet Quotas:');
  unmet.forEach(q => {
    console.log(`  - ${q.contentType}: ${q.remaining} remaining`);
  });
}
```

### Track Content Creation

```typescript
// When content is created and approved
await contentQuotaService.trackContentCreation('property_tour', partnerId);

// This automatically increments the appropriate quota
```

### Sync Quotas from Database

```typescript
// Recalculate all quotas from actual content
await contentQuotaService.syncQuotasFromContent();

// Useful for:
// - Initial setup
// - After bulk imports
// - Periodic reconciliation
```

### Check Specific Quota

```typescript
const propertyToursStatus = await contentQuotaService.getQuotaStatus('property_tours');

if (propertyToursStatus) {
  console.log(`Property Tours: ${propertyToursStatus.currentCount}/${propertyToursStatus.requiredCount}`);
  console.log(`Met: ${propertyToursStatus.isMet}`);
}
```

### Get Unmet Quotas

```typescript
const unmet = await contentQuotaService.getUnmetQuotas();

if (unmet.length > 0) {
  console.log('Content still needed:');
  unmet.forEach(quota => {
    console.log(`  ${quota.contentType}: ${quota.remaining} more pieces`);
  });
} else {
  console.log('All quotas met! Ready to launch.');
}
```

## Content Type Mapping

The service automatically maps content types to quota categories:

```typescript
// Get quota category for a content type
const category = contentQuotaService.getQuotaCategory('property_tour');
// Returns: 'property_tours'

// Add custom mapping
contentQuotaService.addContentTypeMapping('virtual_tour', 'property_tours');

// Get all mappings
const mappings = contentQuotaService.getContentTypeMappings();
```

## Integration Points

### Content Approval Service

When content is approved, track it:

```typescript
// In contentApprovalService.ts
async approveContent(contentId: string) {
  // ... approval logic ...
  
  // Track for quota if it's launch content
  if (content.isLaunchContent) {
    await contentQuotaService.trackContentCreation(
      content.contentType,
      content.partnerId
    );
  }
}
```

### Admin Dashboard

Display quota progress:

```typescript
// In admin dashboard API
app.get('/api/admin/launch/quotas', async (req, res) => {
  const report = await contentQuotaService.getInventoryReport();
  res.json(report);
});
```

### Launch Readiness Check

```typescript
import { launchService } from './launchService';
import { contentQuotaService } from './contentQuotaService';

async function checkLaunchReadiness() {
  const readiness = await launchService.checkLaunchReadiness();
  const report = await contentQuotaService.getInventoryReport();
  
  return {
    canLaunch: readiness.isReady && report.isLaunchReady,
    quotas: report.quotas,
    totalContent: report.totalContent,
    missingQuotas: readiness.missingQuotas
  };
}
```

## Quota Progress Response

```typescript
interface ContentQuotaProgress {
  contentType: string;        // 'property_tours'
  requiredCount: number;      // 50
  currentCount: number;       // 35
  percentComplete: number;    // 70.0
  isMet: boolean;            // false
  remaining: number;          // 15
}
```

## Inventory Report Response

```typescript
interface ContentInventoryReport {
  totalContent: number;       // 145
  totalRequired: number;      // 200
  overallProgress: number;    // 72.5
  isLaunchReady: boolean;    // false
  quotas: ContentQuotaProgress[];
  breakdown: {
    met: number;              // 3
    unmet: number;            // 3
    total: number;            // 6
  };
}
```

## Best Practices

1. **Mark Launch Content**: Set `isLaunchContent: true` on content created during pre-launch
2. **Track Immediately**: Call `trackContentCreation()` as soon as content is approved
3. **Sync Regularly**: Run `syncQuotasFromContent()` daily to ensure accuracy
4. **Monitor Progress**: Display quota progress in admin dashboard
5. **Alert on Gaps**: Notify admins when quotas are falling behind schedule

## Quota Monitoring

Set up automated monitoring:

```typescript
// Daily quota check
async function dailyQuotaCheck() {
  const report = await contentQuotaService.getInventoryReport();
  
  if (report.overallProgress < 50 && daysUntilLaunch < 30) {
    // Alert: Behind schedule
    await notifyAdmins('Quota progress behind schedule', report);
  }
  
  if (report.breakdown.unmet > 0 && daysUntilLaunch < 7) {
    // Alert: Launch at risk
    await notifyAdmins('Launch quotas not met', report);
  }
}
```

## Database Schema

### launch_content_quotas

```sql
CREATE TABLE launch_content_quotas (
  id VARCHAR(36) PRIMARY KEY,
  content_type VARCHAR(50) NOT NULL,
  required_count INT NOT NULL,
  current_count INT DEFAULT 0,
  last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY idx_quota_type (content_type)
);
```

### Content Marking

```sql
-- Mark content as launch content
ALTER TABLE explore_content 
  ADD COLUMN is_launch_content BOOLEAN DEFAULT false;

ALTER TABLE explore_shorts
  ADD COLUMN is_launch_content BOOLEAN DEFAULT false;
```
