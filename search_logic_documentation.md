# Search Architecture & Logic Documentation

## Overview
The search system is designed to trigger **Intelligent Routing** based on user input. It distinguishes between:
1.  **Broad Search / Discovery**: Browsing provinces or general property types (SEO-friendly URLs).
2.  **Specific Search**: Targeted queries for Cities or Suburbs (Interactive Results Pages).

## 1. Frontend: Search Input Components

### `LocationAutosuggest.tsx`
*   **Role**: Provides autocomplete suggestions from Google Places API.
*   **Key Logic**:
    *   Resolves Google Place types to internal types: `province`, `city`, `suburb`.
    *   Matches suggestions against a known `PROVINCE_SLUGS` list and `CITY_PROVINCE_MAP`.
    *   Returns a structured object: `{ name, slug, type, provinceSlug, citySlug }`.

### `ListingNavbar.tsx` (Global Search)
*   **Role**: The primary search bar available on all pages.
*   **Routing Logic**:
    *   **Single Province**: Redirects to the SEO-optimized Province Page (e.g., `/property-for-sale/gauteng`).
    *   **City/Suburb**: Forces the **Interactive Results Page** by using query parameters (e.g., `/property-for-sale?locations=sky-city`).
    *   **Multiple Locations**: Also uses the Interactive Results Page.

### `EnhancedHero.tsx` (Homepage Search)
*   **Role**: The large search interface on the homepage.
*   **Routing Logic**:
    *   **Update (Recent Fix)**: Now mirrors `ListingNavbar` logic.
    *   Explicitly checks if the selected location is a City or Suburb.
    *   If so, constructs a URL with `?locations=slug` to ensure the user bypasses the static SEO pages and sees standard search results.
    *   **Fallback**: If no specific location is selected, falls back to text search (`?city=SearchTerm`).

---

## 2. Routing & URL Construction

### `searchIntent.ts` (The Brain)
*   **Role**: Single source of truth for parsing URLs into Search Intent.
*   **Logic**:
    *   Parses path segments: `/:action/:suburb/:city/:province/:locationId` (Property24 pattern).
    *   Parses query params: `?minPrice=...`, `?locations=...`.
    *   **Resolves Ambiguity**: Determines if a slug is a Province (Discovery) or a City/Suburb (Search) based on hierarchy.

### `urlUtils.ts`
*   **Role**: Helper functions to generate URLs from filter objects.
*   **Key Function**: `generatePropertyUrl(filters)` delegates to `searchIntent` to build the canonical URL string.

---

## 3. Search Results Page (`SearchResults.tsx`)

*   **Role**: Displays the list of properties based on the current URL.
*   **Data Fetching**:
    *   Uses `useSearchIntent` to derive `filters` from the URL.
    *   Calls `trpc.properties.search.useQuery(filters)` to fetch data from the backend.
    *   **Important**: Requires `city`, `suburb`, or `province` filters to be explicitly populated to trigger location-based queries effectively.

---

## 4. Backend Service (`propertySearchService.ts`)

*   **Role**: Executes the database query.
*   **Key Logic**:
    *   **Location Resolution**: Uses `locationResolverService` to convert input slugs (e.g., "gauteng", "sandton") into Database IDs (`provinceId`, `cityId`).
    *   **Filtering**:
        *   Applies filters for Price, Bed/Bath, Property Type.
        *   **Status Filter**: Defaults to `status IN ('available', 'published')`.
    *   **Search Fallback**: If ID resolution fails, it attempts a text-based search on the `address`, `suburb`, or `city` text columns.

## 5. Location Resolver (`locationResolverService.ts`)

*   **Role**: Resolves slugs/names to Database Entities.
*   **Logic**:
    *   Tries to match slugs against `provinces`, `cities`, then `suburbs` tables.
    *   Enforces hierarchy (e.g., a suburb must belong to the specified city).
    *   **Critical Dependency**: The database must contain the City/Suburb for ID-based filtering to work. If "Sky City" is not in the `suburbs` table, it falls back to text search (which requires the property address to contain "Sky City").

---

## Known Issues & Debugging Tips

1.  **Missing Location Data**:
    *   If a property doesn't appear for "Sky City", it's likely because "Sky City" isn't in the `suburbs` table OR the property's `suburbId` is null.
    *   **Fix**: Ensure the property address text contains the suburb name (Text Search Fallback) OR seed the proper Suburb entity.

2.  **SEO vs. Search Page Confusion**:
    *   Users might land on a "Province Page" (`/property-for-sale/gauteng`) when searching for a city if the routing logic misidentifies the slug.
    *   **Fix**: Ensure `EnhancedHero` and `ListingNavbar` force the `?locations=` query param for City/Suburb searches to trigger the explicit Search Results view.
