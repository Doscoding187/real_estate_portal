# Lead Generation Service - Quick Reference

## Lead Types & Pricing

| Type | Price Range | Typical Use Case |
|------|-------------|------------------|
| `quote_request` | R50-R200 | Service quotes (renovations, security) |
| `consultation` | R100-R300 | Professional consultations |
| `eligibility_check` | R500-R1000 | Bond/insurance pre-qualification |

## Lead Status Flow

```
NEW → CONTACTED → CONVERTED
  ↓
DISPUTED → REFUNDED or CONTACTED
```

## Quick API Examples

### Create Lead
```typescript
POST /api/partner-leads
{
  "partnerId": "uuid",
  "userId": "uuid",
  "type": "quote_request",
  "contactInfo": {
    "name": "John Doe",
    "email": "john@example.com",
    "phone": "+27821234567"
  },
  "intentDetails": "Kitchen renovation"
}
```

### Get Partner Leads
```typescript
GET /api/partner-leads/partner/:partnerId?status=new&limit=20
```

### Calculate Price
```typescript
GET /api/partner-leads/pricing/consultation?partnerId=uuid
```

### Dispute Lead
```typescript
POST /api/partner-leads/:leadId/dispute
{
  "reason": "User not responsive"
}
```

### Get Conversion Funnel
```typescript
GET /api/partner-leads/partner/:partnerId/funnel
```

## Service Methods

```typescript
// Create lead
const lead = await leadGenerationService.createLead(data);

// Get leads
const leads = await leadGenerationService.getPartnerLeads(partnerId, filters);

// Calculate price
const price = await leadGenerationService.calculateLeadPrice(type, partnerId);

// Dispute lead
await leadGenerationService.disputeLead(leadId, reason);

// Process dispute (admin)
await leadGenerationService.processDispute(leadId, 'refund' | 'reject');

// Get funnel
const funnel = await leadGenerationService.getLeadConversionFunnel(partnerId);

// Update status
await leadGenerationService.updateLeadStatus(leadId, status);
```

## Pricing Factors

- **Partner Trust Score** (50%): Higher trust = higher price
- **Content Engagement** (30%): Better content = better leads
- **User Quality** (20%): Complete profiles = higher value

## Notification Channels

- ✅ Console logging (implemented)
- 🔜 Email notification
- 🔜 Dashboard notification
- 🔜 SMS/WhatsApp (optional)
- 🔜 Webhook (optional)

## Dispute Guidelines

### Valid Reasons
- Incorrect contact info
- User not responsive
- Not genuinely interested
- Duplicate lead
- Outside service area

### Response Time
- Partner: Dispute within 48 hours
- Admin: Review within 48 hours

## Best Practices

1. **Respond Fast**: Contact within 1 hour
2. **Document Everything**: Track all contact attempts
3. **Update Status**: Keep lead status current
4. **Quality Focus**: Convert, don't dispute

## Common Patterns

### Lead Creation Flow
```typescript
// 1. User clicks CTA on partner content
// 2. User fills contact form
// 3. System creates lead
const lead = await leadGenerationService.createLead({...});
// 4. Partner notified immediately
// 5. Lead appears in partner dashboard
```

### Dispute Resolution Flow
```typescript
// 1. Partner disputes lead
await leadGenerationService.disputeLead(leadId, reason);
// 2. Admin reviews
// 3. Admin decides
await leadGenerationService.processDispute(leadId, decision);
// 4. Partner notified of outcome
```

## Testing Checklist

- [ ] Create lead for each type
- [ ] Verify pricing within range
- [ ] Test partner notification
- [ ] Test dispute creation
- [ ] Test dispute processing
- [ ] Test conversion funnel calculation
- [ ] Test status updates
- [ ] Test filters and pagination

## Requirements Mapping

- **9.1**: Quote request pricing ✅
- **9.2**: Consultation pricing ✅
- **9.3**: Eligibility check pricing ✅
- **9.4**: Contact info capture ✅
- **9.5**: Partner notification ✅
- **9.6**: Dispute handling ✅

## Related Files

- Service: `server/services/leadGenerationService.ts`
- Router: `server/partnerLeadRouter.ts`
- Schema: `drizzle/schema.ts` (partnerLeads table)
- Migration: `drizzle/migrations/add-partner-marketplace-schema.sql`
