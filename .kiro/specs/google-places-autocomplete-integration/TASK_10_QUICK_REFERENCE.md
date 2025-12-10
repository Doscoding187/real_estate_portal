# Task 10 Quick Reference: Enhanced Location Page Data Fetching

## Overview

Enhanced location page data fetching with Google Places integration, implementing SSR/ISR architecture with dual caching strategy.

## Key Features

✅ **Static Content Cache**: 24-hour TTL for SEO content from locations table  
✅ **Dynamic Stats Cache**: 5-minute TTL for market data from listings  
✅ **Intelligent Cache Invalidation**: Cascades to parent locations  
✅ **Backward Compatible**: Legacy endpoints still work  
✅ **Slug-Based Lookups**: Supports hierarchical URL patterns  

## New Endpoints

### 1. Get Enhanced Province Data
```typescript
trpc.locationPages.getEnhancedProvinceData.query({
  provinceSlug: 'gauteng'
})
```

**Returns:**
- Province info + cities + developments + trending suburbs
- Dynamic stats (listings, prices)
- **seoContent**: SEO title, description, hero image, Place ID, coordinates, viewport

### 2. Get Enhanced City Data
```typescript
trpc.locationPages.getEnhancedCityData.query({
  provinceSlug: 'gauteng',
  citySlug: 'johannesburg'
})
```

**Returns:**
- City info + suburbs + properties + developments
- Dynamic stats
- **seoContent**: SEO metadata + Google Places data

### 3. Get Enhanced Suburb Data
```typescript
trpc.locationPages.getEnhancedSuburbData.query({
  provinceSlug: 'gauteng',
  citySlug: 'johannesburg',
  suburbSlug: 'sandton'
})
```

**Returns:**
- Suburb info + listings + analytics
- Dynamic stats
- **seoContent**: SEO metadata + Google Places data

### 4. Get Location By Path
```typescript
trpc.locationPages.getLocationByPath.query({
  province: 'gauteng',
  city: 'johannesburg',      // optional
  suburb: 'sandton'           // optional
})
```

**Returns:** Raw location record from locations table

### 5. Invalidate Location Cache
```typescript
trpc.locationPages.invalidateLocationCache.mutate({
  locationId: 123
})
```

**Effect:** Invalidates dynamic cache for location and all parents

## Usage Patterns

### Frontend Component (SSR)

```typescript
import { trpc } from '@/lib/trpc';

export default function ProvincePage({ provinceSlug }) {
  const { data, isLoading } = trpc.locationPages.getEnhancedProvinceData.useQuery({
    provinceSlug
  });

  if (isLoading) return <Skeleton />;
  if (!data) return <NotFound />;

  return (
    <>
      {/* Static SEO Content (80%) */}
      <Head>
        <title>{data.seoContent?.title}</title>
        <meta name="description" content={data.seoContent?.description} />
      </Head>
      
      <HeroSection
        title={data.province.name}
        description={data.seoContent?.description}
        image={data.seoContent?.heroImage}
        coordinates={data.seoContent?.coordinates}
      />

      {/* Dynamic Market Data (20%) */}
      <StatsRow
        totalListings={data.stats.totalListings}
        avgPrice={data.stats.avgPrice}
      />

      <CitiesList cities={data.cities} />
      <FeaturedDevelopments developments={data.featuredDevelopments} />
      <TrendingSuburbs suburbs={data.trendingSuburbs} />
    </>
  );
}
```

### Cache Invalidation (Backend)

```typescript
// In listing creation/update handler
import { locationPagesService } from './services/locationPagesService.improved';

async function createListing(data) {
  // Create listing
  const listing = await db.insert(properties).values(data);
  
  // Invalidate location cache
  if (listing.locationId) {
    await locationPagesService.invalidateLocationCache(listing.locationId);
  }
  
  return listing;
}
```

## Response Structure

### seoContent Field (Static - 24h cache)
```typescript
{
  title: string;              // SEO title tag
  description: string;        // SEO meta description
  heroImage?: string;         // Hero image URL
  placeId?: string;          // Google Place ID
  coordinates: {
    lat: number;
    lng: number;
  };
  viewport?: {
    northeast: { lat, lng };
    southwest: { lat, lng };
  };
}
```

### Dynamic Stats (5min cache)
```typescript
{
  totalListings: number;
  avgPrice: number;
  rentalCount?: number;
  saleCount?: number;
}
```

## Cache Keys

### Static Content
- `static:province:{slug}`
- `static:city:{provinceSlug}:{citySlug}`
- `static:suburb:{provinceSlug}:{citySlug}:{suburbSlug}`

### Dynamic Stats
- `dynamic:province:{slug}`
- `dynamic:city:{provinceSlug}:{citySlug}`
- `dynamic:suburb:{provinceSlug}:{citySlug}:{suburbSlug}`

## Performance

| Operation | Expected Time | Cache Hit |
|-----------|--------------|-----------|
| Static content fetch | < 10ms | 24 hours |
| Dynamic stats fetch | < 50ms | 5 minutes |
| Total response | < 100ms | Both cached |
| Cache invalidation | < 20ms | N/A |

## Migration Guide

### Before (Legacy)
```typescript
const data = await trpc.locationPages.getProvinceData.query({
  provinceSlug: 'gauteng'
});

// Only dynamic data, no SEO content
```

### After (Enhanced)
```typescript
const data = await trpc.locationPages.getEnhancedProvinceData.query({
  provinceSlug: 'gauteng'
});

// Dynamic data + seoContent field
const seoTitle = data.seoContent?.title;
const heroImage = data.seoContent?.heroImage;
```

## Requirements Satisfied

- ✅ 24.1: Render static SEO content from locations table
- ✅ 24.2: Calculate dynamic statistics from listings table
- ✅ 24.3: Merge static (80%) + dynamic (20%) content
- ✅ 24.4: Invalidate cached statistics on listing changes
- ✅ 24.5: Cache static 24h, dynamic 5min
- ✅ 28.1: Fetch static content from locations table
- ✅ 28.2: Fetch dynamic statistics via aggregation
- ✅ 28.3: Merge server-side before sending HTML
- ✅ 28.4: Support client-side hydration
- ✅ 28.5: Ensure 80/20 static/dynamic ratio

## Troubleshooting

### No SEO Content Returned
**Problem:** `seoContent` field is null  
**Solution:** Location not in locations table. Create via `locationPagesServiceEnhanced.findOrCreateLocation()`

### Stale Statistics
**Problem:** Stats not updating after listing changes  
**Solution:** Call `invalidateLocationCache(locationId)` after mutations

### Cache Not Working
**Problem:** Every request hits database  
**Solution:** Check cache TTL constants, verify cache keys are correct

### Slow Response Times
**Problem:** Response > 2 seconds  
**Solution:** 
1. Check if cache is working
2. Verify database indexes exist
3. Consider upgrading to Redis

## Next Steps

1. Update frontend components to use enhanced endpoints
2. Add cache invalidation to listing mutations
3. Upgrade to Redis for production
4. Add cache warming for popular locations
5. Monitor cache hit rates and performance

## Related Files

- `server/services/locationPagesService.improved.ts` - Service implementation
- `server/locationPagesRouter.ts` - tRPC endpoints
- `server/services/locationPagesServiceEnhanced.ts` - Location creation
- `.kiro/specs/google-places-autocomplete-integration/TASK_10_COMPLETE.md` - Full documentation
