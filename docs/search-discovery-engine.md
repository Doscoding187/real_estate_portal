# Property Listify Search Discovery Engine

**Status:** Draft — PR #325  
**Date:** 2026-06-29  
**Authors:** Codex audit  
**Stack constraints:** React 19 / Vite / wouter / Express / tRPC / MySQL / TiDB / Drizzle ORM  
**Not applicable:** Next.js, PostgreSQL-only features, pg_trgm, JSONB, Next middleware, Next App Router

---

## 1. Executive Summary

Property Listify's current search/navigation flow requires too many steps before users reach useful results. Location data is split across hard-coded frontend arrays, a Google Places autosuggest, and two parallel DB schemas. The mega menus, footer, and LocationSelectionModal all contain hard-coded city/suburb lists that are stale, limited to ~9 cities, and bypass the database entirely.

The **Search Discovery Engine** is the architecture that replaces these fragments with a single, unified, data-driven location discovery system. It spans the homepage search, nav mega menus, listing navbar, SEO location pages, and eventually agent/agency/service discovery by location.

This document captures the current state, the target architecture, and a phased PR plan to get there without breaking the existing user experience.

---

## 2. Current Problems (from Audit)

### 2.1 Hard-coded Location Data

| Location | File | What's Hard-coded |
|---|---|---|
| City dropdown | `EnhancedNavbar.tsx` lines 54–64 | 9 cities (Johannesburg, Cape Town, Kimberley, etc.) |
| Suburb dropdown | `EnhancedNavbar.tsx` lines 67–158 | 72 suburbs (8 per city: Sandton, Rosebank, etc.) |
| Popular city links | `EnhancedNavbar.tsx` line 744 | 3 links (Rent in Jhb/CPT/Dbn) |
| LocationSelectionModal | `LocationSelectionModal.tsx` lines 21–75 | 68 cities + 20 suburbs |
| Footer | `Footer.tsx` lines 99–125 | 5 bare legacy URLs |
| City→Province map | `locationUtils.ts` lines 5–50 | 49-city static mapping |

None of these refresh from the database. None include listing counts or popularity signals.

### 2.2 Two Parallel Autosuggest Systems

- **Primary (homepage):** `LocationAutosuggest.tsx` — Google Places API, country-restricted to ZA.
- **Secondary (forms):** `LocationAutocomplete.tsx` — DB-driven via `trpc.location.searchLocations`.

Both exist. Neither supports township, metro, municipality, estate, or development as a location type. The Google Places version returns `place_id` (string) which has no connection to the internal DB location IDs.

### 2.3 Dual Location Schema

| Schema | Tables | Relationship |
|---|---|---|
| Classic tree | `provinces`, `cities`, `suburbs` | FK: province → city → suburb |
| Unified graph | `locations` (self-referencing via `parentId`) | `type` enum: province, city, suburb, neighborhood |

Both are actively used. The unified `locations` table is the newer approach but the classic tree is still the primary source for most queries. Neither schema supports `metro`, `municipality`, `township`, `town`, `estate`, or `development` as location types.

### 2.4 No Alias Layer

No database table or column stores alternate names. Only a client-side `PROVINCE_NAME_VARIANTS` map handles common province variants (e.g., "kzn" → "kwazulu-natal"). City aliases like "Joburg"/"JHB"/"Jozi" or "CPT"/"Cape Town" have no representation.

### 2.5 URL Strategy Split

- **Province-only searches** → path-based SEO URL: `/property-for-sale/gauteng`
- **City/suburb searches** → query-param SRP URL: `/property-for-sale?city=johannesburg`

This split is enforced by `searchIntent.ts:250-252`. However, `App.tsx` also defines path-based SEO routes for cities and suburbs (`/property-for-sale/gauteng/johannesburg`), which `CityPage`/`SuburbPage` serve. This creates a canonical mismatch: `generateIntentUrl()` produces query-param URLs for city searches while the actual canonical pages use path-based URLs.

### 2.6 Canonical Conflicts

Two components set `<link rel="canonical">`:
- `MetaControl.tsx` — falls back to raw wouter path when no explicit canonical is passed
- `LocationSchema.tsx` — sets canonical via explicit prop

The last-mounted Helmet tag wins. Order is implicit and fragile.

### 2.7 Legacy URL Issues

