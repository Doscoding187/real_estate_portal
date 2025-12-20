# Design Document (Continued)

## Error Handling

### Error Categories

1. **Network Errors**
   - Connection timeout
   - Server unavailable
   - Rate limiting

2. **Data Errors**
   - Invalid filter combinations
   - No results found
   - Malformed property data

3. **User Errors**
   - Invalid input
   - Unauthorized actions
   - Session expired

### Error Handling Strategy

```typescript
interface ErrorState {
  type: 'network' | 'data' | 'user' | 'unknown';
  message: string;
  retryable: boolean;
  action?: () => void;
}

// Error messages in South African context
const ERROR_MESSAGES = {
  NETWORK_TIMEOUT: 'Connection timed out. Please check your internet connection and try again.',
  NO_RESULTS: 'No properties found matching your criteria. Try adjusting your filters or search in nearby suburbs.',
  INVALID_FILTERS: 'Some filter combinations are not valid. Please adjust your selection.',
  SESSION_EXPIRED: 'Your session has expired. Please log in again to continue.',
  RATE_LIMIT: 'Too many requests. Please wait a moment and try again.',
};

// Error recovery strategies
const handleError = (error: Error): ErrorState => {
  if (error instanceof NetworkError) {
    return {
      type: 'network',
      message: ERROR_MESSAGES.NETWORK_TIMEOUT,
      retryable: true,
      action: () => refetch(),
    };
  }
  
  if (error instanceof NoResultsError) {
    return {
      type: 'data',
      message: ERROR_MESSAGES.NO_RESULTS,
      retryable: false,
    };
  }
  
  // Default error handling
  return {
    type: 'unknown',
    message: 'Something went wrong. Please try again.',
    retryable: true,
    action: () => refetch(),
  };
};
```

### Empty States

```typescript
// Empty state configurations
const EMPTY_STATES = {
  NO_RESULTS: {
    icon: 'Building2',
    title: 'No properties found',
    description: 'Try adjusting your filters or search in nearby suburbs',
    actions: [
      { label: 'Clear Filters', action: 'clearFilters' },
      { label: 'View All Properties', action: 'viewAll' },
    ],
  },
  NO_SAVED_SEARCHES: {
    icon: 'Bookmark',
    title: 'No saved searches yet',
    description: 'Save your search criteria to get notified about new properties',
    actions: [
      { label: 'Start Searching', action: 'goToSearch' },
    ],
  },
  NO_FAVORITES: {
    icon: 'Heart',
    title: 'No favorites yet',
    description: 'Start adding properties to your favorites to keep track of them',
    actions: [
      { label: 'Browse Properties', action: 'goToSearch' },
    ],
  },
};
```

## Testing Strategy

### Unit Testing

Unit tests will focus on:
- Filter logic and transformations
- Sort functions
- URL parameter serialization/deserialization
- Property card rendering with different data
- Pagination calculations
- Analytics event formatting

**Testing Framework**: Vitest with React Testing Library

**Example Unit Tests**:
```typescript
describe('Filter URL Synchronization', () => {
  it('should serialize filters to URL parameters', () => {
    const filters: PropertyFilters = {
      city: 'Johannesburg',
      minPrice: 2000000,
      maxPrice: 5000000,
      propertyType: ['house'],
      petFriendly: true,
    };
    
    const url = filtersToUrl(filters);
    expect(url).toContain('city=Johannesburg');
    expect(url).toContain('minPrice=2000000');
    expect(url).toContain('petFriendly=true');
  });
  
  it('should deserialize URL parameters to filters', () => {
    const url = '?city=Sandton&minPrice=3000000&propertyType=apartment&fibreReady=true';
    const filters = urlToFilters(url);
    
    expect(filters.city).toBe('Sandton');
    expect(filters.minPrice).toBe(3000000);
    expect(filters.propertyType).toContain('apartment');
    expect(filters.fibreReady).toBe(true);
  });
});

describe('Sort Functions', () => {
  it('should sort properties by price ascending', () => {
    const properties = [
      { id: '1', price: 3000000 },
      { id: '2', price: 1500000 },
      { id: '3', price: 2500000 },
    ];
    
    const sorted = sortProperties(properties, 'price_asc');
    expect(sorted[0].price).toBe(1500000);
    expect(sorted[2].price).toBe(3000000);
  });
  
  it('should sort properties by suburb alphabetically', () => {
    const properties = [
      { id: '1', suburb: 'Sandton' },
      { id: '2', suburb: 'Centurion' },
      { id: '3', suburb: 'Midrand' },
    ];
    
    const sorted = sortProperties(properties, 'suburb_asc');
    expect(sorted[0].suburb).toBe('Centurion');
    expect(sorted[2].suburb).toBe('Sandton');
  });
});
```

