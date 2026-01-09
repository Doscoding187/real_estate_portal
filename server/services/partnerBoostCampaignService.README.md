# Partner Boost Campaign Service

## Overview

The Partner Boost Campaign Service manages paid promotion campaigns for partner content in the Explore Partner Marketplace system. It handles campaign creation, activation, budget tracking, and ensures compliance with content hierarchy rules.

## Requirements Addressed

- **8.1**: Require topic selection for targeting
- **8.2**: Display "Sponsored" label on boosted content
- **8.3**: Limit boosted content to 1 per 10 organic items (enforced by feed generation)
- **8.4**: Track budget, spent, impressions, clicks
- **8.5**: Auto-pause when budget depleted
- **8.6**: Reject boosts that violate content hierarchy

## Key Features

### 1. Campaign Creation
- Requires topic selection for targeting (Req 8.1)
- Validates content eligibility before creation (Req 8.6)
- Tracks budget, start/end dates, and cost per impression

### 2. Budget Management
- Real-time budget tracking
- Automatic campaign depletion when budget is exhausted (Req 8.5)
- Budget status reporting with percentage used

### 3. Performance Tracking
- Records impressions and clicks (Req 8.4)
- Calculates click-through rate
- Provides real-time analytics

### 4. Content Eligibility Validation
- Prevents tertiary content from being boosted (Req 8.6)
- Ensures only one active boost per content item
- Validates partner association

### 5. Sponsored Label Support
- Identifies boosted content (Req 8.2)
- Provides label configuration for UI display
- Batch checking for feed generation optimization

## API Methods

### Campaign Management

#### `createCampaign(data: BoostCampaignCreate): Promise<BoostCampaign>`
Creates a new boost campaign with topic targeting.

**Parameters:**
```typescript
{
  partnerId: string;
  contentId: string;
  topicId: string;      // Required (Req 8.1)
  budget: number;
  startDate: Date;
  endDate?: Date;
  costPerImpression?: number;
}
```

**Throws:**
- `Error` if topic not found
- `Error` if partner not found
- `Error` if content not eligible (Req 8.6)

#### `activateCampaign(campaignId: string): Promise<void>`
Activates a draft campaign.

**Throws:**
- `Error` if budget depleted
- `Error` if campaign expired

#### `pauseCampaign(campaignId: string): Promise<void>`
Pauses an active campaign.

### Budget Tracking

#### `recordImpression(campaignId: string): Promise<void>`
Records an impression and updates budget. Auto-depletes campaign if budget exhausted (Req 8.5).

#### `recordClick(campaignId: string): Promise<void>`
Records a click on boosted content.

#### `getBudgetStatus(campaignId: string): Promise<BudgetStatus>`
Returns detailed budget information:
```typescript
{
  budget: number;
  spent: number;
  remaining: number;
  percentageUsed: number;
  isDepleted: boolean;
}
```

#### `checkAndPauseDepletedCampaigns(): Promise<number>`
Batch operation to auto-pause depleted campaigns. Should be run periodically.

### Analytics

#### `getCampaignAnalytics(campaignId: string): Promise<BoostAnalytics>`
Returns comprehensive campaign performance metrics:
```typescript
{
  campaignId: string;
  impressions: number;
  clicks: number;
  spent: number;
  budget: number;
  remainingBudget: number;
  costPerImpression: number;
  clickThroughRate: number;
  status: string;
  daysRemaining: number;
}
```

### Content Eligibility

#### `validateBoostEligibility(contentId: string): Promise<ValidationResult>`
Validates if content can be boosted (Req 8.6).

**Validation Rules:**
1. Content must exist
2. Content category must be 'primary' or 'secondary' (not 'tertiary')
3. Content must not already be boosted
4. Content must be associated with a partner

**Returns:**
```typescript
{
  isValid: boolean;
  reason?: string;
}
```

### Sponsored Label Support

#### `isContentBoosted(contentId: string): Promise<BoostStatus>`
Checks if content is currently boosted (Req 8.2).

**Returns:**
```typescript
{
  isBoosted: boolean;
  campaignId?: string;
  partnerId?: string;
}
```

#### `getSponsoredLabel(contentId: string): Promise<SponsoredLabel | null>`
Gets sponsored label configuration for UI display (Req 8.2).

**Returns:**
```typescript
{
  showLabel: boolean;
  labelText: string;      // "Sponsored"
  campaignId?: string;
} | null
```

#### `getBoostedContentIds(contentIds: string[]): Promise<Set<string>>`
Batch operation to identify boosted content in a feed. Optimized for feed generation.

### Query Methods

#### `getActiveCampaignsForTopic(topicId: string): Promise<BoostCampaign[]>`
Gets all active campaigns for a specific topic. Used by feed generation service.

#### `getPartnerCampaigns(partnerId: string): Promise<BoostCampaign[]>`
Gets all campaigns for a partner.

#### `checkBudgetDepletion(campaignId: string): Promise<boolean>`
Checks if campaign budget is depleted.

## Usage Examples

### Creating a Boost Campaign

```typescript
import { partnerBoostCampaignService } from './services/partnerBoostCampaignService';

// Create campaign with topic targeting (Req 8.1)
const campaign = await partnerBoostCampaignService.createCampaign({
  partnerId: 'partner-123',
  contentId: 'content-456',
  topicId: 'find-your-home',  // Required
  budget: 1000,
  startDate: new Date(),
  endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
  costPerImpression: 0.10,
});
```

