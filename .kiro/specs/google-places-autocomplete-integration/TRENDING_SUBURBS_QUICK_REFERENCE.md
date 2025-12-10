# Trending Suburbs - Quick Reference Guide

## Overview

The trending suburbs feature tracks location searches and displays the most popular suburbs based on recent search activity.

## Quick Start

### 1. Display Trending Suburbs

```tsx
import { TrendingSuburbs } from '@/components/location/TrendingSuburbs';
import { useTrendingSuburbs } from '@/hooks/useTrendingSuburbs';

function MyLocationPage() {
  const { data: trending, isLoading } = useTrendingSuburbs({ limit: 10 });
  
  if (isLoading) return <div>Loading...</div>;
  
  return (
    <div>
      {trending && trending.length > 0 && (
        <TrendingSuburbs 
          suburbs={trending}
          title="Trending Suburbs"
          showCount={10}
        />
      )}
    </div>
  );
}
```

### 2. Track a Search

```tsx
import { trpc } from '@/lib/trpc';

function LocationAutocomplete() {
  const trackSearch = trpc.locationPages.trackLocationSearch.useMutation();
  
  const handleLocationSelect = async (locationId: number) => {
    // Track the search
    await trackSearch.mutateAsync({ locationId });
    
    // Navigate to location page
    navigate(`/location/${locationId}`);
  };
}
```

### 3. Backend Tracking

```typescript
import { locationAnalyticsService } from './services/locationAnalyticsService';

// Track authenticated user search
await locationAnalyticsService.trackLocationSearch(locationId, userId);

// Track anonymous search
await locationAnalyticsService.trackLocationSearch(locationId);
```

## API Reference

### Frontend Hook

#### `useTrendingSuburbs(options)`

**Options:**
- `limit?: number` - Number of suburbs to fetch (1-50, default: 10)
- `enabled?: boolean` - Whether to fetch data (default: true)

**Returns:**
```typescript
{
  data: TrendingSuburb[] | undefined;
  isLoading: boolean;
  error: Error | null;
}
```

**TrendingSuburb Type:**
```typescript
interface TrendingSuburb {
  id: number;
  name: string;
  slug: string;
  cityName: string | null;
  provinceName: string | null;
  trendingScore: number;        // 0-100
  searchCount30d: number;        // Total searches in last 30 days
  listingCount: number;          // Active listings
  avgPrice: number | null;       // Average sale price
}
```

### Backend Service

#### `locationAnalyticsService.trackLocationSearch(locationId, userId?)`

Records a search event.

**Parameters:**
- `locationId: number` - Location being searched
- `userId?: number` - User ID (optional, for authenticated users)

**Returns:** `Promise<void>`

**Example:**
```typescript
await locationAnalyticsService.trackLocationSearch(123, 456);
```

#### `locationAnalyticsService.calculateTrendingScore(locationId)`

Calculates trending score for a location.

**Parameters:**
- `locationId: number` - Location to calculate score for

**Returns:** `Promise<number>` - Score between 0-100

**Example:**
```typescript
const score = await locationAnalyticsService.calculateTrendingScore(123);
console.log(`Trending score: ${score}`);
```

#### `locationAnalyticsService.getTrendingSuburbs(limit?)`

Gets top trending suburbs.

**Parameters:**
- `limit?: number` - Number of suburbs to return (default: 10)

**Returns:** `Promise<TrendingSuburb[]>`

**Example:**
```typescript
const trending = await locationAnalyticsService.getTrendingSuburbs(5);
```

### tRPC Endpoints

#### `locationPages.getTrendingSuburbs`

**Input:**
```typescript
{
  limit?: number; // 1-50, default: 10
}
```

**Output:** `TrendingSuburb[]`

**Example:**
```typescript
const trending = await trpc.locationPages.getTrendingSuburbs.query({ limit: 10 });
```

## Component Props

### `<TrendingSuburbs />`

**Props:**
```typescript
interface TrendingSuburbsProps {
  suburbs: TrendingSuburb[];     // Required: Array of trending suburbs
  title?: string;                 // Optional: Card title (default: "Trending Suburbs")
  showCount?: number;             // Optional: Number to display (default: 10)
}
```

**Example:**
```tsx
<TrendingSuburbs 
  suburbs={trendingData}
  title="🔥 Hot Suburbs Right Now"
  showCount={5}
/>
```

## Trending Score Algorithm

### Time-Based Weighting

Searches are weighted based on recency:

| Time Period | Weight |
|------------|--------|
| Last 7 days | 4.0x |
| 7-14 days | 2.0x |
| 14-21 days | 1.0x |
| 21-30 days | 0.5x |

### Score Calculation

```
weighted_score = Σ (search_weight × search_count)
trending_score = min(100, (weighted_score / 100) × 100)
```

### Score Interpretation

| Score | Badge Color | Meaning |
|-------|------------|---------|
| 75-100 | Red | Very Hot 🔥 |
| 50-74 | Orange | Hot 🌶️ |
| 25-49 | Yellow | Warm ☀️ |
| 0-24 | Green | Emerging 🌱 |

## Integration Examples

### Example 1: Province Page

```tsx
import { TrendingSuburbs } from '@/components/location/TrendingSuburbs';
import { useTrendingSuburbs } from '@/hooks/useTrendingSuburbs';

export function ProvincePage({ provinceSlug }: { provinceSlug: string }) {
  const { data: trending } = useTrendingSuburbs({ limit: 10 });
  
  return (
    <div className="space-y-8">
      <HeroSection />
      <QuickStats />
      
      {/* Trending Suburbs Section */}
      {trending && trending.length > 0 && (
        <section>
          <TrendingSuburbs suburbs={trending} />
        </section>
      )}
      
      <PropertyExplorer />
    </div>
  );
}
```

