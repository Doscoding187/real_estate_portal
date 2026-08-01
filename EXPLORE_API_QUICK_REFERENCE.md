# Explore API - Quick Reference Guide

## Overview

Quick reference for developers integrating with the Explore Discovery Engine API.

## Base Router

All endpoints are accessed via `trpc.exploreApi.*`

## Authentication

- 🔒 **Protected**: Requires user authentication
- 🌐 **Public**: No authentication required

---

## Feed & Discovery

### Get Personalized Feed 🔒
```typescript
trpc.exploreApi.getFeed.query({
  sessionHistory: number[];      // Already viewed content IDs
  location?: { lat, lng };       // User location for proximity
  categoryId?: number;           // Filter by lifestyle category
  limit?: number;                // Default: 20, Max: 50
  offset?: number;               // Default: 0
})
```

### Get Video Feed 🔒
```typescript
trpc.exploreApi.getVideoFeed.query({
  sessionHistory: number[];      // Exclude viewed videos
  categoryId?: number;           // Filter by category
  neighbourhoodId?: number;      // Filter by neighbourhood
  creatorId?: number;            // Filter by creator
  limit?: number;                // Default: 20, Max: 50
  offset?: number;               // Default: 0
})
```

---

## Neighbourhoods

### Get All Neighbourhoods 🌐
```typescript
trpc.exploreApi.getNeighbourhoods.query({
  city?: string;
  province?: string;
  limit?: number;                // Default: 20, Max: 100
  offset?: number;               // Default: 0
})
```

### Get Neighbourhood Detail 🌐
```typescript
trpc.exploreApi.getNeighbourhoodDetail.query({
  id: number;
})
```

### Follow/Unfollow Neighbourhood 🔒
```typescript
trpc.exploreApi.toggleNeighbourhoodFollow.mutate({
  neighbourhoodId: number;
})
// Returns: { success: boolean, following: boolean }
```

---

## Categories

### Get All Categories 🌐
```typescript
trpc.exploreApi.getCategories.query()
```

### Get Content by Category 🌐
```typescript
trpc.exploreApi.getContentByCategory.query({
  categoryId: number;
  limit?: number;                // Default: 20, Max: 50
  offset?: number;               // Default: 0
})
```

---

## Following

### Follow/Unfollow Creator 🔒
```typescript
trpc.exploreApi.toggleCreatorFollow.mutate({
  creatorId: number;
})
// Returns: { success: boolean, following: boolean }
```

### Get Followed Items 🔒
```typescript
trpc.exploreApi.getFollowedItems.query()
// Returns: { neighbourhoods: [], creators: [] }
```

---

## Saving

### Save/Unsave Property 🔒
```typescript
trpc.exploreApi.toggleSaveProperty.mutate({
  contentId: number;
  propertyId?: number;
})
// Returns: { success: boolean, saved: boolean }
```

### Get Saved Properties 🔒
```typescript
trpc.exploreApi.getSavedProperties.query({
  limit?: number;                // Default: 20, Max: 100
  offset?: number;               // Default: 0
})
```

---

## Engagement Tracking

### Record Engagement (Batch) 🔒
```typescript
trpc.exploreApi.recordEngagementBatch.mutate({
  engagements: [
    {
      contentId: number;
      engagementType: 'view' | 'save' | 'share' | 'click' | 'skip' | 'complete';
      watchTime?: number;        // Seconds
      completed?: boolean;
      sessionId?: number;
    }
  ]
})
```

---

## Common Patterns

### Video Feed with Swipe Navigation
```typescript
// Initial load
const { data } = await trpc.exploreApi.getVideoFeed.query({
  sessionHistory: [],
  limit: 10,
});

// Track viewed videos
const sessionHistory = data.videos.map(v => v.id);

// Load next batch
const nextBatch = await trpc.exploreApi.getVideoFeed.query({
  sessionHistory,
  limit: 10,
});
```

### Engagement Tracking Pattern
```typescript
// Track video view
await trpc.exploreApi.recordEngagementBatch.mutate({
  engagements: [
    {
      contentId: videoId,
      engagementType: 'view',
      watchTime: 5,
      sessionId,
    }
  ]
});

// Track completion
await trpc.exploreApi.recordEngagementBatch.mutate({
  engagements: [
    {
      contentId: videoId,
      engagementType: 'complete',
      completed: true,
      watchTime: 30,
      sessionId,
    }
  ]
});
```

### Save Property Pattern
```typescript
// Double-tap to save
const handleDoubleTap = async (contentId: number, propertyId: number) => {
  const result = await trpc.exploreApi.toggleSaveProperty.mutate({
    contentId,
    propertyId,
  });
  
  if (result.saved) {
    showToast('Property saved!');
  }
};
```

