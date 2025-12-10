# Location Page Architecture and Rendering Strategy

## Overview

This document describes the architecture and rendering strategy for location pages in the Property Listify platform. Location pages provide SEO-optimized landing pages for provinces, cities, and suburbs with dynamic market statistics and property listings.

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Hybrid SSR/ISR Model](#hybrid-ssrisr-model)
3. [Data Flow](#data-flow)
4. [Rendering Pipeline](#rendering-pipeline)
5. [Component Structure](#component-structure)
6. [Performance Optimization](#performance-optimization)
7. [SEO Strategy](#seo-strategy)

---

## Architecture Overview

### Design Principles

1. **SEO-First**: Static content ensures crawlability and ranking
2. **Dynamic Intelligence**: Real-time statistics provide user value
3. **Progressive Enhancement**: Server-side rendering with client-side hydration
4. **Hierarchical Data**: Province → City → Suburb → Listings

### System Components

```
┌─────────────────────────────────────────────────────────────────┐
│                        Frontend Layer                            │
├─────────────────────────────────────────────────────────────────┤
│  Location Page Components                                        │
│  ├─ Static content (SSR)                                        │
│  ├─ Dynamic statistics (SSR + hydration)                        │
│  ├─ Interactive map                                              │
│  └─ Listing filters                                              │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                         API Layer                                │
├─────────────────────────────────────────────────────────────────┤
│  Location Pages Service                                          │
│  ├─ Location CRUD operations                                    │
│  ├─ Hierarchy management                                         │
│  ├─ SEO content generation                                      │
│  └─ Statistics aggregation                                      │
│                                                                   │
│  Analytics Service                                               │
│  ├─ Market statistics calculation                               │
│  ├─ Trending suburbs analysis                                   │
│  └─ Similar locations recommendation                            │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                       Database Layer                             │
├─────────────────────────────────────────────────────────────────┤
│  locations (static SEO content)                                  │
│  listings (dynamic data source)                                  │
│  location_searches (trending analysis)                           │
│  recent_searches (user history)                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Hybrid SSR/ISR Model

### Content Split

Location pages use a hybrid rendering approach that balances SEO requirements with dynamic data freshness:

#### Static Content (ISR - 24 hour cache)
- Page title and meta tags
- Intro description
- SEO metadata
- Breadcrumbs
- Hero images
- Hierarchy tree
- About the area content

#### Dynamic Content (SSR - 5 minute cache)
- Average sale price
- Average rental price
- Number of listings
- Number of developments
- Price trends
- Market activity metrics
- Property type distribution

#### Client-Side Hydration
- Interactive maps
- Charts and graphs
- Filter controls
- Listing carousels

### Rendering Strategy

```typescript
// SSR Request Flow
SSR Request
    ↓
Load Static SEO Content (from locations table)
    ↓
Load Dynamic Stats (from listings aggregation)
    ↓
Merge Static + Dynamic
    ↓
Render HTML
    ↓
Send to Browser
    ↓
Client-Side Hydration (charts, maps, filters)
```

### Cache Configuration

```typescript
// Static content cache (24 hours)
const STATIC_CACHE_TTL = 24 * 60 * 60; // 86400 seconds

// Dynamic statistics cache (5 minutes)
const DYNAMIC_CACHE_TTL = 5 * 60; // 300 seconds

// ISR revalidation (24 hours)
export const revalidate = 86400;
```

---

## Data Flow

### 1. Location Record Creation

```typescript
// Flow: Listing Creation → Location Record
User selects location from autocomplete
    ↓
Extract Place Details from Google Places API
    ↓
Parse address components (province, city, suburb)
    ↓
Create/find location records with hierarchy
    ↓
Generate SEO content (slug, title, description)
    ↓
Store in locations table
    ↓
Link listing to location via location_id
```

### 2. Location Page Request

```typescript
// Flow: URL → Rendered Page
User navigates to /south-africa/gauteng/johannesburg/sandton
    ↓
Parse URL path (province/city/suburb slugs)
    ↓
Query locations table for matching record
    ↓
Load static SEO content (cached 24h)
    ↓
Calculate dynamic statistics (cached 5min)
    ↓
Merge static + dynamic data
    ↓
Render HTML with SSR
    ↓
Send to browser
    ↓
Hydrate interactive components
```

### 3. Statistics Calculation

```typescript
// Flow: Location → Statistics
Location ID
    ↓
Query listings table with location_id filter
    ↓
Aggregate statistics:
  - Count listings (for sale, to rent, developments)
  - Calculate average prices
  - Calculate median prices
  - Calculate days on market
  - Calculate price per m²
    ↓
Cache results (5 minutes)
    ↓
Return statistics
```

---

## Rendering Pipeline

### Server-Side Rendering (SSR)

```typescript
// Example: Province Page SSR
export async function getServerSideProps(context) {
  const { province } = context.params;
  
  // 1. Load static content (cached 24h)
  const location = await locationPagesService.getLocationByPath(province);
  
  if (!location) {
    return { notFound: true };
  }
  
  // 2. Load dynamic statistics (cached 5min)
  const statistics = await locationAnalyticsService.getLocationStatistics(location.id);
  
  // 3. Load featured listings
  const featuredListings = await listingService.getFeaturedListings({
    locationId: location.id,
    limit: 6,
  });
  
  // 4. Load trending suburbs (if province/city)
  const trendingSuburbs = await locationAnalyticsService.getTrendingSuburbs(location.id);
  
  // 5. Merge data
  return {
    props: {
      location,
      statistics,
      featuredListings,
      trendingSuburbs,
    },
  };
}
```

### Incremental Static Regeneration (ISR)

```typescript
// Example: Static Generation with ISR
export async function getStaticProps(context) {
  const { province, city, suburb } = context.params;
  
  // Load static content
  const location = await locationPagesService.getLocationByPath(
    province,
    city,
    suburb
  );
  
  if (!location) {
    return { notFound: true };
  }
  
  // Load dynamic statistics
  const statistics = await locationAnalyticsService.getLocationStatistics(location.id);
  
  return {
    props: {
      location,
      statistics,
    },
    revalidate: 86400, // Revalidate every 24 hours
  };
}

export async function getStaticPaths() {
  // Generate paths for top locations only
  const topLocations = await locationPagesService.getTopLocations(100);
  
  const paths = topLocations.map(location => ({
    params: {
      province: location.provinceSlug,
      city: location.citySlug,
      suburb: location.suburbSlug,
    },
  }));
  
  return {
    paths,
    fallback: 'blocking', // Generate other pages on-demand
  };
}
```

---

## Component Structure

### Page Layout

```tsx
// Location Page Component Structure
<LocationPage>
  {/* 1. Hero Section (Static + Dynamic) */}
  <HeroSection>
    <Breadcrumbs hierarchy={location.hierarchy} />
    <h1>{location.name}</h1>
    <ProvinceBadge>{location.province}</ProvinceBadge>
    <Description>{location.description}</Description>
    <MarketBadges>
      <Badge>Avg Sale: R{stats.avgSalePrice}</Badge>
      <Badge>Avg Rental: R{stats.avgRentalPrice}</Badge>
      <Badge>{stats.listingCount} Listings</Badge>
    </MarketBadges>
  </HeroSection>
  
  {/* 2. Quick Stats Row (Dynamic) */}
  <QuickStatsRow>
    <Stat label="Price per m²" value={stats.pricePerSqm} />
    <Stat label="Market Activity" value={stats.marketActivity} />
    <Stat label="Avg Days on Market" value={stats.avgDaysOnMarket} />
  </QuickStatsRow>
  
  {/* 3. Property Explorer (Dynamic) */}
  <PropertyExplorer>
    <Tabs>
      <Tab>For Sale ({stats.forSaleCount})</Tab>
      <Tab>To Rent ({stats.toRentCount})</Tab>
      <Tab>Developments ({stats.developmentCount})</Tab>
    </Tabs>
    <FeaturedListings location={location.id} />
  </PropertyExplorer>
  
  {/* 4. Interactive Map (Client-Side) */}
  <InteractiveMap
    center={location.coordinates}
    listings={featuredListings}
    viewport={location.viewport}
  />
  
  {/* 5. About the Area (Static SEO) */}
  <AboutTheArea>
    <h2>About {location.name}</h2>
    <div dangerouslySetInnerHTML={{ __html: location.description }} />
  </AboutTheArea>
  
  {/* 6. Location Breakdown (Dynamic) */}
  {location.type === 'province' && (
    <CityList provinceId={location.id} />
  )}
  {location.type === 'city' && (
    <SuburbList cityId={location.id} />
  )}
  {location.type === 'suburb' && (
    <NearbySuburbs suburbId={location.id} />
  )}
  
  {/* 7. Trending Suburbs (Dynamic) */}
  <TrendingSuburbs locationId={location.id} />
  
  {/* 8. Similar Locations (Dynamic) */}
  <SimilarLocations locationId={location.id} />
  
  {/* 9. SEO Metadata (Static) */}
  <Head>
    <title>{location.seoTitle}</title>
    <meta name="description" content={location.seoDescription} />
    <script type="application/ld+json">
      {JSON.stringify(structuredData)}
    </script>
  </Head>
</LocationPage>
```

### Component Hierarchy

```
LocationPage
├── HeroSection
│   ├── Breadcrumbs
│   ├── LocationTitle
│   ├── ProvinceBadge
│   ├── Description
│   └── MarketBadges
├── QuickStatsRow
│   └── StatCard (×4)
├── PropertyExplorer
│   ├── Tabs
│   └── FeaturedListings
│       └── PropertyCard (×6)
├── InteractiveMap
│   ├── MapContainer
│   ├── Markers
│   └── Controls
├── AboutTheArea
│   ├── SectionTitle
│   └── RichTextContent
├── LocationBreakdown
│   ├── CityList (for provinces)
│   ├── SuburbList (for cities)
│   └── NearbySuburbs (for suburbs)
├── TrendingSuburbs
│   └── SuburbCard (×10)
├── SimilarLocations
│   └── LocationCard (×5)
└── SEOMetadata
    ├── MetaTags
    └── StructuredData
```

---

## Performance Optimization

### 1. Caching Strategy

```typescript
// Multi-layer caching
┌─────────────────────────────────────┐
│         CDN Cache (24h)             │  ← Static HTML
├─────────────────────────────────────┤
│      Redis Cache (5min)             │  ← Dynamic statistics
├─────────────────────────────────────┤
│   In-Memory Cache (5min)            │  ← Fallback cache
├─────────────────────────────────────┤
│      Database Queries               │  ← Source of truth
└─────────────────────────────────────┘
```

### 2. Database Optimization

```sql
-- Indexes for fast queries
CREATE INDEX idx_locations_slug ON locations(slug);
CREATE INDEX idx_locations_parent_id ON locations(parent_id);
CREATE INDEX idx_locations_place_id ON locations(place_id);
CREATE INDEX idx_listings_location_id ON listings(location_id);
CREATE INDEX idx_listings_status ON listings(status);

-- Materialized view for statistics (optional)
CREATE MATERIALIZED VIEW location_statistics AS
SELECT
  location_id,
  COUNT(*) as listing_count,
  AVG(price) as avg_price,
  PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY price) as median_price
FROM listings
WHERE status = 'active'
GROUP BY location_id;

-- Refresh materialized view every 5 minutes
REFRESH MATERIALIZED VIEW CONCURRENTLY location_statistics;
```

### 3. Image Optimization

```typescript
// Lazy loading with WebP format
<OptimizedImage
  src={location.heroImage}
  alt={location.name}
  width={1200}
  height={600}
  format="webp"
  loading="lazy"
  placeholder="blur"
/>
```

### 4. Code Splitting

```typescript
// Dynamic imports for heavy components
const InteractiveMap = dynamic(() => import('@/components/location/InteractiveMap'), {
  loading: () => <MapSkeleton />,
  ssr: false, // Client-side only
});

const ChartComponent = dynamic(() => import('@/components/charts/PriceChart'), {
  loading: () => <ChartSkeleton />,
});
```

---

## SEO Strategy

### 1. URL Structure

```
Province:  /south-africa/{province-slug}
City:      /south-africa/{province-slug}/{city-slug}
Suburb:    /south-africa/{province-slug}/{city-slug}/{suburb-slug}

Examples:
/south-africa/gauteng
/south-africa/gauteng/johannesburg
/south-africa/gauteng/johannesburg/sandton
```

### 2. Meta Tags

```html
<!-- Title Tag -->
<title>Sandton Properties for Sale & Rent | Johannesburg, Gauteng</title>

<!-- Meta Description -->
<meta name="description" content="Find properties in Sandton, Johannesburg. Browse 234 houses, apartments, and new developments. View current listings, average prices, and neighborhood insights." />

<!-- Open Graph -->
<meta property="og:title" content="Sandton Properties for Sale & Rent" />
<meta property="og:description" content="Find properties in Sandton, Johannesburg. Browse 234 listings." />
<meta property="og:image" content="https://cdn.propertylistify.com/locations/sandton-hero.jpg" />
<meta property="og:url" content="https://propertylistify.com/south-africa/gauteng/johannesburg/sandton" />

<!-- Twitter Card -->
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="Sandton Properties for Sale & Rent" />
<meta name="twitter:description" content="Find properties in Sandton, Johannesburg. Browse 234 listings." />
<meta name="twitter:image" content="https://cdn.propertylistify.com/locations/sandton-hero.jpg" />
```

### 3. Structured Data

```json
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
  },
  "url": "https://propertylistify.com/south-africa/gauteng/johannesburg/sandton",
  "aggregateRating": {
    "@type": "AggregateRating",
    "ratingValue": "4.5",
    "reviewCount": "234"
  },
  "additionalProperty": [
    {
      "@type": "PropertyValue",
      "name": "Average Sale Price",
      "value": "R 3,500,000"
    },
    {
      "@type": "PropertyValue",
      "name": "Total Listings",
      "value": "234"
    }
  ]
}
```

### 4. Breadcrumb Structured Data

```json
{
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  "itemListElement": [
    {
      "@type": "ListItem",
      "position": 1,
      "name": "South Africa",
      "item": "https://propertylistify.com/south-africa"
    },
    {
      "@type": "ListItem",
      "position": 2,
      "name": "Gauteng",
      "item": "https://propertylistify.com/south-africa/gauteng"
    },
    {
      "@type": "ListItem",
      "position": 3,
      "name": "Johannesburg",
      "item": "https://propertylistify.com/south-africa/gauteng/johannesburg"
    },
    {
      "@type": "ListItem",
      "position": 4,
      "name": "Sandton",
      "item": "https://propertylistify.com/south-africa/gauteng/johannesburg/sandton"
    }
  ]
}
```

---

## Next Steps

- Review [API Documentation](./API_DOCUMENTATION.md) for service methods
- Check [Database Schema](./DATABASE_SCHEMA.md) for data models
- See [Developer Guide](./DEVELOPER_GUIDE.md) for component usage
- Read [Troubleshooting Guide](./TROUBLESHOOTING_GUIDE.md) for common issues
