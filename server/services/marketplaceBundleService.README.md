# Marketplace Bundle Service

## Overview

The Marketplace Bundle Service manages curated collections of partners grouped by category to help users find all the services they need in one place. For example, a "First-Time Buyer Bundle" includes partners for Finance, Legal, Inspection, and Insurance.

## Key Features

- **Bundle Management**: Create and manage marketplace bundles
- **Partner Curation**: Add/remove partners from bundles with category assignment
- **Partner Display**: Show partner ratings and verification status
- **Performance Tracking**: Monitor and update partner performance within bundles
- **Category Validation**: Ensure bundles have required partner categories

## Requirements Validation

- **Requirement 12.1**: Bundles display curated partners for Finance, Legal, Inspection, Insurance
- **Requirement 12.4**: Bundle display shows partner ratings and verification status

## API Usage

### Get All Active Bundles

```typescript
const bundles = await marketplaceBundleService.getActiveBundles();
```

### Get Bundle with Partners

```typescript
const bundle = await marketplaceBundleService.getBundleWithPartners(bundleId);

// Returns:
{
  id: string;
  slug: string;
  name: string;
  description: string;
  partners: [
    {
      partnerId: string;
      companyName: string;
      verificationStatus: 'verified' | 'pending' | 'rejected';
      trustScore: number;
      category: string; // 'Finance', 'Legal', 'Inspection', 'Insurance'
      performanceScore: number;
      averageRating?: number;
      reviewCount?: number;
    }
  ]
}
```

### Add Partner to Bundle

```typescript
await marketplaceBundleService.addPartnerToBundle({
  bundleId: 'bundle-123',
  partnerId: 'partner-456',
  category: 'Finance',
  displayOrder: 1,
  inclusionFee: 500.00
});
```

### Validate Bundle Categories

```typescript
const validation = await marketplaceBundleService.validateBundleCategories(
  bundleId,
  ['Finance', 'Legal', 'Inspection', 'Insurance']
);

// Returns:
{
  valid: boolean;
  missingCategories: string[];
}
```

## Bundle Categories

Common bundle categories:

- **Finance**: Bond originators, mortgage advisors, financial planners
- **Legal**: Conveyancing attorneys, property lawyers
- **Inspection**: Home inspectors, building inspectors, pest control
- **Insurance**: Home insurance, bond insurance, life insurance

## Partner Performance Tracking

Partners in bundles have a performance score (0-100) based on:
- User engagement with their content
- Lead conversion rates
- User reviews and ratings
- Response time to leads

### Update Performance Score

```typescript
await marketplaceBundleService.updatePartnerPerformance(
  bundleId,
  partnerId,
  85.5 // New performance score
);
```

### Get Underperforming Partners

```typescript
const underperforming = await marketplaceBundleService.getUnderperformingPartners(
  bundleId,
  40 // Threshold score
);
```

## Example: First-Time Buyer Bundle

```typescript
// Create bundle
const bundle = await marketplaceBundleService.createBundle({
  slug: 'first-time-buyer',
  name: 'First-Time Buyer Bundle',
  description: 'Everything you need for your first property purchase',
  targetAudience: 'First-time home buyers'
});

// Add partners
await marketplaceBundleService.addPartnerToBundle({
  bundleId: bundle.id,
  partnerId: 'finance-partner-1',
  category: 'Finance',
  displayOrder: 1
});

await marketplaceBundleService.addPartnerToBundle({
  bundleId: bundle.id,
  partnerId: 'legal-partner-1',
  category: 'Legal',
  displayOrder: 2
});

await marketplaceBundleService.addPartnerToBundle({
  bundleId: bundle.id,
  partnerId: 'inspection-partner-1',
  category: 'Inspection',
  displayOrder: 3
});

await marketplaceBundleService.addPartnerToBundle({
  bundleId: bundle.id,
  partnerId: 'insurance-partner-1',
  category: 'Insurance',
  displayOrder: 4
});

// Validate bundle has all required categories
const validation = await marketplaceBundleService.validateBundleCategories(
  bundle.id,
  ['Finance', 'Legal', 'Inspection', 'Insurance']
);

console.log(validation.valid); // true
```

## Frontend Integration

### Display Bundle

```typescript
// Fetch bundle with partners
const bundle = await fetch(`/api/bundles/first-time-buyer`).then(r => r.json());

// Render partners by category
bundle.partners
  .filter(p => p.category === 'Finance')
  .map(partner => (
    <PartnerCard
      name={partner.companyName}
      verified={partner.verificationStatus === 'verified'}
      trustScore={partner.trustScore}
      rating={partner.averageRating}
      reviews={partner.reviewCount}
    />
  ));
```

## Database Schema

### marketplace_bundles

```sql
CREATE TABLE marketplace_bundles (
  id VARCHAR(36) PRIMARY KEY,
  slug VARCHAR(100) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  target_audience VARCHAR(100),
  is_active BOOLEAN DEFAULT true,
  display_order INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### bundle_partners

```sql
CREATE TABLE bundle_partners (
  bundle_id VARCHAR(36) NOT NULL,
  partner_id VARCHAR(36) NOT NULL,
  category VARCHAR(100) NOT NULL,
  display_order INT DEFAULT 0,
  inclusion_fee DECIMAL(10,2),
  performance_score DECIMAL(5,2) DEFAULT 50.00,
  PRIMARY KEY (bundle_id, partner_id),
  FOREIGN KEY (bundle_id) REFERENCES marketplace_bundles(id),
  FOREIGN KEY (partner_id) REFERENCES explore_partners(id)
);
```

## Error Handling

### Bundle Not Found

```typescript
const bundle = await marketplaceBundleService.getBundleById('invalid-id');
// Returns: null
```

### Partner Not Found

```typescript
try {
  await marketplaceBundleService.addPartnerToBundle({
    bundleId: 'bundle-123',
    partnerId: 'invalid-partner',
    category: 'Finance'
  });
} catch (error) {
  // Error: Partner not found: invalid-partner
}
```

### Invalid Performance Score

```typescript
try {
  await marketplaceBundleService.updatePartnerPerformance(
    bundleId,
    partnerId,
    150 // Invalid: must be 0-100
  );
} catch (error) {
  // Error: Performance score must be between 0 and 100
}
```

## Testing

### Unit Tests

```typescript
describe('MarketplaceBundleService', () => {
  it('should create bundle with valid data', async () => {
    const bundle = await marketplaceBundleService.createBundle({
      slug: 'test-bundle',
      name: 'Test Bundle'
    });
    expect(bundle.slug).toBe('test-bundle');
  });

  it('should validate bundle categories', async () => {
    const validation = await marketplaceBundleService.validateBundleCategories(
      bundleId,
      ['Finance', 'Legal']
    );
    expect(validation.valid).toBe(true);
  });
});
```

## Related Services

- **PartnerService**: Manages partner profiles and verification
- **BundleAttributionService**: Tracks user engagement with bundle partners
- **LeadGenerationService**: Handles leads from bundle partner interactions

## Next Steps

1. Implement bundle attribution tracking (Task 18.3)
2. Add partner review and rating system
3. Implement bundle analytics dashboard
4. Add bundle recommendation engine
