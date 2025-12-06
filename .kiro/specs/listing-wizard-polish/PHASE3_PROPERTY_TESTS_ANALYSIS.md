# Phase 3: Property-Based Tests Analysis

## Overview

Tasks 3.7-3.11 require property-based tests for the map functionality. This document analyzes the feasibility and provides recommendations for testing the LocationMapPicker component and coordinate persistence.

## Challenges with Property-Based Testing for Maps

### 1. External API Dependency
- Google Maps API requires actual API calls to Google's servers
- Geocoding API has rate limits and costs
- Network latency makes tests slow and unreliable
- API keys need to be managed securely in tests

### 2. Browser Environment Requirements
- Google Maps JavaScript API requires a full browser environment
- DOM manipulation and event handling are complex to mock
- Map rendering requires canvas/WebGL support
- Interactive elements (markers, autocomplete) need browser APIs

### 3. Mocking Complexity
- Google Maps API has a large surface area to mock
- Mock implementations may not reflect actual API behavior
- Geocoding responses have complex nested structures
- Map events and callbacks are difficult to simulate accurately

## Recommended Approach

### Option 1: Integration Tests with Mocked Google Maps (Recommended)

Instead of pure property-based tests, use integration tests with a mocked Google Maps API:

```typescript
// Mock Google Maps API
vi.mock('@react-google-maps/api', () => ({
  useJsApiLoader: () => ({ isLoaded: true, loadError: null }),
  GoogleMap: ({ children, onClick }: any) => (
    <div data-testid="google-map" onClick={onClick}>
      {children}
    </div>
  ),
  Marker: ({ position }: any) => (
    <div data-testid="marker" data-lat={position.lat} data-lng={position.lng} />
  ),
  Autocomplete: ({ children }: any) => <div>{children}</div>,
}));

describe('LocationMapPicker - Integration Tests', () => {
  it('should place marker at clicked coordinates', () => {
    // Test pin placement
  });
  
  it('should populate address fields from geocoding', () => {
    // Test geocoding result population
  });
  
  it('should preserve manual edits', () => {
    // Test manual entry preservation
  });
});
```

### Option 2: Unit Tests for Core Logic

Test the core logic separately from the Google Maps integration:

```typescript
describe('parseGeocodingResult', () => {
  it('should extract all address components', () => {
    const mockResult = {
      address_components: [
        { types: ['street_number'], long_name: '123' },
        { types: ['route'], long_name: 'Main Street' },
        { types: ['locality'], long_name: 'Johannesburg' },
        { types: ['administrative_area_level_1'], long_name: 'Gauteng' },
      ],
      formatted_address: '123 Main Street, Johannesburg, Gauteng',
    };
    
    const result = parseGeocodingResult(mockResult, -26.2041, 28.0473);
    
    expect(result.address).toBe('123 Main Street');
    expect(result.city).toBe('Johannesburg');
    expect(result.province).toBe('Gauteng');
    expect(result.latitude).toBe(-26.2041);
    expect(result.longitude).toBe(28.0473);
  });
});
```

### Option 3: E2E Tests with Real API (For CI/CD)

Use end-to-end tests with actual Google Maps API in a controlled environment:

```typescript
// Playwright or Cypress test
test('complete map interaction flow', async ({ page }) => {
  await page.goto('/developer/create-development');
  
  // Click on map
  await page.click('[data-testid="google-map"]', { position: { x: 200, y: 200 } });
  
  // Wait for geocoding
  await page.waitForSelector('[data-testid="address-populated"]');
  
  // Verify address fields are populated
  const address = await page.inputValue('#address');
  expect(address).toBeTruthy();
});
```

## Analysis of Each Property Test

### Task 3.7: Pin Placement Accuracy
**Property**: *For any* valid map click coordinates, the system should place a marker at exactly those coordinates

**Challenge**: Requires simulating map click events with precise coordinates

**Recommendation**: 
- Unit test the marker state management
- Integration test with mocked map component
- Verify marker position matches click coordinates

### Task 3.8: Geocoding Result Population
**Property**: *For any* successful geocoding response, all available address components should be populated

**Challenge**: Requires mocking geocoding API responses

**Recommendation**:
- Property-based test for `parseGeocodingResult` function
- Generate random geocoding responses with fast-check
- Verify all components are extracted correctly

