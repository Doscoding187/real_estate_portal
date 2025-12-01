# Design Document

## Overview

The Property Price Insights Integration feature transforms the existing placeholder-based PropertyInsights component into a data-driven analytics dashboard. The system aggregates real property listing data from the database, calculates statistical metrics (median prices, price distributions, price per m², micromarket comparisons), and serves them through a RESTful API endpoint. The frontend consumes this data to render interactive city-based insights with smooth tab navigation and responsive loading states.

## Architecture

### System Components

```
┌─────────────────┐
│   Home Page     │
│  (React)        │
└────────┬────────┘
         │
         │ HTTP GET /api/price-insights
         │
┌────────▼────────────────────────────┐
│   Price Insights Router             │
│   (Express/tRPC)                    │
└────────┬────────────────────────────┘
         │
         │ getPriceInsights()
         │
┌────────▼────────────────────────────┐
│   Price Insights Service            │
│   - calculateCityStatistics()       │
│   - calculatePriceRanges()          │
│   - calculateMicromarkets()         │
│   - Cache Management                │
└────────┬────────────────────────────┘
         │
         │ SQL Queries
         │
┌────────▼────────────────────────────┐
│   Database (MySQL)                  │
│   - properties                      │
│   - cities                          │
│   - suburbs                         │
└─────────────────────────────────────┘
```

### Data Flow

1. User loads home page → PropertyInsights component mounts
2. Component calls `usePriceInsights()` hook
3. Hook fetches data from `/api/price-insights` endpoint
4. Backend checks cache (Redis/in-memory)
5. If cache miss: Query database, aggregate statistics, store in cache
6. If cache hit: Return cached data immediately
7. Frontend receives data and renders insights
8. User switches tabs → Component updates display without refetch

## Components and Interfaces

### Backend Components

#### 1. Price Insights Router (`server/priceInsightsRouter.ts`)

```typescript
import { Router } from 'express';
import { priceInsightsService } from './services/priceInsightsService';

const router = Router();

router.get('/price-insights', async (req, res) => {
  try {
    const insights = await priceInsightsService.getAllCityInsights();
    res.set('Cache-Control', 'public, max-age=900'); // 15 minutes
    res.json(insights);
  } catch (error) {
    console.error('Price insights error:', error);
    res.status(500).json({ error: 'Failed to fetch price insights' });
  }
});

export default router;
```

#### 2. Price Insights Service (`server/services/priceInsightsService.ts`)

```typescript
interface CityInsights {
  cityName: string;
  medianPrice: number;
  listings: number;
  avgPricePerSqm: number;
  priceRanges: PriceRange[];
  micromarkets: Micromarket[];
}

interface PriceRange {
  range: string;
  count: number;
}

interface Micromarket {
  area: string;
  pricePerSqm: number;
}

class PriceInsightsService {
  private cache: Map<string, { data: any; timestamp: number }>;
  private readonly CACHE_TTL = 15 * 60 * 1000; // 15 minutes

  async getAllCityInsights(): Promise<Record<string, CityInsights>>;
  async getCityInsights(cityId: number): Promise<CityInsights>;
  private calculateMedianPrice(prices: number[]): number;
  private calculatePriceRanges(prices: number[]): PriceRange[];
  private calculateAvgPricePerSqm(properties: Property[]): number;
  private getTopMicromarkets(cityId: number): Promise<Micromarket[]>;
  private isCacheValid(key: string): boolean;
}
```

### Frontend Components

#### 1. Updated PropertyInsights Component

```typescript
interface PropertyInsightsProps {
  // No props needed - fetches its own data
}

export function PropertyInsights() {
  const { data, isLoading, error, refetch } = usePriceInsights();
  const [selectedCity, setSelectedCity] = useState<string>('');

  // Auto-select city with most listings on load
  useEffect(() => {
    if (data && !selectedCity) {
      const topCity = Object.entries(data)
        .sort(([, a], [, b]) => b.listings - a.listings)[0]?.[0];
      setSelectedCity(topCity || '');
    }
  }, [data]);

  if (isLoading) return <InsightsLoadingSkeleton />;
  if (error) return <InsightsErrorState onRetry={refetch} />;
  if (!data || Object.keys(data).length === 0) {
    return <InsightsEmptyState />;
  }

  return (
    <div className="py-16 bg-white">
      {/* Tabs and content */}
    </div>
  );
}
```

