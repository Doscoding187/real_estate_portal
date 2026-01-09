# Partner Subscription Service - Quick Reference

## Subscription Tiers

| Tier | Price | Reach | Content/Month | Analytics | Support | Boost Discount |
|------|-------|-------|---------------|-----------|---------|----------------|
| Free | R0 | 0.5x | 5 | Basic | Community | 0% |
| Basic | R500 | 1.0x | 20 | Basic | Community | 0% |
| Premium | R2000 | 1.5x | 50 | Detailed | Priority | 10% |
| Featured | R5000 | 2.0x | 100 | Advanced | Dedicated | 20% |

## Common Operations

### Create Subscription
```typescript
const subscription = await createSubscription('partner-id', 'premium');
```

### Get Current Subscription
```typescript
const subscription = await getPartnerSubscription('partner-id');
```

### Upgrade (Immediate)
```typescript
await upgradeSubscription('subscription-id', 'featured');
```

### Cancel (Downgrades to Basic)
```typescript
await cancelSubscription('subscription-id');
```

### Check Feature Access
```typescript
const hasAccess = await checkFeatureAccess('partner-id', 'analytics_level');
```

### Check Action Permission
```typescript
const result = await canPerformAction('partner-id', 'create_content');
```

## API Endpoints

```http
GET    /api/subscriptions/pricing
GET    /api/subscriptions/partner/:partnerId
POST   /api/subscriptions
PUT    /api/subscriptions/:id/upgrade
DELETE /api/subscriptions/:id
POST   /api/subscriptions/check-feature
POST   /api/subscriptions/check-action
```

## Middleware

```typescript
// Require feature
requirePartnerFeature('max_monthly_content')

// Require action
requirePartnerAction('create_content')

// Attach subscription
attachPartnerSubscription
```

## State Transitions

```
Free → Basic/Premium/Featured (Subscribe)
Basic → Premium/Featured (Upgrade - Immediate)
Premium → Featured (Upgrade - Immediate)
Premium/Featured → Basic (Cancel/Expire)
```

## Requirements Validated

- **7.1**: Basic tier (R500/month) features
- **7.2**: Premium tier (R2000/month) features
- **7.3**: Featured tier (R5000/month) features
- **7.4**: Upgrades apply immediately
- **7.5**: Lapses downgrade to basic
- **7.6**: Free tier with limited features
