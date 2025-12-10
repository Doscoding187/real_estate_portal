# Location Pages System - Design Document

## Overview

The Location Pages System is a three-tier hierarchical SEO-optimized landing page architecture that transforms Property Listify's existing listing data into high-converting geographic discovery pages. The system automatically calculates market statistics from agent-provided listings and guides users through a structured Province → City → Suburb flow, ultimately leading to refined property search results.

### Key Design Principles

1. **Data-Driven**: All statistics and content are automatically calculated from existing property listings
2. **Zero Manual Input**: Agents upload listings; the system generates location pages automatically
3. **SEO-First**: Every page is optimized for search engine discovery and ranking
4. **Conversion-Focused**: Clear CTAs guide users deeper into the hierarchy toward listing results
5. **Responsive**: Mobile-first design with adaptive layouts for all screen sizes

### System Integration

The Location Pages System integrates with:
- **Existing Listings Database**: Source of all property data
- **Search Results Page**: Destination for all CTAs with pre-applied filters
- **Property Detail Pages**: Linked from featured listings
- **Development Pages**: Linked from new development cards

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────┐
│                   User Request                          │
│              /{province}/{city}/{suburb}                │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│              Location Router                            │
│  - Parse URL segments                                   │
│  - Determine page level (Province/City/Suburb)          │
│  - Route to appropriate page component                  │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│         Location Pages Service                          │
│  - Fetch location hierarchy data                        │
│  - Calculate market statistics                          │
│  - Aggregate listing data                               │
│  - Generate SEO content                                 │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│              Page Renderer                              │
│  - Render appropriate page template                     │
│  - Inject dynamic data                                  │
│  - Apply SEO metadata                                   │
└─────────────────────────────────────────────────────────┘
```

### Data Flow Architecture

```
Agent Uploads Listing
        │
        ▼
┌──────────────────┐
│ Listings Table   │ ← Source of Truth
└────────┬─────────┘
         │
         ▼
┌──────────────────────────────────────────┐
│  Location Statistics Calculator          │
│  - Average prices (sale/rent)            │
│  - Price per m²                          │
│  - Time on market                        │
│  - Listing counts by type                │
│  - Trending calculations                 │
└────────┬─────────────────────────────────┘
         │
         ▼
┌──────────────────────────────────────────┐
│  Location Pages Cache (Redis)            │
│  - Cached for 1 hour                     │
│  - Invalidated on new listings           │
└────────┬─────────────────────────────────┘
         │
         ▼
