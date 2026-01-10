# Partner Profile Page - Quick Reference

## Access
**URL**: `/partner/:partnerId`

## Features

### Header Section
- Company logo (or placeholder)
- Company name
- Verification badge (if verified)
- Partner tier badge
- Subscription tier badge
- Trust score (0-100)
- Company description
- Service locations

### Performance Metrics
- **Total Views**: Total content views
- **Engagement Rate**: Percentage of engaged viewers
- **Content Pieces**: Number of published content
- **Quality Score**: Average content quality (0-100)

### Reviews Section
- Average rating (1-5 stars)
- Total review count
- Individual reviews with:
  - User name
  - Star rating
  - Comment
  - Date
- Empty state for no reviews

## API Endpoints

### Get Partner Profile
```
GET /api/partners/:partnerId
```

**Response**:
```json
{
  "id": "uuid",
  "companyName": "string",
  "description": "string",
  "logoUrl": "string",
  "verificationStatus": "verified|pending|rejected",
  "trustScore": 85,
  "serviceLocations": ["Johannesburg", "Pretoria"],
  "subscriptionTier": "premium",
  "tier": {
    "id": 1,
    "name": "Property Professional"
  }
}
```

### Get Partner Metrics
```
GET /api/partner-analytics/:partnerId/summary
```

**Response**:
```json
{
  "success": true,
  "data": {
    "totalViews": 15420,
    "engagementRate": 12.5,
    "totalContent": 45,
    "averageQualityScore": 78
  }
}
```

## Component Usage

```tsx
import PartnerProfile from '@/pages/PartnerProfile';

// Route configuration
<Route path="/partner/:partnerId" component={PartnerProfile} />

// Navigation
<Link href="/partner/123">View Partner</Link>
```

## Responsive Breakpoints

- **Mobile**: < 768px (1 column metrics)
- **Tablet**: 768px - 1024px (2 column metrics)
- **Desktop**: > 1024px (4 column metrics)

## States

### Loading
- Shows skeleton loaders for all sections
- Metrics show "..." placeholder

### Error
- 404 card for missing partner
- "Go Back" button

### Empty Reviews
- Shows star icon
- Message: "No reviews yet"
- Encouragement for verified partners

## Requirements Mapping

- **5.1**: Trust score, verification badge
- **5.2**: Company info, reviews
- **5.3**: Service locations
- **5.4**: Performance metrics
- **5.5**: Verification badge display
- **5.6**: New partner indicator

## Testing Checklist

- [ ] Load profile with valid partner ID
- [ ] Verify all metrics display correctly
- [ ] Test with verified partner
- [ ] Test with unverified partner
- [ ] Test with no reviews
- [ ] Test with multiple reviews
- [ ] Test responsive layout
- [ ] Test back button
- [ ] Test 404 state
- [ ] Test loading states

## Common Issues

### Partner Not Found
- Verify partner ID is correct
- Check partner exists in database
- Ensure partner is not deleted

### Metrics Not Loading
- Check partner analytics service is running
- Verify partner has content
- Check API endpoint is accessible

### Reviews Not Showing
- Reviews endpoint is placeholder
- Will be implemented in future phase
- Currently returns empty array
