# Search Architecture & Product Requirements

> **The Golden Rule**: SEO pages exist for traffic acquisition. Search results exist for intent fulfilment.

## 1. Core Principles

1.  **Search Input ≠ Search Result**: The system must first classify intent before routing.
2.  **Hierarchy is Sacred**:
    *   **Province**: Discovery intent (Too broad).
    *   **City**: Clear intent.
    *   **Suburb**: Specific intent.
3.  **No Guessing**: Never route user to listings if intent is ambiguous (Province level).

## 2. Routing Rules (Source of Truth)

All search inputs must pass through `resolveSearchRoute(intent)` logic:

| Input Intent | Destination Type | URL Structure | UX Goal |
| :--- | :--- | :--- | :--- |
| **Province** (e.g. "Gauteng") | **SEO Page** | `/property-for-sale/gauteng` | Education, Top Cities, Inspiration. **No Listings.** |
| **City** (e.g. "Johannesburg") | **Search Results** | `/property-for-sale?city=johannesburg` | Immediate Listings. Sidebar offers Suburb drill-down. |
| **Suburb** (e.g. "Sandton") | **Search Results** | `/property-for-sale?suburb=sandton` | Immediate Listings. Sidebar shows sibling suburbs. |

### Why?
*   **Province Pages**: Funnel users. A province is a container, not a location.
*   **Search Pages**: fulfill specific intent. "I want to see houses here."

## 3. Sidebar UX Implementations

The Search Results Sidebar acts as the **Location Refinement Engine**.

### Scenario A: City Search ("Johannesburg")
*   **Context**: User wants to look in JHB but hasn't picked a suburb.
*   **Display**:
    *   **City Selector**: "Johannesburg" (Selected).
    *   **Suburb List**: Show "Popular Suburbs" (Sandton, Rosebank, Midrand).
    *   **Search Input**: "Search for a suburb in Johannesburg..."

### Scenario B: Suburb Search ("Sandton")
*   **Context**: User knows specific area.
*   **Display**:
    *   **City Context**: "Johannesburg" (Fixed/Breadcrumb).
    *   **Suburb Selector**: "Sandton" (Selected).
    *   **Nearby Options**: Show sibling suburbs (Bryanston, Morningside).
    *   **Switching**: Easy toggle to nearby areas.

## 4. Technical Implementation Guidelines

1.  **Classify First**: Every input must resolve to `'province' | 'city' | 'suburb'` using Google Places Types or internal lookup tables **before** the router takes over.
2.  **State Management**: The URL is the single source of truth (`?city=...` or `?suburb=...`).
3.  **Discovery Separation**: `ProvincePage.tsx` and `SearchResults.tsx` remain completely separate components to prevent logic pollution.

## 5. SEO & Indexing Rules

*   **Internal Search = NoIndex**: Search result pages generated via internal search interaction (query params) should be marked `noindex, follow` or point canonicals to the clean SEO page to prevent index bloat.
*   **External Traffic = Index**: SEO landing pages (`/property-for-sale/gauteng`) are the primary indexed assets.

## 6. Edge Case Handling

*   **Ambiguity**: If a search term matches both a City and a Suburb (e.g. "Nelspruit"), **Prefer Suburb** (Higher intent certainty).
*   **Unclassified**: If location cannot be classified, redirect to generic search (`/property-for-sale`) with the text as a keyword.
*   **Null Results**: If a specific location yields 0 results, show "Nearby" or "Parent Location" results to avoid a dead end.

## 7. Definition of Done
*   [ ] **Routing**: "Gauteng" -> SEO Page. "Sandton" -> Search Results.
*   [ ] **Sidebar**: Sidebar is location-aware. It knows if we are in a City or Suburb scope and adapts accordingly.
*   [ ] **No Dead Ends**: Every search leads to either content (SEO) or results (Search).
