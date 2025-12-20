# Design Document: Property Results Page Optimization

## Overview

This design document outlines the technical architecture and implementation approach for optimizing the property search results page for the South African market. The optimization focuses on performance improvements, enhanced user experience, and South African-specific features while maintaining the existing design language and ensuring scalability.

The solution will transform the current results page into a high-performance, mobile-first interface that handles large datasets efficiently, provides intuitive filtering and sorting, and integrates South African property market requirements such as Sectional Title/Freehold indicators, levy information, and load-shedding solutions.

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Client Layer (React)                     │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │ Results Page │  │ Filter Panel │  │  Map View    │     │
│  │  Component   │  │  Component   │  │  Component   │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
│         │                  │                  │             │
│         └──────────────────┴──────────────────┘             │
│                           │                                 │
│                  ┌────────▼────────┐                       │
│                  │  State Manager  │                       │
│                  │   (Zustand)     │                       │
│                  └────────┬────────┘                       │
│                           │                                 │
│                  ┌────────▼────────┐                       │
│                  │  React Query    │                       │
│                  │  (Data Fetching)│                       │
│                  └────────┬────────┘                       │
└───────────────────────────┼─────────────────────────────────┘
                            │
                   ┌────────▼────────┐
                   │   tRPC Layer    │
                   └────────┬────────┘
┌───────────────────────────┼─────────────────────────────────┐
│                    Server Layer (Express)                    │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │   Property   │  │    Filter    │  │  Analytics   │     │
│  │   Service    │  │   Service    │  │   Service    │     │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘     │
│         │                  │                  │             │
│         └──────────────────┴──────────────────┘             │
│                           │                                 │
│                  ┌────────▼────────┐                       │
│                  │  Redis Cache    │                       │
│                  └────────┬────────┘                       │
│                           │                                 │
│                  ┌────────▼────────┐                       │
│                  │   Database      │                       │
│                  │   (PostgreSQL)  │                       │
│                  └─────────────────┘                       │
└─────────────────────────────────────────────────────────────┘
```

### Component Architecture

The results page will be decomposed into focused, reusable components:

1. **PropertyResultsPage** - Main container component
2. **FilterPanel** - Desktop sidebar and mobile bottom sheet
3. **QuickFilters** - Preset filter chips
4. **PropertyGrid** - Virtualized list/grid of property cards
5. **PropertyCard** - Individual property display
6. **SortControls** - Sort dropdown and view mode toggles
7. **PaginationControls** - Page navigation
8. **ResultsHeader** - Count display and active filters
9. **MapView** - Google Maps integration with property markers
10. **SavedSearchManager** - Saved search CRUD operations
11. **ComparisonBar** - Floating comparison tool

## Components and Interfaces

### Core Interfaces

```typescript
// Property data structure with SA-specific fields
interface Property {
  id: string;
  title: string;
  price: number;
  suburb: string;
  city: string;
  province: string;
  propertyType: 'house' | 'apartment' | 'townhouse' | 'plot' | 'commercial';
  listingType: 'sale' | 'rent';
  bedrooms?: number;
  bathrooms?: number;
  erfSize?: number; // in m²
  floorSize?: number; // in m²
  
  // SA-specific fields
  titleType: 'freehold' | 'sectional';
  levy?: number; // monthly levy for sectional title
  rates?: number; // monthly rates estimate
  securityEstate: boolean;
  petFriendly: boolean;
  fibreReady: boolean;
  
  // Load-shedding solutions
  loadSheddingSolutions: Array<'solar' | 'generator' | 'inverter' | 'none'>;
  
  // Media
  images: ImageUrls[];
  videoCount: number;
  
  // Status
  status: 'available' | 'under_offer' | 'sold' | 'let';
  listedDate: Date;
  
  // Agent info
  agent: {
    id: string;
    name: string;
    agency: string;
    phone: string;
    whatsapp: string;
    email: string;
    image?: string;
  };
  
  // Location
  latitude: number;
  longitude: number;
  
  // Highlights
  highlights: string[];
}

// Filter state
interface PropertyFilters {
  // Location
  province?: string;
  city?: string;
  suburb?: string[];
  
  // Basic filters
  propertyType?: Property['propertyType'][];
  listingType?: Property['listingType'];
  minPrice?: number;
  maxPrice?: number;
  minBedrooms?: number;
  maxBedrooms?: number;
  minBathrooms?: number;
  
  // Size filters
  minErfSize?: number;
  maxErfSize?: number;
  minFloorSize?: number;
  maxFloorSize?: number;
  
  // SA-specific filters
  titleType?: Property['titleType'][];
  maxLevy?: number;
  securityEstate?: boolean;
  petFriendly?: boolean;
  fibreReady?: boolean;
  loadSheddingSolutions?: Property['loadSheddingSolutions'];
  
  // Status
  status?: Property['status'][];
  
  // Map bounds
  bounds?: {
    north: number;
    south: number;
    east: number;
    west: number;
  };
}

// Sort options
type SortOption = 
  | 'price_asc'
  | 'price_desc'
  | 'date_desc'
  | 'date_asc'
  | 'suburb_asc'
  | 'suburb_desc';

// View mode
type ViewMode = 'list' | 'grid' | 'map';

