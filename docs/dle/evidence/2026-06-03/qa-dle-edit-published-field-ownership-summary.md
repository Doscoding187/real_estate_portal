# DLE Edit-Published Field Ownership Evidence

Date: 2026-06-03
Branch: `recovery/lead-routing-verification-2026-06-02`
Database: `listify_local`
Development id: `4`
Slug: `dle-qa-sale-flow-1780436367449-2vp50t`

## Result

Sale edit-published ownership proof passed for location, media, marketing highlights, governance/finance, and unit types.

The development remained:

- `isPublished = 1`
- `approvalStatus = approved`
- Visible in public list/search output
- Renderable on the public development page
- Able to capture a post-edit unit lead with commercial context

## Edits Proven

Location edit:

- Changed: `address`, `suburb`, `city`, `province`, `postalCode`
- Preserved: media, highlights, governance, unit types, pricing, inventory, approval/public visibility

Media edit:

- Changed: hero image, gallery image, brochure
- Preserved: location, highlights, governance, unit types, pricing, inventory, approval/public visibility

Marketing edit:

- Changed: description, tagline, public `Market Highlights`
- Preserved: location, media, governance, unit types, pricing, inventory, approval/public visibility

Governance/finance edit:

- Changed: `monthlyLevyFrom = 1350`, `monthlyLevyTo = 1650`, `ratesFrom = 950`, `ratesTo = 1250`, `transferCostsIncluded = 1`
- Preserved: location, media, highlights, unit types, pricing, inventory, approval/public visibility

Unit-types edit:

- Changed unit: `2 Bedroom Garden Apartment Edit Safe 1780478098342`
- Changed pricing: `priceFrom = 1800000`, `priceTo = 1850000`
- Changed inventory: `totalUnits = 12`, `availableUnits = 5`
- Preserved: location, media, highlights, governance, approval/public visibility

## Bug Found And Fixed

During proof, a partial unit-type edit exposed stale development-level inventory totals when the caller omitted top-level `totalUnits` and `availableUnits`.

Fix:

- `server/services/developmentService.ts` now derives development `totalUnits` and `availableUnits` from the effective unit set whenever unit types are edited.

Regression:

- `server/__tests__/integration.development-card-data-flow.test.ts`
- Test: `derives development inventory totals from partial unit-type edits`

## Public Output Evidence

Public page showed:

- `Edit-safe highlight 1780478098342`
- `2 Bedroom Garden Apartment Edit Safe 1780478098342`
- `R1.8M - R1.9M`
- Exact unit range `R 1 800 000 - R 1 850 000`

Screenshot:

- `docs/dle/evidence/2026-06-03/qa-dle-edit-published-public-page-final.png`

Public list/search output included:

- `transactionType: for_sale`
- highlights: `Edit-safe highlight 1780478098342`, `Prime Sandton address`, `Launch-ready investor units`
- configuration: `priceFrom: 1800000`, `priceTo: 1850000`

## Lead Evidence

Post-edit browser lead:

- Email: `dle-edit-lead-1780478249389@example.com`
- HTTP response: `200`
- Dialog closed after submit

Persisted lead:

- `developmentId: 4`
- `unit_id: unit-1780436383320-xxsr1lrnn`
- `unit_name: 2 Bedroom Garden Apartment Edit Safe 1780478098342`
- `unit_price_from: 1800000.00`
- `unit_bedrooms: 2`
- `unit_bathrooms: 1.5`
- `affordability_data.leadContext.transactionType: sale`
- `affordability_data.leadContext.unitPriceLabel: Price from`
- `funnel_stage: interest`
- `lead_source: development_detail_contact`

Screenshot:

- `docs/dle/evidence/2026-06-03/qa-dle-edit-published-lead-submitted.png`

## Autosave Call

Sale edit-published ownership no longer blocks autosave by itself.

Autosave should still wait until:

- rent edit-published ownership is proven
- auction edit-published ownership is proven
- resumed drafts are proven to restore media, documents, highlights, unit types, and readiness state
