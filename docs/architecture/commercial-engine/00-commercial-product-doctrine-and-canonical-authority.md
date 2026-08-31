# COMM-S0 — Commercial Product Doctrine & Canonical Authority

**Status:** Canonical authority for the active Commercial leasing MVP. Public
sale/investment discovery and governed zoning evidence remain deferred.

## Product promise

Property Listify Commercial helps a business assess whether a space can work for it, beginning with trustworthy availability and understandable lease economics. It is not a Buy/Rent property-type filter.

## Authority model

```text
Commercial Asset → Commercial Space → Commercial Availability
                                            ├→ Economics inputs
                                            └→ Existing Listing Engine (marketing link)
```

- **Asset** is the persistent physical-world identity: building, park, centre, or standalone premises.
- **Space** is the independently occupiable or transactable identity within that asset.
- **Availability** owns time-sensitive lease/sale state, occupation timing, confirmation source and reconfirmation due date.
- **Economics** owns supplied and estimated commercial cost inputs. Calculated occupancy totals are deterministic read models; unknown inputs remain unknown.
- **Listing** owns marketing authoring, revision, review and publication only. Its publication never proves a space remains available.

One Asset can contain many Spaces. One Space can have historical or distinct lease/sale Availability records. A Listing is linked to one Availability and can be replaced without changing the Asset or Space identity.

## Active Commercial leasing journey

The first consumer slice is leasing across `office`, `industrial_logistics`,
and `retail`:

```text
author verified commercial inventory
  → Listing review and publication
  → /commercial canonical-location search
  → /commercial/:slug fact and Cost Passport detail
  → consented enquiry against the Listing + Availability
  → recipient re-verification and Commercial lead context capture
```

- The authoring workspace creates the Asset, Space, Availability, economics,
  lease terms and governed specifications before it creates the linked
  marketing Listing. It accepts only an approved Agent or agency principal
  with a canonical enquiry recipient.
- Public discovery selects `office`, `industrial_logistics`, and/or `retail`
  explicitly. Asset and space kinds must be compatible with that selected use;
  the free-form Listing never supplies this classification.
- Public location scopes use canonical province, city or suburb IDs. A typed
  location is resolved only to an exact canonical slug; invalid or mixed
  location authority fails closed rather than widening the search.
- Search and detail expose rentable/usable area, availability provenance,
  gross-versus-componentised rental basis, VAT treatment, known and unresolved
  recurring costs, lease terms, parking and use-specific operational facts.
- Public availability includes only current confirmed or confirmed-upcoming
  lease records. A reconfirmation deadline that has passed is treated as
  `needs_reconfirmation` and is not publicly discoverable.
- A publishable rental quote requires a supplied or estimated base rental for a
  componentised quote, or a supplied or estimated gross rental for a gross
  quote. Supplementary charges may remain explicitly unknown and therefore can
  never be silently included as R0.
- The enquiry boundary re-resolves the publicly eligible Listing and
  Availability, then verifies that the materialized Agent or agency recipient
  remains deliverable. It persists the Commercial Asset, Space and Availability
  context with the lead; UI copy only promises direct handoff after verified
  delivery.

## Deferred scope

- `sale` records remain a foundation capability only. There is no public
  Commercial purchase/investment discovery route or sale-price contract yet.
- Zoning and permitted-use evidence do not yet have a governed Commercial
  record. They must never be inferred from the asset kind, space class or
  marketing copy; public and authoring surfaces state that the advertiser must
  confirm them until that authority is introduced through the database-change
  protocol. [COMM-S1](./01-commercial-sale-and-zoning-authority-design.md)
  freezes the future model without activating it.
- Tenant-requirements matching, CRM workflows, market intelligence and formal
  valuation are outside this slice.

## Trust rules

- Positive availability claims (`available_confirmed` and `available_upcoming`) require source, confirmation timestamp and reconfirmation due date. Upcoming availability also requires an occupation date. Public discovery treats elapsed reconfirmation deadlines as stale and removes the record until it is reconfirmed.
- Economic inputs declare `supplied`, `estimated`, `unknown`, or `not_applicable`; calculated results are labelled `calculated` and never stored as asserted marketing facts.
- Specification codes are a governed vocabulary with typed values. Database constraints require exactly one value only for `known` and no hidden value for `unknown`, `unavailable` or `not_applicable`; `shared/commercial-domain.ts` is the canonical code-to-value-kind write contract. This avoids a brittle SQL code/type matrix while preventing arbitrary forms in future authoring. `propertyDetails` JSON is not Commercial authority.
- Analytical cost estimates are not professional valuation or appraisal.

## Existing-platform boundary

Platform geography, users, Listing Engine media/revision/review/publication, and lead delivery remain reusable downstream dependencies. `properties` and `propertyType=commercial` are neither Commercial identity nor availability authority.