### Property-Based Testing

Property-based tests will verify universal properties across many inputs using fast-check.

**Testing Framework**: Vitest with fast-check

**Example Property Tests**:
```typescript
import * as fc from 'fast-check';

describe('Property-Based Tests', () => {
  it('Property 4: Filter state round-trip', () => {
    fc.assert(
      fc.property(
        fc.record({
          city: fc.option(fc.string(), { nil: undefined }),
          minPrice: fc.option(fc.integer({ min: 0, max: 50000000 }), { nil: undefined }),
          maxPrice: fc.option(fc.integer({ min: 0, max: 50000000 }), { nil: undefined }),
          propertyType: fc.option(fc.array(fc.constantFrom('house', 'apartment', 'townhouse')), { nil: undefined }),
          petFriendly: fc.option(fc.boolean(), { nil: undefined }),
        }),
        (filters) => {
          const url = filtersToUrl(filters);
          const restored = urlToFilters(url);
          expect(restored).toEqual(filters);
        }
      ),
      { numRuns: 100 }
    );
  });
  
  it('Property 2: Sort order correctness', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            id: fc.string(),
            price: fc.integer({ min: 100000, max: 50000000 }),
            suburb: fc.string(),
            listedDate: fc.date(),
          }),
          { minLength: 1, maxLength: 50 }
        ),
        fc.constantFrom('price_asc', 'price_desc', 'suburb_asc', 'date_desc'),
        (properties, sortOption) => {
          const sorted = sortProperties(properties, sortOption);
          
          // Verify sort order
          for (let i = 0; i < sorted.length - 1; i++) {
            if (sortOption === 'price_asc') {
              expect(sorted[i].price).toBeLessThanOrEqual(sorted[i + 1].price);
            } else if (sortOption === 'price_desc') {
              expect(sorted[i].price).toBeGreaterThanOrEqual(sorted[i + 1].price);
            } else if (sortOption === 'suburb_asc') {
              expect(sorted[i].suburb.localeCompare(sorted[i + 1].suburb)).toBeLessThanOrEqual(0);
            }
          }
        }
      ),
      { numRuns: 100 }
    );
  });
  
  it('Property 16: Result count accuracy', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            id: fc.string(),
            price: fc.integer({ min: 100000, max: 50000000 }),
            bedrooms: fc.integer({ min: 1, max: 5 }),
            propertyType: fc.constantFrom('house', 'apartment', 'townhouse'),
            status: fc.constantFrom('available', 'under_offer', 'sold'),
          }),
          { minLength: 0, maxLength: 100 }
        ),
        fc.record({
          minPrice: fc.option(fc.integer({ min: 0, max: 25000000 }), { nil: undefined }),
          maxPrice: fc.option(fc.integer({ min: 25000000, max: 50000000 }), { nil: undefined }),
          minBedrooms: fc.option(fc.integer({ min: 1, max: 3 }), { nil: undefined }),
          propertyType: fc.option(fc.array(fc.constantFrom('house', 'apartment')), { nil: undefined }),
        }),
        (properties, filters) => {
          const filtered = applyFilters(properties, filters);
          const count = getResultCount(filters);
          expect(count).toBe(filtered.length);
        }
      ),
      { numRuns: 100 }
    );
  });
});
```

