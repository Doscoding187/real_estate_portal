# Founding Partner Service

## Overview

The Founding Partner Service manages the Early Partner Program, which provides special benefits to the first 15 partners who enroll during the pre-launch phase. This service tracks enrollment, content commitments, and benefit eligibility.

## Requirements

- **16.25**: Founding Partner designation with special benefits
- **16.26**: Grant 3 months Featured tier, founding badge, co-marketing opportunities
- **16.28**: Fast-track review (24-hour turnaround vs standard 48 hours)
- **16.29**: Limit enrollment to 15 founding partners
- **16.30**: Track content commitments and issue warnings for non-compliance

## Key Features

### 1. Enrollment Management

```typescript
// Enroll a partner in the Founding Partner Program
const result = await foundingPartnerService.enrollFoundingPartner(partnerId);

// Check if enrollment is still open (max 15 partners)
const isOpen = await foundingPartnerService.checkEnrollmentOpen();

// Get founding partner status
const status = await foundingPartnerService.getFoundingPartnerStatus(partnerId);
```

### 2. Benefits Management

```typescript
// Get founding partner benefits configuration
const benefits = foundingPartnerService.getFoundingPartnerBenefits();
// Returns:
// {
//   featuredTierMonths: 3,
//   foundingBadge: true,
//   coMarketingEligible: true,
//   fastTrackReview: true
// }

// Check if benefits are still active
const isActive = await foundingPartnerService.areBenefitsActive(partnerId);
```

### 3. Content Commitment Tracking

```typescript
// Track pre-launch content (5-10 pieces required)
await foundingPartnerService.trackPreLaunchContent(partnerId);

// Track weekly content (2 pieces per week required)
const weekIndex = foundingPartnerService.getCurrentWeekIndex(enrollmentDate);
await foundingPartnerService.trackWeeklyContent(partnerId, weekIndex);

// Check commitment status
const commitment = await foundingPartnerService.checkContentCommitment(partnerId);
// Returns:
// {
//   partnerId: string,
//   isCompliant: boolean,
//   preLaunchMet: boolean,
//   weeklyMet: boolean,
//   preLaunchProgress: { required: 5, delivered: 3 },
//   weeklyProgress: { required: 8, delivered: 6 },
//   warningCount: 0,
//   nextWarningThreshold: 2
// }
```

### 4. Warning System

```typescript
// Issue warning for missed commitments
await foundingPartnerService.issueWarning(
  partnerId,
  'Pre-launch commitment not met: 3/5'
);

// After 2 warnings, status is automatically revoked
// Revoke founding partner status manually
await foundingPartnerService.revokeFoundingStatus(partnerId);
```

### 5. Monitoring & Reporting

```typescript
// Get all active founding partners
const activePartners = await foundingPartnerService.getActiveFoundingPartners();

// Get total count
const count = await foundingPartnerService.getFoundingPartnersCount();

// Check all commitments and issue warnings automatically
await foundingPartnerService.checkAllCommitments();
```

## Content Commitments

### Pre-Launch Phase
- **Required**: 5-10 pieces of content before public launch
- **Tracked**: `preLaunchContentDelivered` field
- **Validation**: Must meet minimum of 5 pieces

### Post-Launch Phase
- **Required**: 2 pieces per week
- **Tracked**: `weeklyContentDelivered` array (one entry per week)
- **Validation**: Average of 2 pieces per week since enrollment

## Warning System

1. **First Warning**: Partner status changes to 'warning'
2. **Second Warning**: Founding Partner status is revoked
3. **Revocation**: 
   - Status set to 'revoked'
   - Featured tier subscription removed
   - Founding badge removed
   - Partner notified

## Database Schema

```sql
CREATE TABLE founding_partners (
  partner_id VARCHAR(36) PRIMARY KEY,
  enrollment_date DATE NOT NULL,
  benefits_end_date DATE NOT NULL,
  pre_launch_content_delivered INT DEFAULT 0,
  weekly_content_delivered JSON,
  warning_count INT DEFAULT 0,
  status ENUM('active', 'warning', 'revoked') DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (partner_id) REFERENCES explore_partners(id)
);
```

