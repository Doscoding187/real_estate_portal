# Content Approval Service - Quick Reference

## Service Import

```typescript
import { contentApprovalService } from './services/contentApprovalService';
```

## Common Operations

### Submit Content for Approval

```typescript
const queueItem = await contentApprovalService.submitForApproval(
  contentId,
  partnerId
);

// Returns: ContentApprovalQueue with auto-approval eligibility
```

### Validate Content Before Submission

```typescript
const validation = await contentApprovalService.validateContentRules(
  {
    contentId: '123',
    partnerId: 'partner-uuid',
    contentType: 'property_tour',
    metadata: {
      title: 'Beautiful 3BR Home',
      description: 'Spacious family home with modern finishes...'
    },
    ctas: ['view_listing', 'contact']
  },
  partner
);

if (!validation.isValid) {
  console.error('Validation errors:', validation.errors);
}
```

### Flag Content for Review

```typescript
await contentApprovalService.flagContent(
  contentId,
  'Inappropriate content',
  reporterUserId
);
```

### Review Content (Admin)

```typescript
await contentApprovalService.reviewContent(
  queueId,
  {
    status: 'approved', // or 'rejected', 'revision_requested'
    feedback: 'Great educational content!',
    violationTypes: [] // optional
  },
  reviewerId
);
```

### Get Approval Queue

```typescript
// Get all pending reviews
const pending = await contentApprovalService.getApprovalQueue({
  status: 'pending',
  limit: 50
});

// Get partner's submissions
const partnerQueue = await contentApprovalService.getApprovalQueue({
  partnerId: 'partner-uuid'
});
```

### Get Partner Review Statistics

```typescript
const stats = await contentApprovalService.getPartnerReviewStats(partnerId);

console.log(`Approval rate: ${stats.approvalRate}%`);
console.log(`Total: ${stats.total}, Approved: ${stats.approved}`);
```

## Validation Methods

### Check Content Type

```typescript
const isValid = await contentApprovalService.validateContentType(
  'property_tour',
  tierId
);
```

### Check CTAs

```typescript
const result = await contentApprovalService.validateCTAs(
  ['view_listing', 'contact'],
  tierId
);

if (!result.isValid) {
  console.log('Invalid CTAs:', result.invalidCTAs);
}
```

### Check Metadata

```typescript
const result = contentApprovalService.validateMetadataCompleteness({
  title: 'My Title',
  description: 'My Description'
});

if (!result.isValid) {
  console.log('Missing fields:', result.missingFields);
}
```

## Auto-Approval Logic

```typescript
// Check if partner is eligible
const isEligible = await contentApprovalService.checkAutoApprovalEligibility(
  partnerId
);

// Partners with 3+ approved content pieces are eligible
// First 3 submissions always go to manual review
```

## Error Handling

```typescript
try {
  await contentApprovalService.submitForApproval(contentId, partnerId);
} catch (error) {
  if (error.message === 'Partner not found') {
    // Handle missing partner
  } else if (error.message === 'Content already submitted for approval') {
    // Handle duplicate submission
  }
}
```

## Common Validation Errors

### Content Type Not Allowed
```
Content type "educational" not allowed for tier "Property Professional". 
Allowed types: property_tour, development_showcase, agent_walkthrough
```

### Invalid CTAs
```
CTAs not allowed for tier "Content Educator": request_quote, book_consult. 
Allowed CTAs: follow, save, share
```

### Missing Metadata
```
Missing required metadata fields: title, description
```

### Promotional Content
```
Content appears to be purely promotional. Please add educational value. 
Ask yourself: "Would I watch this even if I wasn't buying?"
```

## Review Decision Feedback

### Approved
```typescript
{
  status: 'approved',
  feedback: 'Excellent educational content with clear value proposition.'
}
```

### Rejected
```typescript
{
  status: 'rejected',
  feedback: 'Content is purely promotional without educational value.',
  violationTypes: ['promotional_only', 'missing_educational_value']
}
```

### Revision Requested
```typescript
{
  status: 'revision_requested',
  feedback: 'Please add more detail to the description and ensure title is descriptive.',
  violationTypes: ['incomplete_metadata']
}
```

## Integration with Partner Service

The approval service automatically:
- Checks partner eligibility via `partnerService.isEligibleForAutoApproval()`
- Increments approved count via `partnerService.incrementApprovedContentCount()`
- Updates trust score via `partnerService.calculateTrustScore()`

## Database Tables Used

- `content_approval_queue` - Main approval queue
- `explore_partners` - Partner information
- `partner_tiers` - Tier permissions
- `explore_content` - Content metadata

## Status Flow

```
pending → approved (increments partner count)
pending → rejected (provides feedback)
pending → revision_requested (allows resubmission)
approved → pending (when flagged)
```

## Best Practices

1. **Always validate before submission**
   ```typescript
   const validation = await contentApprovalService.validateContentRules(...);
   if (validation.isValid) {
     await contentApprovalService.submitForApproval(...);
   }
   ```

2. **Provide detailed feedback on rejection**
   ```typescript
   {
     status: 'rejected',
     feedback: 'Specific reasons...',
     violationTypes: ['type1', 'type2']
   }
   ```

3. **Check auto-approval eligibility**
   ```typescript
   const isEligible = await contentApprovalService.checkAutoApprovalEligibility(partnerId);
   // Show appropriate UI based on eligibility
   ```

4. **Handle flagged content promptly**
   ```typescript
   // Flagged content bypasses auto-approval
   // Always goes to manual review
   ```

## Performance Considerations

- Queue queries are indexed on `status` and `partnerId`
- Use pagination for large queues (`limit` and `offset`)
- Cache partner tier information when validating multiple items
- Batch validation when possible

## Security Notes

- Only admins should access review endpoints
- Validate reviewer permissions before allowing review
- Log all review decisions for audit trail
- Rate limit flagging to prevent abuse