// Search results
interface SearchResults {
  properties: Property[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

// Saved search
interface SavedSearch {
  id: string;
  userId: string;
  name: string;
  filters: PropertyFilters;
  notificationMethod: 'email' | 'whatsapp' | 'both' | 'none';
  notificationFrequency: 'instant' | 'daily' | 'weekly';
  createdAt: Date;
  lastNotified?: Date;
}
```

### Component Props

```typescript
// PropertyResultsPage
interface PropertyResultsPageProps {
  initialFilters?: PropertyFilters;
  initialViewMode?: ViewMode;
}

// FilterPanel
interface FilterPanelProps {
  filters: PropertyFilters;
  onFilterChange: (filters: PropertyFilters) => void;
  onSaveSearch: () => void;
  resultCount: number;
  isOpen: boolean; // for mobile
  onClose: () => void; // for mobile
}

// PropertyCard
interface PropertyCardProps {
  property: Property;
  viewMode: 'list' | 'grid';
  onFavorite: (id: string) => void;
  onCompare: (id: string) => void;
  onContact: (id: string) => void;
  isFavorited: boolean;
  isComparing: boolean;
}

// QuickFilters
interface QuickFiltersProps {
  onFilterSelect: (filters: PropertyFilters) => void;
  activeFilters: PropertyFilters;
}

// PaginationControls
interface PaginationControlsProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  totalResults: number;
  pageSize: number;
}
```

## Data Models

### Database Schema Extensions

```sql
-- Add SA-specific columns to properties table
ALTER TABLE properties ADD COLUMN IF NOT EXISTS title_type VARCHAR(20) DEFAULT 'freehold';
ALTER TABLE properties ADD COLUMN IF NOT EXISTS levy DECIMAL(10,2);
ALTER TABLE properties ADD COLUMN IF NOT EXISTS rates_estimate DECIMAL(10,2);
ALTER TABLE properties ADD COLUMN IF NOT EXISTS security_estate BOOLEAN DEFAULT false;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS pet_friendly BOOLEAN DEFAULT false;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS fibre_ready BOOLEAN DEFAULT false;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS load_shedding_solutions JSONB DEFAULT '[]';
ALTER TABLE properties ADD COLUMN IF NOT EXISTS erf_size DECIMAL(10,2);
ALTER TABLE properties ADD COLUMN IF NOT EXISTS floor_size DECIMAL(10,2);

-- Create indexes for common filter queries
CREATE INDEX IF NOT EXISTS idx_properties_title_type ON properties(title_type);
CREATE INDEX IF NOT EXISTS idx_properties_security_estate ON properties(security_estate);
CREATE INDEX IF NOT EXISTS idx_properties_pet_friendly ON properties(pet_friendly);
CREATE INDEX IF NOT EXISTS idx_properties_fibre_ready ON properties(fibre_ready);
CREATE INDEX IF NOT EXISTS idx_properties_suburb ON properties(suburb);
CREATE INDEX IF NOT EXISTS idx_properties_price ON properties(price);
CREATE INDEX IF NOT EXISTS idx_properties_status ON properties(status);
CREATE INDEX IF NOT EXISTS idx_properties_listed_date ON properties(listed_date DESC);

-- Composite indexes for common filter combinations
CREATE INDEX IF NOT EXISTS idx_properties_location_type 
  ON properties(city, property_type, listing_type, status);
CREATE INDEX IF NOT EXISTS idx_properties_price_beds 
  ON properties(price, bedrooms, status);

-- Saved searches table
CREATE TABLE IF NOT EXISTS saved_searches (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  filters JSONB NOT NULL,
  notification_method VARCHAR(20) DEFAULT 'email',
  notification_frequency VARCHAR(20) DEFAULT 'weekly',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_notified TIMESTAMP,
  is_active BOOLEAN DEFAULT true
);

CREATE INDEX IF NOT EXISTS idx_saved_searches_user ON saved_searches(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_searches_active ON saved_searches(is_active);

-- Search analytics table
CREATE TABLE IF NOT EXISTS search_analytics (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  session_id VARCHAR(255),
  filters JSONB NOT NULL,
  result_count INTEGER,
  sort_order VARCHAR(50),
  view_mode VARCHAR(20),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_search_analytics_created ON search_analytics(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_search_analytics_user ON search_analytics(user_id);

-- Property click tracking
CREATE TABLE IF NOT EXISTS property_clicks (
  id SERIAL PRIMARY KEY,
  property_id INTEGER REFERENCES properties(id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  session_id VARCHAR(255),
  position INTEGER, -- position in search results
  search_filters JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_property_clicks_property ON property_clicks(property_id);
CREATE INDEX IF NOT EXISTS idx_property_clicks_created ON property_clicks(created_at DESC);
```

### Redis Cache Structure

```typescript
// Cache keys
const CACHE_KEYS = {
  SEARCH_RESULTS: (filters: string, page: number) => 
    `search:${filters}:page:${page}`,
  PROPERTY_DETAIL: (id: string) => 
    `property:${id}`,
  FILTER_COUNTS: (filters: string) => 
    `filter_counts:${filters}`,
  TRENDING_SUBURBS: (city: string) => 
    `trending:${city}`,
  POPULAR_FILTERS: 'popular_filters',
};

// Cache TTLs (in seconds)
const CACHE_TTL = {
  SEARCH_RESULTS: 300, // 5 minutes
  PROPERTY_DETAIL: 600, // 10 minutes
  FILTER_COUNTS: 180, // 3 minutes
  TRENDING_SUBURBS: 3600, // 1 hour
  POPULAR_FILTERS: 7200, // 2 hours
};
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

