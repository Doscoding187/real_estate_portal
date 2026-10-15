# Suburb Guide Transactional Discovery

**Date:** 15 October 2026
**Worktree:** `feat/suburb-guide-discovery-20261015`
**Scope:** Neutral province/city/suburb guide routes, piloted with Sandton local context

## Product direction

At suburb depth, the reader has chosen a precise area and should be able to
compare separate paths without interpreting tabs. Sale, rental and development
inventory therefore have distinct sections and exact-area feeds. Developments
are presented as projects, not as a transaction category: the project itself
may contain different unit offers, which the visitor inspects on its detail
page.

The guide combines transactional discovery with an area snapshot, sourced
parent-city context, local agent profiles, and a searchable city directory.
It does not silently add adjacent Johannesburg neighbourhoods. The city
directory shows current eligible listing counts when available and makes clear
that inventory volume is not search popularity or geographic distance.

## Portal patterns reviewed

- [Zillow's city and neighborhood insights](https://www.zillow.com/region-insights/)
  pair concise local character with separate home-value and rental signals,
  then connect those comparisons to deeper neighborhood pages. This informed
  the area snapshot and the decision to keep sale and rental supply distinct.
- [Redfin's Chicago neighborhood guides](https://www.redfin.com/blog/neighborhoods/chicago/)
  combine neighborhood overview, attractions, restaurants, shopping, schools,
  transportation, market insights and listings. This informed the wider guide
  structure beyond an inventory-only page.
- [Square Yards' Mumbai locality directory](https://www.squareyards.com/mumbai-real-estate)
  combines local descriptions and lifestyle categories with separate sale,
  rental and new-project counts, then links to rates and locality insights.
  Its city pages also expose developer discovery. This informed the separate
  project rail and the local-area comparison path; Property Listify does not
  copy its unverified sample prices.
- [Homes.com's neighborhood search](https://www.homes.com/neighborhood-search/)
  pairs a short description with listing availability and gives users ways to
  compare neighborhoods. This informed the searchable sibling-area rail.
- [Private Property's Southern Suburbs neighbourhood guide](https://www.privateproperty.co.za/neighbourhoods/cape-town-southern-suburbs/58)
  keeps sale and rental previews separate, then adds a map, local imagery and
  resident context. This informed the independent rental section and the
  source-backed area chapter.
- [Property Finder's Al Barari guide](https://www.propertyfinder.ae/en/area-insights/dubai/al-barari)
  remains a useful precedent for tying an area guide to distinct transaction
  journeys and a project feed. Property Listify keeps the project identity
  separate from its transaction type.

These are interface patterns, not evidence that a particular arrangement will
improve Property Listify conversion. Product analytics should validate the
result after broader rollout.

## Current presentation

- The page has a page-level jump rail, not transaction tabs inside the project
  section.
- Sale and rental sections each use the existing exact-suburb public home feed,
  which can include eligible development-derived units in the same property
  card format as resale homes.
- The project section uses the existing exact-suburb public residential project
  feed. Project publishers appear on cards when supplied. The UI does not
  introduce auction inventory or change project eligibility.
- The market snapshot reports eligible listing counts and the sale/rent mix. It
  explicitly describes Property Listify supply, not total market inventory or
  demand.
- The city comparison rail preserves canonical city scope, supports search, and
  shows each area's current sale/rental counts when available. It does not label
  inventory ranking as a search trend or distance ranking.
- The Sandton context chapter uses the City of Johannesburg Region E source and
  clarifies that regional context does not widen property results.

## Data and scope rules

- The suburb record is resolved through the current province → city → suburb
  hierarchy. A mismatched route does not fall through to an unverified place.
- The existing location summary counts eligible property records but does not
  share the photo-ready filter used by the public feed, so those counts are not
  shown here. No median, average, price range or trend is shown on this page.
- Buy and Rent use the existing public home feed. It requires photo-ready
  listings and, for development-derived units, available stock. Development
  units appear in the same card style as other homes, labelled by transaction
  intent; a sale unit is marked “For sale · Off-plan”.
- The New developments pill uses the existing public-development search. It
  does not use draft development records or widen to a parent city when empty.
  This guide also hides project cards without a usable image; the seeded local
  projects in the current demo lack images and therefore do not appear.
- Search handoffs use the suburb's canonical location ID. Generic suburb
  shells remain noindex until unique local content is reviewed; the Sandton
  guide can index only after its source city guide is published.
- The Johannesburg Region E reference comes from the [City of Johannesburg](https://joburg.org.za/about_/regions/Pages/Region%20E%20-%20Sandton%2C%20Alexandra/region-e.aspx).

The preview database for this worktree contains canonical geography but no
property listings, published developments, or public agent inventory. Its
zero counts and empty rails are therefore the real empty state, not seeded
fictional data. It cannot validate populated card appearance or market
statistics. The current suburb service's blended average does not distinguish
sale prices from rents, and the legacy analytics record is not scoped to a
reliable current sample here; neither is exposed as a price insight. A future
market module needs transaction-specific, property-type-aware statistics,
sample thresholds and a visible calculation date before showing median prices,
price bands or trends. Auction inventory also remains outside this UI change.

## Pilot boundary

All neutral suburb-guide routes use this presentation and the same canonical
locality verification. Transactional sale/rent routes remain on their existing
search pages. Only Sandton has the source-backed Region E paragraph in this
pilot; other suburbs receive parent-city context until their own editorial
content is reviewed. The local screenshots contain seeded demo data and are not
representative of production availability.
