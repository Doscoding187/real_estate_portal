# Explore Routes - Routing Order Fix

**Date:** December 7, 2025  
**Status:** ✅ Fixed

---

## Issue: CORS Errors and Incorrect Route Matching

### Symptoms
Console errors showing:
```
Access to fetch at 'https://realestateportal-production-9bb8.up.railway.app/api/trpc/locationPages.getCityData...'
CORS policy: No 'Access-Control-Allow-Origin' header
```

The app was trying to fetch location data with:
- `provinceSlug: "explore"`
- `citySlug: "home"`

### Root Cause

The catch-all location routes at the end of `App.tsx` were matching `/explore/home` before the specific Explore routes could handle it:

```tsx
// These catch-all routes were matching /explore/home
<Route path="/:province/:city/:suburb" component={SuburbPage} />
<Route path="/:province/:city" component={CityPage} />  // ← Matched /explore/home
<Route path="/:province" component={ProvincePage} />
```

The router was treating:
- "explore" as a province slug
- "home" as a city slug

This caused the `CityPage` component to load instead of `ExploreHome`, which then tried to fetch location data that doesn't exist.

---

## Solution

### Route Order Matters!

In `wouter` (and most routers), routes are matched in the order they're defined. More specific routes MUST come before catch-all routes.

**Fixed Route Order:**
```tsx
// ✅ CORRECT: Specific Explore routes BEFORE catch-all location routes
<Route path="/explore/home" component={ExploreHome} />
<Route path="/explore/shorts" component={ExploreShorts} />
<Route path="/explore/upload" component={ExploreUpload} />
<Route path="/explore/component-demo" component={ExploreComponentDemo} />
<Route path="/explore" component={ExploreFeed} />

// ... many other specific routes ...

// ✅ Catch-all location routes at the END
<Route path="/:province/:city/:suburb" component={SuburbPage} />
<Route path="/:province/:city" component={CityPage} />
<Route path="/:province" component={ProvincePage} />
```

---

## Why This Happened

1. The `/explore/home` route was added recently (Task 42.1)
2. It was placed in the middle of the route list
3. The catch-all location routes at the end matched it first
4. The router never reached the specific `/explore/home` route

---

## Verification

### Before Fix:
- ❌ `/explore/home` → Loaded `CityPage` component
- ❌ Tried to fetch location data for "explore/home"
- ❌ CORS errors in console
- ❌ Page showed "Location Not Found"

### After Fix:
- ✅ `/explore/home` → Loads `ExploreHome` component
- ✅ No location data fetching
- ✅ No CORS errors
- ✅ Page displays correctly

---

## Best Practices for Route Order

### 1. Most Specific First
```tsx
// ✅ Good
<Route path="/explore/home" />
<Route path="/explore/shorts" />
<Route path="/explore" />
<Route path="/:province/:city" />

// ❌ Bad
<Route path="/:province/:city" />  // Catches everything!
<Route path="/explore/home" />     // Never reached
```

### 2. Parameterized Routes Last
```tsx
// ✅ Good
<Route path="/properties" />
<Route path="/property/:id" />
<Route path="/:province" />

// ❌ Bad
<Route path="/:province" />        // Catches /properties!
<Route path="/properties" />       // Never reached
```

### 3. Catch-All Routes at the Very End
```tsx
// ✅ Good
<Route path="/specific/route" />
<Route path="/:param" />
<Route path="/404" />
<Route component={NotFound} />     // Fallback

// ❌ Bad
<Route component={NotFound} />     // Catches everything!
<Route path="/specific/route" />   // Never reached
```

---

## Files Modified

- `client/src/App.tsx` - Reordered Explore routes to come before catch-all location routes

---

## Related Issues

This is a common routing pitfall when using:
- Dynamic route parameters (`:param`)
- Catch-all routes
- Multiple route patterns that could match the same URL

Always remember: **Specific routes before generic routes!**

---

**Status:** ✅ Fixed and Documented  
**Impact:** All Explore routes now work correctly without CORS errors