#### 2. Custom Hook (`client/src/hooks/usePriceInsights.ts`)

```typescript
interface UsePriceInsightsResult {
  data: Record<string, CityInsights> | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
}

export function usePriceInsights(): UsePriceInsightsResult {
  const [data, setData] = useState<Record<string, CityInsights> | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchInsights = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/price-insights');
      if (!response.ok) throw new Error('Failed to fetch insights');
      const insights = await response.json();
      setData(insights);
      setError(null);
    } catch (err) {
      setError(err as Error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchInsights();
  }, []);

  return { data, isLoading, error, refetch: fetchInsights };
}
```

## Data Models

### Database Queries

#### Query 1: Get Active Listings by City

```sql
SELECT 
  c.id as cityId,
  c.name as cityName,
  COUNT(p.id) as listingCount,
  AVG(p.price) as avgPrice,
  AVG(p.price / NULLIF(p.area, 0)) as avgPricePerSqm
FROM cities c
LEFT JOIN properties p ON p.cityId = c.id
WHERE p.status IN ('available', 'published', 'pending')
GROUP BY c.id, c.name
HAVING listingCount >= 10
ORDER BY listingCount DESC;
```

#### Query 2: Get Price Distribution for City

```sql
SELECT 
  CASE 
    WHEN price < 1000000 THEN 'Below R1M'
    WHEN price >= 1000000 AND price < 2000000 THEN 'R1M-R2M'
    WHEN price >= 2000000 AND price < 3000000 THEN 'R2M-R3M'
    WHEN price >= 3000000 AND price < 5000000 THEN 'R3M-R5M'
    WHEN price >= 5000000 AND price < 10000000 THEN 'R5M-R10M'
    ELSE 'Above R10M'
  END as priceRange,
  COUNT(*) as count
FROM properties
WHERE cityId = ? 
  AND status IN ('available', 'published', 'pending')
GROUP BY priceRange
ORDER BY 
  CASE priceRange
    WHEN 'Below R1M' THEN 1
    WHEN 'R1M-R2M' THEN 2
    WHEN 'R2M-R3M' THEN 3
    WHEN 'R3M-R5M' THEN 4
    WHEN 'R5M-R10M' THEN 5
    WHEN 'Above R10M' THEN 6
  END;
```

#### Query 3: Get Median Price for City

```sql
-- Using window functions for median calculation
WITH RankedPrices AS (
  SELECT 
    price,
    ROW_NUMBER() OVER (ORDER BY price) as row_num,
    COUNT(*) OVER () as total_count
  FROM properties
  WHERE cityId = ?
    AND status IN ('available', 'published', 'pending')
)
SELECT AVG(price) as medianPrice
FROM RankedPrices
WHERE row_num IN (FLOOR((total_count + 1) / 2), CEIL((total_count + 1) / 2));
```

#### Query 4: Get Top Micromarkets (Suburbs)

```sql
SELECT 
  s.name as area,
  AVG(p.price / NULLIF(p.area, 0)) as pricePerSqm,
  COUNT(p.id) as listingCount
FROM suburbs s
INNER JOIN properties p ON p.suburbId = s.id
WHERE p.cityId = ?
  AND p.status IN ('available', 'published', 'pending')
  AND p.area > 0
GROUP BY s.id, s.name
HAVING listingCount >= 3
ORDER BY listingCount DESC
LIMIT 4;
```

### Response Data Structure