| Issue | File | Detail |
|---|---|---|
| Footer bare URLs | `Footer.tsx` lines 99,114,120 | `/gauteng/johannesburg` (no `/property-for-sale/` prefix) |
| Hardcoded province | `App.tsx` line 358–359 | `/suburb/:city/:suburb` hardcodes `province: 'gauteng'` |
| CityShortcutRedirect dead code | `LegacyRouteHandler.tsx:15-30` | Defined but never wired in any route |

### 2.8 Listing Counts Available but Unused in Nav

`locations.propertyCount` column exists. `locationPagesService` computes `listingCount` for provinces, cities, and suburbs. But the nav never displays or uses these counts — it relies on hard-coded lists.

---

## 3. Current Flow Map

### Flow A: Nav Mega Menu → Property Type → Results

```
User clicks "Houses for Sale" in For Buyers
  → handlePropertyClick('house', 'sale')
  → getLastSearchLocation() from localStorage
    → If found: /property-for-sale?propertyType=house&city=XX
    → If NOT found: LocationSelectionModal (68 cities, pick one)
      → Saves to localStorage, navigate to /property-for-sale?propertyType=house&city=XX
```

### Flow B: Nav City Dropdown → SEO Location Page

```
User clicks "Johannesburg" in CityDropdownContent
  → href="/property-for-sale/gauteng/johannesburg" (hard-coded)
  → CityPage renders
    → If ?view=list or filter params: delegates to SearchResults
    → Else: SEO landing page
```

### Flow C: Nav "Rent in Johannesburg" → SEO Page

```
User clicks "Rent in Johannesburg" in For Renters
  → href="/property-to-rent/gauteng/johannesburg" (hard-coded, line 744)
  → CityPage (rent) renders
```

### Flow D: Homepage Hero → Search

```
User types in LocationAutosuggest (Google Places API)
  → Selects suggestion → LocationNode { name, slug, type, provinceSlug, citySlug }
  → Clicks Search → EnhancedHero.handleSearch()
    → Single province: /property-for-sale/{provinceSlug}
    → Single city: /property-for-sale?city={slug}&province={slug}
    → Multiple cities: /property-for-sale?locations[]=slug1&locations[]=slug2
    → Text fallback: isProvinceSearch() → path, else query params
```

### Flow E: Footer Links → Redirect

```
User clicks "Johannesburg" in Footer
  → href="/gauteng/johannesburg" (bare, no /property-for-sale prefix)
  → LegacyCityRedirect catch-all route fires
  → Client-side redirect to /property-for-sale/gauteng/johannesburg
```

---

## 4. Current Files, Components, Services, Routes

### Frontend Components

| File | Role |
|---|---|
| `client/src/components/EnhancedNavbar.tsx` | Main desktop nav — 6 mega menus, CityDropdownContent, LocationSelectionModal trigger |
| `client/src/components/LocationSelectionModal.tsx` | Modal — 68 hard-coded cities, 20 hard-coded suburbs |
| `client/src/components/LocationAutosuggest.tsx` | Google Places autosuggest (primary, used in EnhancedHero/ListingNavbar) |
| `client/src/components/location/LocationAutocomplete.tsx` | DB-driven autosuggest (secondary, used in listing wizards) |
| `client/src/components/location/LocationAutocomplete.new.tsx` | Updated DB autocomplete (703 lines, full Google Places integration) |
| `client/src/components/EnhancedHero.tsx` | Homepage hero — tabs (Buy/Rent/Developments), LocationAutosuggest, filter panels |
| `client/src/components/Navbar.tsx` | Legacy navbar (no mega menus, used on `/dashboard`) |
| `client/src/components/ListingNavbar.tsx` | Persistent search bar with LocationAutosuggest |
| `client/src/components/Footer.tsx` | Footer — 5 bare legacy location URLs |
| `client/src/components/LegacyRouteHandler.tsx` | Client-side redirect components |
| `client/src/components/seo/MetaControl.tsx` | Sets canonical + noindex |
| `client/src/components/location/LocationSchema.tsx` | Sets canonical + schema.org JSON-LD |

### Frontend Pages

| File | Role |
|---|---|
| `client/src/pages/Home.tsx` | Homepage entry point |
| `client/src/pages/SearchResults.tsx` | Search results — resolves URL via `resolveSearchIntent()`, fetches data |
| `client/src/pages/CityPage.tsx` | City SEO page — delegates to SearchResults if filters present |
| `client/src/pages/ProvincePage.tsx` | Province SEO page |
| `client/src/pages/SuburbPage.tsx` | Suburb SEO page |