┌──────────────────────────────────────────┐
│  Location Page Render                    │
└──────────────────────────────────────────┘
```



## Components and Interfaces

### Page Components

#### 1. ProvincePage Component

**Props:**
```typescript
interface ProvincePageProps {
  province: Province;
  cities: City[];
  trendingSuburbs: Suburb[];
  statistics: ProvinceStatistics;
  developments: Development[];
  propertyTypes: PropertyTypeStats[];
}
```

**Layout Structure:**
- HeroLocation (province name, stats, search bar)
- StatsBar (avg price, avg rent, total listings)
- SearchRefinementBar (filters)
- PropertyTypeExplorer (grid of property type cards)
- LocationGrid (popular cities)
- TrendingSlider (trending suburbs)
- DevelopmentsGrid (new developments)
- MarketInsights (charts and trends)
- SEOTextBlock (200-300 words)
- FinalCTA (3 CTA buttons)

#### 2. CityPage Component

**Props:**
```typescript
interface CityPageProps {
  city: City;
  province: Province;
  suburbs: Suburb[];
  statistics: CityStatistics;
  developments: Development[];
  propertyTypes: PropertyTypeStats[];
  amenities: Amenity[];
  featuredListings: Listing[];
}
```

**Layout Structure:**
- HeroLocation (city name, province, stats)
- Breadcrumbs (Province → City)
- StatsBar
- SearchRefinementBar
- PropertyTypeExplorer
- LocationGrid (popular suburbs)
- DevelopmentsSlider
- MarketInsights (city-specific)
- AmenitiesSection (schools, transport, shopping)
- FeaturedListings (6-12 properties)
- SEOTextBlock (300-500 words)
- FinalCTA

#### 3. SuburbPage Component

**Props:**
```typescript
interface SuburbPageProps {
  suburb: Suburb;
  city: City;
  province: Province;
  statistics: SuburbStatistics;
  propertyTypes: PropertyTypeStats[];
  featuredListings: Listing[];
  amenities: Amenity[];
  nearbySuburbs: Suburb[];
}
```

**Layout Structure:**
- HeroLocation (suburb name, city, province, stats)
- Breadcrumbs (Province → City → Suburb)
- StatsBar
- SearchRefinementBar
- PropertyTypeExplorer
- FeaturedListings (6-12 properties)
- MarketInsights (suburb-specific)
- AmenitiesSection (local schools, shopping)
- NearbySuburbs (similar areas)
- SEOTextBlock (150-250 words)
- FinalCTA



### Shared Components

#### HeroLocation Component

```typescript
interface HeroLocationProps {
  title: string;
  subtitle?: string;
  statistics: {
    avgPrice?: number;
    avgRent?: number;
    totalListings: number;
    avgDOM?: number;
  };
  backgroundImage?: string;
  ctaText: string;
  ctaLink: string;
}
```

Renders a full-width hero section with location name, key stats, and primary CTA.

#### StatsBar Component

```typescript
interface StatsBarProps {
  stats: Array<{
    label: string;
    value: string | number;
    icon?: string;
    trend?: number; // percentage change
  }>;
}
```

Displays a horizontal bar of key statistics with optional trend indicators.

#### SearchRefinementBar Component

```typescript
interface SearchRefinementBarProps {
  location: string;
  onSearch: (filters: SearchFilters) => void;
  availableFilters: {
    propertyTypes: string[];
    priceRanges: PriceRange[];
    bedrooms: number[];
  };
}
```

Interactive filter bar that builds search URLs with applied filters.

#### LocationGrid Component

```typescript
interface LocationGridProps {
  locations: Array<{
    name: string;
    slug: string;
    listingCount: number;
    avgPrice: number;
    image?: string;
  }>;
  type: 'city' | 'suburb';
  columns: number; // responsive: 1-4
}
```

Grid of location cards that link to child location pages.

#### PropertyTypeCard Component

```typescript
interface PropertyTypeCardProps {
  type: string; // 'house', 'apartment', 'townhouse', etc.
  count: number;
  avgPrice: number;
  icon: string;
  link: string; // search URL with filters
}
```

Card displaying property type with stats and link to filtered search.

#### TrendingSlider Component

```typescript
interface TrendingSliderProps {
  items: Array<{
    name: string;
    slug: string;
    trendScore: number;
    listingCount: number;
    priceChange: number;
  }>;
  autoplay?: boolean;
}
```

Horizontal slider showing trending locations with swipe support.

#### DevelopmentsGrid Component

```typescript
interface DevelopmentsGridProps {
  developments: Development[];
  layout: 'grid' | 'slider';
  maxItems?: number;
}
```

Displays new development projects with images, prices, and completion dates.

#### MarketInsights Component

```typescript
interface MarketInsightsProps {
  data: {
    avgSalePrice: number;
    avgRentPrice: number;
    pricePerSqm: number;
    avgDOM: number;
    priceGrowth?: number; // YoY percentage
    rentalYield?: number;
  };
  charts?: {
    priceHistory?: ChartData;
    propertyTypeDistribution?: ChartData;
  };
}
```

Visual display of market statistics with optional charts.

#### AmenitiesSection Component

```typescript
interface AmenitiesSectionProps {
  amenities: {
    schools?: School[];
    transport?: TransportOption[];
    shopping?: ShoppingCenter[];
    healthcare?: HealthcareFacility[];
  };
}
```

Displays nearby amenities with distances and ratings.

#### FeaturedListings Component

```typescript
interface FeaturedListingsProps {
  listings: Listing[];
  layout: 'grid' | 'carousel';
  maxItems: number;
}
```

Showcases featured property listings with images and key details.

#### SEOTextBlock Component

```typescript
interface SEOTextBlockProps {
  content: string; // auto-generated or manual
  wordCount: number; // 150-500 based on page level
}
```

Renders SEO-optimized text content with proper heading structure.

#### FinalCTA Component

```typescript
interface FinalCTAProps {
  location: string;
  ctaButtons: Array<{
    text: string;
    link: string;
    variant: 'primary' | 'secondary' | 'outline';
  }>;
}
```

Three-button CTA block at page bottom (Houses, Apartments, All Properties).

#### Breadcrumbs Component

```typescript
interface BreadcrumbsProps {
  path: Array<{
    label: string;
    url: string;
  }>;
}
```

Navigation breadcrumb trail with schema markup.



## Data Models

### Core Data Structures

#### Province Model

```typescript
interface Province {
  id: number;
  name: string;
  slug: string;
  description?: string;
  seoTitle?: string;
  seoDescription?: string;
}
```

#### City Model

```typescript
interface City {
  id: number;
  name: string;
  slug: string;
  provinceId: number;
  description?: string;
  seoTitle?: string;
  seoDescription?: string;
}
```

#### Suburb Model

```typescript
interface Suburb {
  id: number;
  name: string;
  slug: string;
  cityId: number;
  description?: string;
  seoTitle?: string;
  seoDescription?: string;
}
```

### Statistics Models

#### ProvinceStatistics

```typescript
interface ProvinceStatistics {
  totalListings: number;
  avgSalePrice: number;
  avgRentPrice: number;
  avgPricePerSqm: number;
  avgDOM: number; // days on market
  priceGrowthYoY?: number;
  cityCount: number;
  suburbCount: number;
  propertyTypeBreakdown: PropertyTypeStats[];
}
```

#### CityStatistics

```typescript
interface CityStatistics {
  totalListings: number;
  avgSalePrice: number;
  avgRentPrice: number;
  avgPricePerSqm: number;
  avgDOM: number;
  priceGrowthYoY?: number;
  suburbCount: number;
  propertyTypeBreakdown: PropertyTypeStats[];
  demandScore?: number; // 0-100
}
```

#### SuburbStatistics

```typescript
interface SuburbStatistics {
  totalListings: number;
  avgSalePrice: number;
  avgRentPrice: number;
  avgPricePerSqm: number;
  avgDOM: number;
  priceGrowthYoY?: number;
  rentalYield?: number;
  propertyTypeBreakdown: PropertyTypeStats[];
  demandScore?: number;
  popularityRank?: number; // within city
}
```

#### PropertyTypeStats

```typescript
interface PropertyTypeStats {
  type: string; // 'house', 'apartment', 'townhouse', etc.
  count: number;
  avgPrice: number;
  avgRent?: number;
  percentageOfTotal: number;
}
```

### Supporting Models

#### Development

```typescript
interface Development {
  id: number;
  name: string;
  slug: string;
  location: string; // suburb/city
  provinceId: number;
  cityId?: number;
  suburbId?: number;
  priceRange: {
    min: number;
    max: number;
  };
  completionDate?: Date;
  unitCount?: number;
  images: string[];
  description: string;
}
```

#### Amenity

```typescript
interface Amenity {
  id: number;
  name: string;
  type: 'school' | 'transport' | 'shopping' | 'healthcare';
  distance?: number; // meters
  rating?: number;
  address?: string;
}
```

#### TrendingLocation

```typescript
interface TrendingLocation {
  locationId: number;
  locationType: 'city' | 'suburb';
  name: string;
  slug: string;
  trendScore: number; // calculated metric
  listingGrowth: number; // percentage
  viewGrowth: number; // percentage
  priceChange: number; // percentage
}
```



## API Endpoints and Data Fetching

### API Routes

#### 1. Province Data Endpoint

```
GET /api/location/province/:provinceSlug
```

**Response:**
```typescript
{
  province: Province;
  statistics: ProvinceStatistics;
  cities: City[];
  trendingSuburbs: TrendingLocation[];
  developments: Development[];
  propertyTypes: PropertyTypeStats[];
}
```

**Calculation Logic:**
- Query all listings where `province = :provinceSlug`
- Calculate `AVG(price)` for sale listings
- Calculate `AVG(rental_price)` for rental listings
- Calculate `AVG(price / size)` for price per m²
- Calculate `AVG(DATEDIFF(NOW(), created_at))` for DOM
- Group by property type for breakdown
- Fetch top 10 cities by listing count
- Calculate trending suburbs based on recent activity

#### 2. City Data Endpoint

```
GET /api/location/province/:provinceSlug/city/:citySlug
```

**Response:**
```typescript
{
  city: City;
  province: Province;
  statistics: CityStatistics;
  suburbs: Suburb[];
  developments: Development[];
  propertyTypes: PropertyTypeStats[];
  amenities: Amenity[];
  featuredListings: Listing[];
}
```

**Calculation Logic:**
- Query all listings where `city = :citySlug`
- Calculate same statistics as province level
- Fetch all suburbs within city
- Fetch top 6-12 featured listings (recent, high-quality)
- Fetch nearby amenities from external API or database

#### 3. Suburb Data Endpoint

```
GET /api/location/province/:provinceSlug/city/:citySlug/suburb/:suburbSlug
```

**Response:**
```typescript
{
  suburb: Suburb;
  city: City;
  province: Province;
  statistics: SuburbStatistics;
  propertyTypes: PropertyTypeStats[];
  featuredListings: Listing[];
  amenities: Amenity[];
  nearbySuburbs: Suburb[];
}
```

**Calculation Logic:**
- Query all listings where `suburb = :suburbSlug`
- Calculate statistics specific to suburb
- Calculate rental yield: `(avgRent * 12) / avgPrice * 100`
- Fetch 6-12 featured listings from suburb
- Fetch nearby suburbs (within same city)
- Fetch local amenities

#### 4. Trending Locations Endpoint

```
GET /api/location/trending?type=suburb&limit=10
```

**Response:**
```typescript
{
  trending: TrendingLocation[];
}
```

**Trending Calculation Algorithm:**
```typescript
function calculateTrendScore(location: Location): number {
  const weights = {
    listingGrowth: 0.3,    // 30% weight
    viewGrowth: 0.3,       // 30% weight
    priceGrowth: 0.2,      // 20% weight
    inquiryGrowth: 0.2     // 20% weight
  };
  
  // Compare last 30 days vs previous 30 days
  const listingGrowth = calculateGrowth(location, 'listings', 30);
  const viewGrowth = calculateGrowth(location, 'views', 30);
  const priceGrowth = calculateGrowth(location, 'avgPrice', 30);
  const inquiryGrowth = calculateGrowth(location, 'inquiries', 30);
  
  return (
    listingGrowth * weights.listingGrowth +
    viewGrowth * weights.viewGrowth +
    priceGrowth * weights.priceGrowth +
    inquiryGrowth * weights.inquiryGrowth
  );
}
```

### Caching Strategy

#### Redis Cache Structure

```typescript
// Cache keys
const CACHE_KEYS = {
  province: (slug: string) => `location:province:${slug}`,
  city: (provinceSlug: string, citySlug: string) => 
    `location:city:${provinceSlug}:${citySlug}`,
  suburb: (provinceSlug: string, citySlug: string, suburbSlug: string) => 
    `location:suburb:${provinceSlug}:${citySlug}:${suburbSlug}`,
  trending: 'location:trending'
};