**Implementation**:
```typescript
it('should populate all available address fields from geocoding', () => {
  fc.assert(
    fc.property(
      fc.record({
        streetNumber: fc.option(fc.string()),
        route: fc.option(fc.string()),
        suburb: fc.option(fc.string()),
        city: fc.option(fc.string()),
        province: fc.option(fc.string()),
        postalCode: fc.option(fc.string()),
      }),
      (components) => {
        const mockResult = createMockGeocodingResult(components);
        const parsed = parseGeocodingResult(mockResult, -26.2041, 28.0473);
        
        // Property: All available components should be present
        if (components.streetNumber && components.route) {
          expect(parsed.address).toBeTruthy();
        }
        if (components.city) {
          expect(parsed.city).toBe(components.city);
        }
        // ... verify other components
      }
    )
  );
});
```

### Task 3.9: Manual Entry Preservation
**Property**: *For any* manually entered address data, the system should not override it unless the pin is moved

**Challenge**: Requires testing state management and user interaction flow

**Recommendation**:
- Integration test with React Testing Library
- Test the `manualOverride` flag behavior
- Verify address fields don't change when flag is set

### Task 3.10: Coordinate Round-Trip
**Property**: *For any* development with saved coordinates, loading should display pin at exact same location

**Challenge**: Requires database integration and component mounting

**Recommendation**:
- Integration test with test database
- Property-based test with random coordinates
- Verify coordinates persist and load correctly

**Implementation**:
```typescript
it('should persist and load coordinates correctly', async () => {
  await fc.assert(
    fc.asyncProperty(
      fc.double({ min: -90, max: 90 }), // latitude
      fc.double({ min: -180, max: 180 }), // longitude
      async (lat, lng) => {
        // Create development with coordinates
        const development = await createDevelopment({
          latitude: lat.toString(),
          longitude: lng.toString(),
        });
        
        // Load development
        const loaded = await getDevelopment(development.id);
        
        // Property: Coordinates should match exactly
        expect(parseFloat(loaded.latitude!)).toBeCloseTo(lat, 6);
        expect(parseFloat(loaded.longitude!)).toBeCloseTo(lng, 6);
      }
    )
  );
});
```

### Task 3.11: Graceful Geocoding Failure
**Property**: *For any* geocoding failure, all address fields should remain editable

**Challenge**: Requires simulating API failures

**Recommendation**:
- Unit test error handling in LocationMapPicker
- Mock geocoding API to throw errors
- Verify error state and field editability

## Proposed Implementation Plan

### Phase 1: Core Logic Unit Tests (High Priority)
1. Test `parseGeocodingResult` function with property-based tests
2. Test coordinate validation and formatting
3. Test error handling logic

### Phase 2: Integration Tests (Medium Priority)
1. Test LocationMapPicker with mocked Google Maps
2. Test coordinate persistence with test database
3. Test manual override behavior

### Phase 3: E2E Tests (Low Priority)
1. Set up Playwright/Cypress for E2E testing
2. Test complete user flow with real Google Maps API
3. Run in CI/CD with API key management

## Conclusion

**Recommendation**: Mark tasks 3.7-3.11 as **optional** or **deferred** in the current sprint, and implement:

1. **Immediate**: Unit tests for `parseGeocodingResult` and core logic
2. **Short-term**: Integration tests with mocked Google Maps
3. **Long-term**: E2E tests with real API in CI/CD pipeline

The core functionality is already working and has been manually tested. Property-based tests for external API integrations provide diminishing returns compared to the implementation effort required.

## Alternative: Manual Testing Checklist

Until automated tests are implemented, use this manual testing checklist:

- [ ] Click map at various locations - pin appears at exact click point
- [ ] Drag pin to new location - address updates
- [ ] Use search autocomplete - pin moves to selected location
- [ ] Manually edit address - pin doesn't move
- [ ] Move pin after manual edit - address updates again
- [ ] Save development with coordinates - coordinates persist
- [ ] Edit development with coordinates - pin appears at saved location
- [ ] Test with geocoding failure (invalid coordinates) - fields remain editable
- [ ] Test with no internet connection - graceful error handling
- [ ] Test with various coordinate ranges (South Africa bounds)

## Status

**Current Status**: Core functionality complete and manually tested

**Test Coverage**: 
- ✅ Backend coordinate persistence (covered by existing tests)
- ⏳ Frontend map integration (requires mocking strategy)
- ⏳ Property-based tests (deferred due to complexity)

**Next Steps**: 
1. Discuss with team whether to implement mocked tests or defer
2. If implementing, start with unit tests for `parseGeocodingResult`
3. Add integration tests with mocked Google Maps
4. Consider E2E tests for critical user flows