### Frontend Routing & URL Logic

| File | Role |
|---|---|
| `client/src/App.tsx` | All wouter routes — SEO pages, legacy redirects, catch-alls |
| `client/src/lib/searchIntent.ts` | `resolveSearchIntent()` + `generateIntentUrl()` — URL ↔ state binding |
| `client/src/lib/urlUtils.ts` | URL builders: `generatePropertyUrl()`, `buildPropertyUrl()` |
| `client/src/lib/locationUtils.ts` | `CITY_PROVINCE_MAP`, `PROVINCE_SLUGS`, `PROVINCE_NAME_VARIANTS` |

### Backend Routers

| File | Procedure | Role |
|---|---|---|
| `server/locationRouter.ts` | `searchLocations` | Search provinces, cities, suburbs from DB |
| `server/locationRouter.ts` | `getLocationHierarchy` | Full province→city→suburb tree |
| `server/locationRouter.ts` | `reverseGeocode` | Nearest province/city/suburb from coords |
| `server/locationRouter.ts` | `saveGooglePlaceLocation` | Auto-populate locations from Google Places |
| `server/locationPagesRouter.ts` | `getPopularCities` | Popular cities with listing data |
| `server/locationPagesRouter.ts` | `getTrendingSuburbs` | Trending suburbs with stats |
| `server/locationPagesRouter.ts` | `getProvinceData` / `getCityData` / `getSuburbData` | Location page data |
| `server/locationPagesRouter.ts` | `getHeroCampaign` | Location-specific hero campaigns |

### Backend Services

| File | Role |
|---|---|
| `server/services/locationPagesService.ts` | Location page data with listing counts |
| `server/services/locationResolverService.ts` | Slug→ID resolver, hierarchy validation |
| `server/services/locationAnalyticsService.ts` | Market stats, trending, similar locations |
| `server/services/propertySearchService.ts` | `searchProperties()` — resolves slugs, builds SQL |

### Database Schema

| File | Tables |
|---|---|
| `drizzle/schema/locations.ts` | `provinces`, `cities`, `suburbs`, `locations` (unified), `amenities`, `locationSearchCache` |
| `drizzle/schema/listings.ts` | `properties` (FKs to provinces, cities, suburbs, locations), `listings` |
| `drizzle/schema/analytics.ts` | `locationSearches`, `recentSearches`, `locationAnalyticsEvents` |

### Filter State

| File | Role |
|---|---|
| `client/src/store/propertyFiltersStore.ts` | Zustand — persisted to localStorage, synced with URL |
| `client/src/components/SidebarFilters.tsx` | Sidebar — budget, bedrooms, property type, amenities, location |
| `client/src/hooks/usePropertyFilters.ts` | sessionStorage-based filter state |

---

## 5. Existing Reusable APIs

### tRPC Procedures Ready for Consumption

| Procedure | Returns | Current Consumer | Reuse Potential |
|---|---|---|---|
| `locationPages.getPopularCities` | Cities with listing counts | None (no frontend consumer) | **High** — nav, footer, hero |
| `locationPages.getTrendingSuburbs` | Suburbs with search volume | None | **High** — nav featured sections |
| `location.searchLocations` | Provinces/cities/suburbs from DB | `LocationAutocomplete` | **High** — API-driven autosuggest backend |
| `location.getLocationHierarchy` | Full tree (province→city→suburb) | None | **Medium** — city dropdown data |
| `location.reverseGeocode` | Nearest province/city/suburb | None | **Low** (maps use-case) |
| `locationPages.getProvinceData` | Province + listing count + SEO | `ProvincePage` | **Medium** — nav province cards |
| `locationPages.getCityData` | City + listing count + SEO | `CityPage` | **Medium** — nav city cards |
| `properties.getFilterCounts` | Live property count by filters | `EnhancedHero` | **Medium** — live count in nav |
| `locationAnalyticsService.getSimilarLocations` | Similar suburbs | `SimilarLocations` component | **Low** |

### Key Finding

`locationPages.getPopularCities` exists and returns live data but is **not consumed anywhere on the frontend**. It is the single highest-value API to wire up first.

---

## 6. Search Discovery Engine — Target Architecture