### Checking Content Eligibility

```typescript
// Validate before creating campaign (Req 8.6)
const validation = await partnerBoostCampaignService.validateBoostEligibility('content-456');

if (!validation.isValid) {
  console.error('Content not eligible:', validation.reason);
  // Reason might be: "Tertiary content cannot be boosted to maintain content hierarchy"
}
```

### Displaying Sponsored Label

```typescript
// Check if content is boosted (Req 8.2)
const label = await partnerBoostCampaignService.getSponsoredLabel('content-456');

if (label?.showLabel) {
  // Display "Sponsored" label in UI
  console.log('Show label:', label.labelText); // "Sponsored"
}
```

### Recording Engagement

```typescript
// Record impression (auto-depletes if budget exhausted - Req 8.5)
await partnerBoostCampaignService.recordImpression('campaign-789');

// Record click
await partnerBoostCampaignService.recordClick('campaign-789');
```

### Getting Analytics

```typescript
// Get real-time analytics (Req 8.4)
const analytics = await partnerBoostCampaignService.getCampaignAnalytics('campaign-789');

console.log(`
  Impressions: ${analytics.impressions}
  Clicks: ${analytics.clicks}
  CTR: ${analytics.clickThroughRate.toFixed(2)}%
  Spent: R${analytics.spent}
  Remaining: R${analytics.remainingBudget}
  Status: ${analytics.status}
`);
```

### Feed Generation Integration

```typescript
// Get active campaigns for topic
const activeCampaigns = await partnerBoostCampaignService.getActiveCampaignsForTopic('find-your-home');

// Batch check boosted content
const contentIds = ['content-1', 'content-2', 'content-3'];
const boostedIds = await partnerBoostCampaignService.getBoostedContentIds(contentIds);

// Add sponsored labels to boosted content
const feedItems = contentIds.map(id => ({
  id,
  isSponsored: boostedIds.has(id),
  // ... other properties
}));
```

## Periodic Maintenance

### Auto-Pause Depleted Campaigns

Run periodically (e.g., every 5 minutes):

```typescript
const pausedCount = await partnerBoostCampaignService.checkAndPauseDepletedCampaigns();
console.log(`Auto-paused ${pausedCount} depleted campaigns`);
```

### Update Expired Campaigns

Run periodically (e.g., daily):

```typescript
const expiredCount = await partnerBoostCampaignService.updateExpiredCampaigns();
console.log(`Marked ${expiredCount} campaigns as completed`);
```

## Error Handling

### Common Errors

1. **Topic Not Found**
   ```
   Error: Topic not found. Topic selection is required for boost campaigns.
   ```
   - Ensure valid topicId is provided (Req 8.1)

2. **Content Not Eligible**
   ```
   Error: Content not eligible for boost: Tertiary content cannot be boosted to maintain content hierarchy
   ```
   - Only primary and secondary content can be boosted (Req 8.6)

3. **Budget Depleted**
   ```
   Error: Cannot activate campaign: budget depleted
   ```
   - Campaign automatically set to 'depleted' status (Req 8.5)

4. **Already Boosted**
   ```
   Error: Content not eligible for boost: Content is already being boosted by an active campaign
   ```
   - Only one active boost per content item

## Database Schema

```sql
CREATE TABLE boost_campaigns (
  id VARCHAR(36) PRIMARY KEY,
  partner_id VARCHAR(36) NOT NULL,
  content_id VARCHAR(36) NOT NULL,
  topic_id VARCHAR(36) NOT NULL,      -- Required (Req 8.1)
  budget DECIMAL(10,2) NOT NULL,
  spent DECIMAL(10,2) DEFAULT 0,
  status ENUM('draft', 'active', 'paused', 'completed', 'depleted') DEFAULT 'draft',
  start_date TIMESTAMP NOT NULL,
  end_date TIMESTAMP,
  impressions INT DEFAULT 0,
  clicks INT DEFAULT 0,
  cost_per_impression DECIMAL(6,4) DEFAULT 0.10,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (partner_id) REFERENCES explore_partners(id),
  FOREIGN KEY (topic_id) REFERENCES topics(id),
  INDEX idx_boost_status (status),
  INDEX idx_boost_topic (topic_id, status),
  INDEX idx_boost_partner (partner_id)
);
```

## Integration Points

### Feed Generation Service
- Use `getActiveCampaignsForTopic()` to get boosted content
- Use `getBoostedContentIds()` for batch checking
- Enforce 1:10 boost ratio (Req 8.3)
- Call `recordImpression()` when displaying boosted content

### Content Approval Service
- Validate eligibility before allowing boost creation
- Check content category (primary/secondary only)

### Partner Dashboard
- Display campaign analytics
- Show budget status
- Allow campaign activation/pausing

### UI Components
- Display "Sponsored" label using `getSponsoredLabel()` (Req 8.2)
- Show subtle visual indicator for boosted content

## Testing

See `server/services/__tests__/partnerBoostCampaignService.test.ts` for comprehensive test coverage.

## Related Services

- `partnerService.ts` - Partner management
- `topicsService.ts` - Topic navigation
- `contentHierarchyEngine.ts` - Content categorization
- `feedRankingService.ts` - Feed generation with boost integration
