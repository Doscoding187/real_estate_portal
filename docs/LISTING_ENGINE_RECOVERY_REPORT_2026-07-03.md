# Listing Engine Recovery Report - 2026-07-03

## Executive Verdict

The reconstruction branch is a trustworthy continuation point for the current
recovery work. `HEAD`, `origin/main`, and `origin/HEAD` all resolve to
`1138aef714466e051e0cbf179488a9e70f94c29c`.

The branch now contains five independently reviewable runtime slices plus one
documentation/evidence boundary:

1. Developer Listing Engine auction datetime normalization for database-safe
   publish/finalisation writes.
2. Isolated Single-Property Listing Engine V2 workflow foundation, without
   switching production away from V1.
3. Service-owned PDP journey injection from the clean services branch, wired
   through to lead creation context.
4. DLE finalisation submit-payload extraction, moving duplicated publish mapper
   logic into tested canonical helpers.
5. Single-Property listing lifecycle bridge hardening, making
   `properties.sourceListingId` the canonical public projection link for
   approval, media sync, archive, and delete flows.

No commits, pushes, PRs, broad merges, branch-wide cherry-picks, or schema
migrations were made.

## Previous Findings

Confirmed:

- `1138aef7` is the active baseline and matches `origin/main`.
- `d9d106c8` is a mixed checkpoint and must not be merged wholesale.
- `a94eb04e` is the clean services integration source.
- `9a2401f` contains useful V2 listing workflow work.
- `0da24e18`, `a019ad7e`, and `14af368d` contain useful Single-Property
  lifecycle contract and sourceListingId bridge hardening work.
- `e5f28f69` contains the DLE auction datetime fix proof and is not present in
  the current baseline.
- Navigation work represented by `c32751d` is not a current recovery target.
- The shared Git object store has stale/empty-object symptoms tied to an
  obsolete worktree registration.

Corrected or sharpened:

- Development-derived public delivery is not missing from scratch: current
  baseline already has `server/services/developmentDerivedListingService.ts`
  and `server/services/__tests__/developmentDerivedListingService.test.ts`.
- Several old development discovery branch tips are not clean recovery sources;
  their diffs include repo-wide deletions, schema churn, service/distribution
  changes, and unrelated UI work.
- V2 draft persistence is real work, but its backend implementation requires a
  `listings.draftData` migration and router/database changes. That is a schema
  decision and was not recovered here.
- The older DLE canonical mapper work could be recovered safely as a narrow
  helper/integration slice without taking its broader migrations or operating
  workflow branches.

Rejected for this recovery boundary:

- Broad merging or cherry-picking of `d9d106c8`.
- Production route switching from Single-Property V1 to V2.
- Pulling draft-backend V2 work that depends on a new schema column.
- Pulling broad development-discovery or DLE operating branches with migrations
  and unrelated product changes.

## Repository Health

Current verified facts:

- Reconstruction worktree:
  `/home/edwardspc/Desktop/Dev/listify-dle-reconstruction`
- Branch:
  `recovery/property-listing-engine-continuation-2026-07-02`
- `HEAD`, `origin/main`, `origin/HEAD`:
  `1138aef714466e051e0cbf179488a9e70f94c29c`
- `git rev-list --objects --all --missing=print | rg '^\\?'` produced no
  reachable missing objects.
- `git fsck --connectivity-only --no-dangling` passes.
- `git worktree prune` removed the stale `/tmp/listify-dle-worktree`
  registration after confirming the path did not exist and the corresponding
  remote branch ref was preserved.

Resolved Git hygiene issue:

- The previous failing pointer was an empty loose object referenced only by a
  stale worktree index cache-tree:
  `1425886bc21abe9f633cbc6852d3da956eff2d5b`.
- Before pruning, `/tmp/listify-dle-worktree` did not exist, the local
  `feature/developer-listing-engine-isolated` ref was not valid, and
  `origin/feature/developer-listing-engine-isolated` remained available at
  `ad74f3cb605085f9aefb284a4046b1ca5ade5e69`.