```
┌─────────────────────────────────────────────────────┐
│                  USER INTENT                         │
│  (Buy / Rent / Developments / Agents / Services)     │
└──────────────┬──────────────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────────────┐
│           DYNAMIC LOCATION DISCOVERY                 │
│  ┌───────────────────────────────────────────────┐   │
│  │         location.suggestLocations              │   │
│  │  ┌──────┐ ┌──────┐ ┌──────┐ ┌─────────────┐  │   │
│  │  │Prov  │ │City  │ │Suburb│ │Township/     │  │   │
│  │  │inces │ │      │ │      │ │Estate/Dev/   │  │   │
│  │  │      │ │      │ │      │ │Municipality/ │  │   │
│  │  │      │ │      │ │      │ │Metro/Town    │  │   │
│  │  └──────┘ └──────┘ └──────┘ └─────────────┘  │   │
│  │  All return: id, name, type, slug,             │   │
│  │  canonicalPath, listingCount, context          │   │
│  └───────────────────────────────────────────────┘   │
└──────────────┬──────────────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────────────┐
│              CANONICAL URL                           │
│  /property-for-sale/{province}/{city}/{suburb}       │
│  /property-to-rent/{province}/{city}/{suburb}        │
│  /new-developments/{province}/{city}                 │
└──────────────┬──────────────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────────────┐
│         USEFUL RESULTS / SEO PAGE                    │
│  ┌──────────────────┐  ┌────────────────────────┐   │
│  │  SearchResults    │  │  CityPage / SuburbPage │   │
│  │  (filters active) │  │  (SEO landing page)    │   │
│  └──────────────────┘  └────────────────────────┘   │
└─────────────────────────────────────────────────────┘
```

### 6.1 Location Discovery API — Target Interface

```typescript
// Shared type — lives in shared/ or server types

type LocationType =
  | 'province'
  | 'city'
  | 'suburb'
  | 'metro'
  | 'municipality'
  | 'township'
  | 'town'
  | 'estate'
  | 'development';

interface LocationSuggestion {
  id: number;
  name: string;
  type: LocationType;
  slug: string;
  slugPath: string;           // e.g., "gauteng/johannesburg/sandton"
  canonicalPath: string;      // e.g., "/property-for-sale/gauteng/johannesburg/sandton"
  provinceSlug?: string;
  citySlug?: string;
  parentSlug?: string;
  listingCount?: number;
  matchReason: 'exact' | 'prefix' | 'alias' | 'popular';
}

interface SuggestLocationsInput {
  query: string;
  types?: LocationType[];
  limit?: number;             // default 10
  transactionType?: 'sale' | 'rent' | 'developments';
}

interface SuggestLocationsOutput {
  suggestions: LocationSuggestion[];
  total: number;
}
```

### 6.2 Location Resolver — Target Interface

```typescript
interface ResolvedLocation {
  id: number;
  name: string;
  type: LocationType;
  slug: string;
  slugPath: string;
  parent?: ResolvedLocation;  // Recursive parent chain
  children?: ResolvedLocation[];
  listingCount?: number;
}
```

### 6.3 Data Layer — Target State

**Phase target:** All location data lives in the unified `locations` table with:
- `type` enum expanded to cover all required types
- `parentId` properly populated for the full hierarchy
- `propertyCount` maintained (via triggers or periodic refresh)
- `location_aliases` table for alternate names
- Classic `provinces`/`cities`/`suburbs` tables remain for backward compatibility

---

## 7. Canonical URL Strategy

### 7.1 Preferred URL Patterns

| Location Level | Buy | Rent | Developments |
|---|---|---|---|
| Province | `/property-for-sale/gauteng` | `/property-to-rent/gauteng` | — |
| City | `/property-for-sale/gauteng/johannesburg` | `/property-to-rent/gauteng/johannesburg` | — |
| Suburb | `/property-for-sale/gauteng/johannesburg/sandton` | `/property-to-rent/gauteng/johannesburg/sandton` | — |
| Metro | `/property-for-sale/gauteng/ekurhuleni` | `/property-to-rent/gauteng/ekurhuleni` | — |
| Development | `/new-developments/gauteng/johannesburg/midrand` | — | `/new-developments/gauteng/johannesburg/midrand` |
| Township | `/property-for-sale/gauteng/johannesburg/soweto` | `/property-to-rent/gauteng/johannesburg/soweto` | — |

