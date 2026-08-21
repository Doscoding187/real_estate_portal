# COMM-S0 — Commercial Product Doctrine & Canonical Authority

**Status:** Canonical foundation; no public Commercial journey is activated by this document.

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

## COMM-S0 boundaries

The first consumer slice is leasing across `office`, `industrial_logistics`, and `retail`. The foundation supports `sale`, but does not build Commercial sale/investment discovery.

This authority deliberately does not implement public routes, search, authoring UI, matching, tenant requirements, CRM workflows, market intelligence, formal valuation, or an availability-freshness policy window.

## Trust rules

- Availability state, source, timestamp and reconfirmation due date are explicit.
- Economic inputs declare `supplied`, `estimated`, `unknown`, or `not_applicable`; calculated results are labelled `calculated` and never stored as asserted marketing facts.
- Specification codes are a governed vocabulary with typed values. `propertyDetails` JSON is not Commercial authority.
- Analytical cost estimates are not professional valuation or appraisal.

## Existing-platform boundary

Platform geography, users, Listing Engine media/revision/review/publication, and lead delivery remain reusable downstream dependencies. `properties` and `propertyType=commercial` are neither Commercial identity nor availability authority.
