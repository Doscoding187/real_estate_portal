# DBA-S3B-2 — Bundle Attribution Reachability Audit

## 1. Conclusion

`bundle_attributions` is a **C. Dead legacy subsystem**, not a canonical
omission. `bundleAttributionService.ts` contains executable raw SQL, but no
current server startup path, mounted router, tRPC procedure, job, client API
call, test, package script, CI workflow, or scheduled worker reaches it.

The service and router preserve an unfinished historical bundle-attribution
implementation. They are incompatible with the canonical bundle schema and do
not establish a current approved near-term capability.

## 2. Runtime graph

### Actual startup graph

`package.json` `start` -> `start:prod` -> `server/_core/start.ts` -> dynamic
import of `server/_core/index.ts` -> `startServer()`.

`server/_core/index.ts` mounts core routes and tRPC, then explicitly optional
routers only at these paths:

- `/api/analytics` -> `../routes/analytics`
- `/api/partner-analytics` -> `../partnerAnalyticsRouter`
- `/api/content` -> `../contentRouter`
- `/api/topics` -> `../topicsRouter`
- `/api/boosts` -> `../partnerBoostCampaignRouter`
- `/api/leads` -> `../partnerLeadRouter`
- `/api/explore` -> `../routes/exploreShorts`
- `/api/explore/video` -> `../routes/exploreVideoUpload`

`server/marketplaceBundleRouter.ts` is absent from this list and has no import
from `server/_core/index.ts`, `server/routers/**`, or another mounted router.
Therefore it is not mounted and none of its documented `/api/bundles/**`,
`/api/partners/**`, `/api/users/**`, or `/api/bundles-analytics/**` endpoints
is reachable in the current server.

### Dormant internal graph

`server/marketplaceBundleRouter.ts` imports `marketplaceBundleService` and,
after its default export, imports `bundleAttributionService`. The unmounted
router's dormant tracking/metrics endpoints call:

- `trackBundleView`
- `trackPartnerEngagement`
- `trackLeadAttribution`
- `getBundleMetrics`
- `getPartnerMetricsAcrossBundles`
- `getUserBundleHistory`
- `getTopPerformingBundles`

The cleanup methods `deleteBundleAttributions` and
`deletePartnerAttributions` have no caller. Repository search found no import
or caller of `BundleAttributionService`/`bundleAttributionService` outside that
router, its README examples, audit material, and historical outputs.

## 3. Client, job, and test reachability

- Current `client/**` contains no `/api/bundles`, bundle-attribution, bundle
  click-tracking, or lead-attribution API call.
- No bundle page/navigation route was found in current client source.
- No package script, CI workflow, scheduled job, worker, startup module, or
  analytics adapter imports the attribution service.
- `server/services/__tests__/monetization.smoke.test.ts` only checks that
  `marketplaceBundleService` instantiates; it does not import or call the
  attribution service.

The only current-looking attribution material is the service/router pair and
their READMEs. `marketplaceBundleService.README.md` calls attribution tracking
the next step "Task 18.3"; no active roadmap, startup registration, or client
implementation promotes that historical next step into current authority.

## 4. Related schema authority

| Physical table        | Drizzle schema                  | Canonical inventory | Baseline | Current runtime SQL                      | Result                                                                                                                 |
| --------------------- | ------------------------------- | ------------------- | -------- | ---------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `marketplace_bundles` | `drizzle/schema/marketplace.ts` | yes                 | yes      | dormant bundle service only              | Canonical table; dormant service uses incompatible UUID/slug/price shape.                                              |
| `bundle_partners`     | `drizzle/schema/marketplace.ts` | yes                 | yes      | dormant bundle/attribution services only | Canonical table; canonical FK columns are `bundleId`/`partnerId`, while dormant code uses snake-case UUID assumptions. |
| `explore_partners`    | `drizzle/schema/explore.ts`     | yes                 | yes      | dormant bundle services only             | Canonical table; legacy attribution SQL used it as an FK target.                                                       |
| `bundle_attributions` | no                              | no                  | no       | only dead attribution service            | Legacy-only table from `drizzle_old/migrations/add-partner-marketplace-schema.sql`.                                    |

The canonical bundle tables do not validate the attribution table: their IDs,
keys, and column names differ from the legacy SQL. Adding `bundle_attributions`
alone would create an internally inconsistent hybrid.

## 5. History and intent

History shows the router/service arrived in January 2026 and was later included
in a February 2026 WIP quarantine commit. The only design source is the legacy
partner-marketplace SQL and service README. Current canonical Explore authority
does not name bundle attribution, and the active server deliberately does not
mount its router.

## 6. Final classification and consequences

`bundle_attributions` = **C. Dead legacy subsystem**.

Reclassify it from possible canonical omission to intentionally retired legacy
schema. The later application-code retirement scope must consider:

- `server/services/bundleAttributionService.ts`
- `server/services/bundleAttributionService.README.md`
- `server/marketplaceBundleRouter.ts`
- `server/services/marketplaceBundleService.ts`
- `server/services/marketplaceBundleService.README.md`
- `server/services/__tests__/monetization.smoke.test.ts`
- `drizzle_old/migrations/add-partner-marketplace-schema.sql`

No current request can reach this subsystem, so its legacy SQL need not remain
for runtime. The SQL file can be deleted as part of a Gap 2 migration-tree
cleanup only after the senior-approved historical-evidence boundary is chosen;
the unreachable application code must not be changed in Gap 2.

## 7. Gap 2 implementation gate

`GAP_2_IMPLEMENTATION_GATE=OPEN`

There is no unresolved canonical omission. Utility-dependent SQL remains
temporarily retained until Gap 3, while a Gap 2 patch can be limited to
migration-tree classification/contracts, approved non-dependent historical SQL
deletions, and current-looking documentation supersession. It must not modify
the dormant bundle service/router/client subsystem.

## 8. Validation

This was read-only: startup-to-router trace, import/caller searches, client/API
searches, schema/baseline comparison, history inspection, and deterministic
reference-count reruns. No database was opened.
