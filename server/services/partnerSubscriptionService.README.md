# Partner Subscription Service

Manages partner subscription tiers, feature access control, and state transitions for the Explore Partner Marketplace system.

## Overview

The Partner Subscription Service provides a complete subscription management system with four tiers:

- **Free**: Limited features with reduced visibility (R0/month)
- **Basic**: Standard profile with basic analytics and organic reach (R500/month)
- **Premium**: Enhanced profile with detailed analytics and priority support (R2000/month)
- **Featured**: Premium placement with advanced analytics and dedicated support (R5000/month)

## Requirements Validated

- **7.1**: Basic tier (R500/month) provides standard profile, basic analytics, and organic reach
- **7.2**: Premium tier (R2,000/month) provides enhanced profile, detailed analytics, priority support, and increased reach
- **7.3**: Featured tier (R5,000/month) provides premium profile placement, advanced analytics, dedicated support, and maximum organic reach
- **7.4**: Subscription upgrades apply new benefits immediately
- **7.5**: Subscription lapses downgrade partner to Basic tier features
- **7.6**: Partners without subscription have limited free content with reduced visibility

## Subscription Tiers

### Free Tier
```typescript
{
  tier: 'free',
  price_monthly: 0,
  features: {
    profile_type: 'standard',
    analytics_level: 'basic',
    support_level: 'community',
    organic_reach_multiplier: 0.5,
    max_monthly_content: 5,
    boost_discount_percent: 0,
  }
}
```

### Basic Tier (R500/month)
```typescript
{
  tier: 'basic',
  price_monthly: 500,
  features: {
    profile_type: 'standard',
    analytics_level: 'basic',
    support_level: 'community',
    organic_reach_multiplier: 1.0,
    max_monthly_content: 20,
    boost_discount_percent: 0,
  }
}
```

### Premium Tier (R2000/month)
```typescript
{
  tier: 'premium',
  price_monthly: 2000,
  features: {
    profile_type: 'enhanced',
    analytics_level: 'detailed',
    support_level: 'priority',
    organic_reach_multiplier: 1.5,
    max_monthly_content: 50,
    boost_discount_percent: 10,
  }
}
```

### Featured Tier (R5000/month)
```typescript
{
  tier: 'featured',
  price_monthly: 5000,
  features: {
    profile_type: 'premium',
    analytics_level: 'advanced',
    support_level: 'dedicated',
    organic_reach_multiplier: 2.0,
    max_monthly_content: 100,
    boost_discount_percent: 20,
  }
}
```

## Core Functions

### Subscription Management

#### `createSubscription(partnerId, tier)`
Creates a new subscription for a partner.

```typescript
const subscription = await createSubscription('partner-uuid', 'premium');
// Returns: PartnerSubscription object
```

#### `getPartnerSubscription(partnerId)`
Gets partner's current active subscription.

```typescript
const subscription = await getPartnerSubscription('partner-uuid');
// Returns: PartnerSubscription | null
```

#### `getPartnerSubscriptionHistory(partnerId)`
Gets all subscriptions for a partner (including historical).

```typescript
const history = await getPartnerSubscriptionHistory('partner-uuid');
// Returns: PartnerSubscription[]
```

### State Transitions

#### `upgradeSubscription(subscriptionId, newTier)`
Upgrades subscription with immediate benefit application (Requirement 7.4).

```typescript
await upgradeSubscription('subscription-uuid', 'featured');
// Benefits applied immediately
```

#### `cancelSubscription(subscriptionId)`
Cancels subscription and downgrades to basic tier (Requirement 7.5).

```typescript
await cancelSubscription('subscription-uuid');
// Automatically creates new basic tier subscription
```

#### `handleExpiredSubscription(subscriptionId)`
Handles subscription expiration and downgrades to basic (Requirement 7.5).

```typescript
await handleExpiredSubscription('subscription-uuid');
// Called by cron job for expired subscriptions
```

### Feature Access Control

#### `checkFeatureAccess(partnerId, feature)`
Checks if partner has access to a specific feature (Requirements 7.1, 7.2, 7.3).

```typescript
const hasAccess = await checkFeatureAccess('partner-uuid', 'analytics_level');
// Returns: boolean
```

#### `getFeatureValue(partnerId, feature)`
Gets the value of a feature for a partner.

```typescript
const reachMultiplier = await getFeatureValue('partner-uuid', 'organic_reach_multiplier');
// Returns: 0.5 | 1.0 | 1.5 | 2.0
```

#### `canPerformAction(partnerId, action)`
Checks if partner can perform a specific action.

```typescript
const result = await canPerformAction('partner-uuid', 'create_content');
// Returns: { allowed: boolean, reason?: string }
```

## API Endpoints

### Get Pricing Information

```http
GET /api/subscriptions/pricing
```

Returns all subscription tier pricing.

### Get Partner Subscription

```http
GET /api/subscriptions/partner/:partnerId
```

Returns partner's current active subscription.

### Create Subscription

```http
POST /api/subscriptions
Content-Type: application/json

{
  "partner_id": "uuid",
  "tier": "premium"
}
```

Creates a new subscription for a partner.

### Upgrade Subscription

```http
PUT /api/subscriptions/:id/upgrade
Content-Type: application/json

{
  "new_tier": "featured"
}
```

Upgrades subscription with immediate benefit application.

### Cancel Subscription

```http
DELETE /api/subscriptions/:id
```