Interpretation: active refs are readable, no reachable objects are missing, and
the stale worktree metadata has been repaired.

## Ownership Decisions

- Developer Listing Engine owns development, phase, unit-type, unit inventory,
  development operating data, and derived public development delivery.
- Single-Property Listing Engine owns one sale/rental/auction listing,
  including development-linked single-property listings.
- Services journey injection is service-owned. PDP may provide property
  context, but it does not own the services flow or lead lifecycle.
- V2 listing workflow code is currently an isolated foundation. Production
  `/listings/create` remains V1 until parity is proven across drafts, edit,
  media, location, validation, preview, submit, and public delivery.
- Existing persistence was used. No schema migration was introduced.

## Valuable Sources Used

- `e5f28f69`:
  DLE auction date normalization proof.
- `9a2401f`:
  V2 listing workflow registry, workflow definitions, validation and payload
  adapter direction.
- `a94eb04e`:
  Clean property-services journey injection source.
- `recovery/dle-wizard-verification-2026-06-02`:
  DLE canonical submit-payload and transaction ownership helper source.
- `0da24e18`, `a019ad7e`, `14af368d`:
  Single-Property lifecycle contract, sourceListingId bridge hardening, and
  lower-level DB behavior tests.
- Current `origin/main`:
  canonical baseline and existing development-derived listing/public delivery
  implementation.

## Recovered Work

### 1. DLE Auction Datetime Normalization

Changed files:

- `server/services/developmentDateUtils.ts`
- `server/services/developmentService.ts`
- `server/services/publishNormalizer.ts`
- `server/services/__tests__/developmentService.auctionDates.test.ts`

What changed:

- Added `normalizeDateTimeForDb(value)` as the shared DLE datetime adapter.
- Updated development auction aggregation to normalize `datetime-local` values
  such as `2026-08-01T09:30` to `2026-08-01 09:30:00`.
- Updated unit persistence datetime coercion to use the same helper.
- Updated publish normalization to use the same helper for auction aggregation
  and top-level auction date fallback.
- Exported `computeAuctionRangeFromUnits` for focused tests.

Data path validated:

`development wizard unit auction dates`
-> `developmentService.computeAuctionRangeFromUnits`
-> `developmentService` create/update persistence payload
-> `publishNormalizer.normalizeForPublish`
-> database-safe `YYYY-MM-DD HH:mm:ss` values for public delivery.

### 2. Isolated Single-Property V2 Workflow Foundation

Changed files:

- `shared/listing-workflow-types.ts`
- `client/src/lib/workflows/listing/index.ts`
- `client/src/lib/workflows/listing/listing-sale.ts`
- `client/src/lib/workflows/listing/listing-rent.ts`
- `client/src/lib/workflows/listing/listing-auction.ts`
- `client/src/lib/workflows/listing/listingPayload.ts`
- `client/src/lib/workflows/listing/listingDraftPayload.ts`
- `client/src/lib/workflows/listing/listingSubmitReadiness.ts`
- `client/src/lib/workflows/listing/listingWorkflowValidation.ts`
- `client/src/lib/workflows/listing/__tests__/*.test.ts`

What changed:

- Recovered sale, rental, and auction workflow definitions.
- Recovered the workflow registry and shared workflow types.
- Recovered submit payload mapping from canonical wizard state.
- Recovered draft payload/hydration adapters.
- Recovered V2-to-V1 validation and dry-run readiness adapters.
- Kept all V2 work isolated from production routes.

Data path validated:

`V2 workflow state`
-> `listing workflow registry`
-> `workflow validation adapter`
-> `submit payload adapter`
-> `draft payload/hydration adapter`
-> focused tests.

Not claimed:

- No V2 backend persistence parity.
- No route switch.
- No full production parity.

### 3. PDP Service Journey Injection

Changed files:

