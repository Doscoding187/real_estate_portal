# Task 18: Location Breakdown Components - Integration Guide

## Quick Integration Steps

This guide shows exactly how to integrate the new location breakdown components into existing location pages.

## Step 1: Update ProvincePage.tsx

### Import the new component
```tsx
import { CityList } from '@/components/location/CityList';
```

### Replace LocationGrid with CityList
Find this code (around line 70):
```tsx
<LocationGrid 
  title={`Popular Cities in ${province.name}`} 
  items={cities} 
  parentSlug={provinceSlug}
  type="city"
/>
```

Replace with:
```tsx
<CityList
  title={`Major Cities in ${province.name}`}
  cities={cities}
  parentSlug={provinceSlug}
  showFilters={true}
/>
```

### Update data structure (if needed)
The backend should provide these fields for each city:
```typescript
{
  id: number;
  name: string;
  listingCount: number;
  avgPrice?: number;
  slug?: string;
  suburbCount?: number;      // NEW: Add if available
  developmentCount?: number; // NEW: Add if available
  popularity?: number;       // NEW: Add if available
}
```

---

## Step 2: Update CityPage.tsx

### Import the new component
```tsx
import { SuburbList } from '@/components/location/SuburbList';
```

### Replace LocationGrid with SuburbList
Find this code (around line 60):
```tsx
<LocationGrid 
  title={`Popular Suburbs in ${city.name}`} 
  items={suburbs} 
  parentSlug={`${provinceSlug}/${citySlug}`}
  type="suburb"
/>
```

Replace with:
```tsx
<SuburbList
  title={`Explore Suburbs in ${city.name}`}
  suburbs={suburbs}
  parentSlug={`${provinceSlug}/${citySlug}`}
  showFilters={true}
/>
```

### Update data structure (if needed)
The backend should provide these fields for each suburb:
```typescript
{
  id: number;
  name: string;
  listingCount: number;
  avgPrice?: number;
  slug?: string;
  priceChange?: number;  // NEW: Add if available (percentage)
  popularity?: number;   // NEW: Add if available
}
```

---

## Step 3: Update SuburbPage.tsx

### Import the new component
```tsx
import { NearbySuburbs } from '@/components/location/NearbySuburbs';
```

### Add NearbySuburbs section
Add this code after the `FeaturedListings` section (around line 80):

```tsx
{/* Nearby Suburbs Section - NEW */}
{data.nearbySuburbs && data.nearbySuburbs.length > 0 && (
  <NearbySuburbs
    title="Explore Nearby Areas"
    suburbs={data.nearbySuburbs}
    parentSlug={`${provinceSlug}/${citySlug}`}
    currentSuburbName={suburb.name}
    maxDisplay={6}
  />
)}
```

### Update backend query
The backend `getSuburbData` query should include nearby suburbs:

```typescript
// In locationPagesRouter.ts or locationPagesService.ts
const nearbySuburbs = await db.query(`
  SELECT 
    l.id,
    l.name,
    l.slug,
    COUNT(DISTINCT listings.id) as listingCount,
    AVG(listings.price) as avgPrice,
    ST_Distance_Sphere(
      POINT(l.longitude, l.latitude),
      POINT(?, ?)
    ) / 1000 as distance
  FROM locations l
  LEFT JOIN listings ON listings.location_id = l.id
  WHERE l.type = 'suburb' 
    AND l.id != ?
    AND ST_Distance_Sphere(
      POINT(l.longitude, l.latitude),
      POINT(?, ?)
    ) <= 10000  -- 10km radius
  GROUP BY l.id
  ORDER BY distance ASC
  LIMIT 10
`, [suburb.longitude, suburb.latitude, suburb.id, suburb.longitude, suburb.latitude]);

// Add to response
return {
  suburb,
  listings,
  stats,
  nearbySuburbs  // NEW
};
```

---

## Step 4: Update Backend Services

### locationPagesService.ts - Add popularity scores

```typescript
// Add popularity calculation
async function calculatePopularity(locationId: number): Promise<number> {
  const result = await db.query(`
    SELECT COUNT(*) as searchCount
    FROM location_searches
    WHERE location_id = ?
      AND searched_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
  `, [locationId]);
  
  return result[0]?.searchCount || 0;
}

// Add to getProvinceData
const citiesWithPopularity = await Promise.all(
  cities.map(async (city) => ({
    ...city,
    popularity: await calculatePopularity(city.id)
  }))
);

// Add to getCityData
const suburbsWithPopularity = await Promise.all(
  suburbs.map(async (suburb) => ({
    ...suburb,
    popularity: await calculatePopularity(suburb.id)
  }))
);
```

### locationAnalyticsService.ts - Add price change calculation

```typescript
async function calculatePriceChange(locationId: number, days: number = 30): Promise<number> {
  const result = await db.query(`
    SELECT 
      AVG(CASE WHEN created_at >= DATE_SUB(NOW(), INTERVAL ? DAY) 
        THEN price END) as recentAvg,
      AVG(CASE WHEN created_at < DATE_SUB(NOW(), INTERVAL ? DAY) 
        THEN price END) as oldAvg
    FROM listings
    WHERE location_id = ?
      AND status = 'active'
  `, [days, days, locationId]);
  
  const { recentAvg, oldAvg } = result[0] || {};
  
  if (!recentAvg || !oldAvg) return 0;
  
  return ((recentAvg - oldAvg) / oldAvg) * 100;
}

// Add to getCityData
const suburbsWithPriceChange = await Promise.all(
  suburbs.map(async (suburb) => ({
    ...suburb,
    priceChange: await calculatePriceChange(suburb.id, 30)
  }))
);
```

