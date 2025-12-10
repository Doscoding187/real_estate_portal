# Troubleshooting Guide: Google Places Autocomplete Integration

## Overview

This guide provides solutions to common issues encountered when using the Google Places Autocomplete Integration in the Property Listify platform.

## Table of Contents

1. [Autocomplete Issues](#autocomplete-issues)
2. [API Errors](#api-errors)
3. [Location Page Issues](#location-page-issues)
4. [Performance Issues](#performance-issues)
5. [Database Issues](#database-issues)
6. [SEO Issues](#seo-issues)
7. [Debugging Tools](#debugging-tools)

---

## Autocomplete Issues

### Issue: No Suggestions Appearing

**Symptoms:**
- Autocomplete dropdown remains empty
- No API calls visible in network tab
- No errors in console

**Possible Causes & Solutions:**

#### 1. Input Length Too Short

**Cause:** Autocomplete requires minimum 3 characters

**Solution:**
```typescript
// Verify minimum length requirement
if (input.length < 3) {
  return; // Don't make API call
}
```

**Check:** Type at least 3 characters in the input field

---

#### 2. Debounce Delay

**Cause:** 300ms debounce delay prevents immediate API calls

**Solution:** Wait 300ms after typing stops

**Check:**
```typescript
// Verify debounce is working
console.log('Debounce delay:', AUTOCOMPLETE_DEBOUNCE_MS); // Should be 300
```

---

#### 3. API Key Not Configured

**Cause:** Missing or invalid `GOOGLE_PLACES_API_KEY` in environment variables

**Solution:**
```bash
# Check .env file
cat .env | grep GOOGLE_PLACES_API_KEY

# Should output:
# GOOGLE_PLACES_API_KEY=AIzaSy...
```

**Fix:**
```bash
# Add to .env file
echo "GOOGLE_PLACES_API_KEY=your_api_key_here" >> .env

# Restart server
npm run dev
```

---

#### 4. API Not Enabled

**Cause:** Places API not enabled in Google Cloud Console

**Solution:**
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Navigate to "APIs & Services" > "Library"
3. Search for "Places API (New)"
4. Click "Enable"
5. Wait 5 minutes for changes to propagate

---

#### 5. Session Token Not Created

**Cause:** Session token not initialized

**Solution:**
```typescript
// Verify session token exists
const sessionToken = useRef(new google.maps.places.AutocompleteSessionToken());
console.log('Session token:', sessionToken.current);
```

---

### Issue: Suggestions Show Wrong Locations

**Symptoms:**
- Suggestions include international locations
- South African locations not prioritized

**Possible Causes & Solutions:**

#### 1. Country Restriction Not Set

**Cause:** Missing country restriction parameter

**Solution:**
```typescript
// Verify country restriction
const options = {
  componentRestrictions: { country: 'za' }, // South Africa
};

// Check environment variable
console.log('Country restriction:', process.env.GOOGLE_PLACES_COUNTRY_RESTRICTION);
```

**Fix:**
```bash
# Add to .env file
echo "GOOGLE_PLACES_COUNTRY_RESTRICTION=ZA" >> .env
```

---

#### 2. Location Bias Not Set

**Cause:** Missing location bias for South Africa

**Solution:**
```typescript
// Add location bias
const options = {
  componentRestrictions: { country: 'za' },
  location: new google.maps.LatLng(-30.5595, 22.9375), // South Africa center
  radius: 2000000, // 2000km radius
};
```

---

### Issue: Slow Autocomplete Response

**Symptoms:**
- Suggestions take >2 seconds to appear
- Poor user experience

**Possible Causes & Solutions:**

#### 1. Network Latency

**Cause:** Slow internet connection or distant API servers

**Solution:**
```typescript
// Check API response time
console.time('autocomplete');
const suggestions = await getAutocompleteSuggestions(input);
console.timeEnd('autocomplete'); // Should be <500ms
```

**Fix:**
- Check internet connection speed
- Consider using a CDN for static assets
- Implement request timeout (5 seconds)

---

#### 2. Cache Not Working

**Cause:** Cache not configured or not hitting

**Solution:**
```typescript
// Check cache hit rate
const cacheStats = await redis.info('stats');
console.log('Cache hit rate:', cacheStats.keyspace_hits / cacheStats.keyspace_misses);
// Should be >0.6 (60%)
```

**Fix:**
```bash
# Verify Redis is running
redis-cli ping
# Should output: PONG

# Check cache keys
redis-cli KEYS places:*
```

---

#### 3. Too Many Concurrent Requests

**Cause:** Multiple autocomplete requests running simultaneously

**Solution:**
```typescript
// Implement request cancellation
const abortController = new AbortController();

// Cancel previous request
abortController.abort();

// Make new request
fetch(url, { signal: abortController.signal });
```

---

## API Errors

### Error: "API key not valid"

**Symptoms:**
- 403 Forbidden responses
- Error message: "API key not valid. Please pass a valid API key."

**Possible Causes & Solutions:**

#### 1. Invalid API Key

**Cause:** API key is incorrect or malformed

**Solution:**
```bash
# Verify API key format (should start with AIza)
echo $GOOGLE_PLACES_API_KEY | grep -E '^AIza'

# Test API key with curl
curl "https://maps.googleapis.com/maps/api/place/autocomplete/json?input=Sandton&key=$GOOGLE_PLACES_API_KEY"
```

**Fix:**
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Navigate to "APIs & Services" > "Credentials"
3. Copy the correct API key
4. Update `.env` file

---

#### 2. API Key Restrictions

**Cause:** API key restricted to specific domains/IPs

**Solution:**
```bash
# Check if request is coming from allowed domain
curl -H "Referer: https://yourdomain.com" \
  "https://maps.googleapis.com/maps/api/place/autocomplete/json?input=Sandton&key=$GOOGLE_PLACES_API_KEY"
```

**Fix:**
1. Go to Google Cloud Console > Credentials
2. Edit API key
3. Update "Application restrictions" to include your domain
4. Wait 5 minutes for changes to propagate

---

### Error: "REQUEST_DENIED"

**Symptoms:**
- API returns `status: "REQUEST_DENIED"`
- No suggestions appear

**Possible Causes & Solutions:**

#### 1. Billing Not Enabled

**Cause:** Google Cloud project doesn't have billing enabled

**Solution:**
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Navigate to "Billing"
3. Link a billing account
4. Enable billing for the project

---

#### 2. API Not Enabled

**Cause:** Places API not enabled for the project

**Solution:**
1. Go to "APIs & Services" > "Library"
2. Search for "Places API (New)"
3. Click "Enable"
4. Wait 5 minutes

---

### Error: "OVER_QUERY_LIMIT"

**Symptoms:**
- API returns `status: "OVER_QUERY_LIMIT"`
- Autocomplete stops working

**Possible Causes & Solutions:**

#### 1. Daily Quota Exceeded

**Cause:** Exceeded daily API quota

**Solution:**
```bash
# Check current usage
# Go to Google Cloud Console > APIs & Services > Dashboard
```

**Fix:**
1. Increase quota in Google Cloud Console
2. Implement better caching
3. Reduce API calls with longer debounce delay

---

#### 2. Rate Limiting

**Cause:** Too many requests per second

**Solution:**
```typescript
// Implement rate limiting
const rateLimiter = new RateLimiter({
  tokensPerInterval: 100,
  interval: 'second',
});

await rateLimiter.removeTokens(1);
```

---

### Error: "ZERO_RESULTS"

**Symptoms:**
- API returns `status: "ZERO_RESULTS"`
- No suggestions for valid locations

**Possible Causes & Solutions:**

#### 1. Typo in Query

**Cause:** User typed incorrect location name

**Solution:**
- Implement fuzzy matching
- Show "No results found" message
- Suggest alternative searches

---

#### 2. Location Not in Database

**Cause:** Location doesn't exist in Google Places database

**Solution:**
```typescript
// Fallback to manual entry
if (status === 'ZERO_RESULTS') {
  setAllowManualEntry(true);
  setMessage('Location not found. You can enter it manually.');
}
```

---

## Location Page Issues

### Issue: Location Page Returns 404

**Symptoms:**
- Navigating to location URL returns 404
- Page not found error

**Possible Causes & Solutions:**

#### 1. Location Record Doesn't Exist

**Cause:** Location not in database

**Solution:**
```sql
-- Check if location exists
SELECT * FROM locations
WHERE slug = 'sandton'
  AND parent_id = (
    SELECT id FROM locations WHERE slug = 'johannesburg'
  );
```

**Fix:**
```typescript
// Create location record
await locationPagesService.upsertLocation({
  name: 'Sandton',
  type: 'suburb',
  placeId: 'ChIJ...',
  parentId: johannesburgId,
});
```

---

#### 2. Incorrect URL Format

**Cause:** URL doesn't match expected format

**Solution:**
```
Correct format:
/south-africa/gauteng/johannesburg/sandton

Incorrect formats:
/gauteng/johannesburg/sandton (missing country)
/south-africa/Gauteng/Johannesburg/Sandton (not lowercase)
/south-africa/gauteng/johannesburg/sandton/ (trailing slash)
```

---

### Issue: Location Statistics Not Updating

**Symptoms:**
- Statistics show old data
- New listings not reflected in counts

**Possible Causes & Solutions:**

#### 1. Cache Not Invalidated

**Cause:** Statistics cached for 5 minutes

**Solution:**
```typescript
// Manually invalidate cache
await redis.del(`location:stats:${locationId}`);

// Or wait 5 minutes for automatic expiration
```

---

#### 2. Listings Not Associated with Location

**Cause:** Listings missing `location_id` foreign key

**Solution:**
```sql
-- Check listings without location_id
SELECT COUNT(*) FROM listings
WHERE location_id IS NULL;

-- Populate location_id
UPDATE listings l
SET location_id = (
  SELECT id FROM locations loc
  WHERE loc.place_id = l.place_id
  LIMIT 1
)
WHERE l.location_id IS NULL;
```

---

### Issue: SEO Metadata Missing

**Symptoms:**
- Page title shows "undefined"
- Meta description is empty
- Structured data missing

**Possible Causes & Solutions:**

#### 1. SEO Fields Not Populated

**Cause:** Location record missing SEO fields

**Solution:**
```sql
-- Check SEO fields
SELECT id, name, seo_title, seo_description
FROM locations
WHERE id = ?;

-- Update SEO fields
UPDATE locations
SET 
  seo_title = 'Sandton Properties for Sale & Rent | Johannesburg',
  seo_description = 'Find properties in Sandton, Johannesburg. Browse 234 listings...'
WHERE id = ?;
```

---

#### 2. SSR Not Working

**Cause:** Server-side rendering not generating meta tags

**Solution:**
```typescript
// Verify SSR is working
export async function getServerSideProps(context) {
  const location = await getLocationByPath(...);
  
  console.log('SSR location:', location); // Should log location data
  
  return {
    props: { location },
  };
}
```

---

## Performance Issues

### Issue: Slow Page Load Times

**Symptoms:**
- Location pages take >3 seconds to load
- Poor user experience

**Possible Causes & Solutions:**

#### 1. Slow Database Queries

**Cause:** Missing indexes or inefficient queries

**Solution:**
```sql
-- Check query performance
EXPLAIN ANALYZE
SELECT * FROM listings
WHERE location_id = 456 AND status = 'active';

-- Should use idx_listings_location_status index
-- Execution time should be <50ms
```

**Fix:**
```sql
-- Create missing indexes
CREATE INDEX idx_listings_location_status ON listings(location_id, status);
```

---

#### 2. No Caching

**Cause:** Statistics calculated on every request

**Solution:**
```typescript
// Implement caching
const cacheKey = `location:stats:${locationId}`;
let stats = await redis.get(cacheKey);

if (!stats) {
  stats = await calculateStatistics(locationId);
  await redis.setex(cacheKey, 300, JSON.stringify(stats)); // 5 min cache
}
```

---

#### 3. Large Images

**Cause:** Unoptimized hero images

**Solution:**
```typescript
// Use optimized images
<OptimizedImage
  src={location.heroImage}
  width={1200}
  height={600}
  format="webp"
  quality={80}
  loading="lazy"
/>
```

---

### Issue: High API Costs

**Symptoms:**
- Unexpected billing charges
- High request counts in Google Cloud Console

**Possible Causes & Solutions:**

#### 1. Session Tokens Not Used

**Cause:** Not using session tokens for billing optimization

**Solution:**
```typescript
// Verify session token usage
const sessionToken = new google.maps.places.AutocompleteSessionToken();

// Use same token for autocomplete and place details
await getAutocompleteSuggestions(input, sessionToken);
await getPlaceDetails(placeId, sessionToken);

// Terminate token after place details
sessionToken = new google.maps.places.AutocompleteSessionToken();
```

---

#### 2. Low Cache Hit Rate

**Cause:** Cache not working or TTL too short

**Solution:**
```typescript
// Check cache hit rate
const stats = await getCacheStats();
console.log('Cache hit rate:', stats.hitRate); // Should be >60%

// Increase cache TTL if needed
const CACHE_TTL = 600; // 10 minutes instead of 5
```

---

#### 3. No Debouncing

**Cause:** API called on every keystroke

**Solution:**
```typescript
// Verify debounce is working
const debouncedSearch = useMemo(
  () => debounce(handleSearch, 300),
  []
);

// Should only call API 300ms after user stops typing
```

---

## Database Issues

### Issue: Duplicate Location Records

**Symptoms:**
- Multiple records for same location
- Inconsistent data

**Possible Causes & Solutions:**

#### 1. Missing Unique Constraint

**Cause:** No unique constraint on place_id

**Solution:**
```sql
-- Check for duplicates
SELECT place_id, COUNT(*) as count
FROM locations
WHERE place_id IS NOT NULL
GROUP BY place_id
HAVING count > 1;

-- Add unique constraint
ALTER TABLE locations
ADD CONSTRAINT unique_place_id UNIQUE (place_id);
```

---

#### 2. Race Condition

**Cause:** Multiple requests creating same location simultaneously

**Solution:**
```typescript
// Use upsert with conflict resolution
await db.locations.upsert({
  where: { placeId: 'ChIJ...' },
  update: { updatedAt: new Date() },
  create: {
    name: 'Sandton',
    slug: 'sandton',
    placeId: 'ChIJ...',
    // ... other fields
  },
});
```

---

### Issue: Broken Hierarchy

**Symptoms:**
- Orphaned location records
- Missing parent locations

**Possible Causes & Solutions:**

#### 1. Parent Deleted

**Cause:** Parent location deleted without cascade

**Solution:**
```sql
-- Find orphaned locations
SELECT l.*
FROM locations l
LEFT JOIN locations p ON l.parent_id = p.id
WHERE l.parent_id IS NOT NULL
  AND p.id IS NULL;

-- Fix foreign key constraint
ALTER TABLE locations
DROP CONSTRAINT fk_locations_parent;

ALTER TABLE locations
ADD CONSTRAINT fk_locations_parent
FOREIGN KEY (parent_id)
REFERENCES locations(id)
ON DELETE RESTRICT; -- Prevent deletion of parents
```

---

### Issue: Slow Hierarchy Queries

**Symptoms:**
- Recursive queries take >1 second
- Timeout errors

**Possible Causes & Solutions:**

#### 1. Missing Indexes

**Cause:** No index on parent_id

**Solution:**
```sql
-- Create index
CREATE INDEX idx_locations_parent_id ON locations(parent_id);

-- Verify index is used
EXPLAIN ANALYZE
WITH RECURSIVE location_tree AS (
  SELECT id FROM locations WHERE id = 456
  UNION ALL
  SELECT l.id FROM locations l
  INNER JOIN location_tree lt ON l.parent_id = lt.id
)
SELECT * FROM location_tree;
```

---

#### 2. Deep Hierarchy

**Cause:** Too many levels in hierarchy

**Solution:**
```typescript
// Limit recursion depth
WITH RECURSIVE location_tree AS (
  SELECT id, parent_id, 1 as level
  FROM locations WHERE id = 456
  
  UNION ALL
  
  SELECT l.id, l.parent_id, lt.level + 1
  FROM locations l
  INNER JOIN location_tree lt ON l.parent_id = lt.id
  WHERE lt.level < 10 -- Limit to 10 levels
)
SELECT * FROM location_tree;
```

---

## SEO Issues

### Issue: Pages Not Indexed

**Symptoms:**
- Location pages not appearing in Google search
- Low organic traffic

**Possible Causes & Solutions:**

#### 1. Robots.txt Blocking

**Cause:** robots.txt blocking crawlers

**Solution:**
```
# Check robots.txt
User-agent: *
Allow: /south-africa/
Disallow: /api/

# Should allow location pages
```

---

#### 2. No Sitemap

**Cause:** Sitemap not generated or submitted

**Solution:**
```typescript
// Generate sitemap
const locations = await db.locations.findAll();

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  ${locations.map(loc => `
    <url>
      <loc>https://propertylistify.com${getLocationUrl(loc)}</loc>
      <lastmod>${loc.updatedAt.toISOString()}</lastmod>
      <changefreq>daily</changefreq>
      <priority>0.8</priority>
    </url>
  `).join('')}
</urlset>`;

// Submit to Google Search Console
```

---

#### 3. Duplicate Content

**Cause:** Multiple URLs for same location

**Solution:**
```html
<!-- Add canonical URL -->
<link rel="canonical" href="https://propertylistify.com/south-africa/gauteng/johannesburg/sandton" />

<!-- Redirect alternative URLs -->
if (url !== canonicalUrl) {
  return redirect(canonicalUrl, 301);
}
```

---

### Issue: Poor Search Rankings

**Symptoms:**
- Location pages rank low in search results
- Competitors rank higher

**Possible Causes & Solutions:**

#### 1. Thin Content

**Cause:** Not enough content on page

**Solution:**
```typescript
// Ensure description is 700-1200 words
if (location.description.length < 700) {
  // Generate more content
  location.description = await generateSEOContent(location);
}
```

---

#### 2. Missing Structured Data

**Cause:** No Schema.org markup

**Solution:**
```html
<!-- Add structured data -->
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "Place",
  "name": "Sandton",
  "address": {
    "@type": "PostalAddress",
    "addressLocality": "Johannesburg",
    "addressRegion": "Gauteng",
    "addressCountry": "ZA"
  },
  "geo": {
    "@type": "GeoCoordinates",
    "latitude": -26.1076,
    "longitude": 28.0567
  }
}
</script>
```

---

## Debugging Tools

### Enable Debug Logging

```bash
# Add to .env
NODE_ENV=development
DEBUG=google-places:*

# Restart server
npm run dev
```

### Check API Usage

```bash
# View monitoring dashboard
open http://localhost:5000/api/google-places/monitoring/dashboard
```

### Inspect Cache

```bash
# Connect to Redis
redis-cli

# View all cache keys
KEYS places:*

# Get specific cache entry
GET places:autocomplete:sandton:ZA

# Check cache stats
INFO stats
```

### Test Database Queries

```sql
-- Check location exists
SELECT * FROM locations WHERE slug = 'sandton';

-- Check listings associated
SELECT COUNT(*) FROM listings WHERE location_id = 456;

-- Check hierarchy
WITH RECURSIVE location_path AS (
  SELECT id, name, parent_id FROM locations WHERE id = 456
  UNION ALL
  SELECT l.id, l.name, l.parent_id FROM locations l
  INNER JOIN location_path lp ON l.id = lp.parent_id
)
SELECT * FROM location_path;
```

### Network Debugging

```bash
# Test API endpoint
curl -v "http://localhost:5000/api/locations/autocomplete?input=Sandton&sessionToken=test123"

# Test with authentication
curl -v -H "Authorization: Bearer $TOKEN" \
  "http://localhost:5000/api/locations/456/statistics"
```

---

## Getting Help

If you're still experiencing issues:

1. Check the [Developer Guide](./DEVELOPER_GUIDE.md) for usage examples
2. Review the [API Documentation](./API_DOCUMENTATION.md) for service methods
3. Check the [Database Schema](./DATABASE_SCHEMA.md) for data structure
4. Review [Google Places API Documentation](https://developers.google.com/maps/documentation/places/web-service)
5. Contact the development team with:
   - Error messages
   - Steps to reproduce
   - Browser console logs
   - Network tab screenshots
   - Database query results

---

## Common Error Messages Reference

| Error Message | Cause | Solution |
|---------------|-------|----------|
| "API key not valid" | Invalid API key | Check API key in .env file |
| "REQUEST_DENIED" | Billing not enabled | Enable billing in Google Cloud Console |
| "ZERO_RESULTS" | No matching locations | Check query spelling or allow manual entry |
| "OVER_QUERY_LIMIT" | Quota exceeded | Increase quota or improve caching |
| "Location not found" | Missing database record | Create location record |
| "Network error" | Connection failed | Check internet connection |
| "Session token invalid" | Token expired | Create new session token |
| "Cache connection failed" | Redis not running | Start Redis server |
| "Database connection failed" | DB not accessible | Check database credentials |
| "Slow query" | Missing indexes | Create database indexes |