// Cache TTL
const CACHE_TTL = {
  province: 3600,    // 1 hour
  city: 3600,        // 1 hour
  suburb: 1800,      // 30 minutes
  trending: 1800     // 30 minutes
};
```

#### Cache Invalidation

```typescript
// Invalidate on new listing
async function onNewListing(listing: Listing) {
  await redis.del(CACHE_KEYS.province(listing.province));
  await redis.del(CACHE_KEYS.city(listing.province, listing.city));
  await redis.del(CACHE_KEYS.suburb(listing.province, listing.city, listing.suburb));
  await redis.del(CACHE_KEYS.trending);
}

// Invalidate on listing update
async function onListingUpdate(listing: Listing) {
  // Same as onNewListing
}
```



## SEO Strategy

### Meta Tags Generation

#### Province Page Meta Tags

```typescript
function generateProvinceMeta(province: Province, stats: ProvinceStatistics): MetaTags {
  return {
    title: `${province.name} Properties for Sale & Rent | ${stats.totalListings} Listings`,
    description: `Explore ${stats.totalListings} properties in ${province.name}. Average price R${formatPrice(stats.avgSalePrice)}. Find houses, apartments & more in ${stats.cityCount} cities.`,
    canonical: `https://propertylistify.com/${province.slug}`,
    ogTitle: `${province.name} Real Estate - ${stats.totalListings} Properties`,
    ogDescription: `Discover properties across ${province.name}. ${stats.cityCount} cities, average price R${formatPrice(stats.avgSalePrice)}.`,
    ogImage: `/images/provinces/${province.slug}-hero.jpg`,
    twitterCard: 'summary_large_image'
  };
}
```

#### City Page Meta Tags

```typescript
function generateCityMeta(city: City, province: Province, stats: CityStatistics): MetaTags {
  return {
    title: `${city.name} Properties for Sale & Rent | ${stats.totalListings} Listings in ${province.name}`,
    description: `Find ${stats.totalListings} properties in ${city.name}, ${province.name}. Average price R${formatPrice(stats.avgSalePrice)}. Explore ${stats.suburbCount} suburbs.`,
    canonical: `https://propertylistify.com/${province.slug}/${city.slug}`,
    ogTitle: `${city.name} Real Estate - ${province.name}`,
    ogDescription: `${stats.totalListings} properties in ${city.name}. ${stats.suburbCount} suburbs to explore.`,
    ogImage: `/images/cities/${city.slug}-hero.jpg`,
    twitterCard: 'summary_large_image'
  };
}
```

#### Suburb Page Meta Tags

```typescript
function generateSuburbMeta(suburb: Suburb, city: City, province: Province, stats: SuburbStatistics): MetaTags {
  return {
    title: `${suburb.name} Properties for Sale & Rent | ${city.name}, ${province.name}`,
    description: `${stats.totalListings} properties in ${suburb.name}, ${city.name}. Average price R${formatPrice(stats.avgSalePrice)}. ${stats.rentalYield ? `Rental yield ${stats.rentalYield}%.` : ''}`,
    canonical: `https://propertylistify.com/${province.slug}/${city.slug}/${suburb.slug}`,
    ogTitle: `${suburb.name} Real Estate - ${city.name}`,
    ogDescription: `Explore ${stats.totalListings} properties in ${suburb.name}. Average price R${formatPrice(stats.avgSalePrice)}.`,
    ogImage: `/images/suburbs/${suburb.slug}-hero.jpg`,
    twitterCard: 'summary_large_image'
  };
}
```

### Schema Markup

#### Place Schema

```typescript
function generatePlaceSchema(location: Province | City | Suburb, type: string): object {
  return {
    "@context": "https://schema.org",
    "@type": "Place",
    "name": location.name,
    "description": location.description,
    "address": {
      "@type": "PostalAddress",
      "addressRegion": type === 'province' ? location.name : undefined,
      "addressLocality": type === 'city' || type === 'suburb' ? location.name : undefined,
      "addressCountry": "ZA"
    }
  };
}
```

#### BreadcrumbList Schema

```typescript
function generateBreadcrumbSchema(path: BreadcrumbItem[]): object {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": path.map((item, index) => ({
      "@type": "ListItem",
      "position": index + 1,
      "name": item.label,
      "item": `https://propertylistify.com${item.url}`
    }))
  };
}
```

#### Product Schema (for Featured Listings)

```typescript
function generateListingSchema(listing: Listing): object {
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    "name": listing.title,
    "description": listing.description,
    "image": listing.images[0],
    "offers": {
      "@type": "Offer",
      "price": listing.price,
      "priceCurrency": "ZAR",
      "availability": "https://schema.org/InStock"
    }
  };
}
```

### SEO Content Generation

#### Dynamic Content Templates

```typescript
function generateProvinceContent(province: Province, stats: ProvinceStatistics): string {
  return `
    Discover exceptional real estate opportunities across ${province.name}, 
    South Africa's ${getProvinceDescription(province.name)}. With ${stats.totalListings} 
    active property listings spanning ${stats.cityCount} cities and ${stats.suburbCount} 
    suburbs, ${province.name} offers diverse options for buyers, renters, and investors.
    
    The average property price in ${province.name} is R${formatPrice(stats.avgSalePrice)}, 
    with rental properties averaging R${formatPrice(stats.avgRentPrice)} per month. 
    ${stats.priceGrowthYoY ? `Property values have ${stats.priceGrowthYoY > 0 ? 'increased' : 'decreased'} 
    by ${Math.abs(stats.priceGrowthYoY)}% year-over-year.` : ''}
    
    Popular property types include ${formatPropertyTypes(stats.propertyTypeBreakdown)}. 
    Whether you're searching for a family home, investment property, or rental accommodation, 
    ${province.name} provides excellent opportunities across various price points and locations.
  `.trim();
}
```

### Heading Structure

All pages follow this H-tag hierarchy:
- **H1**: Location name (e.g., "Gauteng Properties", "Sandton Real Estate")
- **H2**: Major sections (Property Types, Market Insights, Popular Areas)
- **H3**: Subsections (Individual property types, specific statistics)



## Routing Structure

### URL Pattern Matching

```typescript
// Route definitions
const routes = [
  {
    path: '/:provinceSlug',
    component: ProvincePage,
    loader: provinceLoader
  },
  {
    path: '/:provinceSlug/:citySlug',
    component: CityPage,
    loader: cityLoader
  },
  {
    path: '/:provinceSlug/:citySlug/:suburbSlug',
    component: SuburbPage,
    loader: suburbLoader
  }
];