- `client/src/features/services/propertyServiceActions.ts`
- `client/src/features/services/__tests__/propertyServiceActions.test.ts`
- `client/src/components/property/PropertyServiceActions.tsx`
- `client/src/features/services/LeadRequestFlow.tsx`
- `client/src/pages/services/ServicesRequestPage.tsx`
- `client/src/pages/services/__tests__/ServicesRequestPage.integration.test.tsx`
- `client/src/pages/PropertyDetailDesktopLegacy.tsx`
- `client/src/pages/PropertyDetailMobileOptimized.tsx`

What changed:

- Added listing-type-aware service actions for sale, rental, and auction PDPs.
- Added PDP action cards that link into `/services/request/:category` with
  sanitized property journey query context.
- Let `LeadRequestFlow` accept trusted journey context without exposing
  internal fields in the UI.
- Let `ServicesRequestPage` parse, sanitize, submit, and preserve property
  context around service lead creation.
- Wired desktop and mobile PDPs to render the service action component.

Data path validated:

`PDP property`
-> `PropertyServiceActions`
-> `/services/request/:category?propertyId=...&intentStage=...`
-> `ServicesRequestPage` sanitization
-> `LeadRequestFlow`
-> `servicesEngine.createLeadFromJourney`
-> session storage result context.

### 4. DLE Submit Payload Extraction

Changed files:

- `shared/developmentDerived.ts`
- `shared/developmentCanonicalSelectors.ts`
- `shared/developmentPayloadOwnership.ts`
- `client/src/lib/developmentTransactionPayload.ts`
- `client/src/lib/developmentTransactionPayload.test.ts`
- `client/src/lib/developmentSubmitPayload.ts`
- `client/src/lib/developmentSubmitPayload.test.ts`
- `client/src/components/development-wizard/phases/FinalisationPhase.tsx`
- `client/src/components/development-wizard/phases/FinalisationPhase.test.tsx`

What changed:

- Recovered transaction normalization and unit-pricing ownership helpers.
- Recovered canonical development selectors for step-owned wizard snapshots.
- Recovered submit/update/partial-update payload builders and tests.
- Rewired `FinalisationPhase` to call `buildDevelopmentSubmitPayload` for
  create/update/publish payloads instead of maintaining a second inline mapper.
- Kept the UI preview calculations local to the component.
- Added active finalisation-path coverage for create and edit publish flows.

Data path validated:

`DLE wizard canonical data`
-> `FinalisationPhase`
-> `buildDevelopmentSubmitPayload`
-> create/update publisher or developer mutation payload
-> `developmentService`
-> existing persistence/publication path.

### 5. Single-Property Lifecycle Bridge Hardening

Changed files:

- `docs/listing-engine/CANONICAL_LISTING_LIFECYCLE.md`
- `server/db.ts`
- `server/listingRouter.ts`
- `server/__tests__/contract.listing-lifecycle.test.ts`
- `server/__tests__/contract.listing-lifecycle-db.test.ts`

What changed:

- Recovered the canonical listing lifecycle contract.
- Added router-level lifecycle characterization coverage.
- Added lower-level DB contract coverage for approval idempotency, media sync,
  reject state guards, archive cascade, delete soft-archive, and bridge
  capability fallback.
- Updated `approveListing()` to upsert public projections by
  `properties.sourceListingId` instead of inserting duplicates.
- Updated approval media mirroring to replace `propertyImages` for the current
  listing media set.
- Updated published media sync to use `sourceListingId` first, with legacy
  matching only for unbridged rows and automatic bridge stamping.
- Updated archive/delete flows to hide linked public projections by
  `sourceListingId` without adding schema changes.
- Updated approve/reject router error handling so lifecycle-state errors are
  returned as tRPC `BAD_REQUEST`, while unrelated server errors remain
  `INTERNAL_SERVER_ERROR`.

Data path validated:

`Single-Property V1 listing`
-> `listingRouter`
-> `db.approveListing/update/archive/delete`
-> `properties.sourceListingId`
-> `propertyImages` mirror
-> public search/PDP projection identity.

## Verification

Passed:

