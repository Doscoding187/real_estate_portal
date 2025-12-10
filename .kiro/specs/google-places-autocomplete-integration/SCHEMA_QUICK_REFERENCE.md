# Google Places Schema Quick Reference

## New Fields Added

### Provinces Table
```typescript
{
  slug: string | null;           // SEO-friendly URL slug
  placeId: string | null;        // Google Places ID
  seoTitle: string | null;       // Custom SEO title
  seoDescription: string | null; // Custom SEO description
}
```

### Cities Table
```typescript
{
  slug: string | null;           // SEO-friendly URL slug (unique within province)
  placeId: string | null;        // Google Places ID (unique)
  seoTitle: string | null;       // Custom SEO title
  seoDescription: string | null; // Custom SEO description
}
```

### Suburbs Table
```typescript
{
  slug: string | null;           // SEO-friendly URL slug (unique within city)
  placeId: string | null;        // Google Places ID (unique)
  seoTitle: string | null;       // Custom SEO title
  seoDescription: string | null; // Custom SEO description
}
```

### Locations Table
```typescript
{
  placeId: string | null;              // Google Places ID (unique)
  viewportNeLat: number | null;        // Viewport northeast latitude
  viewportNeLng: number | null;        // Viewport northeast longitude
  viewportSwLat: number | null;        // Viewport southwest latitude
  viewportSwLng: number | null;        // Viewport southwest longitude
  seoTitle: string | null;             // Custom SEO title
  seoDescription: string | null;       // Custom SEO description
  heroImage: string | null;            // Hero image URL
}
```

### Properties Table
```typescript
{
  locationId: number | null;     // Foreign key to locations table
}
```

### Developments Table
```typescript
{
  locationId: number | null;     // Foreign key to locations table
}
```

## New Tables

### location_searches
Tracks location searches for trending analysis

```typescript
{
  id: number;                    // Primary key
  locationId: number;            // Foreign key to locations
  userId: number | null;         // Foreign key to users (nullable)
  searchedAt: Date;              // Timestamp of search
}
```

**Indexes:**
- `idx_location_searched` on (location_id, searched_at)
- `idx_user_id` on (user_id)

### recent_searches
Stores user's recent location searches

```typescript
{
  id: number;                    // Primary key
  userId: number;                // Foreign key to users
  locationId: number;            // Foreign key to locations
  searchedAt: Date;              // Timestamp of search
}
```

**Indexes:**
- `idx_user_recent` on (user_id, searched_at DESC)
- `unique_user_location` UNIQUE on (user_id, location_id)

## Usage Examples

### Querying Locations with Google Places Data

```typescript
import { db } from './server/db';
import { locations } from './drizzle/schema';
import { eq } from 'drizzle-orm';

// Find location by Place ID
const location = await db
  .select()
  .from(locations)
  .where(eq(locations.placeId, 'ChIJ...'))
  .limit(1);

// Find location by slug
const locationBySlug = await db
  .select()
  .from(locations)
  .where(eq(locations.slug, 'sandton'))
  .limit(1);

// Get location with viewport bounds
const locationWithBounds = await db
  .select({
    id: locations.id,
    name: locations.name,
    viewport: {
      ne: {
        lat: locations.viewportNeLat,
        lng: locations.viewportNeLng,
      },
      sw: {
        lat: locations.viewportSwLat,
        lng: locations.viewportSwLng,
      },
    },
  })
  .from(locations)
  .where(eq(locations.id, locationId));
```

### Tracking Location Searches

```typescript
import { locationSearches } from './drizzle/schema';

// Record a location search
await db.insert(locationSearches).values({
  locationId: 123,
  userId: 456, // or null for anonymous
  searchedAt: new Date(),
});

// Get trending locations (most searched in last 30 days)
const trending = await db
  .select({
    locationId: locationSearches.locationId,
    searchCount: sql<number>`COUNT(*)`,
  })
  .from(locationSearches)
  .where(
    sql`${locationSearches.searchedAt} >= DATE_SUB(NOW(), INTERVAL 30 DAY)`
  )
  .groupBy(locationSearches.locationId)
  .orderBy(sql`COUNT(*) DESC`)
  .limit(10);
```

### Managing Recent Searches

```typescript
import { recentSearches } from './drizzle/schema';

// Add to recent searches (upsert pattern)
await db
  .insert(recentSearches)
  .values({
    userId: 456,
    locationId: 123,
    searchedAt: new Date(),
  })
  .onDuplicateKeyUpdate({
    searchedAt: new Date(),
  });

// Get user's recent searches
const recent = await db
  .select()
  .from(recentSearches)
  .where(eq(recentSearches.userId, 456))
  .orderBy(desc(recentSearches.searchedAt))
  .limit(5);
```

### Linking Properties to Locations

```typescript
import { properties } from './drizzle/schema';

// Update property with location
await db
  .update(properties)
  .set({ locationId: 123 })
  .where(eq(properties.id, propertyId));

// Query properties by location
const propertiesInLocation = await db
  .select()
  .from(properties)
  .where(eq(properties.locationId, 123));
```

## URL Patterns

With the new slug fields, location pages follow this pattern:

- **Province**: `/south-africa/{province-slug}`
  - Example: `/south-africa/gauteng`

- **City**: `/south-africa/{province-slug}/{city-slug}`
  - Example: `/south-africa/gauteng/johannesburg`

- **Suburb**: `/south-africa/{province-slug}/{city-slug}/{suburb-slug}`
  - Example: `/south-africa/gauteng/johannesburg/sandton`

## SEO Fields Usage

The SEO fields allow customization of meta tags:

```typescript
// Generate SEO metadata
const seoData = {
  title: location.seoTitle || `Properties in ${location.name}`,
  description: location.seoDescription || 
    `Browse ${propertyCount} properties for sale and rent in ${location.name}`,
  image: location.heroImage || '/default-location-hero.jpg',
};
```

## Migration Status

Run the migration to apply these changes:

```bash
pnpm tsx scripts/run-google-places-migration.ts
```

## Property Tests

Verify hierarchical integrity:

```bash
pnpm vitest run server/services/__tests__/locationHierarchy.property.test.ts
```