### Follow Neighbourhood Pattern
```typescript
// Follow button click
const handleFollow = async (neighbourhoodId: number) => {
  const result = await trpc.exploreApi.toggleNeighbourhoodFollow.mutate({
    neighbourhoodId,
  });
  
  setIsFollowing(result.following);
};
```

---

## Response Types

### RecommendedContent
```typescript
{
  id: number;
  contentType: string;
  title: string;
  thumbnailUrl: string;
  videoUrl?: string;
  score: number;
  reason: string;
}
```

### VideoFeedItem
```typescript
{
  id: number;
  title: string;
  description: string;
  thumbnailUrl: string;
  videoUrl: string;
  creatorId: number;
  tags: string[];
  lifestyleCategories: string[];
  priceMin: number;
  priceMax: number;
  duration: number;
  propertyId?: number;
  developmentId?: number;
  totalViews: number;
  completionRate: number;
  engagementScore: number;
  createdAt: Date;
}
```

### NeighbourhoodDetail
```typescript
{
  id: number;
  name: string;
  slug: string;
  city: string;
  province: string;
  heroBannerUrl: string;
  description: string;
  locationLat: number;
  locationLng: number;
  amenities: object;
  safetyRating: number;
  walkabilityScore: number;
  avgPropertyPrice: number;
  priceTrend: object;
  highlights: string[];
  followerCount: number;
  propertyCount: number;
  videoCount: number;
}
```

---

## Error Handling

All endpoints return standardized responses:

```typescript
// Success
{
  success: true,
  data: { ... }
}

// Error
{
  success: false,
  error: {
    message: string;
    code?: string;
  }
}
```

### Common Errors
- `UNAUTHORIZED`: User not authenticated
- `NOT_FOUND`: Resource not found
- `VALIDATION_ERROR`: Invalid input
- `INTERNAL_ERROR`: Server error

---

## Performance Tips

### Pagination
- Use `limit` and `offset` for large result sets
- Default limit is 20, max is 50 for feeds
- Max 100 for saved items and neighbourhoods

### Session History
- Track viewed content IDs to avoid duplicates
- Keep session history under 100 items
- Clear on session end

### Batch Operations
- Use `recordEngagementBatch` for multiple engagements
- Reduces API calls and improves performance
- Batch up to 50 engagements at once

### Caching (Client-Side)
- Cache category list (rarely changes)
- Cache neighbourhood details (1 hour)
- Don't cache personalized feeds (always fresh)

---

## Integration Checklist

### Video Feed Component
- ✅ Load initial videos with `getVideoFeed`
- ✅ Track session history
- ✅ Preload next 2 videos
- ✅ Record view engagements
- ✅ Record completion on video end
- ✅ Handle save/share actions

### Discovery Feed Component
- ✅ Load personalized feed with `getFeed`
- ✅ Apply category filters
- ✅ Implement infinite scroll
- ✅ Track engagement on card clicks

### Neighbourhood Pages
- ✅ Load detail with `getNeighbourhoodDetail`
- ✅ Display amenities and stats
- ✅ Show neighbourhood videos
- ✅ Implement follow button

### User Profile
- ✅ Display saved properties
- ✅ Display followed neighbourhoods
- ✅ Display followed creators
- ✅ Allow unsave/unfollow actions

---

## Testing

### Example Test Cases
```typescript
// Test video feed loading
it('should load video feed', async () => {
  const result = await trpc.exploreApi.getVideoFeed.query({
    sessionHistory: [],
    limit: 10,
  });
  
  expect(result.success).toBe(true);
  expect(result.data.videos).toHaveLength(10);
});

// Test save property
it('should save property', async () => {
  const result = await trpc.exploreApi.toggleSaveProperty.mutate({
    contentId: 1,
    propertyId: 1,
  });
  
  expect(result.success).toBe(true);
  expect(result.saved).toBe(true);
});

// Test follow neighbourhood
it('should follow neighbourhood', async () => {
  const result = await trpc.exploreApi.toggleNeighbourhoodFollow.mutate({
    neighbourhoodId: 1,
  });
  
  expect(result.success).toBe(true);
  expect(result.following).toBe(true);
});
```

---

## Support

For issues or questions:
1. Check `EXPLORE_API_ENDPOINTS_COMPLETE.md` for detailed documentation
2. Review the active discovery implementation under `server/domains/discovery/`
   for current behaviour; historical progress reports are not authority.
3. See `server/exploreApiRouter.ts` for source code

---

**Last Updated**: December 6, 2024  
**Version**: 1.0  
**Status**: Production Ready ✅
