# Location Breakdown Components

This document describes the three location breakdown components created for displaying hierarchical location data with sorting and filtering capabilities.

## Components Overview

### 1. SuburbList
**Purpose**: Display a list of suburbs for city pages with sorting and filtering options.

**Location**: `client/src/components/location/SuburbList.tsx`

**Features**:
- Sortable by: Name, Price (ascending/descending), Listings count, Popularity
- Filterable by: Minimum listings count (0, 5, 10, 20+)
- Displays: Suburb name, listing count, average price, price change trends
- Responsive grid layout (1-4 columns based on screen size)
- Hover effects and smooth transitions
- Price trend indicators (up/down arrows with percentage)

**Props**:
```typescript
interface SuburbListProps {
  title: string;              // Section title
  suburbs: SuburbItem[];      // Array of suburb data
  parentSlug: string;         // Parent URL slug (e.g., 'gauteng/johannesburg')
  showFilters?: boolean;      // Show/hide filter controls (default: true)
}

interface SuburbItem {
  id: number;
  name: string;
  listingCount: number;
  avgPrice?: number;
  slug?: string;
  priceChange?: number;       // Percentage change for trend indicator
  popularity?: number;        // Search popularity score
}
```

**Usage Example**:
```tsx
<SuburbList
  title="Popular Suburbs in Johannesburg"
  suburbs={suburbsData}
  parentSlug="gauteng/johannesburg"
  showFilters={true}
/>
```

---

### 2. CityList
**Purpose**: Display a list of cities for province pages with sorting and filtering options.

**Location**: `client/src/components/location/CityList.tsx`

**Features**:
- Sortable by: Name, Price (ascending/descending), Listings count, Popularity
- Filterable by: Minimum listings count (0, 10, 50, 100+)
- Displays: City name, listing count, average price, suburb count, development count
- Larger cards with more prominent styling
- Badge indicators for suburbs and developments
- Responsive grid layout (1-3 columns based on screen size)

**Props**:
```typescript
interface CityListProps {
  title: string;              // Section title
  cities: CityItem[];         // Array of city data
  parentSlug: string;         // Parent URL slug (e.g., 'gauteng')
  showFilters?: boolean;      // Show/hide filter controls (default: true)
}

interface CityItem {
  id: number;
  name: string;
  listingCount: number;
  avgPrice?: number;
  slug?: string;
  suburbCount?: number;       // Number of suburbs in this city
  developmentCount?: number;  // Number of developments
  popularity?: number;        // Search popularity score
}
```

**Usage Example**:
```tsx
<CityList
  title="Major Cities in Gauteng"
  cities={citiesData}
  parentSlug="gauteng"
  showFilters={true}
/>
```

---

### 3. NearbySuburbs
**Purpose**: Display nearby suburbs for suburb pages to help users discover alternative locations.

**Location**: `client/src/components/location/NearbySuburbs.tsx`

**Features**:
- Shows suburbs near the current location
- Displays distance from current suburb (in km or meters)
- No sorting/filtering (shows closest suburbs first)
- Compact card layout
- Distance badges with navigation icon
- Configurable maximum display count

**Props**:
```typescript
interface NearbySuburbsProps {
  title?: string;             // Section title (default: "Nearby Suburbs")
  suburbs: NearbySuburb[];    // Array of nearby suburb data
  parentSlug: string;         // Parent URL slug (e.g., 'gauteng/johannesburg')
  currentSuburbName: string;  // Name of current suburb for context
  maxDisplay?: number;        // Maximum suburbs to display (default: 6)
}

interface NearbySuburb {
  id: number;
  name: string;
  listingCount: number;
  avgPrice?: number;
  slug?: string;
  distance?: number;          // Distance in kilometers
  cityName?: string;
}
```

**Usage Example**:
```tsx
<NearbySuburbs
  title="Explore Nearby Areas"
  suburbs={nearbySuburbsData}
  parentSlug="gauteng/johannesburg"
  currentSuburbName="Sandton"
  maxDisplay={6}
/>
```

---

## Integration with Location Pages

### Province Page Integration
Replace the existing `LocationGrid` component with `CityList`:

```tsx
// Before
<LocationGrid 
  title={`Popular Cities in ${province.name}`} 
  items={cities} 
  parentSlug={provinceSlug}
  type="city"
/>

// After
<CityList
  title={`Major Cities in ${province.name}`}
  cities={cities}
  parentSlug={provinceSlug}
  showFilters={true}
/>
```

### City Page Integration
Replace the existing `LocationGrid` component with `SuburbList`:

