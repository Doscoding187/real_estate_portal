# Partner Profile Page

## Overview

The Partner Profile page displays comprehensive information about a partner in the Explore Partner Marketplace system. This page serves as a trust-building interface where users can view partner credibility information to make informed decisions about engagement.

## Requirements Fulfilled

This component fulfills the following requirements from the Partner Profile Trust Layer (Requirement 5):

- **5.1**: Display verification badge status and trust score
- **5.2**: Show aggregated reviews and ratings from users  
- **5.3**: List service locations and coverage areas
- **5.4**: Show content performance metrics (views, saves, engagement rate)
- **5.5**: Display prominent verification badge for verified partners
- **5.6**: Display "New Partner" indicator when no reviews exist

## Features

### Header Section
- **Company Logo**: Displays partner logo or fallback Building2 icon
- **Company Name**: Primary heading with partner company name
- **Verification Badge**: Green "Verified Partner" badge for verified partners
- **Partner Tier**: Badge showing tier level (Property Professional, etc.)
- **Subscription Tier**: Badge for premium/featured members
- **Trust Score**: Numerical score (0-100) with shield icon
- **Description**: Company description text
- **Service Locations**: List of coverage areas as badges

### Performance Metrics
Four metric cards displaying:
- **Total Views**: Number of content views with eye icon
- **Engagement Rate**: Percentage with trending up icon  
- **Content Pieces**: Number of published content with heart icon
- **Quality Score**: Average quality score with star icon

### Reviews Section
- **Average Rating**: Star rating display with numerical average
- **Review Count**: Total number of reviews
- **Individual Reviews**: List of user reviews with ratings and comments
- **Empty State**: "New Partner" message when no reviews exist

## API Integration

The component integrates with the following API endpoints:

### Partner Profile Data
```
GET /api/partners/:partnerId
```
Returns partner profile information including company details, verification status, trust score, and service locations.

### Partner Metrics
```
GET /api/partner-analytics/:partnerId/summary
```
Returns performance metrics including views, engagement rate, content count, and quality score.

### Partner Reviews (Future)
```
GET /api/partner-reviews/:partnerId
```
Returns user reviews and ratings (placeholder for future implementation).

## Component Structure

```tsx
interface PartnerProfile {
  id: string;
  userId: string;
  tier: PartnerTier;
  companyName: string;
  description: string | null;
  logoUrl: string | null;
  verificationStatus: 'pending' | 'verified' | 'rejected';
  trustScore: number;
  serviceLocations: string[];
  subscriptionTier: 'free' | 'basic' | 'premium' | 'featured';
  approvedContentCount: number;
  createdAt: Date;
  updatedAt: Date;
}
```

## Error Handling

- **Loading State**: Displays skeleton loaders while data loads
- **Partner Not Found**: Shows error card with back button for 404 errors
- **API Errors**: Gracefully handles network and server errors
- **Missing Data**: Handles optional fields like logo, description, reviews

## Responsive Design

- **Mobile First**: Optimized for mobile viewing
- **Flexible Layout**: Adapts to different screen sizes
- **Card-based Design**: Clean, modern card layout
- **Accessible**: Proper ARIA labels and keyboard navigation

## Usage

### Direct Navigation
```
/partner/123
```

### Programmatic Navigation
```tsx
import { useLocation } from 'wouter';

const [, setLocation] = useLocation();
setLocation(`/partner/${partnerId}`);
```

### From Content Cards
Partner profiles are typically accessed from content cards that display partner information, allowing users to click through to the full profile.

## Testing

The component includes comprehensive tests covering:
- Loading states and skeleton display
- Partner information rendering
- Verification badge display
- Metrics display
- Error handling
- Reviews section (empty and populated states)

## Future Enhancements

- **Review System**: Full review and rating functionality
- **Contact Forms**: Direct contact capabilities
- **Content Gallery**: Display of partner's content
- **Performance Charts**: Visual analytics displays
- **Social Links**: Integration with social media profiles

## Dependencies

- `@tanstack/react-query`: Data fetching and caching
- `wouter`: Routing and URL parameters
- `lucide-react`: Icons
- `@/components/ui/*`: UI components (Card, Badge, Button, Skeleton)

## File Location

```
client/src/pages/PartnerProfile.tsx
```