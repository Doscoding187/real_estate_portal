# Task 16: Personalized Content Sections - Quick Reference

## Overview
Personalized content sections on Explore home page with intelligent recommendations.

## Key Files

### Backend
- `server/services/recommendationEngineService.ts` - Recommendation engine with multi-factor scoring

### Frontend
- `client/src/components/explore-discovery/PersonalizedContentBlock.tsx` - Horizontal scroll section
- `client/src/hooks/usePersonalizedContent.ts` - Fetches 4 content sections
- `client/src/pages/ExploreHome.tsx` - Home view with sections

## Content Sections

### 1. For You
- **Type**: `for-you`
- **Title**: "For You"
- **Subtitle**: "Personalized based on your preferences"
- **Logic**: Multi-factor scoring algorithm
- **Factors**: Price, categories, follows, recency, location

### 2. Popular Near You
- **Type**: `popular-near-you`
- **Title**: "Popular Near You"
- **Subtitle**: "Trending properties in your area"
- **Logic**: Location-based filtering
- **Requires**: Geolocation permission

### 3. New Developments
- **Type**: `new-developments`
- **Title**: "New Developments"
- **Subtitle**: "Latest property developments"
- **Logic**: Filter by development content type

### 4. Trending
- **Type**: `trending`
- **Title**: "Trending"
- **Subtitle**: "Most popular properties right now"
- **Logic**: Sort by engagement score

## Scoring Algorithm

```typescript
Total Score (0-100):
├─ Base Engagement (0-40): engagementScore × 4
├─ Price Match (0-20): priceOverlap × 20
├─ Category Match (0-15): 15 if matched
├─ Creator Follow (0-10): 10 if followed
├─ Recency (0-10): 10 × (1 - days/7)
└─ Location (0-5): 5 × (1 - distance/50km)
```

## Usage

### Display Sections
```tsx
import { usePersonalizedContent } from '@/hooks/usePersonalizedContent';
import { PersonalizedContentBlock } from '@/components/explore-discovery/PersonalizedContentBlock';

const { sections, isLoading } = usePersonalizedContent({
  categoryId: selectedCategoryId,
  location: userLocation,
});

{sections.map((section) => (
  <PersonalizedContentBlock
    key={section.id}
    title={section.title}
    subtitle={section.subtitle}
    items={section.items}
    onItemClick={handleItemClick}
    onSeeAll={() => handleSeeAll(section.type)}
  />
))}
```

### Get User Location
```tsx
useEffect(() => {
  if ('geolocation' in navigator) {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
      }
    );
  }
}, []);
```

## API Endpoints

### Get Personalized Feed
```typescript
apiClient.exploreApi.getFeed.query({
  categoryId?: number,
  location?: { lat: number, lng: number },
  limit: 10,
  offset: 0,
})
```

## View Modes

1. **Home** - Personalized sections (NEW)
2. **Cards** - Discovery card feed
3. **Videos** - Full-screen video feed

## Requirements Covered

- ✅ 12.1 - Display content blocks
- ✅ 12.2 - Progressive loading
- ✅ 12.3 - Horizontal scrollable lists
- ✅ 12.4 - "See All" navigation
- ✅ 12.5 - "For You" personalization
- ✅ 12.6 - "Popular Near You" location-based

## Performance Tips

1. **Caching**: Use React Query for automatic caching
2. **Lazy Loading**: Images load as they enter viewport
3. **Snap Scrolling**: Smooth horizontal navigation
4. **Skeleton Loaders**: Prevent layout shift

## Common Issues

### No Sections Showing
- Check if user is authenticated
- Verify API endpoint is working
- Check if content exists in database

### Location Not Working
- Ensure HTTPS (required for geolocation)
- Check browser permissions
- Provide fallback for denied permission

### Slow Loading
- Reduce candidate limit in recommendation engine
- Add Redis caching for user profiles
- Optimize database queries

## Next Steps

1. Add Redis caching for profiles
2. Implement A/B testing for algorithms
3. Add more section types
4. Track section engagement metrics
5. Optimize scoring algorithm based on data

---

**Status**: ✅ COMPLETE  
**Version**: 1.0  
**Last Updated**: December 6, 2024