### Example 2: Search Results Page

```tsx
import { TrendingSuburbs } from '@/components/location/TrendingSuburbs';
import { useTrendingSuburbs } from '@/hooks/useTrendingSuburbs';

export function SearchResults() {
  const { data: trending } = useTrendingSuburbs({ limit: 5 });
  
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Main search results */}
      <div className="lg:col-span-2">
        <SearchResultsList />
      </div>
      
      {/* Sidebar with trending */}
      <aside className="space-y-6">
        <FilterPanel />
        {trending && trending.length > 0 && (
          <TrendingSuburbs 
            suburbs={trending}
            title="Trending Now"
            showCount={5}
          />
        )}
      </aside>
    </div>
  );
}
```

### Example 3: Track Search on Location Select

```tsx
import { locationAnalyticsService } from '@/server/services/locationAnalyticsService';

export async function handleLocationSelection(
  locationId: number,
  userId?: number
) {
  // Track the search
  await locationAnalyticsService.trackLocationSearch(locationId, userId);
  
  // Update recent searches for the user
  // (automatically handled by trackLocationSearch)
  
  // Navigate to location page
  window.location.href = `/location/${locationId}`;
}
```

## Database Schema

### location_searches Table

```sql
CREATE TABLE location_searches (
  id INT AUTO_INCREMENT PRIMARY KEY,
  location_id INT NOT NULL,
  user_id INT NULL,
  searched_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_location_searched (location_id, searched_at),
  INDEX idx_user_id (user_id),
  FOREIGN KEY (location_id) REFERENCES locations(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);
```

### recent_searches Table

```sql
CREATE TABLE recent_searches (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  location_id INT NOT NULL,
  searched_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY unique_user_location (user_id, location_id),
  INDEX idx_user_recent (user_id, searched_at DESC),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (location_id) REFERENCES locations(id) ON DELETE CASCADE
);
```

## Performance Tips

### 1. Caching

The hook uses React Query with smart caching:
- Stale time: 1 hour (trending data changes slowly)
- GC time: 2 hours
- Automatic background refetch

### 2. Conditional Rendering

Only render when data is available:

```tsx
{trending && trending.length > 0 && (
  <TrendingSuburbs suburbs={trending} />
)}
```

### 3. Limit Results

Request only what you need:

```tsx
// Homepage: Show top 5
const { data } = useTrendingSuburbs({ limit: 5 });

// Dedicated page: Show top 20
const { data } = useTrendingSuburbs({ limit: 20 });
```

## Troubleshooting

### No Trending Suburbs Showing

**Possible causes:**
1. No search activity in last 30 days
2. Database not seeded with location data
3. location_searches table empty

**Solution:**
```typescript
// Seed some test searches
for (let i = 0; i < 50; i++) {
  await locationAnalyticsService.trackLocationSearch(testLocationId);
}
```

### Trending Scores All Zero

**Possible causes:**
1. Searches older than 30 days
2. Database time zone issues

**Solution:**
Check search timestamps:
```sql
SELECT location_id, searched_at, 
       DATEDIFF(NOW(), searched_at) as days_ago
FROM location_searches
ORDER BY searched_at DESC
LIMIT 10;
```

### Component Not Rendering

**Possible causes:**
1. Empty suburbs array
2. Missing imports
3. tRPC not configured

**Solution:**
```tsx
// Add loading and error states
const { data, isLoading, error } = useTrendingSuburbs();

if (isLoading) return <Skeleton />;
if (error) return <ErrorMessage error={error} />;
if (!data || data.length === 0) return null;

return <TrendingSuburbs suburbs={data} />;
```

## Testing

### Manual Testing

```typescript
// 1. Track some searches
await locationAnalyticsService.trackLocationSearch(123);
await locationAnalyticsService.trackLocationSearch(123);
await locationAnalyticsService.trackLocationSearch(456);

// 2. Calculate scores
const score123 = await locationAnalyticsService.calculateTrendingScore(123);
const score456 = await locationAnalyticsService.calculateTrendingScore(456);

console.log(`Location 123 score: ${score123}`); // Should be higher
console.log(`Location 456 score: ${score456}`);

// 3. Get trending suburbs
const trending = await locationAnalyticsService.getTrendingSuburbs(10);
console.log('Trending suburbs:', trending);
```

### Property Tests

Run the property-based tests:

```bash
npm run test -- server/services/__tests__/trendingSuburbs.property.test.ts --run
```

## Best Practices

### 1. Track All Location Interactions

```typescript
// Autocomplete selection
onSelect={(location) => {
  trackLocationSearch.mutate({ locationId: location.id });
}}

// Location page view
useEffect(() => {
  trackLocationSearch.mutate({ locationId });
}, [locationId]);

// Search filter application
onFilterApply={(filters) => {
  if (filters.locationId) {
    trackLocationSearch.mutate({ locationId: filters.locationId });
  }
}}
```

### 2. Handle Errors Gracefully

```typescript
const trackSearch = trpc.locationPages.trackLocationSearch.useMutation({
  onError: (error) => {
    // Log but don't show to user
    console.error('Failed to track search:', error);
  }
});
```

### 3. Optimize Rendering

```tsx
// Memoize the component
const TrendingSection = React.memo(({ suburbs }) => (
  <TrendingSuburbs suburbs={suburbs} />
));

// Use in parent
<TrendingSection suburbs={trending} />
```

## Related Documentation

- [Task 13 Complete](./TASK_13_COMPLETE.md) - Full implementation details
- [Design Document](./design.md) - Architecture and algorithms
- [Requirements](./requirements.md) - Requirements 21.1-21.5
- [Location Analytics Service](../../server/services/locationAnalyticsService.ts) - Source code
