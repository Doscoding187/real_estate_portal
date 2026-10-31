# National geography totals — 2026-10-31
**Basis:** GitHub `main` at `0b7ae664`; nine packages in `data/place-admission-territories.v0.2/territory-registry.v0.2.json`. Raw Place rows match each province registry count; no production database read.
**Columns:** records / active listing-search eligible / public-page eligible (publication flag, verified identity, active lifecycle).
Gauteng 1,465 / 1,433 / 68; Western Cape 1,862 / 1,102 / 418; KwaZulu-Natal 2,090 / 1,570 / 276.
Eastern Cape 5,084 / 4,634 / 290; Free State 1,544 / 1,297 / 105; Mpumalanga 1,045 / 795 / 52.
Limpopo 1,669 / 1,493 / 71; North West 1,352 / 1,162 / 60; Northern Cape 1,552 / 1,321 / 686.
**Total:** 17,663 / 14,807 / 2,026. The registered files contain 720 OSM-only rows, all in the Gauteng package.
**Correction:** 17,664 / 14,808 is one high; current Gauteng v0.3 has 1,465 records and 1,433 listing-search eligible.
**Product meaning:** the listing selector calls database-backed `placeAuthority.discover`; package eligibility does not prove production currently offers those options. Production totals and installed data version are unverified.
The historic 16,944 figure is the pre-2026-10-20 protected subset in older release records; it is not a verified current production count.
**Sitemap source, not live proof:** the checked-in URL projection has 14,807 paths; 2,026 pass the published-place filter, and the sitemap route adds the country URL. The reported three Place URLs do not match this code and projection; live response is unverified.
**Release-rule conflict:** Edward's standing decision accepts OSM with attribution; D3 and the earlier data loader retain a production ODbL gate. The newer release builder includes OSM rows but still reports that gate uncleared. Resolve before release; no flags changed.
**Not verified:** `pnpm db:authority:status` could not run in this worktree (`tsx` dependency missing). This report makes no claim about local service or production database status.
**Sources:** `data/place-admission-territories.v0.2/territory-registry.v0.2.json` and registered Place JSONL; `client/src/components/location/CanonicalPlaceSelector.tsx`; `server/services/placeDiscoveryService.ts`; `data/place-url-projection-national-v0.1.json`; `server/routes/sitemap.ts`; `docs/architecture/geography-coverage-contract.md` (D3); `docs/architecture/launch-readiness-and-product-convergence/64-location-model-and-licensing-decision-2026-10-20.md`.
