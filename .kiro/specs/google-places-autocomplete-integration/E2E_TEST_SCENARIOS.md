# End-to-End Test Scenarios

## Overview

This document provides detailed test scenarios for manual end-to-end testing of the Google Places Autocomplete Integration. Each scenario includes step-by-step instructions, expected results, and validation criteria.

---

## Test Environment Setup

### Prerequisites

- [ ] Staging environment accessible
- [ ] Test user accounts created
- [ ] Google Places API key configured
- [ ] Database seeded with test data
- [ ] Browser DevTools available
- [ ] Network throttling tools available

### Test Data

**Test Locations**:
- Sandton, Johannesburg, Gauteng
- Camps Bay, Cape Town, Western Cape
- Umhlanga, Durban, KwaZulu-Natal
- Rosebank, Johannesburg, Gauteng
- Sea Point, Cape Town, Western Cape

---

## Scenario 1: Complete Listing Creation with Autocomplete

### Objective
Verify that an agent can create a property listing using location autocomplete from start to finish.

### Steps

1. **Navigate to Listing Creation**
   - Go to `/listings/create`
   - Verify page loads successfully
   - Verify form is empty

2. **Use Location Autocomplete**
   - Click on "Location" input field
   - Type "San" (3 characters)
   - Wait 300ms for debounce
   - Verify loading indicator appears
   - Verify autocomplete dropdown appears
   - Verify suggestions include "Sandton, Johannesburg, Gauteng"

3. **Select Location**
   - Click on "Sandton, Johannesburg, Gauteng"
   - Verify dropdown closes
   - Verify form fields populated:
     - Province: "Gauteng"
     - City: "Johannesburg"
     - Suburb: "Sandton"
     - Coordinates: Populated (lat/lng)
     - GPS Accuracy: "accurate"

4. **Verify Map Preview**
   - Verify small map preview appears
   - Verify marker placed at Sandton coordinates
   - Verify map centered correctly

5. **Complete Listing**
   - Fill in remaining required fields
   - Submit form
   - Verify listing created successfully

6. **Verify Database**
   - Check locations table for Sandton record
   - Check listing has location_id set
   - Verify hierarchy: Gauteng → Johannesburg → Sandton

### Expected Results
- ✅ Autocomplete triggers after 3 characters
- ✅ Suggestions appear within 500ms
- ✅ Selection populates all fields correctly
- ✅ Map preview displays correctly
- ✅ Location record created with hierarchy
- ✅ Listing linked to location

### Validation Criteria
- Response time < 500ms
- All fields populated correctly
- No JavaScript errors
- Database records created correctly

---

## Scenario 2: Location Page Discovery and Navigation

### Objective
Verify that users can discover and navigate location pages with correct data display.


### Steps

1. **Navigate to Suburb Page**
   - Go to `/south-africa/gauteng/johannesburg/sandton`
   - Verify page loads within 2 seconds
   - Open DevTools Network tab
   - Verify SSR (HTML contains content)

2. **Verify Hero Section**
   - Verify location name: "Sandton"
   - Verify province badge: "Gauteng"
   - Verify breadcrumbs: South Africa > Gauteng > Johannesburg > Sandton
   - Verify hero image displays

3. **Verify Market Statistics**
   - Verify average sale price displayed
   - Verify average rental price displayed
   - Verify listing count displayed
   - Verify development count displayed
   - Verify statistics are realistic numbers

4. **Verify Property Explorer**
   - Verify "For Sale" tab shows count
   - Verify "To Rent" tab shows count
   - Verify "New Developments" tab shows count
   - Click "View All Properties"
   - Verify redirect to search with Place ID filter

5. **Verify Interactive Map**
   - Verify map displays
   - Verify markers for listings
   - Verify map centered on Sandton
   - Verify zoom controls work

6. **Navigate to Similar Suburb**
   - Scroll to "Similar Suburbs" section
   - Click on a similar suburb (e.g., Rosebank)
   - Verify navigation to Rosebank page
   - Verify URL: `/south-africa/gauteng/johannesburg/rosebank`

### Expected Results
- ✅ Page loads in < 2 seconds
- ✅ Static content renders server-side
- ✅ Dynamic statistics display correctly
- ✅ All sections render properly
- ✅ Navigation works seamlessly

### Validation Criteria
- Page load time < 2s
- No layout shifts
- All images load
- No JavaScript errors
- Statistics are accurate

---

## Scenario 3: Search Integration and Filtering

