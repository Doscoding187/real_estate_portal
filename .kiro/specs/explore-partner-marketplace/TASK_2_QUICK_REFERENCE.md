# Task 2: Partner Management Service - Quick Reference

## Service Methods

### Partner Registration
```typescript
import { partnerService } from './services/partnerService';

// Register new partner
const partner = await partnerService.registerPartner({
  userId: 123,
  tierId: 1, // 1=Property Professional, 2=Home Service, 3=Financial, 4=Content Educator
  companyName: "Elite Properties",
  description: "Premium property listings",
  logoUrl: "https://example.com/logo.png",
  serviceLocations: ["Johannesburg", "Cape Town"]
});
```

### Profile Management
```typescript
// Get partner profile
const profile = await partnerService.getPartnerProfile(partnerId);

// Update profile
await partnerService.updateProfile(partnerId, {
  companyName: "Updated Name",
  description: "Updated description",
  serviceLocations: ["Johannesburg", "Cape Town", "Durban"]
});
```

### Verification
```typescript
// Verify partner
await partnerService.verifyPartner(partnerId, {
  credentials: "PPRA License",
  documentUrls: ["https://example.com/license.pdf"],
  licenseNumber: "PPRA-12345"
});
```

### Trust Score
```typescript
// Calculate trust score
const score = await partnerService.calculateTrustScore(partnerId);
// Returns: 0-100 based on verification (30%), quality (30%), reviews (20%), engagement (20%)
```

### Helper Methods
```typescript
// Check auto-approval eligibility
const eligible = await partnerService.isEligibleForAutoApproval(partnerId);
// Returns true if partner has 3+ approved content pieces

// Increment approved content count
await partnerService.incrementApprovedContentCount(partnerId);

// Get partners by tier
const partners = await partnerService.getPartnersByTier(1);
```

## API Endpoints

### POST /api/partners
Register new partner (authenticated)
```json
{
  "tierId": 1,
  "companyName": "Elite Properties",
  "description": "Premium property listings",
  "logoUrl": "https://example.com/logo.png",
  "serviceLocations": ["Johannesburg", "Cape Town"]
}
```

### GET /api/partners/:id
Get partner profile (public)

### PUT /api/partners/:id
Update partner profile (authenticated, owner only)
```json
{
  "companyName": "Updated Name",
  "description": "Updated description",
  "serviceLocations": ["Johannesburg", "Cape Town", "Durban"]
}
```

### POST /api/partners/:id/verify
Submit verification (authenticated, owner only)
```json
{
  "credentials": "PPRA License",
  "documentUrls": ["https://example.com/license.pdf"],
  "licenseNumber": "PPRA-12345"
}
```

### PUT /api/partners/:id/tier
Assign tier (admin only)
```json
{
  "tierId": 2
}
```

### POST /api/partners/:id/trust-score
Recalculate trust score (authenticated)

### GET /api/partners/tier/:tierId
Get partners by tier (public)

## Partner Tiers

| Tier ID | Name | Allowed Content Types | Allowed CTAs |
|---------|------|----------------------|--------------|
| 1 | Property Professional | property_tour, development_showcase, agent_walkthrough | view_listing, contact, save |
| 2 | Home Service Provider | educational, showcase, how_to | request_quote, book_consult |
| 3 | Financial Partner | educational, market_insight | check_eligibility, learn_more |
| 4 | Content Educator | educational, inspiration, trend | follow, save, share |

## Trust Score Components

| Component | Weight | Description |
|-----------|--------|-------------|
| Verification Status | 30% | Verified=30pts, Pending=15pts, Rejected=0pts |
| Content Quality | 30% | Average quality score of all content |
| User Reviews | 20% | Aggregated user ratings and reviews |
| Engagement Metrics | 20% | Watch time, saves, click-throughs |

**Score Range**: 0-100

## Verification Status

- **pending** - Initial status, awaiting verification
- **verified** - Credentials validated, badge displayed
- **rejected** - Verification failed

## Subscription Tiers

- **free** - Default tier, limited features
- **basic** - R500/month
- **premium** - R2,000/month
- **featured** - R5,000/month

## Auto-Approval Eligibility

Partners become eligible for auto-approval after:
- ✅ 3+ approved content pieces
- ✅ No recent violations

Check eligibility:
```typescript
const eligible = await partnerService.isEligibleForAutoApproval(partnerId);
```

## Common Workflows

### New Partner Onboarding
1. User registers → `POST /api/partners`
2. Partner status: `pending`
3. Submit verification → `POST /api/partners/:id/verify`
4. Admin reviews credentials
5. Status changes to `verified`
6. Verification badge appears on all content

### Content Submission Flow
1. Partner submits content
2. Check auto-approval eligibility
3. If eligible (3+ approved): auto-approve
4. If not eligible: route to manual review
5. On approval: increment approved content count

### Trust Score Update
1. Content approved/rejected
2. User reviews submitted
3. Engagement metrics updated
4. Call `calculateTrustScore(partnerId)`
5. Score updates in database
6. Affects feed ranking (10% weight)

## Error Handling

```typescript
try {
  await partnerService.registerPartner(data);
} catch (error) {
  // Common errors:
  // - "Invalid tier ID: X"
  // - "User already has a partner account"
  // - "Partner not found"
}
```

## Integration Points

### With Content Approval Service (Task 3)
```typescript
// Check if partner can auto-approve
const canAutoApprove = await partnerService.isEligibleForAutoApproval(partnerId);

// After content approval
await partnerService.incrementApprovedContentCount(partnerId);
```

### With Feed Ranking Service (Task 8)
```typescript
// Get trust score for ranking
const profile = await partnerService.getPartnerProfile(partnerId);
const trustScore = profile.trustScore; // Used in ranking algorithm (10% weight)
```

### With Subscription Service (Task 15)
```typescript
// Update subscription tier
await db.update(partners)
  .set({ subscriptionTier: 'premium' })
  .where(eq(partners.id, partnerId));
```

## Database Queries

### Get Partner with Tier Info
```typescript
const partner = await db.query.partners.findFirst({
  where: eq(partners.id, partnerId),
  with: {
    tier: true
  }
});
```

### Get Verified Partners
```typescript
const verified = await db.query.partners.findMany({
  where: eq(partners.verificationStatus, 'verified'),
  orderBy: [desc(partners.trustScore)]
});
```

### Get Partners by Location
```typescript
// Service locations stored as JSON array
const partners = await db.query.partners.findMany();
const filtered = partners.filter(p => {
  const locations = JSON.parse(p.serviceLocations);
  return locations.includes('Johannesburg');
});
```

## Testing Checklist

- [ ] Register partner with valid tier
- [ ] Register partner with invalid tier (should fail)
- [ ] Register duplicate partner (should fail)
- [ ] Get partner profile
- [ ] Update partner profile (owner)
- [ ] Update partner profile (non-owner, should fail)
- [ ] Submit verification
- [ ] Calculate trust score
- [ ] Check auto-approval eligibility
- [ ] Assign tier (admin)
- [ ] Assign tier (non-admin, should fail)
- [ ] Get partners by tier

---

**Quick Links**:
- [Task 2 Complete Documentation](./TASK_2_COMPLETE.md)
- [Requirements](./requirements.md)
- [Design Document](./design.md)
- [Tasks Overview](./tasks.md)
