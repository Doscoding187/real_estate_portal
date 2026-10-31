# National geography totals — 2026-10-31
**Basis:** GitHub `main` at `0b7ae664`; the nine province packages named by the national registry. Raw Place rows match each province count; no production data read.
**Columns:** all places / active places usable in listing-form search / public-page eligible (publication flag, verified identity, active status).
Gauteng 1,465 / 1,433 / 68; Western Cape 1,862 / 1,102 / 418; KwaZulu-Natal 2,090 / 1,570 / 276.
Eastern Cape 5,084 / 4,634 / 290; Free State 1,544 / 1,297 / 105; Mpumalanga 1,045 / 795 / 52.
Limpopo 1,669 / 1,493 / 71; North West 1,352 / 1,162 / 60; Northern Cape 1,552 / 1,321 / 686.
**Total:** 17,663 / 14,807 / 2,026. There are 720 OSM-only rows (OpenStreetMap as the sole source), all in the Gauteng package.
**Correction:** 17,664 / 14,808 is one high; current Gauteng v0.3 has 1,465 records and 1,433 listing-search eligible.
The listing form queries the database; package counts do not prove which options production serves. Founder reports production loaded on 10 October, but today's production counts and data version are unverified.
The historical 16,944 is the pre-20-October protected subset in older release records, not a verified current production count.
**Sitemap source, not live proof:** the checked-in place URL list has 14,807 paths; 2,026 pass the current public-page filter, and the sitemap adds the country URL. The reported three Place URLs conflict with this code and list; live response is unverified.
**Release-rule conflict:** the standing founder decision accepts OSM with attribution; geography rule D3 and the earlier data loader retain a production ODbL (OpenStreetMap database licence) gate. The newer release builder includes OSM rows but still reports that gate uncleared. Resolve before release; no flags changed.
**Not verified:** the local database-status command could not start because its `tsx` runner is missing. No local-service status or production database state is claimed.
**Sources:** `data/place-admission-territories.v0.2/territory-registry.v0.2.json` and registered Place JSONL; `client/src/components/location/CanonicalPlaceSelector.tsx`; `server/services/placeDiscoveryService.ts`; `data/place-url-projection-national-v0.1.json`; `server/routes/sitemap.ts`; `docs/architecture/geography-coverage-contract.md` (D3); `docs/architecture/launch-readiness-and-product-convergence/64-location-model-and-licensing-decision-2026-10-20.md`.