// Loader functions
async function provinceLoader({ params }: LoaderParams) {
  const data = await fetchProvinceData(params.provinceSlug);
  if (!data) throw new Response("Not Found", { status: 404 });
  return data;
}

async function cityLoader({ params }: LoaderParams) {
  const data = await fetchCityData(params.provinceSlug, params.citySlug);
  if (!data) throw new Response("Not Found", { status: 404 });
  return data;
}

async function suburbLoader({ params }: LoaderParams) {
  const data = await fetchSuburbData(
    params.provinceSlug,
    params.citySlug,
    params.suburbSlug
  );
  if (!data) throw new Response("Not Found", { status: 404 });
  return data;
}
```

### Navigation Links

#### Province to City

```typescript
// City card links
<Link to={`/${province.slug}/${city.slug}`}>
  {city.name}
</Link>
```

#### City to Suburb

```typescript
// Suburb card links
<Link to={`/${province.slug}/${city.slug}/${suburb.slug}`}>
  {suburb.name}
</Link>
```

#### Property Type to Search

```typescript
// Property type card links
<Link to={`/search?location=${suburb.slug}&type=${propertyType}`}>
  View {propertyType}s in {suburb.name}
</Link>
```

#### CTA to Search Results

```typescript
// Final CTA buttons
const ctaLinks = {
  houses: `/search?location=${location.slug}&type=house`,
  apartments: `/search?location=${location.slug}&type=apartment`,
  all: `/search?location=${location.slug}`
};
```

### Breadcrumb Navigation

```typescript
function generateBreadcrumbs(
  province?: Province,
  city?: City,
  suburb?: Suburb
): BreadcrumbItem[] {
  const crumbs: BreadcrumbItem[] = [
    { label: 'Home', url: '/' }
  ];
  
  if (province) {
    crumbs.push({
      label: province.name,
      url: `/${province.slug}`
    });
  }
  
  if (city) {
    crumbs.push({
      label: city.name,
      url: `/${province.slug}/${city.slug}`
    });
  }
  
  if (suburb) {
    crumbs.push({
      label: suburb.name,
      url: `/${province.slug}/${city.slug}/${suburb.slug}`
    });
  }
  
  return crumbs;
}
```



## Responsive Design Strategy

### Breakpoints

```typescript
const breakpoints = {
  mobile: '0px',      // 0-639px
  tablet: '640px',    // 640-1023px
  desktop: '1024px',  // 1024-1279px
  wide: '1280px'      // 1280px+
};
```

### Layout Adaptations

#### Mobile (< 640px)

- **Hero**: Full-width, stacked stats
- **Search Bar**: Simplified, expandable filters
- **Property Type Cards**: Horizontal scroll slider
- **Location Grid**: Single column
- **Trending Slider**: Full-width swipe
- **Developments**: Horizontal scroll
- **Market Insights**: Stacked charts
- **Featured Listings**: 1 column
- **CTAs**: Stacked buttons

#### Tablet (640px - 1023px)

- **Hero**: Full-width, inline stats
- **Search Bar**: Expanded filters visible
- **Property Type Cards**: 2 columns
- **Location Grid**: 2 columns
- **Trending Slider**: 2-3 items visible
- **Developments**: 2 columns
- **Market Insights**: Side-by-side charts
- **Featured Listings**: 2 columns
- **CTAs**: Inline buttons

#### Desktop (1024px+)

- **Hero**: Full-width, inline stats with background
- **Search Bar**: Full filters visible
- **Property Type Cards**: 4 columns
- **Location Grid**: 3-4 columns
- **Trending Slider**: 4-5 items visible
- **Developments**: 3 columns
- **Market Insights**: Multi-column layout with charts
- **Featured Listings**: 3-4 columns
- **CTAs**: Inline buttons with hover effects

### Touch Interactions

```typescript
// Swipe gesture support for sliders
interface SwipeConfig {
  threshold: number;  // minimum distance for swipe
  velocity: number;   // minimum speed
  preventScroll: boolean;
}