### 7.2 Query Params (Filters Only — Not Location Identity)

```
?beds=3&price=1000000-3000000&propertyType=house&sort=relevance&page=2&view=list
```

Location identity must never appear only in query params for an indexed SEO page.

### 7.3 Rules

1. Every important location page must have exactly one canonical URL.
2. Legacy bare routes (e.g., `/gauteng/johannesburg`) must redirect (`replace: true`) to canonical (`/property-for-sale/gauteng/johannesburg`).
3. `MetaControl` and `LocationSchema` must not both set canonical. One component owns canonical.
4. Filtered URLs should be `noindex, follow` unless intentionally designed as landing pages.
5. `generateIntentUrl` and `resolveSearchIntent` must produce and consume path-based URLs for all geography levels, not just provinces.

---

## 8. Dynamic Nav Strategy

### 8.1 Approach

Replace hard-coded location data in the nav from the outside in:

1. **Data adapter** — Normalize existing API responses into a stable shape.
2. **Lowest-risk section** — Replace one small section (e.g., 3 "Rent in City" links).
3. **City dropdown** — Replace 9-city hard-coded list.
4. **Suburb sub-lists** — Replace per-city suburb arrays.

### 8.2 Fallback Pattern

Every dynamic section must have a static fallback for:
- Loading state
- Error state
- Empty data
- Development/offline mode

```typescript
const popularCities = usePopularCities({ limit: 9 });
const cityLinks = popularCities.data?.length
  ? popularCities.data.map(cityToNavLink)
  : FALLBACK_CITY_LINKS; // Static constant
```

### 8.3 Data Adapter Shape (Phase 1)

```typescript
interface NavLocationLink {
  label: string;              // Display name
  href: string;               // Canonical URL
  provinceSlug: string;
  citySlug?: string;
  suburbSlug?: string;
  listingCount?: number;
  type: LocationType;
}
```

---

## 9. Homepage Autosuggest Strategy

### 9.1 Current State

Homepage uses `LocationAutosuggest.tsx` — Google Places API with ZA country restriction. Returns `LocationNode` with `place_id` (string), not DB `id` (int). No DB integration.

### 9.2 Target State

A DB/API-driven autosuggest behind a feature flag that:
1. Calls `location.searchLocations` or a new `location.suggestLocations` endpoint.
2. Returns grouped suggestions: Provinces → Cities → Suburbs → Townships/Estates.
3. Navigates to canonical path when a structured location is selected.
4. Falls back to text search if no structured match.

### 9.3 Migration Path

| Step | What | Risk |
|---|---|---|
| 1 | Create new API-driven autosuggest behind flag | Low — Google Places remains default |
| 2 | A/B test both versions | Medium |
| 3 | Remove Google Places autosuggest | Medium — requires API key removal |
| 4 | Add township/estate/development suggestions | Low — backend change only |

---

## 10. SEO Rules

### 10.1 Canonical Ownership

**Decision:** `LocationSchema.tsx` owns the canonical `<link>` for location pages. `MetaControl.tsx` handles only `noindex`/`nofollow` directives. No duplicate canonical tags.

### 10.2 Robots Directives

| Page Type | Index | Follow | Notes |
|---|---|---|---|
| Province SEO page | yes | yes | Canonical path |
| City SEO page | yes | yes | Canonical path |
| Suburb SEO page | yes | yes | Canonical path |
| SearchResults (filters active) | no | yes | Any query param beyond geography |
| SearchResults (no filters) | no | yes | `/property-for-sale` root |
| Legacy redirect path | no | yes | 301-equivalent client-side redirect |

### 10.3 Sitemap

The existing `server/routes/sitemap.ts` generates canonical location URLs correctly:
- Province: `{prefix}/{provinceSlug}`
- City: `{prefix}/{provinceSlug}/{citySlug}`
- Suburb: `{prefix}/{provinceSlug}/{citySlug}/{suburbSlug}`

This is already correct. Do not change sitemap generation until URL strategy is fully unified.

### 10.4 Legacy Redirects