- `pnpm vitest run server/__tests__/contract.listing-lifecycle.test.ts server/__tests__/contract.listing-lifecycle-db.test.ts client/src/components/development-wizard/phases/FinalisationPhase.test.tsx client/src/lib/developmentTransactionPayload.test.ts client/src/lib/developmentSubmitPayload.test.ts server/services/__tests__/developmentService.auctionDates.test.ts client/src/features/services/__tests__/propertyServiceActions.test.ts client/src/pages/services/__tests__/ServicesRequestPage.integration.test.tsx client/src/lib/workflows/listing/__tests__/listing-wizard-workflows.test.ts client/src/lib/workflows/listing/__tests__/listingDraftPayload.test.ts client/src/lib/workflows/listing/__tests__/listingPayload.test.ts client/src/lib/workflows/listing/__tests__/listingSubmitReadiness.test.ts client/src/lib/workflows/listing/__tests__/listingWorkflowValidation.test.ts`
  - 13 files, 185 tests passed.
- `pnpm type-check`
  - passed.
- `git diff --check`
  - passed.
- `pnpm build`
  - passed; existing Vite chunk-size warning only.
- `git worktree prune`
  - passed; removed stale `/tmp/listify-dle-worktree` registration only.
- `git fsck --connectivity-only --no-dangling`
  - passed.
- `git rev-list --objects --all --missing=print | rg '^\\?'`
  - no reachable missing objects.

Attempted but blocked by local environment:

- `pnpm exec playwright test e2e/wizard/development-wizard.spec.ts --project="Desktop Chrome" --reporter=list --output=/tmp/listify-playwright-results`
  - failed waiting for the configured web server.
  - backend startup reported missing `DATABASE_URL` and `JWT_SECRET`.
  - generated Playwright artifacts were removed.

## Scope And Contamination Audit

- No schema files were changed.
- No migrations were added.
- No broad feature branch was merged.
- `d9d106c8` was used only as evidence, not as a patch source.
- Services changes came from the service-owned source `a94eb04e` and were kept
  within PDP-to-services journey context.
- V2 workflow code is isolated under `client/src/lib/workflows/listing/` and
  shared type definitions; it does not replace V1 production UI.
- Single-Property lifecycle hardening is V1-safe and server-side; it keeps the
  existing router contracts while stabilizing the public projection bridge.
- DLE runtime changes are constrained to auction datetime normalization and
  finalisation payload mapping.
- DLE finalisation now depends on a tested mapper module, but still uses the
  existing create/update/publish mutations and persistence contracts.

## Remaining Risks And Dependency-Ordered Backlog

1. Provide local runtime env and rerun browser verification for development
   wizard, PDP service injection, and services request journey.
2. Audit any legacy public `properties` rows without `sourceListingId` and
   backfill where the canonical listing can be proven safely.
3. Decide the V2 draft persistence schema question:
   `feature/ile-phase3c-draft-backend` requires a new `listings.draftData`
   column before backend parity can be recovered.
4. Continue Single-Property V2 toward real parity:
   UI shell, drafts, edit, media, location, preview, submit, public delivery.
5. Classify older DLE operating/autosave branches into tiny, testable slices
   before recovering anything from them.
6. Reassess development discovery/detail branches only as file-level evidence;
   do not merge their branch tips.

## Recommended Commit Boundaries

1. `fix(dle): normalize auction datetimes for persistence`
   - DLE helper, service/normalizer changes, auction date tests.
2. `refactor(dle): extract canonical submit payload mapper`
   - shared DLE selector/transaction helpers, client submit mapper, finalisation
     integration, active finalisation component coverage, mapper tests.
3. `fix(listings): harden source listing projection bridge`
   - lifecycle contract docs, router/db contract tests, router `BAD_REQUEST`
     lifecycle-state propagation, `sourceListingId` approval upsert, media
     mirror replacement, archive/delete projection soft-archive.
4. `feat(listings): recover isolated v2 workflow foundation`
   - shared workflow types, listing workflow registry/adapters/tests.
5. `feat(services): inject property journey actions into pdp`
   - property service actions, PDP rendering, request page context tests.
6. `docs: record listing-engine recovery boundary`
   - this report.

## Independent Boundary Classification