const swipeConfig: SwipeConfig = {
  threshold: 50,
  velocity: 0.3,
  preventScroll: true
};
```

### Performance Optimizations

#### Image Loading

```typescript
// Progressive image loading
<img
  src={thumbnail}
  data-src={fullImage}
  loading="lazy"
  alt={altText}
  className="progressive-image"
/>
```

#### Component Lazy Loading

```typescript
// Lazy load below-the-fold components
const MarketInsights = lazy(() => import('./MarketInsights'));
const FeaturedListings = lazy(() => import('./FeaturedListings'));
const AmenitiesSection = lazy(() => import('./AmenitiesSection'));
```

#### Infinite Scroll (for large grids)

```typescript
// Virtual scrolling for large location grids
<VirtualGrid
  items={suburbs}
  itemHeight={200}
  overscan={3}
  renderItem={(suburb) => <SuburbCard suburb={suburb} />}
/>
```



## Error Handling

### Missing Data Scenarios

#### No Listings in Location

```typescript
function handleNoListings(location: Location): PageData {
  return {
    ...location,
    statistics: getDefaultStatistics(),
    message: `No properties currently listed in ${location.name}. Check back soon or explore nearby areas.`,
    nearbyLocations: getNearbyLocations(location),
    showEmptyState: true
  };
}
```

#### Missing Statistics

```typescript
function handleMissingStats(location: Location): Statistics {
  return {
    totalListings: 0,
    avgSalePrice: null,
    avgRentPrice: null,
    avgPricePerSqm: null,
    avgDOM: null,
    message: 'Insufficient data for statistics'
  };
}
```

#### Invalid Location Slug

```typescript
async function validateLocation(slug: string, type: LocationType): Promise<Location | null> {
  const location = await db.query(
    `SELECT * FROM ${type}s WHERE slug = ?`,
    [slug]
  );
  
  if (!location) {
    // Log 404 for analytics
    logNotFound(slug, type);
    return null;
  }
  
  return location;
}
```

### Graceful Degradation

```typescript
// Component-level error boundaries
class LocationPageErrorBoundary extends React.Component {
  state = { hasError: false };
  
