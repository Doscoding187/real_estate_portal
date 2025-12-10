# Search Integration Quick Reference

## Overview

The search integration provides unified search across locations, listings, and developments with intelligent ranking and Place ID-based filtering.

## Core Functions

### 1. Global Search

Search across all entity types:

```typescript
import { globalSearch } from './server/services/globalSearchService';

const results = await globalSearch({
  query: 'Sandton',
  types: ['location', 'listing', 'development'], // Optional, defaults to all
  limit: 20, // Optional, defaults to 20
  userId: 123 // Optional, for personalization
});

// Results structure:
{
  locations: LocationResult[],
  listings: ListingResult[],
  developments: DevelopmentResult[],
  totalResults: number,
  query: string
}
```

### 2. Location Search

Search locations with intelligent ranking:

```typescript
import { searchLocations } from './server/services/globalSearchService';

const locations = await searchLocations(
  'Johannesburg',
  10, // limit
  userId // optional, for personalization
);

// Each location includes:
{
  id: number,
  name: string,
  slug: string,
  type: 'province' | 'city' | 'suburb' | 'neighborhood',
  placeId: string | null,
  url: string, // e.g., '/south-africa/gauteng/johannesburg'
  relevanceScore: number, // 0-100
  trendingScore: number, // 0-100
  propertyCount: number | null
}
```

### 3. Filter Listings by Place ID

Precise filtering using location_id:

```typescript
import { filterListingsByPlaceId } from './server/services/globalSearchService';

const listings = await filterListingsByPlaceId(
  'ChIJabcdef123456', // Google Place ID
  {
    propertyType: ['house', 'apartment'],
    listingType: ['sale'],
    minPrice: 1000000,
    maxPrice: 5000000,
    bedrooms: 3,
    bathrooms: 2
  },
  50 // limit
);
```

### 4. Track Location Search

Record searches for trending analysis:

```typescript
import { trackLocationSearch } from './server/services/globalSearchService';

await trackLocationSearch(
  locationId,
  userId // optional
);
```

## Ranking Signals

Location search results are ranked using multiple signals:

| Signal | Weight | Description |
|--------|--------|-------------|
| Query Similarity | 35% | How well the query matches the location name |
| Historical Popularity | 20% | Search frequency over last 30 days |
| Listing Inventory | 20% | Number of active listings in the location |
| Type Priority | 15% | Suburbs (20) > Cities (10) > Provinces (5) |
| User History | 10% | Bonus for locations in user's recent searches |

## URL Patterns

Location URLs follow a hierarchical pattern:

```
Province:  /south-africa/{province-slug}
City:      /south-africa/{province-slug}/{city-slug}
Suburb:    /south-africa/{province-slug}/{city-slug}/{suburb-slug}
```

Example:
```
/south-africa/gauteng/johannesburg/sandton
```

## Frontend Integration Examples

### Search Autocomplete

```typescript
import { searchLocations } from '@/lib/api/search';

const SearchAutocomplete = () => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);

  const handleSearch = async (value: string) => {
    setQuery(value);
    if (value.length >= 3) {
      const locations = await searchLocations(value, 5);
      setResults(locations);
    }
  };

  return (
    <input
      value={query}
      onChange={(e) => handleSearch(e.target.value)}
      placeholder="Search locations..."
    />
    <ul>
      {results.map(location => (
        <li key={location.id}>
          <Link to={`${location.url}?placeId=${location.placeId}`}>
            {location.name}
            <span>{location.type}</span>
            <span>{location.propertyCount} listings</span>
          </Link>
        </li>
      ))}
    </ul>
  );
};
```

### Global Search Page

```typescript
import { globalSearch } from '@/lib/api/search';

const SearchPage = () => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState(null);

  const handleSearch = async () => {
    const searchResults = await globalSearch({
      query,
      types: ['location', 'listing', 'development'],
      limit: 20
    });
    setResults(searchResults);
  };

  return (
    <div>
      <input value={query} onChange={(e) => setQuery(e.target.value)} />
      <button onClick={handleSearch}>Search</button>

      {results && (
        <>
          <section>
            <h2>Locations ({results.locations.length})</h2>
            {results.locations.map(loc => (
              <LocationCard key={loc.id} location={loc} />
            ))}
          </section>

          <section>
            <h2>Listings ({results.listings.length})</h2>
            {results.listings.map(listing => (
              <ListingCard key={listing.id} listing={listing} />
            ))}
          </section>

          <section>
            <h2>Developments ({results.developments.length})</h2>
            {results.developments.map(dev => (
              <DevelopmentCard key={dev.id} development={dev} />
            ))}
          </section>
        </>
      )}
    </div>
  );
};
```