### 1. DLE Auction Datetime Normalization

- Files: `server/services/developmentDateUtils.ts`,
  `server/services/developmentService.ts`,
  `server/services/publishNormalizer.ts`,
  `server/services/__tests__/developmentService.auctionDates.test.ts`.
- Source: `e5f28f69` proof.
- Runtime data path: DLE unit auction dates -> development service auction
  range calculation and unit persistence -> publish normalizer -> DB/public
  datetime values.
- Tests: `server/services/__tests__/developmentService.auctionDates.test.ts`.
- Dependencies: no schema change; no dependency on services, V2 workflow, or
  lifecycle bridge work.
- Independent commit/revert: yes, subject only to local conflict resolution in
  DLE service files.
- Owning branch/PR: `fix/dle-auction-datetime-normalization`.
- Production-ready: yes, pending normal review.

### 2. DLE Finalisation Payload Extraction And Active-Path Tests

- Files: `shared/developmentDerived.ts`,
  `shared/developmentCanonicalSelectors.ts`,
  `shared/developmentPayloadOwnership.ts`,
  `client/src/lib/developmentTransactionPayload.ts`,
  `client/src/lib/developmentTransactionPayload.test.ts`,
  `client/src/lib/developmentSubmitPayload.ts`,
  `client/src/lib/developmentSubmitPayload.test.ts`,
  `client/src/components/development-wizard/phases/FinalisationPhase.tsx`,
  `client/src/components/development-wizard/phases/FinalisationPhase.test.tsx`.
- Source: `recovery/dle-wizard-verification-2026-06-02`, adapted as a narrow
  mapper/helper slice.
- Runtime data path: DLE wizard canonical data -> `FinalisationPhase` ->
  `buildDevelopmentSubmitPayload` -> create/update/publish mutation payloads
  -> existing development service persistence.
- Tests: finalisation component coverage plus development transaction and
  submit-payload mapper tests.
- Dependencies: independent from auction normalization except both are DLE
  owned; no schema change.
- Independent commit/revert: yes, with `FinalisationPhase.tsx` as the likely
  conflict point if DLE UI work lands nearby.
- Owning branch/PR: `refactor/dle-submit-payload-mapper`.
- Production-ready: yes, pending normal review.

### 3. Single-Property V2 Workflow Foundation

- Files: `shared/listing-workflow-types.ts` and
  `client/src/lib/workflows/listing/`.
- Source: `9a2401f` and related V2 workflow evidence.
- Runtime data path: isolated V2 workflow state -> registry -> validation
  adapter -> submit payload adapter -> draft payload/readiness adapters.
- Tests: listing workflow, draft payload, submit payload, readiness, and
  validation tests under `client/src/lib/workflows/listing/__tests__/`.
- Dependencies: no production route switch; no backend draft persistence; no
  dependency on DLE or services changes.
- Independent commit/revert: yes.
- Owning branch/PR: `feat/listings-v2-workflow-foundation`.
- Production-ready: yes as an isolated library foundation; not production route
  ready.

### 4. Service Provider/PDP Integration

- Files: `client/src/features/services/propertyServiceActions.ts`,
  `client/src/features/services/__tests__/propertyServiceActions.test.ts`,
  `client/src/components/property/PropertyServiceActions.tsx`,
  `client/src/features/services/LeadRequestFlow.tsx`,
  `client/src/pages/services/ServicesRequestPage.tsx`,
  `client/src/pages/services/__tests__/ServicesRequestPage.integration.test.tsx`,
  `client/src/pages/PropertyDetailDesktopLegacy.tsx`,
  `client/src/pages/PropertyDetailMobileOptimized.tsx`.
- Source: service-owned source `a94eb04e`.
- Runtime data path: PDP property -> `PropertyServiceActions` ->
  `/services/request/:category` query context -> `ServicesRequestPage`
  sanitization -> `LeadRequestFlow` -> services lead mutation -> session
  result context.