---

## Step 5: Test the Integration

### Manual Testing Checklist

#### Province Page
- [ ] CityList renders with all cities
- [ ] Sort by name works (A-Z)
- [ ] Sort by price (high to low) works
- [ ] Sort by price (low to high) works
- [ ] Sort by listings works
- [ ] Sort by popularity works
- [ ] Filter by 10+ listings works
- [ ] Filter by 50+ listings works
- [ ] Filter by 100+ listings works
- [ ] Clicking a city navigates to city page
- [ ] Suburb count badge displays correctly
- [ ] Development count badge displays correctly

#### City Page
- [ ] SuburbList renders with all suburbs
- [ ] Sort by name works (A-Z)
- [ ] Sort by price (high to low) works
- [ ] Sort by price (low to high) works
- [ ] Sort by listings works
- [ ] Sort by popularity works
- [ ] Filter by 5+ listings works
- [ ] Filter by 10+ listings works
- [ ] Filter by 20+ listings works
- [ ] Clicking a suburb navigates to suburb page
- [ ] Price trend indicators show correctly (↑↓)
- [ ] Trend percentages display correctly

#### Suburb Page
- [ ] NearbySuburbs section renders
- [ ] Distance badges show correctly
- [ ] Distance formatting is correct (km/m)
- [ ] Clicking a nearby suburb navigates correctly
- [ ] Max display limit works (shows 6 by default)
- [ ] Section hides when no nearby suburbs

### Responsive Testing
- [ ] Test on mobile (320px width)
- [ ] Test on tablet (768px width)
- [ ] Test on desktop (1024px width)
- [ ] Test on wide screen (1920px width)
- [ ] Verify grid columns adjust correctly
- [ ] Check filter controls on mobile

### Performance Testing
- [ ] Test with 1 city/suburb
- [ ] Test with 10 cities/suburbs
- [ ] Test with 50 cities/suburbs
- [ ] Test with 100+ cities/suburbs
- [ ] Verify sorting is fast
- [ ] Verify filtering is fast
- [ ] Check for any lag or stuttering

---

## Step 6: Optional Enhancements

### Add Loading States
```tsx
{isLoading ? (
  <div className="container py-12">
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {[...Array(6)].map((_, i) => (
        <Skeleton key={i} className="h-48 w-full" />
      ))}
    </div>
  </div>
) : (
  <SuburbList
    title={`Explore Suburbs in ${city.name}`}
    suburbs={suburbs}
    parentSlug={`${provinceSlug}/${citySlug}`}
    showFilters={true}
  />
)}
```

### Add Error Boundaries
```tsx
<ErrorBoundary fallback={<div>Failed to load suburbs</div>}>
  <SuburbList
    title={`Explore Suburbs in ${city.name}`}
    suburbs={suburbs}
    parentSlug={`${provinceSlug}/${citySlug}`}
    showFilters={true}
  />
</ErrorBoundary>
```

### Add Analytics Tracking
```tsx
const handleSuburbClick = (suburbId: number) => {
  // Track suburb view
  analytics.track('suburb_viewed', {
    suburb_id: suburbId,
    source: 'city_page_suburb_list'
  });
};
```

---

## Troubleshooting

### Issue: Components not rendering
**Solution**: Check that data is being passed correctly. Use console.log to verify:
```tsx
console.log('Cities data:', cities);
console.log('Suburbs data:', suburbs);
```

### Issue: Sorting not working
**Solution**: Ensure popularity and priceChange fields are numbers, not strings:
```tsx
// Backend should return numbers
popularity: parseInt(row.popularity) || 0,
priceChange: parseFloat(row.priceChange) || 0,
```

### Issue: URLs not working
**Solution**: Verify slug generation and parentSlug format:
```tsx
// Should be: 'gauteng' for province
// Should be: 'gauteng/johannesburg' for city
console.log('Parent slug:', parentSlug);
```

### Issue: Distance not showing
**Solution**: Check that distance is calculated in kilometers:
```tsx
// Backend query should divide by 1000
ST_Distance_Sphere(...) / 1000 as distance
```

---

## Rollback Plan

If you need to rollback to the old LocationGrid component:

1. Remove the new imports:
```tsx
// Remove these
import { CityList } from '@/components/location/CityList';
import { SuburbList } from '@/components/location/SuburbList';
import { NearbySuburbs } from '@/components/location/NearbySuburbs';
```

2. Restore LocationGrid usage:
```tsx
// Restore this
<LocationGrid 
  title={`Popular Cities in ${province.name}`} 
  items={cities} 
  parentSlug={provinceSlug}
  type="city"
/>
```

3. Remove NearbySuburbs section from SuburbPage.tsx

---

## Support

For questions or issues:
1. Check the comprehensive documentation: `LOCATION_BREAKDOWN_README.md`
2. Review the demo page: `LocationBreakdownDemo.tsx`
3. Check the implementation summary: `TASK_18_COMPLETE.md`

---

## Next Steps After Integration

1. **Monitor Performance**: Watch for any performance issues with large datasets
2. **Gather Feedback**: Ask users about the sorting/filtering experience
3. **A/B Testing**: Consider testing different default sort orders
4. **Analytics**: Track which sort/filter options are most used
5. **Iterate**: Add requested features based on user feedback