## Integration Points

### With Partner Service
```typescript
// Check if partner has founding partner benefits
const isFounding = await foundingPartnerService.isFoundingPartner(partnerId);

// Apply fast-track review (24hr vs 48hr)
if (isFounding) {
  reviewDeadline = Date.now() + (24 * 60 * 60 * 1000);
}
```

### With Subscription Service
```typescript
// Grant Featured tier for 3 months on enrollment
if (enrollmentResult.success) {
  await subscriptionService.createSubscription(partnerId, 'featured', {
    duration: 3,
    reason: 'founding_partner_benefit'
  });
}
```

### With Content Approval Service
```typescript
// Track content creation for founding partners
if (await foundingPartnerService.isFoundingPartner(partnerId)) {
  const status = await foundingPartnerService.getFoundingPartnerStatus(partnerId);
  const weekIndex = foundingPartnerService.getCurrentWeekIndex(status.enrollmentDate);
  
  // Determine if pre-launch or post-launch
  const isPreLaunch = await launchService.getCurrentPhase() === 'pre_launch';
  
  if (isPreLaunch) {
    await foundingPartnerService.trackPreLaunchContent(partnerId);
  } else {
    await foundingPartnerService.trackWeeklyContent(partnerId, weekIndex);
  }
}
```

## Scheduled Jobs

### Daily Commitment Check
```typescript
// Run daily to check all founding partners' commitments
// and issue warnings for non-compliance
cron.schedule('0 0 * * *', async () => {
  await foundingPartnerService.checkAllCommitments();
});
```

### Weekly Reminder
```typescript
// Send weekly reminders to founding partners about commitments
cron.schedule('0 9 * * 1', async () => {
  const activePartners = await foundingPartnerService.getActiveFoundingPartners();
  
  for (const partner of activePartners) {
    const commitment = await foundingPartnerService.checkContentCommitment(partner.partnerId);
    
    if (!commitment.isCompliant) {
      // Send reminder email
      await emailService.sendFoundingPartnerReminder(partner.partnerId, commitment);
    }
  }
});
```

## Error Handling

```typescript
try {
  const result = await foundingPartnerService.enrollFoundingPartner(partnerId);
  
  if (!result.success) {
    // Handle enrollment failure
    console.error(result.message);
  }
} catch (error) {
  // Handle unexpected errors
  console.error('Enrollment error:', error);
}
```

## Testing

```typescript
// Example test cases
describe('FoundingPartnerService', () => {
  it('should limit enrollment to 15 partners', async () => {
    // Enroll 15 partners
    for (let i = 0; i < 15; i++) {
      const result = await foundingPartnerService.enrollFoundingPartner(`partner-${i}`);
      expect(result.success).toBe(true);
    }
    
    // 16th enrollment should fail
    const result = await foundingPartnerService.enrollFoundingPartner('partner-16');
    expect(result.success).toBe(false);
    expect(result.message).toContain('enrollment is closed');
  });

  it('should revoke status after 2 warnings', async () => {
    await foundingPartnerService.enrollFoundingPartner(partnerId);
    
    // Issue first warning
    await foundingPartnerService.issueWarning(partnerId, 'Missed commitment');
    let status = await foundingPartnerService.getFoundingPartnerStatus(partnerId);
    expect(status.status).toBe('warning');
    
    // Issue second warning
    await foundingPartnerService.issueWarning(partnerId, 'Missed commitment again');
    status = await foundingPartnerService.getFoundingPartnerStatus(partnerId);
    expect(status.status).toBe('revoked');
  });
});
```

## Best Practices

1. **Check enrollment status before enrolling**: Always verify enrollment is open
2. **Track content consistently**: Update content counts immediately after approval
3. **Monitor commitments regularly**: Run daily checks to catch issues early
4. **Communicate clearly**: Send reminders and warnings with clear expectations
5. **Document revocations**: Log reasons for status changes for transparency

## Future Enhancements

- Email notifications for warnings and revocations
- Dashboard for founding partners to track their progress
- Analytics on founding partner content performance
- Automated content quality checks for founding partners
- Co-marketing campaign management tools
