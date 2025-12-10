# Enhanced Location Pages Service - Quick Reference

## Overview

The Enhanced Location Pages Service provides Google Places integration for automatic location record creation and hierarchy management.

## Import

```typescript
import { 
  locationPagesServiceEnhanced,
  generateSlug,
  generateSEOContent 
} from '../services/locationPagesServiceEnhanced';
```

## Core Methods

### 1. Find or Create Location

Automatically creates or finds a location record with SEO content:

```typescript
const location = await locationPagesServiceEnhanced.findOrCreateLocation({
  name: 'Sandton',
  type: 'suburb',
  parentId: cityId,
  placeId: 'ChIJ0RhONcBRlR4RYjIBfymf8Bs',
  latitude: '-26.1076',
  longitude: '28.0567',
  viewportNeLat: -26.0976,
  viewportNeLng: 28.0667,
  viewportSwLat: -26.1176,
  viewportSwLng: 28.0467,
});

// Returns: Location object with auto-generated slug and SEO content
```

**Features:**
- Prevents duplicates using Place ID
- Generates SEO-friendly slug automatically
- Creates SEO title and description
- Ensures slug uniqueness within parent

### 2. Resolve Location Hierarchy

Resolves complete location hierarchy from Google Places data:

```typescript
import { googlePlacesService } from '../services/googlePlacesService';

// Get place details from Google Places
const placeDetails = await googlePlacesService.getPlaceDetails(placeId, sessionToken);

// Resolve hierarchy
const hierarchy = await locationPagesServiceEnhanced.resolveLocationHierarchy(placeDetails);

// Returns:
// {
//   province: Location | null,
//   city: Location | null,
//   suburb: Location | null
// }
```

**Features:**
- Creates all levels of hierarchy (province → city → suburb)
- Maintains parent-child relationships
- Extracts coordinates and viewport bounds
- Validates South Africa boundaries

### 3. Sync Legacy Tables

Keeps provinces/cities/suburbs tables in sync with locations table:

```typescript
await locationPagesServiceEnhanced.syncLegacyTables(locationId);
```

**Features:**
- Ensures backward compatibility
- Syncs based on location type
- Creates records in legacy tables if missing

### 4. Get Location by Path

Retrieves location using hierarchical URL path:

```typescript
// Get suburb
const suburb = await locationPagesServiceEnhanced.getLocationByPath(
  'gauteng',
  'johannesburg',
  'sandton'
);

// Get city
const city = await locationPagesServiceEnhanced.getLocationByPath(
  'gauteng',
  'johannesburg'
);

// Get province
const province = await locationPagesServiceEnhanced.getLocationByPath('gauteng');
```

## Utility Functions

### Generate Slug

Converts location names to SEO-friendly slugs:

```typescript
const slug = generateSlug('Cape Town');
// Returns: 'cape-town'

const slug2 = generateSlug('Port Elizabeth!');
// Returns: 'port-elizabeth'

const slug3 = generateSlug('Johannesburg  CBD');
// Returns: 'johannesburg-cbd'
```

**Rules:**
- Lowercase only
- Hyphens replace spaces
- Special characters removed
- No leading/trailing hyphens
- No consecutive hyphens

### Generate SEO Content

Creates SEO-optimized titles and descriptions:

```typescript
const seoContent = generateSEOContent({
  name: 'Sandton',
  type: 'suburb',
}, {
  province: 'Gauteng',
  city: 'Johannesburg'
});

// Returns:
// {
//   title: 'Sandton Properties for Sale & Rent | Johannesburg, Gauteng',
//   description: 'Find properties in Sandton, Johannesburg. Browse houses, apartments...',
//   heroImage: undefined
// }
```

## Complete Example: Listing Creation Flow