| Incoming | Redirects To | Status |
|---|---|---|
| `/{province}` | `/property-for-sale/{province}` | Active (catch-all) |
| `/{province}/{city}` | `/property-for-sale/{province}/{city}` | Active (catch-all) |
| `/{province}/{city}/{suburb}` | `/property-for-sale/{province}/{city}/{suburb}` | Active (catch-all) |
| `/city/{slug}` | `/property-for-sale/{province}/{slug}` | Active (explicit) |
| `/suburb/{city}/{suburb}` | `/property-for-sale/gauteng/{city}/{suburb}` | **BUG** — hardcoded gauteng |
| `/houses-for-sale/{suburb}/{city}/{province}/{locationId}` | SuburbPage with params | Active (P24 legacy) |

Keep all redirects. Fix the gauteng bug in a later phase.

---

## 11. Phased PR Roadmap

### Phase 0 — Documentation and Safety (PR #325)

**This PR.** No runtime changes. Document only.

### Phase 1 — Low-Risk Dynamic Data Adapter (PR #326)

**Goal:** Create a frontend data adapter that normalizes existing API responses into a stable `NavLocationLink[]` shape. No UI changes. No schema changes. Unit tests only.

**Files:** `client/src/lib/locationDataAdapter.ts` (new), `client/src/lib/__tests__/locationDataAdapter.test.ts` (new)

**Scope:**
- Normalize `locationPages.getPopularCities` → `NavLocationLink[]`
- Provide static fallback arrays matching current hard-coded data
- Add unit tests
- Do NOT change EnhancedNavbar rendering yet

### Phase 2 — First Visible Dynamic Nav Slice (PR #327)

**Goal:** Replace one small hard-coded nav section with dynamic data.

**Target:** The 3 "Rent in Johannesburg/Cape Town/Durban" links in the For Renters mega menu (`EnhancedNavbar.tsx:743-747`).

**Scope:**
- Call `getPopularCities` via TanStack Query
- Use `NavLocationLink[]` adapter
- Static fallback when data is loading/unavailable
- Preserve canonical URLs
- Preserve visual layout
- Nav SEO tests must still pass

### Phase 3 — Dynamic City Dropdown (PR #328)

**Goal:** Replace CityDropdownContent hard-coded cities with dynamic data.

**Scope:**
- Use `locationPages.getPopularCities` for the city list
- Use `location.getLocationHierarchy` or `location.searchLocations` for per-city suburbs
- Keep static fallback
- Every generated link must be a canonical path
- Do not add query-param city links in the mega menu

### Phase 4 — Homepage Autosuggest Foundation (PR #329)

**Goal:** Build a DB/API-driven autosuggest behind a feature flag.

**Scope:**
- New component or adapter wrapping `trpc.location.searchLocations`
- Returns grouped suggestions (provinces → cities → suburbs)
- Navigates to canonical path on selection
- Feature-flagged: Google Places remains default
- Falls back to text search behavior

### Phase 5 — Backend Suggest API Upgrade (PR #330)

**Goal:** Add or improve `location.suggestLocations` on the backend.

**Scope:**
- Reuse existing tables first (no broad migration)
- Return typed suggestions with canonical href
- Include `listingCount` where data allows
- MySQL/TiDB compatible
- No alias table in this PR unless explicitly approved

### Phase 6 — Canonical Cleanup

**PR #331:** Fix footer legacy URLs — replace `/gauteng/johannesburg` → `/property-for-sale/gauteng/johannesburg`.

**PR #332:** Audit and fix canonical ownership — `LocationSchema` owns canonical, `MetaControl` stops setting it.

**PR #333:** Fix hardcoded Gauteng legacy redirect — resolve province dynamically in `/suburb/:city/:suburb`.

### Phase 7 — Alias and Location Graph (Post-Discovery API)

**Goal:** Add alias support, expand location types, backfill unified locations table.

**Scope:**
- `location_aliases` table + service
- Populate aliases (Joburg, JHB, Jozi, CPT, Pta, Durbs, etc.)
- Expand `locations.type` enum
- Backfill unified `locations` from classic tables if needed
- Add township/estate/development discovery

---

## 12. First Implementation Slice Recommendation

**PR #326 — Data Adapter (Phase 1)** is the safest first implementation.

### Why this slice?

| Criteria | Assessment |
|---|---|
| Schema changes | None |
| UI changes | None |
| Backend changes | None |
| Existing consumer risk | None (adapter is new, unconnected code) |
| Testability | High — pure function, no dependencies |
| Rollback risk | Zero — not wired into any component |
| Foundation value | High — every subsequent nav PR depends on this shape |