  static getDerivedStateFromError(error: Error) {
    return { hasError: true };
  }
  
  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    logError('LocationPage', error, errorInfo);
  }
  
  render() {
    if (this.state.hasError) {
      return <ErrorFallback message="Unable to load location data" />;
    }
    
    return this.props.children;
  }
}
```

### API Error Handling

```typescript
async function fetchWithRetry<T>(
  url: string,
  options: RequestOptions,
  retries: number = 3
): Promise<T> {
  try {
    const response = await fetch(url, options);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    if (retries > 0) {
      await delay(1000);
      return fetchWithRetry(url, options, retries - 1);
    }
    throw error;
  }
}
```



## Testing Strategy

### Unit Testing

Test individual components and utility functions:

```typescript
describe('generateProvinceMeta', () => {
  it('should generate correct meta tags for province', () => {
    const province = { name: 'Gauteng', slug: 'gauteng' };
    const stats = { totalListings: 1500, avgSalePrice: 2500000 };
    
    const meta = generateProvinceMeta(province, stats);
    
    expect(meta.title).toContain('Gauteng');
    expect(meta.title).toContain('1500 Listings');
    expect(meta.description).toContain('R2,500,000');
  });
});

describe('calculateTrendScore', () => {
  it('should calculate trend score correctly', () => {
    const location = {
      listingGrowth: 20,
      viewGrowth: 30,
      priceGrowth: 10,
      inquiryGrowth: 15
    };
    
    const score = calculateTrendScore(location);
    
    expect(score).toBeGreaterThan(0);
    expect(score).toBeLessThanOrEqual(100);
  });
});
```

### Integration Testing

Test API endpoints and data flow:

```typescript
describe('Province API', () => {
  it('should return province data with statistics', async () => {
    const response = await request(app)
      .get('/api/location/province/gauteng')
      .expect(200);
    
    expect(response.body).toHaveProperty('province');
    expect(response.body).toHaveProperty('statistics');
    expect(response.body.statistics).toHaveProperty('totalListings');
  });
  
  it('should return 404 for invalid province', async () => {
    await request(app)
      .get('/api/location/province/invalid')
      .expect(404);
  });
});
```

### End-to-End Testing

Test complete user flows:

```typescript
describe('Location Pages User Flow', () => {
  it('should navigate from province to city to suburb', async () => {
    // Visit province page
    await page.goto('/gauteng');
    await expect(page.locator('h1')).toContainText('Gauteng');
    
    // Click on city
    await page.click('text=Johannesburg');
    await expect(page).toHaveURL('/gauteng/johannesburg');
    
    // Click on suburb
    await page.click('text=Sandton');
    await expect(page).toHaveURL('/gauteng/johannesburg/sandton');
    
    // Click property type CTA
    await page.click('text=View Houses');
    await expect(page).toHaveURL(/\/search\?location=sandton&type=house/);
  });
});
```

### Performance Testing

```typescript
describe('Page Load Performance', () => {
  it('should load province page within 2 seconds', async () => {
    const startTime = Date.now();
    await page.goto('/gauteng');
    const loadTime = Date.now() - startTime;
    
    expect(loadTime).toBeLessThan(2000);
  });
  
  it('should have good Lighthouse scores', async () => {
    const result = await lighthouse('/gauteng/johannesburg/sandton');
    
    expect(result.lhr.categories.performance.score).toBeGreaterThan(0.9);
    expect(result.lhr.categories.seo.score).toBeGreaterThan(0.9);
  });
});
```

### SEO Testing

```typescript
describe('SEO Compliance', () => {
  it('should have proper meta tags', async () => {
    await page.goto('/gauteng');
    
    const title = await page.title();
    const description = await page.getAttribute('meta[name="description"]', 'content');
    const canonical = await page.getAttribute('link[rel="canonical"]', 'href');
    
    expect(title).toBeTruthy();
    expect(description).toBeTruthy();
    expect(canonical).toContain('/gauteng');
  });
  
  it('should have schema markup', async () => {
    await page.goto('/gauteng/johannesburg');
    
    const schema = await page.locator('script[type="application/ld+json"]').textContent();
    const parsed = JSON.parse(schema);
    
    expect(parsed['@type']).toBe('Place');
    expect(parsed.name).toBe('Johannesburg');
  });
});
```



## Page Wireframes

### Province Page Wireframe

```
┌─────────────────────────────────────────────────────────────┐
│                    HERO SECTION                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Gauteng Properties                                   │  │
│  │  1,500 Listings | Avg R2.5M | 12 Cities              │  │
│  │  [Search Bar with Filters]                           │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────────┐
│  Home > Gauteng                                             │
└─────────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────────┐
│  PROPERTY TYPE EXPLORER                                     │
│  ┌──────┐  ┌──────┐  ┌──────┐  ┌──────┐                  │
│  │Houses│  │Apts  │  │Towns │  │Villas│                  │
│  │ 450  │  │ 600  │  │ 300  │  │ 150  │                  │
│  │R2.8M │  │R1.5M │  │R2.1M │  │R4.5M │                  │
│  └──────┘  └──────┘  └──────┘  └──────┘                  │
└─────────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────────┐
│  POPULAR CITIES                                             │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐                │
│  │Joburg    │  │Pretoria  │  │Centurion │                │
│  │800 props │  │450 props │  │250 props │                │
│  │Avg R2.5M │  │Avg R2.2M │  │Avg R2.8M │                │
│  └──────────┘  └──────────┘  └──────────┘                │
└─────────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────────┐
│  TRENDING SUBURBS                                           │
│  ← [Sandton] [Fourways] [Rosebank] [Midrand] →            │
└─────────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────────┐
│  NEW DEVELOPMENTS                                           │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐                │
│  │Dev Name  │  │Dev Name  │  │Dev Name  │                │
│  │Location  │  │Location  │  │Location  │                │
│  │R1.5M-3M  │  │R2M-4M    │  │R1.8M-3.5M│                │
│  └──────────┘  └──────────┘  └──────────┘                │
└─────────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────────┐
│  MARKET INSIGHTS                                            │
│  ┌────────────────┐  ┌────────────────┐                   │
│  │ Price Trends   │  │ Property Types │                   │
│  │ [Chart]        │  │ [Pie Chart]    │                   │
│  └────────────────┘  └────────────────┘                   │
│  Avg Sale: R2.5M | Avg Rent: R15K | Growth: +5.2%         │
└─────────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────────┐
│  SEO CONTENT (200-300 words)                                │
│  Discover exceptional real estate opportunities...          │
└─────────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────────┐
│  FINAL CTAs                                                 │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐      │
│  │Search Houses │ │Search Apts   │ │All Properties│      │
│  └──────────────┘ └──────────────┘ └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
```

### City Page Wireframe

```
┌─────────────────────────────────────────────────────────────┐
│                    HERO SECTION                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Johannesburg, Gauteng                                │  │
│  │  800 Listings | Avg R2.5M | 45 Suburbs               │  │
│  │  [Search Bar with Filters]                           │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────────┐
│  Home > Gauteng > Johannesburg                              │
└─────────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────────┐
│  PROPERTY TYPE FILTERS                                      │
│  [Houses] [Apartments] [Townhouses] [Villas]               │
└─────────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────────┐
│  POPULAR SUBURBS                                            │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  │
│  │Sandton   │  │Rosebank  │  │Fourways  │  │Midrand   │  │
│  │150 props │  │80 props  │  │120 props │  │90 props  │  │
│  │Avg R4.5M │  │Avg R3.2M │  │Avg R3.8M │  │Avg R2.8M │  │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘  │
└─────────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────────┐
│  NEW DEVELOPMENTS                                           │
│  ← [Dev 1] [Dev 2] [Dev 3] [Dev 4] →                      │
└─────────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────────┐
│  MARKET INSIGHTS                                            │
│  Price Trends | Rental Yield | Time on Market              │
│  [Charts and Statistics]                                    │
└─────────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────────┐
│  LIFESTYLE & AMENITIES                                      │
│  Schools | Transport | Shopping | Healthcare                │
└─────────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────────┐
│  FEATURED PROPERTIES                                        │
│  ┌──────┐  ┌──────┐  ┌──────┐  ┌──────┐                  │
│  │Prop 1│  │Prop 2│  │Prop 3│  │Prop 4│                  │
│  └──────┘  └──────┘  └──────┘  └──────┘                  │
└─────────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────────┐
│  SEO CONTENT (300-500 words)                                │
└─────────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────────┐
│  FINAL CTAs                                                 │
└─────────────────────────────────────────────────────────────┘
```

### Suburb Page Wireframe

```
┌─────────────────────────────────────────────────────────────┐
│                    HERO SECTION                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Sandton, Johannesburg, Gauteng                       │  │
│  │  150 Listings | Avg R4.5M | Rental Yield 6.2%        │  │
│  │  [Search Bar with Filters]                           │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────────┐
│  Home > Gauteng > Johannesburg > Sandton                    │
└─────────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────────┐
│  PROPERTY TYPE FILTERS                                      │
│  [Houses: 60] [Apartments: 70] [Townhouses: 20]            │
└─────────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────────┐
│  FEATURED PROPERTIES                                        │
│  ┌──────┐  ┌──────┐  ┌──────┐                            │
│  │Prop 1│  │Prop 2│  │Prop 3│                            │
│  │R4.5M │  │R5.2M │  │R3.8M │                            │
│  │3 bed │  │4 bed │  │2 bed │                            │
│  └──────┘  └──────┘  └──────┘                            │
│  ┌──────┐  ┌──────┐  ┌──────┐                            │
│  │Prop 4│  │Prop 5│  │Prop 6│                            │
│  └──────┘  └──────┘  └──────┘                            │
└─────────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────────┐
│  MARKET INSIGHTS                                            │
│  Avg House: R5.2M | Avg Apt: R3.8M | DOM: 45 days         │
│  Price Growth: +8.5% YoY | Rental Yield: 6.2%             │
└─────────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────────┐
│  SCHOOLS & AMENITIES                                        │
│  Top Schools | Shopping Centers | Transport                 │
└─────────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────────┐
│  NEARBY SUBURBS                                             │
│  [Rosebank] [Fourways] [Midrand]                           │
└─────────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────────┐
│  SEO CONTENT (150-250 words)                                │
└─────────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────────┐
│  FINAL CTAs                                                 │
└─────────────────────────────────────────────────────────────┘
```



## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Location Page Data Completeness

*For any* valid location (province, city, or suburb), when the page loads, all required data fields (name, statistics, listing count) should be present and non-null.
**Validates: Requirements 1.1, 2.1, 3.1**

### Property 2: Hierarchical Data Consistency

*For any* city displayed on a province page, that city should belong to the specified province, and for any suburb displayed on a city page, that suburb should belong to the specified city.
**Validates: Requirements 1.2, 2.3**

### Property 3: Property Type Count Invariant

*For any* location page, the sum of all property type counts should equal the total listing count for that location.
**Validates: Requirements 1.3**

### Property 4: Trending Score Calculation

*For any* location with sufficient data, the trending score should be calculated according to the defined formula: (listingGrowth * 0.3) + (viewGrowth * 0.3) + (priceGrowth * 0.2) + (inquiryGrowth * 0.2).
**Validates: Requirements 1.4**

### Property 5: Statistics Calculation Accuracy

*For any* location, the average sale price should equal the mean of all sale listing prices in that location, and average rent should equal the mean of all rental listing prices.
**Validates: Requirements 1.5, 5.1, 13.2**

### Property 6: Search URL Construction

*For any* property type card or CTA button, the generated search URL should include the correct location parameter and property type filter.
**Validates: Requirements 2.2, 3.2, 4.4, 4.5**

### Property 7: Featured Listings Boundary

*For any* suburb page, the number of featured listings displayed should be between 6 and 12 (or the total available if less than 6).
**Validates: Requirements 3.3**

### Property 8: Rental Yield Formula

*For any* suburb with both sale and rental listings, the rental yield should be calculated as: (avgMonthlyRent * 12) / avgSalePrice * 100.
**Validates: Requirements 3.4, 5.4**

### Property 9: Breadcrumb Hierarchy

*For any* location page, the breadcrumb trail should correctly reflect the full hierarchy from Home → Province → City → Suburb (depending on page level).
**Validates: Requirements 4.1**

### Property 10: Navigation Link Validity

*For any* location card (city or suburb), the navigation link should be a valid URL matching the pattern /{province-slug}/{city-slug} or /{province-slug}/{city-slug}/{suburb-slug}.
**Validates: Requirements 4.2, 4.3**

### Property 11: Time on Market Calculation

*For any* location, the average days on market should equal the mean of (current_date - listing_created_date) for all active listings in that location.
**Validates: Requirements 5.3**

### Property 12: SEO Heading Structure

*For any* location page, there should be exactly one H1 element containing the location name, and all H2 elements should be nested under the H1.
**Validates: Requirements 9.1**

### Property 13: SEO Content Word Count

*For any* location page, the SEO text content should contain between 150-500 words, with province pages at 200-300, city pages at 300-500, and suburb pages at 150-250.
**Validates: Requirements 9.2**

### Property 14: Meta Tag Completeness

*For any* location page, the following meta tags should be present and non-empty: title, description, canonical, og:title, og:description, og:image.
**Validates: Requirements 9.3, 9.5**

### Property 15: Schema Markup Validity

*For any* location page, the JSON-LD schema markup should be valid JSON and include @context and @type fields for Place and BreadcrumbList.
**Validates: Requirements 9.4**

### Property 16: Dynamic Data Freshness

*For any* location page loaded at time T1 and again at time T2 (after new listings added), the listing count at T2 should reflect the new listings without code deployment.
**Validates: Requirements 13.1, 13.5**

### Property 17: Development Location Filtering

*For any* location page, all displayed developments should have their location (provinceId, cityId, or suburbId) matching the current page's location.
**Validates: Requirements 13.4**

### Property 18: Cache Invalidation Consistency

*For any* new listing added to location L, the cached data for location L should be invalidated, ensuring the next page load reflects the new listing.
**Validates: Requirements 13.5**