```typescript
import { googlePlacesService } from '../services/googlePlacesService';
import { locationPagesServiceEnhanced } from '../services/locationPagesServiceEnhanced';

async function createListingWithLocation(listingData: any, placeId: string) {
  // 1. Create session token
  const sessionToken = googlePlacesService.createSessionToken();
  
  try {
    // 2. Get place details from Google Places
    const placeDetails = await googlePlacesService.getPlaceDetails(
      placeId,
      sessionToken
    );
    
    if (!placeDetails) {
      throw new Error('Failed to get place details');
    }
    
    // 3. Resolve location hierarchy
    const hierarchy = await locationPagesServiceEnhanced.resolveLocationHierarchy(
      placeDetails
    );
    
    // 4. Get the most specific location (suburb > city > province)
    const location = hierarchy.suburb || hierarchy.city || hierarchy.province;
    
    if (!location) {
      throw new Error('Failed to resolve location');
    }
    
    // 5. Create listing with location_id
    const listing = await db.insert(listings).values({
      ...listingData,
      locationId: location.id,
      // Also populate legacy fields for backward compatibility
      province: hierarchy.province?.name,
      city: hierarchy.city?.name,
      suburb: hierarchy.suburb?.name,
      placeId: placeDetails.placeId,
      latitude: placeDetails.geometry.location.lat,
      longitude: placeDetails.geometry.location.lng,
    });
    
    // 6. Sync legacy tables
    await locationPagesServiceEnhanced.syncLegacyTables(location.id);
    
    // 7. Terminate session token
    googlePlacesService.terminateSessionToken(sessionToken);
    
    return listing;
  } catch (error) {
    console.error('Error creating listing with location:', error);
    throw error;
  }
}
```

## Database Schema

### locations Table

```sql
CREATE TABLE locations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  slug VARCHAR(200) NOT NULL,
  type ENUM('province', 'city', 'suburb', 'neighborhood') NOT NULL,
  parent_id INT,
  place_id VARCHAR(255),
  description TEXT,
  latitude VARCHAR(50),
  longitude VARCHAR(50),
  viewport_ne_lat DECIMAL(10, 8),
  viewport_ne_lng DECIMAL(11, 8),
  viewport_sw_lat DECIMAL(10, 8),
  viewport_sw_lng DECIMAL(11, 8),
  seo_title VARCHAR(255),
  seo_description TEXT,
  hero_image VARCHAR(500),
  property_count INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  INDEX idx_locations_place_id (place_id),
  INDEX idx_locations_slug (slug),
  INDEX idx_locations_parent_id (parent_id)
);
```

## URL Patterns

The service supports hierarchical URL patterns:

- Province: `/south-africa/gauteng`
- City: `/south-africa/gauteng/johannesburg`
- Suburb: `/south-africa/gauteng/johannesburg/sandton`

## Error Handling

```typescript
try {
  const location = await locationPagesServiceEnhanced.findOrCreateLocation(input);
} catch (error) {
  if (error.code === 'ER_DUP_ENTRY') {
    // Handle duplicate entry (shouldn't happen with proper Place ID checking)
    console.error('Duplicate location entry');
  } else {
    // Handle other errors
    console.error('Error creating location:', error);
  }
}
```

## Best Practices

1. **Always use Place ID for deduplication**
   - Place ID is the most reliable way to prevent duplicates
   - Fall back to slug + parent_id if Place ID is not available

2. **Terminate session tokens**
   - Always terminate session tokens after place selection
   - This optimizes Google Places API billing

3. **Sync legacy tables**
   - Call `syncLegacyTables()` after creating locations
   - Ensures backward compatibility with existing code

4. **Validate coordinates**
   - Use `validateSouthAfricaBoundaries()` from googlePlacesService
   - Ensure coordinates are within South Africa

5. **Handle hierarchy gracefully**
   - Not all places have complete hierarchy (province/city/suburb)
   - Use the most specific location available

## Testing

Property-based tests validate:
- ✅ Slug generation format (Property 34)
- ✅ Slug uniqueness within parent (Property 39)
- ✅ Location record creation (Property 19)

Run tests:
```bash
npm test -- server/services/__tests__/locationPagesServiceEnhanced.property.test.ts --run
```

## Related Services

- `googlePlacesService.ts` - Google Places API wrapper
- `locationPagesService.improved.ts` - Existing location pages service
- `locationHierarchy.property.test.ts` - Hierarchy validation tests

## Requirements Validated

- ✅ 16.1-16.5: Automatic location record creation
- ✅ 27.1-27.5: SEO-friendly slugs and content
- ✅ 29.1-29.4: Hierarchical URL patterns