- Tests: property service actions and services request page integration tests.
- Dependencies: independent from DLE, V2 workflow, and lifecycle bridge work.
- Independent commit/revert: yes.
- Owning branch/PR: move to a separate service-owned branch, for example
  `feat(services): inject property journey actions into pdp`.
- Production-ready: likely yes after focused tests, but it should not remain
  bundled in the listing-engine recovery PR.

### 5. Single-Property Publication Lifecycle And Router Hardening

- Files: `docs/listing-engine/CANONICAL_LISTING_LIFECYCLE.md`,
  `server/db.ts`, `server/listingRouter.ts`,
  `server/__tests__/contract.listing-lifecycle.test.ts`,
  `server/__tests__/contract.listing-lifecycle-db.test.ts`.
- Source: `0da24e18`, `a019ad7e`, `14af368d`, adapted with current router
  lifecycle-error tests.
- Runtime data path: `listingRouter` create/update/submit/approve/reject/
  archive/delete -> `server/db.ts` listing lifecycle functions ->
  `properties.sourceListingId` bridge -> `propertyImages` public projection.
- Tests: lifecycle router and DB contract tests.
- Dependencies: depends only on the existing `properties.sourceListingId`
  schema; no V2 workflow dependency and no new migration.
- Independent commit/revert: yes, with careful review of the broad
  `server/db.ts` lifecycle edits.
- Owning branch/PR: `fix/listings-source-listing-projection-bridge`.
- Production-ready: yes, pending final build verification and normal review.

### 6. Recovery And Lifecycle Documentation

- Files: `docs/LISTING_ENGINE_RECOVERY_REPORT_2026-07-03.md`; lifecycle docs
  in `docs/listing-engine/CANONICAL_LISTING_LIFECYCLE.md` travel with boundary
  5 when that PR is split.
- Source: current recovery analysis and verification evidence.
- Runtime data path: none.
- Tests: not applicable; backed by the verification commands above.
- Dependencies: references all runtime boundaries.
- Independent commit/revert: yes, though reverting removes recovery evidence.
- Owning branch/PR: `docs/listing-engine-recovery-boundary` or the final
  recovery housekeeping commit.
- Production-ready: not runtime code.

## Final Working Tree Snapshot

Expected local changes after this report:

- Modified:
  `client/src/components/development-wizard/phases/FinalisationPhase.tsx`,
  `client/src/features/services/LeadRequestFlow.tsx`,
  `client/src/pages/PropertyDetailDesktopLegacy.tsx`,
  `client/src/pages/PropertyDetailMobileOptimized.tsx`,
  `client/src/pages/services/ServicesRequestPage.tsx`,
  `client/src/pages/services/__tests__/ServicesRequestPage.integration.test.tsx`,
  `server/db.ts`,
  `server/listingRouter.ts`,
  `server/services/developmentService.ts`,
  `server/services/publishNormalizer.ts`.
- Added:
  `client/src/components/development-wizard/phases/FinalisationPhase.test.tsx`,
  `client/src/components/property/PropertyServiceActions.tsx`,
  `client/src/features/services/propertyServiceActions.ts`,
  `client/src/features/services/__tests__/propertyServiceActions.test.ts`,
  `client/src/lib/developmentSubmitPayload.ts`,
  `client/src/lib/developmentSubmitPayload.test.ts`,
  `client/src/lib/developmentTransactionPayload.ts`,
  `client/src/lib/developmentTransactionPayload.test.ts`,
  `client/src/lib/workflows/listing/`,
  `docs/listing-engine/CANONICAL_LISTING_LIFECYCLE.md`,
  `server/__tests__/contract.listing-lifecycle.test.ts`,
  `server/__tests__/contract.listing-lifecycle-db.test.ts`,
  `server/services/developmentDateUtils.ts`,
  `server/services/__tests__/developmentService.auctionDates.test.ts`,
  `shared/developmentCanonicalSelectors.ts`,
  `shared/developmentDerived.ts`,
  `shared/developmentPayloadOwnership.ts`,
  `shared/listing-workflow-types.ts`,
  `docs/LISTING_ENGINE_RECOVERY_REPORT_2026-07-03.md`.