```typescript
{
  "Johannesburg": {
    "cityName": "Johannesburg",
    "medianPrice": 2850000,
    "listings": 45655,
    "avgPricePerSqm": 16950,
    "priceRanges": [
      { "range": "Below R1M", "count": 8500 },
      { "range": "R1M-R2M", "count": 15200 },
      { "range": "R2M-R3M", "count": 12800 },
      { "range": "R3M-R5M", "count": 6400 },
      { "range": "R5M-R10M", "count": 2100 },
      { "range": "Above R10M", "count": 655 }
    ],
    "micromarkets": [
      { "area": "Sandton", "pricePerSqm": 46100 },
      { "area": "Rosebank", "pricePerSqm": 34650 },
      { "area": "Fourways", "pricePerSqm": 33100 },
      { "area": "Midrand", "pricePerSqm": 30100 }
    ]
  },
  "Cape Town": {
    // Similar structure
  }
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Active listings filter consistency

*For any* database query for price insights, all returned properties should have status in ['available', 'published', 'pending']
**Validates: Requirements 1.2**

### Property 2: Price range bucket completeness

*For any* city with active listings, the price range distribution should include all six buckets (Below R1M, R1M-R2M, R2M-R3M, R3M-R5M, R5M-R10M, Above R10M) even if some have zero count
**Validates: Requirements 3.4**

### Property 3: Median calculation correctness

*For any* sorted list of property prices, the calculated median should be the middle value (or average of two middle values for even-length lists)
**Validates: Requirements 2.1**

### Property 4: Price per m² exclusion

*For any* property with null or zero area, that property should be excluded from price per m² calculations
**Validates: Requirements 4.3**

### Property 5: Micromarket ordering

*For any* city, the returned micromarkets should be ordered by listing count in descending order and limited to 4 results
**Validates: Requirements 5.2**

### Property 6: Cache freshness

*For any* cached price insights data, if the cache timestamp is older than 15 minutes, the system should recalculate from the database
**Validates: Requirements 7.3**

### Property 7: City minimum threshold

*For any* city in the response, that city should have at least 10 active listings
**Validates: Requirements 6.1**

### Property 8: Response time with cache

*For any* request when cache is valid, the API response time should be under 500ms
**Validates: Requirements 9.2**

### Property 9: Data consistency across tabs

*For any* city data loaded in the frontend, switching tabs should display the same data without refetching
**Validates: Requirements 6.5**

### Property 10: Price range boundary correctness

*For any* property price, it should be categorized into exactly one price range bucket using inclusive lower bounds and exclusive upper bounds
**Validates: Requirements 3.5**

## Error Handling

### Backend Error Scenarios

1. **Database Connection Failure**
   - Catch database errors in service layer
   - Return 500 status with generic error message
   - Log detailed error for debugging
   - Do not expose database details to client

2. **No Data Available**
   - Return empty object `{}` with 200 status
   - Frontend handles empty state gracefully
   - Log warning for monitoring

3. **Cache Corruption**
   - Catch cache read errors
   - Fall back to database query
   - Clear corrupted cache entry
   - Log error for investigation

4. **Query Timeout**
   - Set 5-second timeout on database queries
   - Return 504 Gateway Timeout
   - Log slow query for optimization

### Frontend Error Scenarios

1. **Network Failure**
   - Display error message: "Unable to load price insights"
   - Show retry button
   - Maintain previous data if available

2. **Invalid Response Format**
   - Log error to console
   - Display generic error state
   - Provide retry option

3. **Empty Data**
   - Display message: "No price insights available yet"
   - Show placeholder content
   - No retry button needed

4. **Slow Loading**
   - Show skeleton loaders after 200ms
   - Maintain loading state until data arrives
   - Timeout after 10 seconds with error

## Testing Strategy

### Unit Testing

**Backend Unit Tests:**
- Test median calculation with odd and even-length arrays
- Test price range categorization for boundary values
- Test cache hit/miss logic
- Test data filtering for active listings only
- Test micromarket sorting and limiting

**Frontend Unit Tests:**
- Test usePriceInsights hook state management
- Test city selection logic
- Test data formatting functions
- Test error state rendering
- Test loading state rendering

### Property-Based Testing

The property-based testing library for this project is **fast-check** (JavaScript/TypeScript).

Each property-based test should run a minimum of 100 iterations.

**Property Test 1: Active listings filter**
- Generate random property datasets with mixed statuses
- Verify all returned properties have valid active status
- **Feature: property-price-insights-integration, Property 1: Active listings filter consistency**

**Property Test 2: Price range completeness**
- Generate random property price lists
- Verify all six price buckets are present in output
- **Feature: property-price-insights-integration, Property 2: Price range bucket completeness**

**Property Test 3: Median calculation**
- Generate random price arrays of varying lengths
- Verify median matches manual calculation
- **Feature: property-price-insights-integration, Property 3: Median calculation correctness**

**Property Test 4: Price per m² filtering**
- Generate properties with various area values including null/zero
- Verify properties with invalid areas are excluded
- **Feature: property-price-insights-integration, Property 4: Price per m² exclusion**

**Property Test 5: Micromarket limiting**
- Generate suburbs with varying listing counts
- Verify exactly 4 or fewer suburbs returned, ordered by count
- **Feature: property-price-insights-integration, Property 5: Micromarket ordering**

**Property Test 6: Cache expiry**
- Generate timestamps and verify cache validity logic
- Test boundary conditions at exactly 15 minutes
- **Feature: property-price-insights-integration, Property 6: Cache freshness**

**Property Test 7: City threshold**
- Generate cities with varying listing counts
- Verify only cities with >= 10 listings are included
- **Feature: property-price-insights-integration, Property 7: City minimum threshold**

**Property Test 8: Price range boundaries**
- Generate prices at bucket boundaries (1M, 2M, 3M, etc.)
- Verify each price maps to exactly one bucket
- **Feature: property-price-insights-integration, Property 10: Price range boundary correctness**

### Integration Testing

- Test full API endpoint with real database
- Test cache behavior across multiple requests
- Test concurrent request handling
- Test database query performance with large datasets
- Test frontend component with mocked API responses

### Performance Testing

- Benchmark database queries with 10k, 50k, 100k properties
- Measure API response time with cold and warm cache
- Test frontend rendering with large datasets
- Monitor memory usage during aggregation

## Performance Considerations

### Database Optimization

1. **Indexes**: Ensure indexes exist on:
   - `properties.cityId`
   - `properties.status`
   - `properties.price`
   - `properties.suburbId`

2. **Query Optimization**:
   - Use `EXPLAIN` to analyze query plans
   - Consider materialized views for frequently accessed aggregations
   - Batch queries where possible

3. **Connection Pooling**:
   - Reuse database connections
   - Set appropriate pool size (10-20 connections)

### Caching Strategy

1. **Cache Layer**: Use Redis if available, fall back to in-memory Map
2. **Cache Key**: `price-insights:all-cities`
3. **TTL**: 15 minutes (900 seconds)
4. **Invalidation**: Time-based only (no manual invalidation needed)
5. **Cache Warming**: Consider pre-calculating on server start

### Frontend Optimization

1. **Data Fetching**: Fetch once on mount, reuse for all tabs
2. **Memoization**: Use `useMemo` for expensive calculations
3. **Lazy Loading**: Consider code-splitting if component is large
4. **Skeleton Loading**: Show immediate feedback while loading

## Security Considerations

1. **SQL Injection**: Use parameterized queries (Drizzle ORM handles this)
2. **Rate Limiting**: Apply rate limits to API endpoint (100 req/min per IP)
3. **Data Exposure**: Only expose aggregated data, never individual property details
4. **CORS**: Ensure proper CORS headers for API endpoint
5. **Input Validation**: Validate any query parameters if added in future

## Migration Strategy

### Phase 1: Backend Implementation
1. Create priceInsightsService.ts
2. Implement database queries
3. Add caching layer
4. Create API endpoint
5. Test with Postman/curl

### Phase 2: Frontend Integration
1. Create usePriceInsights hook
2. Update PropertyInsights component
3. Add loading and error states
4. Test with real API

### Phase 3: Deployment
1. Deploy backend changes
2. Monitor API performance
3. Deploy frontend changes
4. Monitor error rates and user engagement

### Rollback Plan

If issues arise:
1. Revert frontend to use placeholder data
2. Disable API endpoint
3. Investigate and fix issues
4. Redeploy with fixes

## Future Enhancements

1. **Historical Trends**: Add price trend graphs over time
2. **Filters**: Allow filtering by property type
3. **Comparison Tool**: Compare multiple cities side-by-side
4. **Export**: Allow downloading insights as PDF/CSV
5. **Real-time Updates**: Use WebSockets for live data updates
6. **Predictive Analytics**: ML-based price predictions