### Integration Testing

Integration tests will verify:
- Complete search flow (filter → fetch → display)
- Saved search creation and restoration
- Map view with property markers
- Contact agent flow
- Analytics tracking

**Testing Framework**: Playwright for E2E tests

### Performance Testing

Performance tests will measure:
- Initial page load time
- Filter application response time
- Scroll performance with large datasets
- Image loading optimization
- Cache hit rates

**Tools**: Lighthouse, WebPageTest, Chrome DevTools Performance

## Performance Optimization

### Virtual Scrolling

Implement virtual scrolling using `react-window` or `react-virtual` to render only visible property cards:

```typescript
import { FixedSizeList } from 'react-window';

const PropertyVirtualList = ({ properties, viewMode }: Props) => {
  const itemHeight = viewMode === 'list' ? 280 : 400;
  
  return (
    <FixedSizeList
      height={window.innerHeight - 200}
      itemCount={properties.length}
      itemSize={itemHeight}
      width="100%"
    >
      {({ index, style }) => (
        <div style={style}>
          <PropertyCard property={properties[index]} viewMode={viewMode} />
        </div>
      )}
    </FixedSizeList>
  );
};
```

### Image Optimization

1. **Progressive Loading**: Use blur-up placeholders
2. **Responsive Images**: Serve appropriate sizes for device
3. **Lazy Loading**: Load images as they enter viewport
4. **WebP Format**: Use WebP with JPEG fallback

```typescript
const OptimizedPropertyImage = ({ property }: Props) => {
  return (
    <picture>
      <source
        srcSet={`${property.images[0].small}.webp`}
        type="image/webp"
        media="(max-width: 640px)"
      />
      <source
        srcSet={`${property.images[0].medium}.webp`}
        type="image/webp"
        media="(max-width: 1024px)"
      />
      <img
        src={property.images[0].medium}
        alt={property.title}
        loading="lazy"
        className="property-image"
      />
    </picture>
  );
};
```

### Caching Strategy

1. **Client-Side**: React Query with stale-while-revalidate
2. **Server-Side**: Redis for search results and filter counts
3. **CDN**: CloudFlare for static assets and images

```typescript
// React Query configuration
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      cacheTime: 10 * 60 * 1000, // 10 minutes
      refetchOnWindowFocus: false,
      retry: 2,
    },
  },
});

// Server-side caching
const getCachedSearchResults = async (filters: PropertyFilters, page: number) => {
  const cacheKey = CACHE_KEYS.SEARCH_RESULTS(JSON.stringify(filters), page);
  
  // Try cache first
  const cached = await redis.get(cacheKey);
  if (cached) {
    return JSON.parse(cached);
  }
  
  // Fetch from database
  const results = await db.searchProperties(filters, page);
  
  // Cache for 5 minutes
  await redis.setex(cacheKey, CACHE_TTL.SEARCH_RESULTS, JSON.stringify(results));
  
  return results;
};
```

### Database Query Optimization

1. **Indexed Queries**: Use composite indexes for common filter combinations
2. **Query Pagination**: Limit results per page
3. **Selective Fields**: Only fetch required fields
4. **Connection Pooling**: Reuse database connections

```typescript
// Optimized search query
const searchProperties = async (filters: PropertyFilters, page: number) => {
  const pageSize = 12;
  const offset = page * pageSize;
  
  let query = db
    .select({
      id: properties.id,
      title: properties.title,
      price: properties.price,
      suburb: properties.suburb,
      city: properties.city,
      bedrooms: properties.bedrooms,
      bathrooms: properties.bathrooms,
      erfSize: properties.erfSize,
      titleType: properties.titleType,
      levy: properties.levy,
      securityEstate: properties.securityEstate,
      petFriendly: properties.petFriendly,
      fibreReady: properties.fibreReady,
      status: properties.status,
      // Only fetch first image for list view
      mainImage: properties.images[0],
    })
    .from(properties)
    .where(eq(properties.status, 'available'));
  
  // Apply filters
  if (filters.city) {
    query = query.where(eq(properties.city, filters.city));
  }
  
  if (filters.minPrice) {
    query = query.where(gte(properties.price, filters.minPrice));
  }
  
  if (filters.maxPrice) {
    query = query.where(lte(properties.price, filters.maxPrice));
  }
  
  // ... more filters
  
  // Pagination
  query = query.limit(pageSize).offset(offset);
  
  return await query;
};
```