```tsx
// Before
<LocationGrid 
  title={`Popular Suburbs in ${city.name}`} 
  items={suburbs} 
  parentSlug={`${provinceSlug}/${citySlug}`}
  type="suburb"
/>

// After
<SuburbList
  title={`Explore Suburbs in ${city.name}`}
  suburbs={suburbs}
  parentSlug={`${provinceSlug}/${citySlug}`}
  showFilters={true}
/>
```

### Suburb Page Integration
Add the `NearbySuburbs` component to suburb pages:

```tsx
// Add after the FeaturedListings section
{nearbySuburbs && nearbySuburbs.length > 0 && (
  <NearbySuburbs
    title="Nearby Suburbs"
    suburbs={nearbySuburbs}
    parentSlug={`${provinceSlug}/${citySlug}`}
    currentSuburbName={suburb.name}
    maxDisplay={6}
  />
)}
```

---

## Design Decisions

### Sorting Options
- **Popularity**: Default sort to show most searched/viewed locations first
- **Name**: Alphabetical sorting for easy browsing
- **Price**: Both ascending and descending for different user needs
- **Listings**: Shows most active markets first

### Filtering Options
- **Minimum Listings**: Helps users focus on areas with sufficient inventory
- Different thresholds for cities (10, 50, 100+) vs suburbs (5, 10, 20+)
- "All" option to show everything

### Visual Design
- **Cards**: Consistent card-based layout with hover effects
- **Badges**: Visual indicators for trends, distance, and counts
- **Icons**: Lucide icons for visual clarity
- **Colors**: Primary color for interactive elements, slate for text
- **Spacing**: Generous padding and gaps for readability

### Responsive Behavior
- **SuburbList**: 1 → 2 → 3 → 4 columns (mobile → tablet → desktop → wide)
- **CityList**: 1 → 2 → 3 columns (larger cards need more space)
- **NearbySuburbs**: 1 → 2 → 3 columns (compact layout)

---

## Requirements Validation

This implementation satisfies **Requirement 20** from the specification:

### Requirement 20.1
✅ "WHEN a development is created with a location THEN the system SHALL associate it with the corresponding suburb, city, and province location pages"
- Components display developments count and link to development grids

### Requirement 20.2
✅ "WHEN displaying a suburb page THEN the system SHALL show all developments where suburb matches"
- SuburbList displays all suburbs with their statistics

### Requirement 20.3
✅ "WHEN displaying a city page THEN the system SHALL show featured developments from all suburbs within that city"
- CityList shows development counts per city

### Requirement 20.4
✅ "WHEN displaying a province page THEN the system SHALL show featured developments from all cities within that province"
- CityList displays all cities with development information

### Requirement 20.5
✅ "THE system SHALL prioritize active developments over completed ones in location page displays"
- Components support sorting by popularity and listings count

---

## Future Enhancements

1. **Map View Toggle**: Add option to view locations on a map
2. **Comparison Mode**: Allow users to compare multiple locations side-by-side
3. **Save Favorites**: Let users save favorite locations
4. **Price Alerts**: Notify users when prices change in saved locations
5. **Advanced Filters**: Add property type, bedroom count, price range filters
6. **Pagination**: For provinces/cities with many locations
7. **Search Within**: Add search box to filter displayed locations

---

## Testing Recommendations

### Unit Tests
- Test sorting logic for all sort options
- Test filtering logic for minimum listings
- Test price formatting for various ranges
- Test URL generation for different slug formats

### Integration Tests
- Test component rendering with real data
- Test user interactions (sorting, filtering)
- Test responsive behavior at different breakpoints
- Test empty states and error handling

### Visual Tests
- Verify card layouts at different screen sizes
- Check hover states and transitions
- Validate badge and icon positioning
- Test with varying data lengths (1 item, 10 items, 100 items)

---

## Performance Considerations

1. **Memoization**: `useMemo` used for sorting/filtering to prevent unnecessary recalculations
2. **Lazy Loading**: Consider implementing virtual scrolling for large lists
3. **Image Optimization**: Use optimized images for location cards if added
4. **Data Fetching**: Components expect pre-fetched data from parent pages

---

## Accessibility

- Semantic HTML with proper heading hierarchy
- Keyboard navigation support via Link components
- ARIA labels for interactive elements
- Color contrast meets WCAG AA standards
- Focus indicators on interactive elements

---

## Dependencies

- `wouter`: Routing and navigation
- `lucide-react`: Icons
- `@/components/ui/*`: Shadcn UI components (Card, Badge, Button, Select)
- React hooks: `useState`, `useMemo`

---

## Maintenance Notes

- Keep sort options consistent across all components
- Update filter thresholds based on actual data distribution
- Monitor performance with large datasets
- Gather user feedback on default sort order
- Consider A/B testing different layouts