### Objective
Verify that location-based search and filtering work correctly.

### Steps

1. **Use Global Search**
   - Navigate to homepage
   - Click on search bar
   - Type "Camps Bay"
   - Verify autocomplete suggestions appear
   - Select "Camps Bay, Cape Town, Western Cape"

2. **Verify Location Page Redirect**
   - Verify redirect to `/south-africa/western-cape/cape-town/camps-bay`
   - Verify Place ID in URL parameters
   - Verify page loads correctly

3. **Filter by Location**
   - Click "View Properties" button
   - Verify redirect to search results
   - Verify URL contains location filter
   - Verify Place ID in filter parameters

4. **Verify Filtered Results**
   - Verify only Camps Bay properties shown
   - Verify listing count matches location page
   - Verify "Location: Camps Bay" filter chip displayed
   - Click X on filter chip
   - Verify filter removed and results expand

5. **Verify Search Tracking**
   - Check database location_searches table
   - Verify search event recorded
   - Verify location_id, timestamp recorded

### Expected Results
- ✅ Search autocomplete works
- ✅ Location page redirect correct
- ✅ Place ID filtering accurate
- ✅ Search tracking recorded
- ✅ Filter removal works

### Validation Criteria
- Search results accurate
- No duplicate listings
- Filter state persists
- Search tracking works

---

## Scenario 4: Manual Entry Fallback

### Objective
Verify that manual entry works when Google Places API is unavailable.

### Steps

1. **Simulate API Failure**
   - Open DevTools Network tab
   - Set network to "Offline" or block Google Places API
   - Navigate to listing creation

2. **Attempt Autocomplete**
   - Type in location field
   - Verify error message appears
   - Verify message: "Location autocomplete temporarily unavailable"

3. **Use Manual Entry**
   - Verify manual entry mode enabled
   - Type "123 Main Street, Sandton, Johannesburg"
   - Verify "Use this address" button appears
   - Click button

4. **Verify Geocoding Attempt**
   - Verify system attempts geocoding
   - If geocoding fails, verify GPS accuracy marked as "manual"
   - Verify user can proceed with manual coordinates

5. **Complete Listing**
   - Fill remaining fields
   - Submit form
   - Verify listing created successfully
   - Verify GPS accuracy field = "manual"

### Expected Results
- ✅ API error handled gracefully
- ✅ Manual entry mode activates
- ✅ Geocoding attempted
- ✅ Fallback works correctly
- ✅ GPS accuracy marked appropriately

### Validation Criteria
- No system crash
- User can complete task
- Data saved correctly
- Error message clear

---

## Scenario 5: Mobile Experience

### Objective
Verify that all features work correctly on mobile devices.

### Steps

1. **Test on Mobile Device**
   - Use real mobile device or Chrome DevTools device emulation
   - Set to iPhone 12 (375x667)
   - Navigate to listing creation

2. **Test Autocomplete on Mobile**
   - Tap location input
   - Verify keyboard appears
   - Type "Umhlanga"
   - Verify suggestions appear
   - Verify suggestion items are 44px height (touch-friendly)
   - Tap a suggestion
   - Verify keyboard dismisses
   - Verify fields populated

3. **Test Map on Mobile**
   - Verify map preview displays
   - Verify map is responsive
   - Test pinch-to-zoom
   - Test pan gestures
   - Verify marker visible

4. **Test Location Page on Mobile**
   - Navigate to location page
   - Verify responsive layout
   - Verify hero section stacks correctly
   - Verify statistics cards stack
   - Verify map is full-width
   - Test scrolling performance

5. **Test Search on Mobile**
   - Use search bar
   - Verify autocomplete dropdown fits screen
   - Verify touch targets adequate
   - Test filter panel (should be bottom sheet)

### Expected Results
- ✅ Touch targets ≥ 44px
- ✅ Keyboard handling correct
- ✅ Responsive layout works
- ✅ Gestures work smoothly
- ✅ No horizontal scroll

### Validation Criteria
- All features accessible
- No layout issues
- Performance acceptable
- Touch interactions smooth

---

## Scenario 6: Performance Under Load

### Objective
Verify system performance under realistic load conditions.

### Steps

1. **Baseline Performance**
   - Open Chrome DevTools
   - Go to Performance tab
   - Record page load for location page
   - Verify First Contentful Paint < 1.5s
   - Verify Time to Interactive < 3s

2. **Test Autocomplete Performance**
   - Type rapidly in autocomplete field
   - Verify debouncing works (only 1 request per 300ms)
   - Check Network tab for request count
   - Verify cache hits for duplicate queries

