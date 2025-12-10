# Similar Locations Feature - Example Walkthrough

## Real-World Example: Sandton, Johannesburg

Let's walk through how the similar locations feature works using Sandton as an example.

### Step 1: User Views Sandton Suburb Page

**URL**: `/south-africa/gauteng/johannesburg/sandton`

**Page Content**:
- Hero section with Sandton details
- Market statistics
- Property listings
- Interactive map
- **Similar Locations section** ⬅️ Our feature

### Step 2: Component Loads

```tsx
// In SuburbPage.tsx
<SimilarLocationsSection 
  locationId={123}  // Sandton's ID
  currentLocationName="Sandton"
/>
```

### Step 3: Hook Fetches Data

```typescript
// useSimilarLocations hook
const { data: similarLocations, isLoading } = useSimilarLocations({
  locationId: 123,
  limit: 5,
  enabled: true
});
```

### Step 4: API Request

**Request**:
```json
{
  "locationId": 123,
  "limit": 5
}
```

### Step 5: Backend Processing

#### 5.1 Get Target Location Stats

**Sandton Statistics**:
```json
{
  "avgPrice": 3500000,
  "listingCount": 45,
  "propertyTypes": {
    "Apartment": 25,
    "Townhouse": 12,
    "House": 8
  }
}
```

#### 5.2 Find Candidate Locations

**Query**: Find all suburbs in database (excluding Sandton)

**Candidates Found**: 100 suburbs

#### 5.3 Calculate Similarity for Each Candidate

**Example: Rosebank**

**Rosebank Statistics**:
```json
{
  "avgPrice": 3200000,
  "listingCount": 38,
  "propertyTypes": {
    "Apartment": 22,
    "Townhouse": 10,
    "House": 6
  }
}
```

**Similarity Calculation**:

1. **Price Similarity (40% weight)**:
   ```
   priceDiff = |3500000 - 3200000| = 300000
   maxPrice = 3500000
   priceScore = 1 - (300000 / 3500000) = 0.914
   ```

2. **Property Type Similarity (30% weight)**:
   ```
   Sandton types: [Apartment, Townhouse, House]
   Rosebank types: [Apartment, Townhouse, House]
   
   intersection = 3 (all match)
   union = 3
   typeScore = 3 / 3 = 1.0
   ```

3. **Listing Density Similarity (30% weight)**:
   ```
   densityDiff = |45 - 38| = 7
   maxDensity = 45
   densityScore = 1 - (7 / 45) = 0.844
   ```

4. **Final Similarity Score**:
   ```
   similarityScore = (0.914 × 0.4) + (1.0 × 0.3) + (0.844 × 0.3)
                   = 0.366 + 0.300 + 0.253
                   = 0.919
   ```

**Result**: Rosebank is 91.9% similar to Sandton ✅

#### 5.4 Calculate for All Candidates

**Top 5 Results**:

1. **Rosebank** - 0.919 (Very Similar)
   - Same city: ✅ Johannesburg
   - Avg Price: R3,200,000
   - Listings: 38

2. **Hyde Park** - 0.887 (Very Similar)
   - Same city: ✅ Johannesburg
   - Avg Price: R3,800,000
   - Listings: 42

3. **Morningside** - 0.856 (Very Similar)
   - Same city: ✅ Johannesburg
   - Avg Price: R3,300,000
   - Listings: 35

4. **Parktown** - 0.782 (Similar)
   - Same city: ✅ Johannesburg
   - Avg Price: R2,900,000
   - Listings: 28

5. **Umhlanga** - 0.723 (Similar)
   - Same city: ❌ Durban
   - Avg Price: R3,400,000
   - Listings: 52

### Step 6: API Response

```json
[
  {
    "id": 456,
    "name": "Rosebank",
    "slug": "rosebank",
    "type": "suburb",
    "cityName": "Johannesburg",
    "provinceName": "Gauteng",
    "similarityScore": 0.92,
    "avgPrice": 3200000,
    "listingCount": 38,
    "propertyTypes": ["Apartment", "Townhouse", "House"]
  },
  {
    "id": 457,
    "name": "Hyde Park",
    "slug": "hyde-park",
    "type": "suburb",
    "cityName": "Johannesburg",
    "provinceName": "Gauteng",
    "similarityScore": 0.89,
    "avgPrice": 3800000,
    "listingCount": 42,
    "propertyTypes": ["Apartment", "House", "Townhouse"]
  },
  // ... 3 more locations
]
```

### Step 7: Component Renders

**Visual Output**:

```
┌─────────────────────────────────────────────────────────────┐
│                    Similar Locations                         │
│                                                              │
│  Explore areas similar to Sandton based on price range,     │
│  property types, and market activity                        │
└─────────────────────────────────────────────────────────────┘

┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐
│ Rosebank         │  │ Hyde Park        │  │ Morningside      │
│ 📍 Johannesburg  │  │ 📍 Johannesburg  │  │ 📍 Johannesburg  │
│ [Very Similar]   │  │ [Very Similar]   │  │ [Very Similar]   │
│                  │  │                  │  │                  │
│ 💰 Avg Price     │  │ 💰 Avg Price     │  │ 💰 Avg Price     │
│ R3,200,000       │  │ R3,800,000       │  │ R3,300,000       │
│                  │  │                  │  │                  │
│ 🏠 Active        │  │ 🏠 Active        │  │ 🏠 Active        │
│ 38 Listings      │  │ 42 Listings      │  │ 35 Listings      │
│                  │  │                  │  │                  │
│ 📊 Property Types│  │ 📊 Property Types│  │ 📊 Property Types│
│ [Apartment]      │  │ [Apartment]      │  │ [Apartment]      │
│ [Townhouse]      │  │ [House]          │  │ [Townhouse]      │
│ [House]          │  │ [Townhouse]      │  │ [House]          │
│                  │  │                  │  │                  │
│ Match Score      │  │ Match Score      │  │ Match Score      │
│ 92%              │  │ 89%              │  │ 86%              │
│ ████████████████ │  │ ██████████████▓▓ │  │ █████████████▓▓▓ │
└──────────────────┘  └──────────────────┘  └──────────────────┘

┌──────────────────┐  ┌──────────────────┐
│ Parktown         │  │ Umhlanga         │
│ 📍 Johannesburg  │  │ 📍 Durban        │
│ [Similar]        │  │ [Similar]        │
│                  │  │                  │
│ 💰 Avg Price     │  │ 💰 Avg Price     │
│ R2,900,000       │  │ R3,400,000       │
│                  │  │                  │
│ 🏠 Active        │  │ 🏠 Active        │
│ 28 Listings      │  │ 52 Listings      │
│                  │  │                  │
│ 📊 Property Types│  │ 📊 Property Types│
│ [Apartment]      │  │ [Apartment]      │
│ [Townhouse]      │  │ [House]          │
│ [House]          │  │ [Townhouse]      │
│                  │  │                  │
│ Match Score      │  │ Match Score      │
│ 78%              │  │ 72%              │
│ ████████████▓▓▓▓ │  │ ███████████▓▓▓▓▓ │
└──────────────────┘  └──────────────────┘
```

### Step 8: User Interaction

**User clicks on "Rosebank" card**

**Navigation**: `/south-africa/gauteng/johannesburg/rosebank`

**Result**: User is taken to Rosebank's location page where they can:
- View Rosebank's market statistics
- Browse available properties
- See similar locations to Rosebank
- Compare with Sandton

## Why This Works

### 1. Price Similarity ✅
- Sandton: R3.5M average
- Rosebank: R3.2M average
- Difference: Only 8.6%
- **Result**: Users looking at Sandton can afford Rosebank

### 2. Property Type Match ✅
- Both have: Apartments, Townhouses, Houses
- Similar distribution
- **Result**: Users find the same property types they're interested in

### 3. Market Activity ✅
- Sandton: 45 listings
- Rosebank: 38 listings
- **Result**: Both are active markets with good selection

### 4. Geographic Relevance ✅
- Both in Johannesburg
- Same city prioritization
- **Result**: Users stay in their preferred city

## User Benefits

### For Property Seekers
1. **Discover alternatives** they might not have considered
2. **Compare similar areas** side-by-side
3. **Expand search** without leaving price range
4. **Find better value** in comparable neighborhoods

### For Property Agents
1. **Suggest alternatives** when inventory is low
2. **Show market knowledge** with data-driven recommendations
3. **Keep users engaged** on the platform
4. **Increase conversion** by showing more options

### For Platform
1. **Increase page views** through internal navigation
2. **Improve SEO** with internal linking
3. **Enhance user experience** with smart recommendations
4. **Reduce bounce rate** by keeping users exploring

## Edge Cases Handled

### Case 1: No Similar Locations
**Scenario**: Unique location with no comparable areas

**Handling**:
- Similarity threshold filters out poor matches (< 0.5)
- Component returns empty array
- Section is hidden from page
- No visual clutter

### Case 2: Few Similar Locations
**Scenario**: Only 2-3 similar locations found

**Handling**:
- Display only the locations found (not forced to 5)
- Grid adjusts to available items
- Still provides value to user

### Case 3: All Same City
**Scenario**: All similar locations in same city

**Handling**:
- All locations shown
- Sorted by similarity score
- User gets best matches

### Case 4: Mixed Cities
**Scenario**: Similar locations in different cities

**Handling**:
- Same-city locations prioritized first
- Then sorted by similarity
- User sees local options first

### Case 5: Loading State
**Scenario**: Data still fetching

**Handling**:
- Skeleton UI displayed
- 3 placeholder cards shown
- Smooth transition when data loads

### Case 6: Error State
**Scenario**: API request fails

**Handling**:
- Error caught and logged
- Empty array returned
- Section hidden gracefully
- User experience not disrupted

## Performance Optimization

### Backend Optimizations
1. **Candidate Limiting**: Only process 100 candidates
2. **Early Filtering**: Skip locations with 0 listings
3. **Threshold Filtering**: Only include similarity ≥ 0.5
4. **Parallel Processing**: Calculate stats concurrently
5. **Error Isolation**: Individual failures don't break request

### Frontend Optimizations
1. **React Query Caching**: 5-minute cache
2. **Stale-While-Revalidate**: Show cached data while updating
3. **Lazy Loading**: Component only loads when visible
4. **Skeleton UI**: Prevents layout shift
5. **Memoization**: Expensive calculations cached

## Analytics Opportunities

### Metrics to Track
1. **Click-through rate** on similar location cards
2. **Most common similar location pairs**
3. **User journey** through similar locations
4. **Conversion rate** from similar location visits
5. **Average similarity scores** clicked

### Insights to Gain
1. Which locations are frequently compared
2. Price sensitivity of users
3. Geographic preferences
4. Property type preferences
5. Market trends and patterns

## Future Enhancements

### Potential Improvements
1. **Lifestyle Matching**: Add amenities, schools, commute time
2. **User Preferences**: Weight algorithm based on user history
3. **Explanation**: Show "Why similar?" breakdown
4. **Comparison Tool**: Side-by-side location comparison
5. **Save Comparisons**: Let users save location sets
6. **Price Trends**: Show which similar locations are appreciating
7. **Commute Similarity**: Match based on distance to work areas
8. **Demographics**: Match based on age, income, family size

---

This example demonstrates how the similar locations feature provides real value to users by helping them discover comparable areas they might not have considered, all backed by data-driven similarity calculations.
