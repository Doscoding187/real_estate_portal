# Discovery Engine MVP Readiness - 2026-07-10

## Decision

Discovery/Search is the buyer-conversion layer between a published property and
an attributable Agency lead. Its MVP is complete when a buyer can find public
inventory by location, reach the correct public property detail, and submit an
enquiry that is routed by canonical listing/property ownership.

It does not own listing authoring, review, publication, video feeds, ranking,
or a replacement of every legacy SEO/location route. Those remain Listing and
Explore work, with larger SEO consolidation deferred until the revenue path is
stable.

The next engineering sequence is:

1. Run Discovery against production-configured published inventory.
2. Confirm a staging buyer enquiry reaches the owning agency workspace.
3. Move to Explore and make it consume the same public listing/media contract.

The core conversion path is:

`published listing -> public property projection -> location search/results ->
property detail -> agency-attributable enquiry`

## MVP Scope

The release scope includes:

- Public search results and filter counts sourced from publicly visible
  properties.
- Public property detail entry points, images, and contact actions.
- Location autosuggest that uses Google Places when available and a public
  database catalog fallback when it is not.
- A fallback from classic location-tree gaps to public property city/province
  values, so imported/legacy inventory remains discoverable before a data
  backfill is complete.
- Lead attribution to the source listing's agency, with property agent/owner
  membership only as legacy fallbacks.

## Invariants

- `listings` remains the canonical inventory record; a public `properties`
  record is a projection and keeps `sourceListingId`.
- Only public property statuses are eligible for public images, results, and
  detail access. Non-public records must not leak media through public APIs.
- Location fallback expands discovery only for `available` or `published`
  properties. It never makes draft, rejected, archived, or private inventory
  discoverable.
- A buyer-selected location is expressed through the existing URL/search
  contract; the fallback does not introduce a second search state.
- Public lead ownership is server-derived. A client cannot use search or
  property-detail input to assign another agency.
- Google Places is an enhancement, not a requirement for buyer location
  search. The database fallback stays within the existing province/city/suburb
  response contract.

## Evidence Completed Locally

- The public search/detail/lead ownership contract suite passes, including
  non-public image protection.
- A persisted local-database integration test passes for a public catalog city
  not present in the classic location tree.
- The LocationAutosuggest fallback component test passes.
- Browser verification confirms a buyer can type `Sandton`, select the
  database-backed city result, navigate to the scoped sale-results URL, see
  only the matching public listing, and open its property detail.

## Release Gates

Before declaring Discovery live in production:

1. Run the search/detail/lead ownership suite and a staging browser journey
   against production-like public inventory.
2. Submit one staging enquiry from a public property and confirm it appears in
   the correct agency workspace, with no client-selected agency override.
3. Verify Google Maps configuration if it is enabled. If it is absent or
   unavailable, verify the database location catalog returns useful live
   listings for the launch regions.
4. Check search result, public image, and property-detail responses for a
   rejected or private listing before launch.

## Deferred Discovery Work

- Consolidate the two location schemas and hard-coded navigation location
  menus behind a single canonical location catalog.
- Define canonical SEO paths consistently for province, city, and suburb
  searches, then consolidate duplicate canonical tags and legacy redirects.
- Add aliases, township/estate/development location types, popularity signals,
  and ranked discovery suggestions.
- Make search analytics, saved-search alerts, and broader discovery content
  part of a measured acquisition iteration rather than the first revenue MVP.

## Top Risks

1. Incomplete location data could hide legitimate launch inventory. Mitigation:
   fall back only to active public property city/province values and add a
   staging check for every launch region.
2. A future public endpoint could bypass visibility or ownership rules.
   Mitigation: keep public-status and lead-attribution checks server-side, and
   retain contract coverage for private images and source-listing agency
   ownership.
