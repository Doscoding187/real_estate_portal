# Suburb Guide Transactional Discovery

**Date:** 15 October 2026
**Worktree:** `feat/suburb-guide-discovery-20261015`
**Scope:** Neutral province/city/suburb guide routes, piloted with Sandton local context

## Product direction

At suburb depth, the reader has already chosen a precise area. Put currently
available homes, rentals and developments at the top of the page. Keep the
selected area visible, make Buy, Rent and New developments one tap away, and
place the neighbourhood context below the live inventory.

The suburb guide is a handoff into exact-area listings. It does not silently
add adjacent Johannesburg neighbourhoods. A separate link returns to the
Johannesburg guide when a visitor wants to compare areas.

## Portal patterns reviewed

- [Property Finder: Al Barari area guide](https://www.propertyfinder.ae/en/area-insights/dubai/al-barari)
  pairs local context with Buy, Rent and New Projects, filters, a market overview
  and listing cards. The pilot adapts the transaction switches and direct
  inventory handoff, while omitting market-price statistics that Property
  Listify cannot currently substantiate for this suburb.
- [Private Property: Sandton neighbourhood](https://www.privateproperty.co.za/neighbourhoods/sandton/34)
  puts sale and rental previews inside the neighbourhood guide, then adds local
  context and ways to continue exploring. The pilot follows that sequence.
- [Private Property: Sandton sale results](https://www.privateproperty.co.za/for-sale/gauteng/johannesburg/sandton/34)
  separates Buy and Rent journeys, property categories, developments, alerts
  and alternative areas. The pilot keeps the transaction choices and project
  path together while requiring a separate action before leaving Sandton.
- [Property24: Sandton sale results](https://www.property24.com/for-sale/sandton/gauteng/109)
  makes stock counts, category choices and listing cards prominent. Its broad
  “Sandton” result page includes many distinct local place labels; the pilot
  therefore makes the current selected area explicit and uses the app's
  no-fallback public feed.

These are interface patterns, not evidence that a particular arrangement will
improve Property Listify conversion. Product analytics should validate the
result after broader rollout.

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

## Pilot boundary

All neutral suburb-guide routes use this presentation and the same canonical
locality verification. Transactional sale/rent routes remain on their existing
search pages. Only Sandton has the source-backed Region E paragraph in this
pilot; other suburbs receive parent-city context until their own editorial
content is reviewed. The local screenshots contain seeded demo data and are not
representative of production availability.