### What it produces

A single file (`client/src/lib/locationDataAdapter.ts`) that:
1. Exports `NavLocationLink` type
2. Exports `FALLBACK_CITY_LINKS` (static array matching today's hard-coded data)
3. Exports `cityToNavLink(city)` pure function — maps a popular city API object to `NavLocationLink`
4. Exports `popularCitiesToNavLinks(cities)` pure function — maps an array
5. Has unit tests

No tRPC hooks. No data fetching. The hook (`usePopularCityLinks`) comes in PR #327.

No rendering changes. No new dependencies. Merges safely.

---

## 13. Explicit Stack Constraints

### Frontend
- **UI framework:** React 19
- **Build tool:** Vite 7
- **Router:** wouter (not Next.js file-based routing)
- **Server state:** TanStack React Query v5
- **Client state:** Zustand v5
- **CSS:** Tailwind CSS v4 + shadcn/ui (Radix primitives)
- **No:** Next.js App Router, Next.js pages router, Next middleware

### Backend
- **Server:** Express 4
- **API layer:** tRPC v11 (primary), Express REST (file uploads, webhooks)
- **Database:** MySQL / TiDB (MySQL-compatible)
- **ORM:** Drizzle ORM v0.44
- **Caching:** Redis (ioredis)
- **No:** PostgreSQL-only features (no pg_trgm, no JSONB, no PostGIS-specific index types)

### Database
- **Provider:** TiDB Serverless (MySQL 8 compatible) or MySQL 8
- **Engine:** InnoDB
- **Index types:** BTREE only (no GiST, no GIN)
- **Fulltext:** MySQL fulltext indexes are acceptable where needed
- **No:** PostgreSQL-only extensions or features

### Deployment
- **Hosting:** Railway / Vercel
- **Sitemap:** Express server-side (not Next.js `getServerSideProps`)
- **Canonical/SEO:** Client-side via Helmet-style deduplication, not Next.js `<Head>`

---

## Appendix A: Audit References

| Area | File:Line | Finding |
|---|---|---|
| Hard-coded cities | `EnhancedNavbar.tsx:54-64` | 9 cities |
| Hard-coded suburbs | `EnhancedNavbar.tsx:67-158` | 72 suburbs |
| Hard-coded rent links | `EnhancedNavbar.tsx:744` | 3 city links |
| Hard-coded modal cities | `LocationSelectionModal.tsx:21-68` | 68 cities |
| Hard-coded modal suburbs | `LocationSelectionModal.tsx:70-75` | 20 suburbs |
| Hard-coded footer | `Footer.tsx:99,114,120` | 5 bare legacy URLs |
| CITY_PROVINCE_MAP | `locationUtils.ts:5-50` | 49 static city→province mappings |
| Google Places autosuggest | `LocationAutosuggest.tsx:92` | `getPlacePredictions()` |
| DB autocompete | `locationRouter.ts:23` | `searchLocations` procedure |
| URL split rule | `searchIntent.ts:250-252` | City/suburb → query params |
| Canonical fallback | `MetaControl.tsx:62-63` | Falls back to raw wouter path |
| Hardcoded province in legacy | `App.tsx:358-359` | Gauteng hardcoded in `/suburb/` |
| Dead code | `LegacyRouteHandler.tsx:15-30` | `CityShortcutRedirect` never wired |
| Popular cities API unused | `locationPagesRouter.ts:170` | No frontend consumer |
| Locations table types | `locations.ts:86` | Only 4 types: province/city/suburb/neighborhood |
| No alias table | — | No DB-level alias support |
| Listing counts exist | `locations.ts:91` | `propertyCount` column available |

---

## Appendix B: Decision Log

| Date | Decision | Rationale |
|---|---|---|
| 2026-06-29 | Phase 0 is doc-only | Establish source of truth before any runtime change |
| 2026-06-29 | Phase 1 is data adapter | Zero-risk foundation, no UI wiring |
| 2026-06-29 | `LocationSchema` owns canonical | Explicit canonical wins over implicit fallback |
| 2026-06-29 | No Google Places removal in Phase 0-3 | Too risky without proven DB alternative |
| 2026-06-29 | Keep static fallbacks forever | Nav must never appear empty |
| 2026-06-29 | Classic tables remain | Backward compatibility; migration is Phase 7+ |