3. **Test Statistics Calculation**
   - Navigate to location page with many listings
   - Open Network tab
   - Check statistics API response time
   - Verify < 500ms response time
   - Refresh page multiple times
   - Verify cache hit on subsequent loads

4. **Test Database Performance**
   - Check database query logs
   - Verify location lookup queries < 100ms
   - Verify listing aggregation queries < 500ms
   - Verify indexes being used

### Expected Results
- ✅ Page load < 2s
- ✅ Autocomplete debounced correctly
- ✅ Statistics calculation < 500ms
- ✅ Cache hit rate > 60%
- ✅ Database queries optimized

### Validation Criteria
- All performance targets met
- No memory leaks
- CPU usage reasonable
- Network requests minimized

---

## Scenario 7: SEO and Structured Data

### Objective
Verify that SEO metadata and structured data are correct.

### Steps

1. **Verify Meta Tags**
   - Navigate to location page
   - View page source
   - Verify `<title>` tag present and unique
   - Verify meta description present and unique
   - Verify OG tags present (og:title, og:description, og:url)
   - Verify canonical URL correct

2. **Verify Structured Data**
   - View page source
   - Find JSON-LD script tag
   - Copy structured data
   - Go to Google Rich Results Test
   - Paste structured data
   - Verify no errors
   - Verify @type "Place"
   - Verify all required properties present

3. **Verify URL Structure**
   - Verify URL follows pattern: `/south-africa/{province}/{city}/{suburb}`
   - Verify slugs are kebab-case
   - Verify no special characters in URLs
   - Verify URLs are stable (don't change)

4. **Verify Breadcrumbs**
   - Verify breadcrumb navigation present
   - Verify breadcrumb structured data present
   - Verify breadcrumbs match URL hierarchy

### Expected Results
- ✅ All meta tags present and unique
- ✅ Structured data validates
- ✅ URLs follow hierarchical pattern
- ✅ Breadcrumbs correct

### Validation Criteria
- No validation errors
- Meta tags unique per page
- Structured data complete
- URLs SEO-friendly

---

## Scenario 8: Error Recovery

### Objective
Verify that system recovers gracefully from various error conditions.

### Steps

1. **Test API Rate Limit**
   - Simulate rate limit exceeded (429 error)
   - Verify error message displayed
   - Verify manual entry mode activates
   - Verify administrator alert triggered

2. **Test Invalid API Key**
   - Use invalid API key
   - Verify error logged
   - Verify manual entry mode activates
   - Verify critical alert triggered

3. **Test Network Timeout**
   - Throttle network to slow 3G
   - Use autocomplete
   - Verify loading indicator shows
   - Wait for timeout (5 seconds)
   - Verify retry attempted
   - Verify fallback to manual entry

4. **Test Database Error**
   - Simulate database connection error
   - Navigate to location page
   - Verify 503 status returned
   - Verify maintenance page displayed
   - Verify error logged

5. **Test Statistics Failure**
   - Simulate statistics calculation error
   - Navigate to location page
   - Verify static content renders
   - Verify error message for statistics
   - Verify page remains functional

### Expected Results
- ✅ All errors handled gracefully
- ✅ User can continue working
- ✅ Appropriate error messages shown
- ✅ Alerts triggered correctly
- ✅ No data loss

### Validation Criteria
- No system crashes
- Error messages clear
- Fallbacks work
- Monitoring alerts triggered

---

## Test Execution Tracking

### Test Run Information

- **Test Date**: _______________
- **Tester**: _______________
- **Environment**: Staging / Production
- **Browser**: _______________
- **Device**: _______________

### Scenario Results

| Scenario | Status | Issues Found | Notes |
|----------|--------|--------------|-------|
| 1. Listing Creation | ⏳ | | |
| 2. Location Page | ⏳ | | |
| 3. Search Integration | ⏳ | | |
| 4. Manual Entry | ⏳ | | |
| 5. Mobile Experience | ⏳ | | |
| 6. Performance | ⏳ | | |
| 7. SEO | ⏳ | | |
| 8. Error Recovery | ⏳ | | |

### Overall Assessment

- **Pass Rate**: _____ / 8 scenarios
- **Critical Issues**: _____
- **Non-Critical Issues**: _____
- **Ready for Production**: Yes / No

### Sign-Off

- **Tester**: _________________ Date: _______
- **QA Lead**: ________________ Date: _______
