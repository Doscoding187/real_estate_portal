# Similar Locations Feature - Quick Reference

## Overview

The Similar Locations feature recommends comparable areas based on price bracket, property types, and market characteristics. This helps users discover alternative locations that match their preferences.

## Implementation Status

✅ **COMPLETE** - All components implemented and integrated

## Architecture

### Backend Service

**File**: `server/services/locationAnalyticsService.ts`

**Key Methods**:

1. **`calculateSimilarity(location1Stats, location2Stats)`**
   - Calculates similarity score (0-1) between two locations
   - **Algorithm weights**:
     - Price similarity: 40%
     - Property type overlap: 30%
     - Listing density: 30%
   - Returns weighted average score

2. **`getSimilarLocations(locationId, limit = 5)`**
   - Finds similar locations for a given location
   - Filters candidates by same type (suburb/city)
   - Calculates similarity scores
   - Prioritizes locations in same city
   - Returns top N most similar locations

**Similarity Algorithm**:
```typescript
// Price similarity (40%)
priceScore = 1 - |price1 - price2| / max(price1, price2)

// Property type similarity (30%) - Jaccard coefficient
typeScore = intersection(types1, types2) / union(types1, types2)

// Listing density similarity (30%)
densityScore = 1 - |count1 - count2| / max(count1, count2)

// Final score
similarityScore = (priceScore * 0.4) + (typeScore * 0.3) + (densityScore * 0.3)
```

### API Endpoint

**Router**: `server/locationPagesRouter.ts`

**Endpoint**: `getSimilarLocations`
- **Input**: `{ locationId: number, limit?: number }`
- **Output**: Array of similar locations with:
  - id, name, slug, type
  - cityName, provinceName
  - similarityScore (0-1)
  - avgPrice, listingCount
  - propertyTypes array

### Frontend Hook

**File**: `client/src/hooks/useSimilarLocations.ts`

**Usage**:
```typescript
const { data: similarLocations, isLoading } = useSimilarLocations({
  locationId: 123,
  limit: 5,
  enabled: true
});
```

**Features**:
- React Query integration
- 5-minute cache
- Automatic refetch on window focus
- Error handling

### UI Component

**File**: `client/src/components/location/SimilarLocations.tsx`

**Features**:
- Responsive grid layout (1/2/3 columns)
- Similarity badges (Very Similar, Similar, Somewhat Similar)
- Key statistics display:
  - Average price
  - Active listing count
  - Property types
  - Match score with progress bar
- Loading skeleton states
- Links to location pages

**Similarity Labels**:
- ≥ 0.8: "Very Similar" (green)
- ≥ 0.7: "Similar" (blue)
- < 0.7: "Somewhat Similar" (gray)

## Integration Points

### Location Pages

**SuburbPage** (`client/src/pages/SuburbPage.tsx`):
```tsx
<SimilarLocationsSection 
  locationId={suburb.id} 
  currentLocationName={suburb.name} 
/>
```

**CityPage** (`client/src/pages/CityPage.tsx`):
```tsx
<SimilarLocationsSection 
  locationId={city.id} 
  currentLocationName={city.name} 
/>
```

## Requirements Coverage

✅ **Requirement 22.1**: Calculate similar suburbs based on average price range
- Implemented with 40% weight on price similarity

✅ **Requirement 22.2**: Consider listing density
- Implemented with 30% weight on listing count similarity

✅ **Requirement 22.3**: Consider property type distribution
- Implemented with 30% weight using Jaccard coefficient

✅ **Requirement 22.4**: Prioritize suburbs within same city
- Implemented in sorting logic (same city locations ranked first)

✅ **Requirement 22.5**: Display up to 5 similar suburbs with statistics
- Component displays exactly 5 locations with full statistics

## Performance Characteristics

**Backend**:
- Candidate limit: 100 locations (for performance)
- Minimum similarity threshold: 0.5
- Parallel statistics calculation for candidates
- Error handling for individual candidate failures

**Frontend**:
- Query cache: 5 minutes
- Stale time: 5 minutes
- Automatic background refetch
- Loading states for better UX

## Data Flow

```
User views location page
    ↓
useSimilarLocations hook fetches data
    ↓
API calls getSimilarLocations(locationId)
    ↓
Service gets target location stats
    ↓
Service finds candidate locations (same type)
    ↓
For each candidate:
  - Calculate statistics
  - Calculate similarity score
  - Filter by threshold (≥ 0.5)
    ↓
Sort by similarity (prioritize same city)
    ↓
Return top 5 with parent location names
    ↓
Component renders similar locations
```

## Example Output

```json
[
  {
    "id": 456,
    "name": "Rosebank",
    "slug": "rosebank",
    "type": "suburb",
    "cityName": "Johannesburg",
    "provinceName": "Gauteng",
    "similarityScore": 0.87,
    "avgPrice": 3500000,
    "listingCount": 45,
    "propertyTypes": ["Apartment", "Townhouse", "House"]
  },
  // ... up to 5 locations
]
```

## Testing

**Manual Testing**:
1. Navigate to any suburb or city page
2. Scroll to "Similar Locations" section
3. Verify 5 similar locations displayed
4. Check similarity scores and statistics
5. Click location cards to navigate

**Expected Behavior**:
- Locations with similar prices shown
- Same city locations prioritized
- Similar property type distributions
- Smooth loading states
- Accurate statistics

## Future Enhancements

Potential improvements:
- Add lifestyle pattern matching (amenities, demographics)
- Include commute time similarity
- Add price trend similarity
- Support user preference weighting
- Add "Why similar?" explanations
- Cache similarity calculations

## Related Files

**Backend**:
- `server/services/locationAnalyticsService.ts` - Core logic
- `server/locationPagesRouter.ts` - API endpoint

**Frontend**:
- `client/src/hooks/useSimilarLocations.ts` - Data fetching
- `client/src/components/location/SimilarLocations.tsx` - UI component
- `client/src/pages/SuburbPage.tsx` - Integration
- `client/src/pages/CityPage.tsx` - Integration

## Notes

- Minimum similarity threshold of 0.5 ensures quality recommendations
- Same-city prioritization improves relevance for users
- Jaccard coefficient provides robust property type comparison
- Component gracefully handles empty results
- Error handling prevents cascade failures