### Location Page with Filtering

```typescript
import { filterListingsByPlaceId } from '@/lib/api/search';
import { trackLocationSearch } from '@/lib/api/search';

const LocationPage = ({ location }) => {
  const [filters, setFilters] = useState({});
  const [listings, setListings] = useState([]);

  useEffect(() => {
    // Track the location view
    trackLocationSearch(location.id);

    // Load listings
    loadListings();
  }, [location.id]);

  const loadListings = async () => {
    const results = await filterListingsByPlaceId(
      location.placeId,
      filters,
      50
    );
    setListings(results);
  };

  return (
    <div>
      <h1>{location.name}</h1>
      <p>{location.description}</p>

      <FilterPanel
        filters={filters}
        onChange={(newFilters) => {
          setFilters(newFilters);
          loadListings();
        }}
      />

      <div>
        {listings.map(listing => (
          <ListingCard key={listing.id} listing={listing} />
        ))}
      </div>
    </div>
  );
};
```

## API Router Integration

To expose these functions via tRPC:

```typescript
// server/searchRouter.ts
import { router, publicProcedure } from './_core/trpc';
import { z } from 'zod';
import {
  globalSearch,
  searchLocations,
  filterListingsByPlaceId,
  trackLocationSearch
} from './services/globalSearchService';

export const searchRouter = router({
  global: publicProcedure
    .input(z.object({
      query: z.string().min(1),
      types: z.array(z.enum(['location', 'listing', 'development'])).optional(),
      limit: z.number().min(1).max(100).optional(),
    }))
    .query(async ({ input, ctx }) => {
      return globalSearch({
        ...input,
        userId: ctx.user?.id
      });
    }),

  locations: publicProcedure
    .input(z.object({
      query: z.string().min(1),
      limit: z.number().min(1).max(50).optional(),
    }))
    .query(async ({ input, ctx }) => {
      return searchLocations(
        input.query,
        input.limit || 10,
        ctx.user?.id
      );
    }),

  filterByPlaceId: publicProcedure
    .input(z.object({
      placeId: z.string(),
      filters: z.object({
        propertyType: z.array(z.string()).optional(),
        listingType: z.array(z.string()).optional(),
        minPrice: z.number().optional(),
        maxPrice: z.number().optional(),
        bedrooms: z.number().optional(),
        bathrooms: z.number().optional(),
      }).optional(),
      limit: z.number().min(1).max(100).optional(),
    }))
    .query(async ({ input }) => {
      return filterListingsByPlaceId(
        input.placeId,
        input.filters,
        input.limit || 50
      );
    }),

  trackSearch: publicProcedure
    .input(z.object({
      locationId: z.number(),
    }))
    .mutation(async ({ input, ctx }) => {
      await trackLocationSearch(
        input.locationId,
        ctx.user?.id
      );
      return { success: true };
    }),
});
```

## Performance Tips

1. **Debounce search input**: Wait 300ms after user stops typing
2. **Cache results**: Cache search results for 5 minutes
3. **Limit results**: Use appropriate limits (5-10 for autocomplete, 20-50 for search pages)
4. **Use indexes**: Ensure database indexes on place_id, slug, location_id
5. **Paginate**: Implement pagination for large result sets

## Testing

Run property tests:
```bash
npm run test -- server/services/__tests__/searchIntegration.property.test.ts --run
```

## Related Tasks

- Task 13: Implement trending suburbs feature (uses search tracking)
- Task 14: Implement similar locations recommendation
- Task 15: Add recent searches feature
- Task 19: Create data migration and sync scripts

## Requirements Validated

- ✅ 19.1-19.5: Search integration with location pages
- ✅ 25.1-25.5: Place ID-based filtering for listings