## Accessibility

### WCAG 2.1 AA Compliance

1. **Keyboard Navigation**: All interactive elements accessible via keyboard
2. **Screen Reader Support**: Proper ARIA labels and roles
3. **Color Contrast**: Minimum 4.5:1 for text
4. **Focus Indicators**: Visible focus states
5. **Alt Text**: Descriptive alt text for all images

### Implementation

```typescript
// Accessible property card
const AccessiblePropertyCard = ({ property }: Props) => {
  return (
    <article
      role="article"
      aria-label={`Property: ${property.title} in ${property.suburb}`}
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          navigateToProperty(property.id);
        }
      }}
    >
      <img
        src={property.mainImage}
        alt={`${property.title} - ${property.propertyType} in ${property.suburb}`}
      />
      
      <div className="property-details">
        <h3>{property.title}</h3>
        
        <div aria-label="Property specifications">
          <span aria-label={`Price: ${formatCurrency(property.price)}`}>
            {formatCurrency(property.price)}
          </span>
          <span aria-label={`${property.bedrooms} bedrooms`}>
            {property.bedrooms} Bed
          </span>
          <span aria-label={`${property.bathrooms} bathrooms`}>
            {property.bathrooms} Bath
          </span>
        </div>
        
        <button
          aria-label={`Contact agent about ${property.title}`}
          onClick={() => contactAgent(property.id)}
        >
          Contact Agent
        </button>
      </div>
    </article>
  );
};
```

## Security Considerations

1. **Input Validation**: Sanitize all user inputs
2. **SQL Injection Prevention**: Use parameterized queries
3. **XSS Protection**: Escape user-generated content
4. **Rate Limiting**: Prevent abuse of search API
5. **Authentication**: Secure saved searches and favorites

```typescript
// Input validation
const validateFilters = (filters: PropertyFilters): PropertyFilters => {
  return {
    ...filters,
    minPrice: filters.minPrice ? Math.max(0, filters.minPrice) : undefined,
    maxPrice: filters.maxPrice ? Math.min(100000000, filters.maxPrice) : undefined,
    minBedrooms: filters.minBedrooms ? Math.max(1, Math.min(10, filters.minBedrooms)) : undefined,
    city: filters.city ? sanitizeString(filters.city) : undefined,
    suburb: filters.suburb?.map(s => sanitizeString(s)),
  };
};

// Rate limiting
const searchRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // 30 requests per minute
  message: 'Too many search requests, please try again later',
});
```

## Deployment Strategy

### Phased Rollout

1. **Phase 1**: Deploy to staging environment
2. **Phase 2**: A/B test with 10% of users
3. **Phase 3**: Gradual rollout to 50% of users
4. **Phase 4**: Full deployment to all users

### Monitoring

1. **Performance Metrics**: Page load time, API response time
2. **Error Tracking**: Sentry for error monitoring
3. **Analytics**: Google Analytics for user behavior
4. **Alerts**: Set up alerts for performance degradation

### Rollback Plan

If critical issues are detected:
1. Immediate rollback to previous version
2. Investigate root cause
3. Fix and redeploy

## Future Enhancements

1. **AI-Powered Recommendations**: Machine learning for personalized property suggestions
2. **Virtual Tours**: 360° property tours
3. **Mortgage Calculator**: Integrated bond calculator with SA bank rates
4. **Neighborhood Insights**: Crime stats, school ratings, amenities
5. **Price Alerts**: Notify users when properties in their range become available
6. **Voice Search**: "Show me 3-bedroom houses in Sandton under R3M"
