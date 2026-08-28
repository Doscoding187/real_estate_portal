# Property Listify public property detail — build framework

## Product job

The detail page turns a prospect from recognition into a confident next step:

1. **Recognition:** identify the home, its public location, and its media.
2. **Evaluation:** establish price, type-aware physical facts, and the buyer checks that matter.
3. **Exploration:** explain the home through advertiser-supplied description and structured features.
4. **Due diligence:** offer public location intelligence only when real data exists.
5. **Trust and conversion:** identify the authorised representative and offer one accountable enquiry/viewing flow.
6. **Continued discovery:** offer constrained, relevant public alternatives.

This is a buyer journey, not an expanded search card or an agent advertising page.

## Canonical authority

For the first launch slice, this applies to approved, published manual Buy/Rent listings only.

```text
listing authoring aggregate
  → review + entitlement + approval transaction
  → public property projection and approved media mirror
  → public eligibility resolver (fail closed)
  → public detail presentation DTO
  → responsive property-detail page
  → canonical lead custody on enquiry/viewing
```

The approved source listing is fact authority. The `properties` projection remains the public read-model/coherence evidence; it is not a second authoring system. Land, commercial, development, and shared-living pages retain their own specialist contracts until a shared discriminated public-detail model can represent their facts truthfully.

## Future public API shape

Replace loose generic property JSON on `properties.getById` with one server-owned `PublicPropertyDetail` presentation. The client must render it rather than parse `amenities`, `features`, `propertyDetails`, or pricing aliases.

```ts
type PublicPropertyDetail = {
  identity: {
    id: number;
    title: string;
    listingType: 'sale' | 'rent';
    propertyType: PublicPropertyType;
  };
  navigation: { returnScope: 'for-sale' | 'to-rent'; breadcrumbs: PublicBreadcrumb[] };
  location: PublicLocationPresentation;
  media: PublicMediaPresentation;
  price: PublicPricePresentation;
  heroFacts: PublicFact[]; // type-aware, ordered, at most four
  buyerChecks: PublicBuyerCheck[]; // six focused, ordered buyer-readiness facts
  overview?: { preview: string; full: string };
  featureGroups: PublicFeatureGroup[];
  contextFacts: PublicFact[];
  runningCosts: PublicRunningCost[];
  representative: PublicRepresentative;
  sections: PublicDetailSectionAvailability;
};
```

All display labels, ordering, applicability and absence state belong to the server/shared contract. The browser may format layout, not interpret publication JSON.

## Hero rules

### Media is a canvas

- The main image remains emotionally dominant.
- Photo count, video, floor plan, virtual tour and public documents appear in the gallery only when approved media actually exists.
- Thumbnail browsing is useful when there are multiple photos; a one-photo listing does not pretend to be a rich gallery.
- Media must not be duplicated below the hero as a second unrelated interaction system.

### Price is the commercial anchor

- Asking price/monthly rent is the strongest commercial signal.
- Transaction type and pricing qualification may support it but do not compete with it.
- No generic “Agent” price badge; the representative appears in its own accountable area.

### Hero facts are property-type-aware

The contract selects four facts based on the property and transaction, for example:

| Kind                      | Priority facts                                                             |
| ------------------------- | -------------------------------------------------------------------------- |
| House / freestanding home | internal size, bedrooms, bathrooms, erf/yard size                          |
| Apartment                 | floor size, bedrooms, bathrooms, parking where known                       |
| Townhouse / cluster       | internal size, bedrooms, bathrooms, erf or parking                         |
| Land / farm               | land size, zoning, servicing, road access — only in its specialist journey |
| Commercial                | specialist contract, never a residential metric masquerade                 |

### Buyer checks are a decision registry, not screenshot decoration

The hero supports **six focused buyer-readiness checks**. Each check has a typed state:

- `known`: show the published fact.
- `not_supplied`: show a clear, neutral absence state where the question is applicable.
- `not_applicable`: omit it rather than filling a cell.

The residential registry is deliberately fixed to these six questions; it is
not a generic feature dump:

1. electricity supply
2. water supply
3. solar / backup power
4. concise confirmed security detail
5. internet / fibre
6. pet policy

Security is one buyer question, not two tiles. The hero uses the most material
confirmed operational fact, such as a 24-hour guard. Its direct setting—one of
Security estate, Gated community, Standard security, or Not sure—belongs in
Property context below. Rates, taxes and an applicable levy are conditional
Property costs below the fold: they are shown only when the approved listing
contains a confirmed figure. Sewerage can remain a supporting utility fact
where it is genuinely supplied; it does not consume scarce hero space.

