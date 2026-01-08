# Partner Service Quick Reference Guide

## Service Import

```typescript
import { partnerService } from './services/partnerService';
```

## Core Methods

### 1. Register Partner

```typescript
const partner = await partnerService.registerPartner({
  userId: "user-uuid",
  tierId: 1, // 1=Property Professional, 2=Home Service, 3=Financial, 4=Content Educator
  companyName: "Acme Properties",
  description: "Leading property developer in Cape Town",
  logoUrl: "https://example.com/logo.png",
  serviceLocations: ["Cape Town", "Johannesburg"]
});
```

**Validations:**
- Tier must exist
- User cannot have multiple partner accounts
- Returns created partner object

### 2. Assign Tier

```typescript
await partnerService.assignTier(partnerId, newTierId);
```

**Use Case:** Admin changing partner tier
**Validations:**
- Tier must exist
- Partner must exist

### 3. Update Profile

```typescript
const updated = await partnerService.updateProfile(partnerId, {
  companyName: "New Company Name",
  description: "Updated description",
  logoUrl: "https://example.com/new-logo.png",
  serviceLocations: ["Cape Town", "Durban", "Pretoria"]
});
```

**Note:** All fields are optional - only provided fields are updated

### 4. Get Partner Profile

```typescript
const profile = await partnerService.getPartnerProfile(partnerId);

// Returns:
{
  id: string,
  userId: string,
  tier: {
    id: number,
    name: string,
    allowedContentTypes: string[],
    allowedCTAs: string[]
  },
  companyName: string,
  description: string | null,
  logoUrl: string | null,
  verificationStatus: 'pending' | 'verified' | 'rejected',
  trustScore: number,
  serviceLocations: string[],
  subscriptionTier: 'free' | 'basic' | 'premium' | 'featured',
  approvedContentCount: number,
  createdAt: Date,
  updatedAt: Date
}
```

### 5. Verify Partner

```typescript
await partnerService.verifyPartner(partnerId, {
  credentials: "Professional license details",
  documentUrls: ["https://example.com/license.pdf"],
  licenseNumber: "ABC123456"
});
```

**Effects:**
- Sets verificationStatus to 'verified'
- Recalculates trust score
- Verification badge automatically propagates to all partner content

### 6. Calculate Trust Score

```typescript
const score = await partnerService.calculateTrustScore(partnerId);
// Returns: number (0-100)
```

**Algorithm:**
- Verification Status: 30 points (verified=30, pending=15, rejected=0)
- Content Quality: 30 points (average of all content quality scores)
- Reviews/Ratings: 20 points (placeholder: 10)
- Engagement Metrics: 20 points (placeholder: 10)

**Auto-triggered on:**
- Partner verification
- Content approval (future)
- Review submission (future)

### 7. Get Partners by Tier

```typescript
const partners = await partnerService.getPartnersByTier(1);
// Returns partners sorted by trust score (highest first)
```

### 8. Check Auto-Approval Eligibility

```typescript
const isEligible = await partnerService.isEligibleForAutoApproval(partnerId);
// Returns: boolean (true if partner has 3+ approved content pieces)
```

### 9. Increment Approved Content Count

```typescript
await partnerService.incrementApprovedContentCount(partnerId);
// Called automatically by Content Approval Service
```

## Partner Tiers

| Tier ID | Name | Allowed Content Types | Allowed CTAs |
|---------|------|----------------------|--------------|
| 1 | Property Professional | property_tour, development_showcase, agent_walkthrough | view_listing, contact, save |
| 2 | Home Service Provider | educational, showcase, how_to | request_quote, book_consult |
| 3 | Financial Partner | educational, market_insight | check_eligibility, learn_more |
| 4 | Content Educator | educational, inspiration, trend | follow, save, share |

## Error Handling

```typescript
try {
  await partnerService.registerPartner(data);
} catch (error) {
  if (error.message === 'Invalid tier ID: X') {
    // Handle invalid tier
  } else if (error.message === 'User already has a partner account') {
    // Handle duplicate
  } else if (error.message === 'Partner not found') {
    // Handle not found
  }
}
```

## Common Patterns

### Partner Registration Flow

```typescript
// 1. User signs up
const user = await createUser(userData);

// 2. Register as partner
const partner = await partnerService.registerPartner({
  userId: user.id,
  tierId: 1,
  companyName: "My Company",
  serviceLocations: ["Cape Town"]
});

// 3. Submit verification
await partnerService.verifyPartner(partner.id, credentials);

// 4. Check profile
const profile = await partnerService.getPartnerProfile(partner.id);
console.log(`Trust Score: ${profile.trustScore}`);
```

### Content Approval Integration

```typescript
// When content is approved
await partnerService.incrementApprovedContentCount(partnerId);

// Check if now eligible for auto-approval
const canAutoApprove = await partnerService.isEligibleForAutoApproval(partnerId);
if (canAutoApprove) {
  console.log('Partner now eligible for auto-approval!');
}
```

### Trust Score Monitoring

```typescript
// Recalculate after significant events
await partnerService.calculateTrustScore(partnerId);

// Get updated profile
const profile = await partnerService.getPartnerProfile(partnerId);

if (profile.trustScore < 40) {
  // Alert partner about low trust score
  await sendLowTrustScoreNotification(partnerId);
}
```

## Database Relations

The service automatically handles these relationships:
- Partner → Tier (one-to-one)
- Partner → Subscriptions (one-to-many)
- Partner → Boost Campaigns (one-to-many)
- Partner → Leads (one-to-many)
- Partner → Content (one-to-many)
- Partner → Shorts (one-to-many)

## Performance Considerations

- Profile queries include tier information (single join)
- Trust score calculation queries content quality scores (may be slow for partners with many content pieces)
- Consider caching trust scores and recalculating periodically
- Service locations stored as JSON for flexible querying

## Security Notes

- Tier assignment requires admin role (enforced in router)
- Profile updates require ownership verification (enforced in router)
- Verification submission requires ownership verification (enforced in router)
- Trust score calculation is public (no auth required)
