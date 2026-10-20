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
  project rail and the local-area comparison path; its prices are not presented
  as Property Listify market data.
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

## Section-by-section reference review

The supplied screenshots make the intended page a decision workspace: compact
market evidence, place context, transaction discovery, and trustworthy local
connections. They do not call for a long-form article template.

| Reference pattern                                | Current Property Listify state                                                                                                                                                                              | Decision                                                                                                                                                                               |
| ------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Area identity and jump navigation                | The suburb hero identifies the canonical area; a horizontal anchor rail jumps to page sections.                                                                                                             | Keep. The selected suburb remains explicit throughout.                                                                                                                                 |
| Sale and rent market panels                      | The top snapshot reports current eligible inventory. A new panel separates sale and rent, charts current supply by property type, and compares available medians by type and bedroom band.                 | Added. Asking-price medians use eligible offers, show the calculation date, and stay hidden below ten priced examples per group.                                                       |
| Price history, growth and completed transactions | No governed historic time series or completed-sale transaction source is exposed to this page.                                                                                                              | Do not imitate the chart with current asking prices. Add only after a dated source and calculation contract exist.                                                                     |
| Sale, rental and project discovery               | Separate exact-suburb sale, rental and residential-project carousels are already present. Project cards show their publisher where available; eligible development units can appear in the sale/rent cards. | Keep the rails separate. A project is not a transaction type.                                                                                                                          |
| Map and nearby amenities                         | The guide uses the canonical suburb centre and a two-kilometre search radius. Provider failures are separate from a successful search with no results.                                                        | Added with explicit boundary and approximate-centre language. The map is orientation only; a provider outage does not claim that the area has no amenities.                            |
| Nearby areas and comparison                      | A searchable carousel links to other verified suburbs under the selected city and reports current listing counts when supplied. It is inventory-ranked, not a distance or search-popularity ranking.        | Keep the scope statement. A later comparison table can reuse per-area medians only after the same sample rules are applied.                                                            |
| Regional and local character                     | Sandton has one sourced Region E passage. Other suburb routes do not yet have reviewed local editorial profiles.                                                                                            | Preserve source attribution. Do not clone the Sandton passage across unrelated suburbs.                                                                                                |
| Resident reviews and lifestyle scores            | No governed, verified resident-review or lifestyle-score source is available here. The legacy location-insights adapter is not a source for public claims.                                                  | Do not add generated reviews, ratings, safety scores, commute promises or demographic profiles.                                                                                        |
| Agents and developers                            | Public agent profiles can be resolved by the canonical suburb. Published projects show their publisher on the project card. The monetized featured-developer procedure is not implemented.                  | Keep organic, exact-area agent profiles and publishers attached to real projects. Do not present paid placements or “top” rankings without an approved authority and ranking evidence. |
| FAQs and practical guide content                 | No suburb-specific reviewed FAQ/content set is wired into this page.                                                                                                                                        | Add authored answers with sources and review dates before using them as SEO content.                                                                                                   |

The new modules follow the visual pattern in the supplied realestate.com.au
and Property Finder screenshots while keeping the facts narrower than those
portals' licensed market datasets. REA's Market Explorer describes sale and
rental medians, supply/demand comparisons, performance trends and surrounding
suburbs, with monthly refreshes; Property Finder's Palm Jumeirah guide combines
market insights and transactions with mapped amenities, schools, transport,
resident reviews and local experts. These patterns inform information
architecture only; their third-party statistics are not transferable to our
inventory. See [REA Market Explorer](https://help.realestate.com.au/hc/en-us/articles/9073367896345-How-to-use-the-Market-Explorer),
[Property Finder: Palm Jumeirah](https://www.propertyfinder.ae/en/area-insights/dubai/palm-jumeirah),
and [Redfin: Chicago neighbourhood guides](https://www.redfin.com/blog/neighborhoods/chicago/).

## Data prerequisites still open

- A historical asking-price series or trusted transaction feed is required for
  price movement, growth, sold counts, days on market, rental yield or demand.
- A governed locality-cluster hierarchy is required before nesting Morningside,
  Sandhurst and other Johannesburg neighbourhoods under a marketing label such
  as “Sandton”. The current canonical hierarchy resolves suburbs under a city;
  this page does not infer a second parent from text.
- Reviewed suburb profiles, source records, authorship and update policy are
  required before wider indexability. Generic suburb shells remain noindex;
  the local preview's data coverage is not proof of SEO readiness.
- A public local-developer directory and a ranking rule are required before a
  “top developers in this suburb” section. The disabled monetized placement
  endpoint is not an acceptable substitute.

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
- The existing location summary counts eligible property records; those counts
  are shown separately from the photo-ready feed previews. The median panel
  uses eligible exact-suburb offers, splits sale from rent, and suppresses each
  median unless at least ten priced examples support that group. It labels
  asking prices and does not claim to represent completed sales or the whole
  suburb market. No historical price trend is available.
- Buy and Rent use the existing public home feed. It requires photo-ready
  listings and, for development-derived units, available stock. Development
  units appear in the same card style as other homes, labelled by transaction
  intent; a sale unit is marked “For sale · Off-plan”.
- The New developments section uses the existing public-development search. It
  does not use draft development records or widen to a parent city when empty.
  This guide also hides project cards without a usable image.
- Search handoffs use the suburb's canonical location ID. Generic suburb
  shells remain noindex until unique local content is reviewed; the Sandton
  guide can index only after its source city guide is published.
- The Johannesburg Region E reference comes from the [City of Johannesburg](https://joburg.org.za/about_/regions/Pages/Region%20E%20-%20Sandton%2C%20Alexandra/region-e.aspx).

The preview database for this worktree contains canonical geography but no
property listings, published developments, or public agent inventory. Its
zero counts and empty rails are therefore the real empty state, not seeded
fictional data. It cannot validate populated card appearance or market
statistics. The local Places provider currently returns `REQUEST_DENIED`; the
guide reports that as an availability error rather than claiming there are no
nearby amenities. A separate historical or completed-transaction source is
still required for price changes, sold counts, days on market, rental yield or
demand. Auction inventory also remains outside this UI change.

## Pilot boundary

All neutral suburb-guide routes use this presentation and the same canonical
locality verification. Transactional sale/rent routes remain on their existing
search pages. Only Sandton has the source-backed Region E paragraph in this
pilot; other suburbs receive parent-city context until their own editorial
content is reviewed. The local screenshots show the true empty-inventory state
of this isolated worktree database and are not representative of production
availability.
