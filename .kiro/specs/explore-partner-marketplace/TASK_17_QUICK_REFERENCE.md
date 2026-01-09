# Lead Generation Service - Quick Reference

## Service Location
`server/services/leadGenerationService.ts`

## API Base URL
`/api/partner-leads`

## Quick Start

### Create a Lead
```typescript
POST /api/partner-leads
{
  "partnerId": "uuid",
  "userId": "uuid",
  "type": "quote_request", // or "consultation", "eligibility_check"
  "contactInfo": {
    "name": "John Doe",
    "email": "john@example.com",
    "phone": "+27123456789",
    "preferredContactMethod": "email" // optional
  },
  "intentDetails": "Looking for 3-bedroom house in Sandton", // optional
  "contentId": "uuid" // optional
}
```

### Get Partner Leads
```typescript
GET /api/partner-leads/partner/:partnerId?status=new&limit=20
```

### Dispute a Lead
```typescript
POST /api/partner-leads/:leadId/dispute
{
  "reason": "User provided incorrect contact information"
}
```

## Lead Types & Pricing

| Type | Price Range | Use Case |
|------|-------------|----------|
| `quote_request` | R50-R200 | Service quotes (plumbing, electrical, etc.) |
| `consultation` | R100-R300 | Professional consultations (financial, legal) |
| `eligibility_check` | R500-R1000 | Bond/finance eligibility checks |

## Lead Status Flow

```
new → contacted → converted
  ↓
disputed → refunded (if approved)
       → contacted (if rejected)
```

## Service Methods

```typescript
// Create lead
const lead = await leadGenerationService.createLead({
  partnerId: "...",
  userId: "...",
  type: "quote_request",
  contactInfo: { ... }
});

// Get partner leads
const leads = await leadGenerationService.getPartnerLeads(partnerId, {
  status: "new",
  limit: 20
});

// Calculate price
const price = await leadGenerationService.calculateLeadPrice(
  "consultation",
  partnerId
);

// Dispute lead
await leadGenerationService.disputeLead(leadId, "Invalid contact");

// Get conversion funnel
const funnel = await leadGenerationService.getLeadConversionFunnel(partnerId);
```

## Pricing Factors

Price is calculated dynamically based on:
- **Partner Trust Score** (50%): Higher trust = higher price
- **Content Engagement** (30%): Better content = higher price
- **User Quality** (20%): Complete profiles = higher price

Formula:
```
price = min + (max - min) × weighted_score
rounded to nearest R10
```

## Notification System

When a lead is created:
1. ✅ Lead saved to database
2. ✅ Partner notified (console log in dev, email/SMS in prod)
3. ✅ Dashboard notification created (production)
4. ✅ Webhook triggered (if configured)

## Error Handling

| Status | Condition | Response |
|--------|-----------|----------|
| 400 | Missing required fields | `{ error: "Missing required fields: ..." }` |
| 400 | Invalid lead type | `{ error: "Invalid lead type. Must be one of: ..." }` |
| 400 | Invalid contact info | `{ error: "Contact info must include name, email, and phone" }` |
| 404 | Lead not found | `{ error: "Lead not found" }` |
| 500 | Server error | `{ error: "Failed to create lead", details: "..." }` |

## Conversion Funnel Metrics

```typescript
{
  totalLeads: 100,
  contacted: 75,      // 75% contact rate
  converted: 25,      // 25% conversion rate
  disputed: 5,        // 5% dispute rate
  refunded: 2,        // 2% refund rate
  conversionRate: 25.0,
  averagePrice: 150.0
}
```

## Requirements Mapping

- **9.1**: Quote request pricing (R50-R200) ✅
- **9.2**: Consultation pricing (R100-R300) ✅
- **9.3**: Eligibility check pricing (R500-R1000) ✅
- **9.4**: Contact info capture ✅
- **9.5**: Immediate partner notification ✅
- **9.6**: Dispute handling with refunds ✅

## Integration Example

```typescript
// Frontend: Create lead from content card
const handleRequestQuote = async () => {
  try {
    const response = await fetch('/api/partner-leads', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        partnerId: content.partnerId,
        userId: currentUser.id,
        type: 'quote_request',
        contentId: content.id,
        contactInfo: {
          name: currentUser.name,
          email: currentUser.email,
          phone: currentUser.phone,
          preferredContactMethod: 'email'
        },
        intentDetails: userMessage
      })
    });
    
    const data = await response.json();
    if (data.success) {
      showNotification('Quote request sent! Partner will contact you soon.');
    }
  } catch (error) {
    showError('Failed to send quote request');
  }
};
```

## Admin Actions

```typescript
// Process dispute (admin only)
POST /api/partner-leads/:leadId/dispute/process
{
  "decision": "refund" // or "reject"
}
```

## Database Schema

```sql
CREATE TABLE partner_leads (
  id VARCHAR(36) PRIMARY KEY,
  partner_id VARCHAR(36) NOT NULL,
  user_id VARCHAR(36) NOT NULL,
  content_id VARCHAR(36),
  type ENUM('quote_request', 'consultation', 'eligibility_check'),
  status ENUM('new', 'contacted', 'converted', 'disputed', 'refunded'),
  price DECIMAL(10,2) NOT NULL,
  contact_info JSON NOT NULL,
  intent_details TEXT,
  dispute_reason TEXT,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

## Testing

```typescript
// Property test: Pricing bounds
fc.assert(
  fc.property(
    fc.constantFrom('quote_request', 'consultation', 'eligibility_check'),
    async (type) => {
      const price = await leadGenerationService.calculateLeadPrice(type, partnerId);
      const range = LEAD_PRICING[type];
      return price >= range.min && price <= range.max;
    }
  )
);
```

---

**Quick Links**:
- [Full Implementation](./TASK_17_COMPLETE.md)
- [Service Code](../../server/services/leadGenerationService.ts)
- [Router Code](../../server/partnerLeadRouter.ts)
- [Requirements](./requirements.md#requirement-9-lead-generation-system)
- [Design](./design.md#9-lead-generation-service)
