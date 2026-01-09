# Partner Boost Campaign Service - Quick Reference

## Core Concepts

**Boost Campaign**: Paid promotion that increases content visibility within topic-specific feeds.

**Key Requirements**:
- ✅ Topic selection required (Req 8.1)
- ✅ "Sponsored" label on boosted content (Req 8.2)
- ✅ 1:10 boost ratio limit (Req 8.3) - enforced by feed generation
- ✅ Budget/impression/click tracking (Req 8.4)
- ✅ Auto-pause when depleted (Req 8.5)
- ✅ Content hierarchy validation (Req 8.6)

## Quick Start

### 1. Create Campaign

```typescript
const campaign = await partnerBoostCampaignService.createCampaign({
  partnerId: 'partner-123',
  contentId: 'content-456',
  topicId: 'find-your-home',  // REQUIRED
  budget: 1000,
  startDate: new Date(),
  endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
});
```

### 2. Activate Campaign

```typescript
await partnerBoostCampaignService.activateCampaign(campaign.id);
```

### 3. Check if Content is Boosted

```typescript
const label = await partnerBoostCampaignService.getSponsoredLabel('content-456');
if (label?.showLabel) {
  // Display "Sponsored" label
}
```

### 4. Record Engagement

```typescript
// On display
await partnerBoostCampaignService.recordImpression(campaignId);

// On click
await partnerBoostCampaignService.recordClick(campaignId);
```

## API Endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/api/partner-boost-campaigns` | Create campaign |
| PUT | `/api/partner-boost-campaigns/:id/activate` | Activate campaign |
| PUT | `/api/partner-boost-campaigns/:id/pause` | Pause campaign |
| GET | `/api/partner-boost-campaigns/:id/analytics` | Get analytics |
| GET | `/api/partner-boost-campaigns/:id/budget` | Get budget status |
| GET | `/api/partner-boost-campaigns/partner/:partnerId` | Get partner campaigns |
| GET | `/api/partner-boost-campaigns/topic/:topicId/active` | Get active campaigns for topic |
| GET | `/api/partner-boost-campaigns/content/:contentId/boosted` | Check if boosted |
| GET | `/api/partner-boost-campaigns/content/:contentId/sponsored-label` | Get sponsored label |
| POST | `/api/partner-boost-campaigns/validate-eligibility` | Validate eligibility |
| POST | `/api/partner-boost-campaigns/:id/impression` | Record impression |
| POST | `/api/partner-boost-campaigns/:id/click` | Record click |

## Validation Rules (Req 8.6)

Content is eligible for boost if:
- ✅ Content exists
- ✅ Content category is 'primary' or 'secondary' (NOT 'tertiary')
- ✅ Content is not already boosted
- ✅ Content has partner association

**Tertiary content CANNOT be boosted** to maintain content hierarchy.

## Campaign Statuses

| Status | Description |
|--------|-------------|
| `draft` | Created but not activated |
| `active` | Currently running |
| `paused` | Manually paused by partner |
| `completed` | End date reached |
| `depleted` | Budget exhausted (auto-paused) |

## Budget Tracking (Req 8.5)

Campaign automatically transitions to `depleted` status when:
```
spent >= budget
```

Check budget status:
```typescript
const status = await partnerBoostCampaignService.getBudgetStatus(campaignId);
// Returns: { budget, spent, remaining, percentageUsed, isDepleted }
```

## Analytics (Req 8.4)

```typescript
const analytics = await partnerBoostCampaignService.getCampaignAnalytics(campaignId);
```

Returns:
- `impressions` - Total impressions
- `clicks` - Total clicks
- `spent` - Amount spent
- `budget` - Total budget
- `remainingBudget` - Budget remaining
- `costPerImpression` - Cost per impression
- `clickThroughRate` - CTR percentage
- `status` - Current status
- `daysRemaining` - Days until end date

## Feed Integration

### Get Active Campaigns for Topic

```typescript
const campaigns = await partnerBoostCampaignService.getActiveCampaignsForTopic('find-your-home');
```

### Batch Check Boosted Content

```typescript
const contentIds = ['content-1', 'content-2', 'content-3'];
const boostedIds = await partnerBoostCampaignService.getBoostedContentIds(contentIds);

// boostedIds is a Set<string> of boosted content IDs
```

### Display Sponsored Label (Req 8.2)

```typescript
// In feed component
const label = await partnerBoostCampaignService.getSponsoredLabel(contentId);

if (label?.showLabel) {
  return (
    <div className="sponsored-badge">
      {label.labelText} {/* "Sponsored" */}
    </div>
  );
}
```

## Common Patterns

### Create and Activate

```typescript
// 1. Validate eligibility
const validation = await partnerBoostCampaignService.validateBoostEligibility(contentId);
if (!validation.isValid) {
  throw new Error(validation.reason);
}

// 2. Create campaign
const campaign = await partnerBoostCampaignService.createCampaign({
  partnerId,
  contentId,
  topicId,  // REQUIRED
  budget,
  startDate: new Date(),
});

// 3. Activate
await partnerBoostCampaignService.activateCampaign(campaign.id);
```

### Monitor Budget

```typescript
// Check if depleted
const isDepleted = await partnerBoostCampaignService.checkBudgetDepletion(campaignId);

if (isDepleted) {
  // Campaign automatically paused
  console.log('Campaign budget depleted');
}
```

### Periodic Maintenance

```typescript
// Run every 5 minutes
const pausedCount = await partnerBoostCampaignService.checkAndPauseDepletedCampaigns();

// Run daily
const expiredCount = await partnerBoostCampaignService.updateExpiredCampaigns();
```

## Error Messages

| Error | Cause | Solution |
|-------|-------|----------|
| "Topic not found" | Invalid topicId | Provide valid topic ID |
| "Content not eligible: Tertiary content..." | Trying to boost tertiary content | Only boost primary/secondary content |
| "Content is already being boosted" | Content has active campaign | Wait for current campaign to end |
| "Cannot activate: budget depleted" | Budget exhausted | Add more budget or create new campaign |
| "Cannot activate: campaign expired" | End date passed | Create new campaign |

## Best Practices

1. **Always validate eligibility** before creating campaigns
2. **Set realistic budgets** based on expected impressions
3. **Monitor analytics** regularly to optimize performance
4. **Use topic targeting** to reach relevant audiences
5. **Respect content hierarchy** - don't boost tertiary content
6. **Display sponsored labels** clearly for transparency
7. **Run periodic maintenance** to auto-pause depleted campaigns

## Integration Checklist

- [ ] Create campaign with topic selection (Req 8.1)
- [ ] Validate content eligibility (Req 8.6)
- [ ] Display "Sponsored" label on boosted content (Req 8.2)
- [ ] Record impressions when displaying boosted content (Req 8.4)
- [ ] Record clicks when user interacts (Req 8.4)
- [ ] Check budget status regularly (Req 8.5)
- [ ] Enforce 1:10 boost ratio in feed generation (Req 8.3)
- [ ] Show analytics in partner dashboard (Req 8.4)
- [ ] Handle auto-pause on budget depletion (Req 8.5)

## Related Documentation

- `partnerBoostCampaignService.README.md` - Full documentation
- `feedRankingService.README.md` - Feed generation with boosts
- `contentHierarchyEngine.README.md` - Content categorization
- `topicsService.README.md` - Topic navigation
