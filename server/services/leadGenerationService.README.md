# Lead Generation Service

## Overview

The Lead Generation Service handles lead capture, pricing, partner notification, and dispute management for the Explore Partner Marketplace. It implements a dynamic pricing model based on lead type and partner factors.

## Requirements Coverage

- **9.1**: Quote request leads (R50-R200)
- **9.2**: Consultation leads (R100-R300)
- **9.3**: Eligibility check leads (R500-R1000)
- **9.4**: Capture contact info and intent details
- **9.5**: Notify partners immediately
- **9.6**: Handle lead disputes and refunds

## Lead Types

### 1. Quote Request (R50-R200)
- User requests a quote for a service
- Typically from Home Service Provider partners (Tier 2)
- Examples: Renovation quote, security system quote

### 2. Consultation (R100-R300)
- User books a consultation session
- Can be from any partner tier
- Examples: Financial consultation, design consultation

### 3. Eligibility Check (R500-R1000)
- User checks eligibility for a service
- Typically from Financial Partner partners (Tier 3)
- Examples: Bond pre-qualification, insurance eligibility

## Pricing Model

Lead prices are calculated dynamically based on:

1. **Lead Type** (60% weight)
   - Base range determined by type
   - Quote Request: R50-R200
   - Consultation: R100-R300
   - Eligibility Check: R500-R1000

2. **Partner Trust Score** (50% of dynamic weight)
   - Higher trust score = higher lead price
   - Verified partners command premium prices

3. **Content Engagement** (30% of dynamic weight)
   - Content that drives the lead
   - Higher engagement = higher quality lead

4. **User Quality** (20% of dynamic weight)
   - Profile completeness
   - Engagement history

### Pricing Formula

```typescript
const range = getPricingRange(type);
const weight = (
  partnerTrustScore * 0.5 +
  contentEngagement * 0.3 +
  userQuality * 0.2
);
const price = range.min + (range.max - range.min) * weight;
// Round to nearest R10
```

## Lead Lifecycle

```
NEW → CONTACTED → CONVERTED
  ↓
DISPUTED → REFUNDED or back to CONTACTED
```

### Status Definitions

- **new**: Lead just created, partner notified
- **contacted**: Partner has reached out to user
- **converted**: User became a customer
- **disputed**: Partner disputes lead quality
- **refunded**: Dispute approved, partner refunded

## API Usage

### Create a Lead

```typescript
import { leadGenerationService } from './services/leadGenerationService';

const lead = await leadGenerationService.createLead({
  partnerId: 'partner-uuid',
  userId: 'user-uuid',
  contentId: 'content-uuid', // Optional
  type: 'quote_request',
  contactInfo: {
    name: 'John Doe',
    email: 'john@example.com',
    phone: '+27821234567',
    preferredContactMethod: 'email'
  },
  intentDetails: 'Looking for kitchen renovation quote'
});
```

### Get Partner Leads

```typescript
const leads = await leadGenerationService.getPartnerLeads('partner-uuid', {
  status: 'new',
  type: 'consultation',
  limit: 20,
  offset: 0
});
```

### Calculate Lead Price

```typescript
const price = await leadGenerationService.calculateLeadPrice(
  'eligibility_check',
  'partner-uuid'
);
// Returns: 750 (example, based on partner factors)
```

### Dispute a Lead

```typescript
await leadGenerationService.disputeLead(
  'lead-uuid',
  'User did not respond to multiple contact attempts'
);
```

### Process Dispute (Admin)

```typescript
// Approve dispute and refund
await leadGenerationService.processDispute('lead-uuid', 'refund');

// Reject dispute
await leadGenerationService.processDispute('lead-uuid', 'reject');
```

### Get Conversion Funnel

```typescript
const funnel = await leadGenerationService.getLeadConversionFunnel('partner-uuid');
// Returns:
// {
//   totalLeads: 100,
//   contacted: 85,
//   converted: 42,
//   disputed: 5,
//   refunded: 2,
//   conversionRate: 42.0,
//   averagePrice: 175.50
// }
```

## Partner Notification

When a lead is created, the partner is notified immediately via:

1. **Email Notification** (TODO: Implement)
   - Lead details
   - Contact information
   - Intent details
   - Action link to dashboard

2. **Dashboard Notification** (TODO: Implement)
   - Real-time notification badge
   - Lead preview in notification center

3. **SMS/WhatsApp** (Optional, TODO: Implement)
   - For urgent leads
   - Configurable per partner

4. **Webhook** (Optional, TODO: Implement)
   - For partners with CRM integration
   - POST to partner's webhook URL

## Dispute Handling

### Partner Dispute Process

1. Partner disputes lead within 48 hours
2. Provides reason for dispute
3. Lead status changes to 'disputed'
4. Admin team reviews within 48 hours

### Valid Dispute Reasons

- User contact information incorrect
- User not responsive after multiple attempts
- User not genuinely interested
- Duplicate lead
- Lead outside service area

### Admin Review Process

1. Review lead details and dispute reason
2. Check partner's dispute history
3. Verify user contact attempts
4. Make decision: refund or reject

### Refund Policy

- Full refund if dispute is valid
- No refund if partner didn't attempt contact
- Partial refund for edge cases (manual adjustment)

## Best Practices

### For Partners

1. **Respond Quickly**: Contact leads within 1 hour for best conversion
2. **Document Contact**: Keep records of contact attempts
3. **Quality Over Quantity**: Focus on converting leads, not disputing
4. **Update Status**: Mark leads as contacted/converted promptly

### For Platform

1. **Monitor Dispute Rate**: High dispute rate indicates quality issues
2. **Track Conversion**: Low conversion may indicate poor lead quality
3. **Partner Education**: Train partners on lead follow-up
4. **Quality Scoring**: Use conversion data to improve lead quality

## Testing

```typescript
// Test lead creation
const testLead = await leadGenerationService.createLead({
  partnerId: 'test-partner',
  userId: 'test-user',
  type: 'quote_request',
  contactInfo: {
    name: 'Test User',
    email: 'test@example.com',
    phone: '+27821234567'
  }
});

// Test pricing calculation
const price = await leadGenerationService.calculateLeadPrice(
  'consultation',
  'test-partner'
);
expect(price).toBeGreaterThanOrEqual(100);
expect(price).toBeLessThanOrEqual(300);

// Test dispute handling
await leadGenerationService.disputeLead(testLead.id, 'Test dispute');
const disputedLead = await leadGenerationService.getLeadById(testLead.id);
expect(disputedLead?.status).toBe('disputed');
```

## Future Enhancements

1. **Lead Scoring**: Predict lead quality before charging
2. **Auto-Refund**: Automatic refund for clearly invalid leads
3. **Lead Routing**: Route leads to multiple partners
4. **Performance Bonuses**: Reward high-converting partners
5. **Lead Nurturing**: Automated follow-up sequences
6. **Integration APIs**: Connect with partner CRMs
7. **Analytics Dashboard**: Detailed lead performance metrics
8. **A/B Testing**: Test different pricing models

## Related Services

- **PartnerService**: Partner management and verification
- **ContentApprovalService**: Content that drives leads
- **SubscriptionService**: Partner subscription tiers
- **AnalyticsService**: Lead performance tracking