## Content rules

### Overview

Show a 2–3 sentence advertiser-supplied preview followed by an explicit expand control. Do not invent editorial language or show a visually empty two-line card as a full “about” experience.

### Spaces & features

Group structured facts into meaningful categories such as Spaces, Utilities & resilience, Security, and Listing highlights. The group and its items only render from canonical feature context or explicitly supported core facts.

### Property context

Keep “what it has” distinct from “what it is.” Context includes ownership/type, sizes, year built, setting, access, and other legitimate public title/development facts.

### Location intelligence

#### MVP boundary — implemented now

- The detail page renders a server-owned public location presentation derived
  only from the approved public projection: public label, public precision and
  public coordinates where available.
- An exact public location may be shown as an exact map location. An
  approximate location is explicitly labelled **Approximate area location**;
  its marker and Google Maps handoff describe the area, never the home itself.
- If no public coordinates or usable map preview exists, the public location
  context remains visible. The experience does not manufacture a map, a pin or
  nearby places simply to fill a card.
- The property-detail page does **not** call the generic live nearby-places
  endpoint. That endpoint accepts arbitrary provider types, uses a fixed
  radius, fails silently to an empty array and ranks only by straight-line
  distance. A returned provider result is not, by itself, credible marketplace
  location intelligence.
- Approximate public centroids are not emitted as the listing's exact Schema.org
  `geo` value.

#### Follow-on: Location Intelligence V1

Nearby landmarks are valuable, but they are a data product rather than a
front-end tab set. Do not add them to the public detail page until a dedicated
workstream establishes a governed location-context authority with:

1. one canonical geography scope for each request (suburb, city or approved
   public coordinate context), with precision-aware copy;
2. a curated landmark catalogue or governed provider-ingestion pipeline with
   canonical identity, category, source/provenance, freshness, coverage and
   public-display status;
3. category policies that choose meaningful anchors — for example a major
   school, hospital, shopping centre or transport interchange — rather than
   every nearby shop or provider result;
4. relevance ranking that first applies eligibility and category importance,
   then uses distance as a tie-breaker rather than the only ranking signal;
5. a small buyer-oriented result set (normally one to three meaningful anchors
   per category), transparent absence/freshness states and measurable quality;
   and
6. language that says “around this public area” for approximate listings, and
   only uses property-relative wording when an exact public pin is authorised.

The existing `amenities` table is not a runtime source of truth for this
experience and lacks the governance above. It must not be revived as an
implicit landmark authority; any schema or ingestion work belongs to the
separate Location Intelligence V1 workstream.

### Trust and conversion

- Representative identity comes exclusively from `PublicPropertySupplyIdentity` resolved by eligibility.
- Do not claim verification, response time, agency quality, finance eligibility, or availability unless the platform can prove it.
- “Send enquiry” and “Request a viewing” invoke the existing canonical lead flow. A viewing request never claims an appointment is confirmed.
- Desktop keeps a secondary representative/contact rail; mobile keeps the property primary and uses the persistent action bar.

### Continued discovery

Use the existing constrained public related-inventory query. It must remain bounded by the opened listing’s approved transaction, property type, and governed public geography.

## Deliberate retirements in this workstream

- client-side JSON `try/catch` parsing of public property fields;
- duplicated media reconstruction from `images`, `media`, `property.media`, and raw fallbacks;
- client-side price and core-area recomputation;
- generic `features`/`amenities` alias precedence;
- generic badge-derived public detail claims;
- simultaneous static-map and JavaScript-map rendering in one property-detail location region;
- generic live-provider nearby-landmark queries from the property-detail page;
- section navigation that advertises sections with no meaningful content.

## Responsive posture

Desktop pairs emotional media and decision data side-by-side. Mobile protects the sequence rather than mechanically stacking cards:

1. title/location/actions;
2. primary media;
3. price and concise facts;
4. persistent two-action conversion bar;
5. progressive exploration sections;
6. representative and related inventory.

## Acceptance conditions

- A buyer can answer what, where, price, physical scale, primary buyer checks, and next action without scrolling on a normal desktop.
- A house foregrounds yard/erf scale; an apartment does not pretend it has one.
- No unsupported fact, “verified” claim, timing promise, nearby landmark, or finance offer is fabricated.
- All public facts trace to the approved listing contract and public eligibility boundary.
- An approved listing edit cannot create a mixed old/new public presentation.
- The same public detail input renders accessibly on desktop and mobile, with appropriate loading, unavailable, map-failure and no-media states.
