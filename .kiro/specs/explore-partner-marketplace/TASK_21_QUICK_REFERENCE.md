# Task 21: API Endpoints - Quick Reference

## API Base URLs

All endpoints are prefixed with `/api/`

## Partner Management (`/api/partners`)

```typescript
POST   /api/partners                    // Register partner
GET    /api/partners/:id                // Get partner profile
PUT    /api/partners/:id                // Update partner profile
POST   /api/partners/:id/verify         // Submit verification
PUT    /api/partners/:id/tier           // Assign tier (admin)
POST   /api/partners/:id/trust-score    // Recalculate trust score
GET    /api/partners/tier/:tierId       // Get partners by tier
```

## Content Approval (`/api/content`)

```typescript
POST   /api/content/submit                      // Submit content for approval
GET    /api/content/approval-queue              // Get approval queue (admin)
POST   /api/content/:id/review                  // Review content (admin)
POST   /api/content/:id/flag                    // Flag content
GET    /api/content/partner/:partnerId/stats    // Get review statistics
POST   /api/content/validate                    // Validate content rules
```

## Topics Navigation (`/api/topics`)

```typescript
GET    /api/topics                          // Get all active topics
GET    /api/topics/:slug                    // Get topic by slug
GET    /api/topics/:slug/feed               // Get topic-filtered feed
GET    /api/topics/:slug/content-count      // Get content count
GET    /api/topics/:slug/related            // Get related topics
```

## Subscriptions (`/api/subscriptions`)

```typescript
GET    /api/subscriptions/pricing                      // Get all tier pricing
GET    /api/subscriptions/pricing/:tier                // Get specific tier pricing
GET    /api/subscriptions/partner/:partnerId           // Get partner subscription
GET    /api/subscriptions/partner/:partnerId/history   // Get subscription history
GET    /api/subscriptions/partner/:partnerId/features  // Get feature access
POST   /api/subscriptions                              // Create subscription
PUT    /api/subscriptions/:id/upgrade                  // Upgrade subscription
DELETE /api/subscriptions/:id                          // Cancel subscription
POST   /api/subscriptions/check-feature                // Check feature access
POST   /api/subscriptions/check-action                 // Check action permission
```

## Boost Campaigns (`/api/boosts`)

```typescript
POST   /api/boosts                                  // Create boost campaign
PUT    /api/boosts/:id/activate                     // Activate campaign
PUT    /api/boosts/:id/pause                        // Pause campaign
GET    /api/boosts/:id/analytics                    // Get campaign analytics
GET    /api/boosts/:id/budget                       // Get budget status
GET    /api/boosts/partner/:partnerId               // Get partner campaigns
GET    /api/boosts/topic/:topicId/active            // Get active campaigns for topic
GET    /api/boosts/content/:contentId/boosted       // Check if content is boosted
GET    /api/boosts/content/:contentId/sponsored-label // Get sponsored label
POST   /api/boosts/validate-eligibility             // Validate boost eligibility
POST   /api/boosts/:id/impression                   // Record impression
POST   /api/boosts/:id/click                        // Record click
```

## Lead Generation (`/api/leads`)

```typescript
POST   /api/leads                              // Create lead
GET    /api/leads/partner/:partnerId           // Get partner leads
GET    /api/leads/:leadId                      // Get single lead
PUT    /api/leads/:leadId/status               // Update lead status
POST   /api/leads/:leadId/dispute              // Dispute lead
POST   /api/leads/:leadId/dispute/process      // Process dispute (admin)
GET    /api/leads/partner/:partnerId/funnel    // Get conversion funnel
GET    /api/leads/pricing/:type                // Get lead pricing
```

## Common Request/Response Patterns

### Create Partner
```json
POST /api/partners
{
  "tierId": 1,
  "companyName": "Example Agency",
  "description": "We help people find homes",
  "logoUrl": "https://...",
  "serviceLocations": ["Johannesburg", "Pretoria"]
}
```

### Submit Content for Approval
```json
POST /api/content/submit
{
  "contentId": "content-uuid",
  "partnerId": "partner-uuid"
}
```

### Review Content (Admin)
```json
POST /api/content/:id/review
{
  "status": "approved" | "rejected" | "revision_requested",
  "feedback": "Optional feedback message",
  "violationTypes": ["promotional", "incomplete_metadata"]
}
```

### Get Topic Feed
```
GET /api/topics/find-your-home/feed?page=1&limit=20&includeShorts=true
```

### Create Subscription
```json
POST /api/subscriptions
{
  "partner_id": "partner-uuid",
  "tier": "basic" | "premium" | "featured"
}
```

### Create Boost Campaign
```json
POST /api/boosts
{
  "partnerId": "partner-uuid",
  "contentId": "content-uuid",
  "topicId": "topic-uuid",
  "budget": 1000.00,
  "startDate": "2026-01-10",
  "endDate": "2026-02-10",
  "costPerImpression": 0.10
}
```

### Create Lead
```json
POST /api/leads
{
  "partnerId": "partner-uuid",
  "userId": "user-uuid",
  "type": "quote_request" | "consultation" | "eligibility_check",
  "contactInfo": {
    "name": "John Doe",
    "email": "john@example.com",
    "phone": "+27123456789"
  },
  "intentDetails": "Looking for 3-bedroom house in Sandton"
}
```

## Authentication

Most endpoints require authentication via `requireAuth` middleware:
- User must be logged in
- `req.user.id` contains authenticated user ID
- `req.user.role` contains user role

Admin-only endpoints check:
```typescript
if (req.user!.role !== 'super_admin') {
  return res.status(403).json({ error: "Admin access required" });
}
```

## Error Response Format

```json
{
  "error": "Error message",
  "details": "Additional details (optional)"
}
```

## Success Response Format

```json
{
  "success": true,
  "data": { ... },
  "message": "Optional success message"
}
```

## Status Codes

- `200` - Success
- `201` - Created
- `400` - Bad Request (validation error)
- `401` - Unauthorized (not logged in)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found
- `409` - Conflict (duplicate resource)
- `422` - Unprocessable Entity (business logic error)
- `500` - Internal Server Error

## Query Parameters

### Pagination
```
?page=1&limit=20&offset=0
```

### Filtering
```
?status=pending&partnerId=uuid&contentTypes=video,card
```

### Price Range
```
?priceMin=500000&priceMax=2000000
```

## Router Files

- `server/partnerRouter.ts` - Partner management
- `server/contentRouter.ts` - Content approval
- `server/topicsRouter.ts` - Topics navigation
- `server/partnerSubscriptionRouter.ts` - Subscriptions
- `server/partnerBoostCampaignRouter.ts` - Boost campaigns
- `server/partnerLeadRouter.ts` - Lead generation

## Service Files

- `server/services/partnerService.ts`
- `server/services/contentApprovalService.ts`
- `server/services/topicsService.ts`
- `server/services/partnerSubscriptionService.ts`
- `server/services/partnerBoostCampaignService.ts`
- `server/services/leadGenerationService.ts`