Cancels subscription and downgrades to basic tier.

### Check Feature Access

```http
POST /api/subscriptions/check-feature
Content-Type: application/json

{
  "partner_id": "uuid",
  "feature": "analytics_level"
}
```

Checks if partner has access to a specific feature.

## Middleware Usage

### Require Feature Access

```typescript
import { requirePartnerFeature } from './middleware/partnerFeatureAccess';

router.post('/content', 
  requirePartnerFeature('max_monthly_content'),
  async (req, res) => {
    // Only accessible if partner has this feature
  }
);
```

### Require Action Permission

```typescript
import { requirePartnerAction } from './middleware/partnerFeatureAccess';

router.post('/content', 
  requirePartnerAction('create_content'),
  async (req, res) => {
    // Only accessible if partner can create content
  }
);
```

### Attach Subscription to Request

```typescript
import { attachPartnerSubscription } from './middleware/partnerFeatureAccess';

router.get('/dashboard', 
  attachPartnerSubscription,
  async (req, res) => {
    const subscription = req.partnerSubscription;
    // Use subscription data
  }
);
```

## State Transition Rules

### Valid Transitions

1. **Free → Basic/Premium/Featured**: Partner subscribes
2. **Basic → Premium/Featured**: Partner upgrades (immediate)
3. **Premium → Featured**: Partner upgrades (immediate)
4. **Premium → Basic**: Partner downgrades or cancels
5. **Featured → Premium/Basic**: Partner downgrades or cancels
6. **Any → Basic**: Subscription expires or is cancelled

### Immediate vs Scheduled

- **Upgrades**: Always immediate (Requirement 7.4)
- **Downgrades**: Immediate when cancelled (Requirement 7.5)
- **Expiration**: Automatic downgrade to basic (Requirement 7.5)

## Feature Access Matrix

| Feature | Free | Basic | Premium | Featured |
|---------|------|-------|---------|----------|
| Profile Type | Standard | Standard | Enhanced | Premium |
| Analytics | Basic | Basic | Detailed | Advanced |
| Support | Community | Community | Priority | Dedicated |
| Reach Multiplier | 0.5x | 1.0x | 1.5x | 2.0x |
| Monthly Content | 5 | 20 | 50 | 100 |
| Boost Discount | 0% | 0% | 10% | 20% |

## Cron Jobs

### Process Expired Subscriptions

Run daily to handle expired subscriptions:

```typescript
import { processExpiredSubscriptions } from './services/partnerSubscriptionService';

// In your cron job
await processExpiredSubscriptions();
```

This automatically:
1. Finds subscriptions past their end date
2. Marks them as expired
3. Downgrades partners to basic tier

## Error Handling

### Subscription Errors

| Error | Status | Response |
|-------|--------|----------|
| Payment failed | 402 | Payment Required |
| Invalid tier upgrade | 400 | Bad Request with valid options |
| Subscription not found | 404 | Not Found |
| Subscription already exists | 409 | Conflict |

### Feature Access Errors

| Error | Status | Response |
|-------|--------|----------|
| Feature not available | 403 | Forbidden with upgrade prompt |
| Action not allowed | 403 | Forbidden with reason |
| Monthly limit reached | 403 | Forbidden with limit info |

## Testing

### Unit Tests

Test subscription creation, upgrades, downgrades, and feature access:

```typescript
describe('Partner Subscription Service', () => {
  it('should create subscription with correct features', async () => {
    const subscription = await createSubscription('partner-id', 'premium');
    expect(subscription.tier).toBe('premium');
    expect(subscription.features.organic_reach_multiplier).toBe(1.5);
  });

  it('should upgrade subscription immediately', async () => {
    const subscription = await createSubscription('partner-id', 'basic');
    await upgradeSubscription(subscription.id, 'premium');
    const updated = await getPartnerSubscription('partner-id');
    expect(updated?.tier).toBe('premium');
  });

  it('should downgrade to basic on cancellation', async () => {
    const subscription = await createSubscription('partner-id', 'premium');
    await cancelSubscription(subscription.id);
    const updated = await getPartnerSubscription('partner-id');
    expect(updated?.tier).toBe('basic');
  });
});
```

### Property-Based Tests

Property tests should verify:
- **Property 7**: Subscription feature access matches tier definition
- **Property 8**: State transitions maintain data integrity

## Integration Points

### Partner Service
- Check subscription tier when displaying partner profile
- Apply organic reach multiplier to content ranking

### Content Service
- Check monthly content limit before allowing submission
- Apply boost discount based on subscription tier

### Analytics Service
- Filter analytics data based on analytics_level feature
- Show upgrade prompts for advanced analytics

### Support Service
- Route support requests based on support_level feature
- Prioritize premium/featured partner requests

## Best Practices

1. **Always check feature access** before allowing actions
2. **Use middleware** for consistent access control
3. **Handle expired subscriptions** with daily cron job
4. **Apply upgrades immediately** (Requirement 7.4)
5. **Downgrade to basic** on cancellation/expiration (Requirement 7.5)
6. **Show upgrade prompts** when features are blocked
7. **Track subscription events** for analytics and billing

## Related Services

- `partnerService.ts` - Partner registration and profiles
- `contentApprovalService.ts` - Content submission and approval
- `feedRankingService.ts` - Content ranking with reach multipliers
- `boostCampaignService.ts` - Boost campaigns with tier discounts
