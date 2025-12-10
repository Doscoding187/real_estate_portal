# Database Schema Documentation

## Overview

This document provides comprehensive documentation for the database schema used in the Google Places Autocomplete Integration. The schema supports hierarchical location data, market analytics, and SEO-optimized location pages.

## Table of Contents

1. [Schema Overview](#schema-overview)
2. [Core Tables](#core-tables)
3. [Relationships](#relationships)
4. [Indexes](#indexes)
5. [Migrations](#migrations)
6. [Query Examples](#query-examples)

---

## Schema Overview

### Entity Relationship Diagram

```
┌─────────────────┐
│    locations    │
│  (hierarchical) │
└────────┬────────┘
         │ parent_id (self-referencing)
         │
         ├─────────────────────────────────┐
         │                                 │
         ↓                                 ↓
┌─────────────────┐              ┌─────────────────┐
│    listings     │              │  developments   │
│  (properties)   │              │   (projects)    │
└─────────────────┘              └─────────────────┘
         │                                 │
         │ location_id                     │ location_id
         │                                 │
         └─────────────┬───────────────────┘
                       │
                       ↓
              ┌─────────────────┐
              │location_searches│
              │  (tracking)     │
              └─────────────────┘
```

### Design Principles

1. **Hierarchical Structure**: Locations use self-referencing parent_id for hierarchy
2. **Referential Integrity**: Foreign keys ensure data consistency
3. **Performance**: Strategic indexes for fast queries
4. **Backward Compatibility**: Legacy fields maintained during migration
5. **SEO Optimization**: Static content fields for search engine ranking

---

## Core Tables

### locations

Stores hierarchical location data with SEO content.

```sql
CREATE TABLE locations (
  -- Primary key
  id SERIAL PRIMARY KEY,
  
  -- Basic information
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) NOT NULL,
  type VARCHAR(50) NOT NULL, -- 'country', 'province', 'city', 'suburb'
  
  -- Hierarchy
  parent_id INTEGER REFERENCES locations(id) ON DELETE RESTRICT,
  
  -- Google Places integration
  place_id VARCHAR(255) UNIQUE,
  
  -- Geographic data
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  viewport_ne_lat DECIMAL(10, 8),
  viewport_ne_lng DECIMAL(11, 8),
  viewport_sw_lat DECIMAL(10, 8),
  viewport_sw_lng DECIMAL(11, 8),
  
  -- SEO content (static)
  description TEXT,
  hero_image VARCHAR(500),
  seo_title VARCHAR(255),
  seo_description TEXT,
  
  -- Metadata
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  -- Constraints
  UNIQUE(slug, parent_id),
  CHECK (type IN ('country', 'province', 'city', 'suburb')),
  CHECK (latitude BETWEEN -90 AND 90),
  CHECK (longitude BETWEEN -180 AND 180)
);
```

**Field Descriptions:**

| Field | Type | Description |
|-------|------|-------------|
| `id` | INTEGER | Primary key |
| `name` | VARCHAR(255) | Location name (e.g., "Sandton") |
| `slug` | VARCHAR(255) | URL-friendly slug (e.g., "sandton") |
| `type` | VARCHAR(50) | Location type: country, province, city, suburb |
| `parent_id` | INTEGER | Reference to parent location (NULL for country) |
| `place_id` | VARCHAR(255) | Google Place ID (unique identifier) |
| `latitude` | DECIMAL(10,8) | Latitude coordinate |
| `longitude` | DECIMAL(11,8) | Longitude coordinate |
| `viewport_*` | DECIMAL | Bounding box for map display |
| `description` | TEXT | SEO-optimized description (700-1200 words) |
| `hero_image` | VARCHAR(500) | Hero image URL |
| `seo_title` | VARCHAR(255) | Page title for SEO |
| `seo_description` | TEXT | Meta description for SEO |
| `created_at` | TIMESTAMP | Record creation timestamp |
| `updated_at` | TIMESTAMP | Last update timestamp |

**Example Data:**

```sql
-- Country
INSERT INTO locations (name, slug, type, parent_id, place_id, latitude, longitude)
VALUES ('South Africa', 'south-africa', 'country', NULL, 'ChIJ...', -30.5595, 22.9375);

-- Province
INSERT INTO locations (name, slug, type, parent_id, place_id, latitude, longitude)
VALUES ('Gauteng', 'gauteng', 'province', 1, 'ChIJ...', -26.2708, 28.1123);

-- City
INSERT INTO locations (name, slug, type, parent_id, place_id, latitude, longitude)
VALUES ('Johannesburg', 'johannesburg', 'city', 2, 'ChIJ...', -26.2041, 28.0473);

-- Suburb
INSERT INTO locations (name, slug, type, parent_id, place_id, latitude, longitude)
VALUES ('Sandton', 'sandton', 'suburb', 3, 'ChIJ...', -26.1076, 28.0567);
```

---

### location_searches

Tracks location search events for trending analysis.

```sql
CREATE TABLE location_searches (
  -- Primary key
  id SERIAL PRIMARY KEY,
  
  -- Foreign keys
  location_id INTEGER NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  
  -- Metadata
  searched_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- Indexes
  INDEX idx_location_searched (location_id, searched_at DESC),
  INDEX idx_user_id (user_id)
);
```

**Field Descriptions:**

| Field | Type | Description |
|-------|------|-------------|
| `id` | INTEGER | Primary key |
| `location_id` | INTEGER | Reference to location searched |
| `user_id` | INTEGER | User who performed search (NULL for anonymous) |
| `searched_at` | TIMESTAMP | When the search occurred |

**Usage:**

This table powers:
- Trending suburbs calculation
- Search popularity ranking
- User search history
- Market interest analytics

---

### recent_searches

Stores user's recent location searches.

```sql
CREATE TABLE recent_searches (
  -- Primary key
  id SERIAL PRIMARY KEY,
  
  -- Foreign keys
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  location_id INTEGER NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
  
  -- Metadata
  searched_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- Constraints
  UNIQUE(user_id, location_id),
  
  -- Indexes
  INDEX idx_user_recent (user_id, searched_at DESC)
);
```

**Field Descriptions:**

| Field | Type | Description |
|-------|------|-------------|
| `id` | INTEGER | Primary key |
| `user_id` | INTEGER | User who performed search |
| `location_id` | INTEGER | Location that was searched |
| `searched_at` | TIMESTAMP | When the search occurred |

**Usage:**

- Display recent searches in autocomplete dropdown
- Limit to 5 most recent per user
- Unique constraint prevents duplicates

---

### listings (Enhanced)

Existing listings table with location_id foreign key added.

```sql
ALTER TABLE listings ADD COLUMN location_id INTEGER REFERENCES locations(id);
ALTER TABLE listings ADD INDEX idx_location_id (location_id);
ALTER TABLE listings ADD INDEX idx_location_status (location_id, status);

-- Keep existing fields for backward compatibility:
-- province VARCHAR(100)
-- city VARCHAR(100)
-- suburb VARCHAR(100)
-- place_id VARCHAR(255)
-- latitude DECIMAL(10, 8)
-- longitude DECIMAL(11, 8)
```

**New Fields:**

| Field | Type | Description |
|-------|------|-------------|
| `location_id` | INTEGER | Reference to locations table |

**Migration Strategy:**

```sql
-- Populate location_id from existing data
UPDATE listings l
SET location_id = (
  SELECT id FROM locations loc
  WHERE loc.place_id = l.place_id
  LIMIT 1
)
WHERE l.location_id IS NULL AND l.place_id IS NOT NULL;
```

---

### developments (Enhanced)

Existing developments table with location_id foreign key added.

```sql
ALTER TABLE developments ADD COLUMN location_id INTEGER REFERENCES locations(id);
ALTER TABLE developments ADD INDEX idx_location_id (location_id);
```

**New Fields:**

| Field | Type | Description |
|-------|------|-------------|
| `location_id` | INTEGER | Reference to locations table |

---

## Relationships

### Hierarchical Location Relationships

```sql
-- Get all children of a location
SELECT * FROM locations
WHERE parent_id = ?;

-- Get full hierarchy path for a location
WITH RECURSIVE location_path AS (
  SELECT id, name, slug, type, parent_id, 1 as level
  FROM locations
  WHERE id = ?
  
  UNION ALL
  
  SELECT l.id, l.name, l.slug, l.type, l.parent_id, lp.level + 1
  FROM locations l
  INNER JOIN location_path lp ON l.id = lp.parent_id
)
SELECT * FROM location_path
ORDER BY level DESC;

-- Get all descendants of a location
WITH RECURSIVE location_tree AS (
  SELECT id, name, slug, type, parent_id
  FROM locations
  WHERE id = ?
  
  UNION ALL
  
  SELECT l.id, l.name, l.slug, l.type, l.parent_id
  FROM locations l
  INNER JOIN location_tree lt ON l.parent_id = lt.id
)
SELECT * FROM location_tree;
```

### Location to Listings Relationship

```sql
-- Get all listings in a location
SELECT l.*
FROM listings l
WHERE l.location_id = ?
  AND l.status = 'active';

-- Get all listings in a location and its descendants
WITH RECURSIVE location_tree AS (
  SELECT id FROM locations WHERE id = ?
  UNION ALL
  SELECT l.id FROM locations l
  INNER JOIN location_tree lt ON l.parent_id = lt.id
)
SELECT l.*
FROM listings l
WHERE l.location_id IN (SELECT id FROM location_tree)
  AND l.status = 'active';
```

### Location Search Tracking

```sql
-- Track a search
INSERT INTO location_searches (location_id, user_id)
VALUES (?, ?);

-- Get trending suburbs (last 30 days)
SELECT 
  l.id,
  l.name,
  l.slug,
  COUNT(ls.id) as search_count,
  COUNT(DISTINCT ls.user_id) as unique_users
FROM locations l
INNER JOIN location_searches ls ON l.id = ls.location_id
WHERE ls.searched_at >= NOW() - INTERVAL 30 DAY
  AND l.type = 'suburb'
GROUP BY l.id, l.name, l.slug
ORDER BY search_count DESC
LIMIT 10;
```

---

## Indexes

### Performance Indexes

```sql
-- Location lookups
CREATE INDEX idx_locations_slug ON locations(slug);
CREATE INDEX idx_locations_slug_parent ON locations(slug, parent_id);
CREATE INDEX idx_locations_place_id ON locations(place_id);
CREATE INDEX idx_locations_type ON locations(type);
CREATE INDEX idx_locations_parent_id ON locations(parent_id);

-- Listing associations
CREATE INDEX idx_listings_location_id ON listings(location_id);
CREATE INDEX idx_listings_location_status ON listings(location_id, status);
CREATE INDEX idx_listings_location_type ON listings(location_id, listing_type);

-- Development associations
CREATE INDEX idx_developments_location_id ON developments(location_id);

-- Search tracking
CREATE INDEX idx_location_searches_location_time ON location_searches(location_id, searched_at DESC);
CREATE INDEX idx_location_searches_user_id ON location_searches(user_id);

-- Recent searches
CREATE INDEX idx_recent_searches_user_time ON recent_searches(user_id, searched_at DESC);
```

### Index Usage Examples

```sql
-- Fast slug lookup (uses idx_locations_slug_parent)
SELECT * FROM locations
WHERE slug = 'sandton' AND parent_id = 123;

-- Fast place_id lookup (uses idx_locations_place_id)
SELECT * FROM locations
WHERE place_id = 'ChIJ...';

-- Fast listing count (uses idx_listings_location_status)
SELECT COUNT(*) FROM listings
WHERE location_id = 456 AND status = 'active';

-- Fast trending calculation (uses idx_location_searches_location_time)
SELECT location_id, COUNT(*) as search_count
FROM location_searches
WHERE searched_at >= NOW() - INTERVAL 30 DAY
GROUP BY location_id
ORDER BY search_count DESC;
```

---

## Migrations

### Migration Order

1. Create locations table
2. Create location_searches table
3. Create recent_searches table
4. Add location_id to listings table
5. Add location_id to developments table
6. Create indexes
7. Populate locations from existing data
8. Populate location_id in listings
9. Populate location_id in developments

### Migration Scripts

#### 1. Create locations table

```sql
-- File: migrations/001_create_locations_table.sql

CREATE TABLE locations (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) NOT NULL,
  type VARCHAR(50) NOT NULL,
  parent_id INTEGER REFERENCES locations(id) ON DELETE RESTRICT,
  place_id VARCHAR(255) UNIQUE,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  viewport_ne_lat DECIMAL(10, 8),
  viewport_ne_lng DECIMAL(11, 8),
  viewport_sw_lat DECIMAL(10, 8),
  viewport_sw_lng DECIMAL(11, 8),
  description TEXT,
  hero_image VARCHAR(500),
  seo_title VARCHAR(255),
  seo_description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE(slug, parent_id),
  CHECK (type IN ('country', 'province', 'city', 'suburb')),
  CHECK (latitude BETWEEN -90 AND 90),
  CHECK (longitude BETWEEN -180 AND 180)
);
```

#### 2. Create tracking tables

```sql
-- File: migrations/002_create_tracking_tables.sql

CREATE TABLE location_searches (
  id SERIAL PRIMARY KEY,
  location_id INTEGER NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  searched_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE recent_searches (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  location_id INTEGER NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
  searched_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, location_id)
);
```

#### 3. Add location_id to listings

```sql
-- File: migrations/003_add_location_id_to_listings.sql

ALTER TABLE listings 
ADD COLUMN location_id INTEGER REFERENCES locations(id);
```

#### 4. Add location_id to developments

```sql
-- File: migrations/004_add_location_id_to_developments.sql

ALTER TABLE developments 
ADD COLUMN location_id INTEGER REFERENCES locations(id);
```

#### 5. Create indexes

```sql
-- File: migrations/005_create_indexes.sql

-- Location indexes
CREATE INDEX idx_locations_slug ON locations(slug);
CREATE INDEX idx_locations_slug_parent ON locations(slug, parent_id);
CREATE INDEX idx_locations_place_id ON locations(place_id);
CREATE INDEX idx_locations_type ON locations(type);
CREATE INDEX idx_locations_parent_id ON locations(parent_id);

-- Listing indexes
CREATE INDEX idx_listings_location_id ON listings(location_id);
CREATE INDEX idx_listings_location_status ON listings(location_id, status);

-- Development indexes
CREATE INDEX idx_developments_location_id ON developments(location_id);

-- Search tracking indexes
CREATE INDEX idx_location_searches_location_time ON location_searches(location_id, searched_at DESC);
CREATE INDEX idx_location_searches_user_id ON location_searches(user_id);
CREATE INDEX idx_recent_searches_user_time ON recent_searches(user_id, searched_at DESC);
```

---

## Query Examples

### Common Queries

#### Get location by hierarchical path

```sql
-- Get suburb by full path
SELECT l_suburb.*
FROM locations l_suburb
INNER JOIN locations l_city ON l_suburb.parent_id = l_city.id
INNER JOIN locations l_province ON l_city.parent_id = l_province.id
WHERE l_province.slug = 'gauteng'
  AND l_city.slug = 'johannesburg'
  AND l_suburb.slug = 'sandton'
  AND l_suburb.type = 'suburb';
```

#### Get location statistics

```sql
-- Get listing counts and average prices
SELECT
  COUNT(*) as total_listings,
  SUM(CASE WHEN listing_type = 'sale' THEN 1 ELSE 0 END) as for_sale_count,
  SUM(CASE WHEN listing_type = 'rent' THEN 1 ELSE 0 END) as to_rent_count,
  AVG(CASE WHEN listing_type = 'sale' THEN price END) as avg_sale_price,
  AVG(CASE WHEN listing_type = 'rent' THEN price END) as avg_rental_price,
  PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY price) as median_price
FROM listings
WHERE location_id = ?
  AND status = 'active';
```

#### Get trending suburbs

```sql
-- Get top 10 trending suburbs (last 30 days)
SELECT
  l.id,
  l.name,
  l.slug,
  COUNT(ls.id) as search_count,
  COUNT(DISTINCT ls.user_id) as unique_users,
  COUNT(DISTINCT DATE(ls.searched_at)) as active_days
FROM locations l
INNER JOIN location_searches ls ON l.id = ls.location_id
WHERE ls.searched_at >= NOW() - INTERVAL 30 DAY
  AND l.type = 'suburb'
GROUP BY l.id, l.name, l.slug
HAVING search_count >= 10
ORDER BY search_count DESC, unique_users DESC
LIMIT 10;
```

#### Get similar locations

```sql
-- Get similar suburbs based on price range
SELECT
  l2.id,
  l2.name,
  l2.slug,
  AVG(listings2.price) as avg_price,
  COUNT(listings2.id) as listing_count
FROM locations l1
INNER JOIN listings listings1 ON l1.id = listings1.location_id
CROSS JOIN locations l2
INNER JOIN listings listings2 ON l2.id = listings2.location_id
WHERE l1.id = ?
  AND l2.id != l1.id
  AND l2.type = 'suburb'
  AND listings1.status = 'active'
  AND listings2.status = 'active'
GROUP BY l2.id, l2.name, l2.slug
HAVING ABS(AVG(listings2.price) - AVG(listings1.price)) / AVG(listings1.price) < 0.2
ORDER BY ABS(AVG(listings2.price) - AVG(listings1.price))
LIMIT 5;
```

#### Get location hierarchy breadcrumbs

```sql
-- Get full breadcrumb path for a location
WITH RECURSIVE location_path AS (
  SELECT id, name, slug, type, parent_id, 1 as level
  FROM locations
  WHERE id = ?
  
  UNION ALL
  
  SELECT l.id, l.name, l.slug, l.type, l.parent_id, lp.level + 1
  FROM locations l
  INNER JOIN location_path lp ON l.id = lp.parent_id
)
SELECT id, name, slug, type, level
FROM location_path
ORDER BY level DESC;

-- Result:
-- id | name          | slug          | type     | level
-- 1  | South Africa  | south-africa  | country  | 4
-- 2  | Gauteng       | gauteng       | province | 3
-- 3  | Johannesburg  | johannesburg  | city     | 2
-- 4  | Sandton       | sandton       | suburb   | 1
```

---

## Next Steps

- Review [API Documentation](./API_DOCUMENTATION.md) for service methods
- Check [Developer Guide](./DEVELOPER_GUIDE.md) for component usage
- See [Troubleshooting Guide](./TROUBLESHOOTING_GUIDE.md) for common issues
- Read [Google Places API Setup](./GOOGLE_PLACES_API_SETUP.md) for configuration
