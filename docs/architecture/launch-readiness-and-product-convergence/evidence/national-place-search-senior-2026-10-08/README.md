# Senior canonical Place search performance correction

The bounded national diagnostic passes twice on runtime source
**6be9ef01d7a93ea5943b2310082a8d257978f4d1**. At 20 concurrent clients, read p95 is
**733.33 ms** and **738.69 ms**, within the unchanged **750 ms** budget. Headroom
is narrow (11.31 ms on the repeat); these small samples do not certify production
capacity or a stable production tail. No production access, deployment, hosted CI,
payment activation, or launch acceptance occurred.

Worktree: `/home/edwardspc/Desktop/Dev/worktrees/property-listify-national-place-search-senior-20261008`.
Branch: `fix/national-place-search-senior-20261008`.
Base: junior performance candidate `5de5f05c0ce9e75f0d003486d3dc3f03805e155b`,
which descends from accepted geography merge `04821fe7ae6401e781925adce099a93ead08490a`.

## Cause and correction

Province inventory queries previously expanded every descendant Place, including
places with no matching property. The scoped correction still issued 41 queries
for Eastern Cape. Autocomplete independently loaded each candidate's ancestry;
the measured prefix request issued 174 queries because many shared ancestors were
read repeatedly.

- `publicSearchService` validates the selected identity and hands an exclusive
  province scope to the property search boundary. Exact city/locality selection
  retains exact identity membership.
- `propertySearchService` selects candidate property identities using the existing
  non-geographic SQL filters, projects fresh complete ancestry for their distinct
  Place assignments, and checks membership through the existing approved scope
  projector. Geography filtering precedes public eligibility, counts and paging.
  Unassigned, malformed, unlabelled and outside-province candidates cannot enter
  the scope. Private address/display text never becomes geography authority.
- `placeDiscoveryService` batches shared ancestry reads, preserving all competing
  edges and refusing missing/retired/unsupported parents, cycles and exhausted
  traversal. The authoring transaction/locking reader remains intact.

No response caching, entitlement caching, scope widening, migration, new index,
provider-write exception or threshold change was introduced. Province candidate
selection still reads all properties matching the other filters; work now scales
with that inventory rather than every empty Place in the national reference graph.
This is not an indexed national-scale inventory capacity claim.

## Measured result

| Concurrent clients | First p95 / p99 ms | Repeat p95 / p99 ms | Repeat acquisition p95 ms |
| --- | ---: | ---: | ---: |
| 1 | 123.67 / 139.92 | 120.00 / 135.20 | 0.21 |
| 5 | 195.27 / 204.96 | 193.45 / 199.98 | 0.22 |
| 20 | 733.33 / 765.96 | 738.69 / 767.43 | 27.87 |

Every window also meets p99 <=2,000 ms and acquisition p95 <=250 ms. Each run
contains 220 HTTP calls: 20 first observations, 20 warm-up calls and 60 calls at
concurrency 1, 5 and 20. Each timed window includes 54 real reads and six expected
rejection/unsupported outcomes, excluded from read percentiles. There were zero
unexpected errors across both runs (440 calls). The repeat was justified by the
first run's narrow p95 margin; both complete results are retained, not selected
by best latency. No parallel build/typecheck/test job ran during either measured
window. These are short closed-loop local measurements, not a production SLO.

The prior junior report records c20 p95 2,353.71 ms on source `5de5f05c0`; its
selected metrics and original report hash are in `prior-measurement-comparison.json`.
It was inspected, not independently rerun here. The new disposable database has
128 source listings and 129 property rows, with 120 active synthetic listings
(72 sale / 48 rent). Earlier runs had different archived-row histories, so this
comparison is not a fully identical physical-dataset A/B experiment.

Representative measured query counts fell from 174 to 8 for prefix discovery and
41 to 20 for Eastern Cape search. Raw request timings, categories, query hashes,
returned-row counts and acquisition observations are in `observations.jsonl`
and `repeat/observations.jsonl`. Driver durations include acquisition/transfer;
physical SQL rows examined are not measured. Graph and inventory phases overlap
and must not be summed. First observations follow preparation; no OS/InnoDB cache
flush or shared database service restart occurred.

## Correctness and authority

The governed release subset is 16,944 Places across all nine provinces, with
25,618 names, 16,935 relationships, 79,189 Place evidence rows and 19,042 external
mappings. All 720 held OSM-only Places are absent. Existing source pins and
migration manifest digest remain unchanged.

Both HTTP runs prove North Riding inclusion, Bryanston exclusion, exact city
scope, province membership, Buy/Rent filtering, pagination, empty results,
mixed-authority refusal, unsupported development scope, canonical labels and
public detail eligibility. Separate postflight passes after each run verify all
120 published source/projection pairs and positive rental membership/counts/labels
for all nine provinces. See both `postflight.json` files.

Validation completed:

- 94 focused tests: public scope dispatch, inventory filtering before eligibility
  and pagination, malformed/shared ancestry and national scope projection.
- 696 database-authority static tests and the repository static authority gate.
- Production type checking, touched-file lint (zero errors/warnings), build.
- Native migration through `0111`, schema congruency, governed reference preview
  preparation/verification, foundation preparation/verification, scenario verifier.
- Two national HTTP measurements and two independent semantic postflight runs.

An extra fresh-schema consumer command was refused because this already-migrated
owned target contained tables. It made no change and is **not counted as passed**;
its output is preserved. Earlier exploratory tests included a DB-required contract
without its fixture and an unsupported assertion matcher; these were not treated
as product failures or release evidence. The final focused suite passes after
using the correct test scope and supported matcher.

Task classification: database consumer correction on an exact disposable local
target. Canonical authority: repository AGENTS; database entry/playbook, policy,
compatibility register and change protocol; approved Place inventory scope policy;
existing canonical models/migrations. No compatibility exception was introduced.

Target fingerprint:
`6678d3d0240dfc8e08e089728d59fb4e8a3d5cb3be9b4b514b5e06cd88957f80`.
The first establishment was interrupted with an incomplete attempt. Edward
explicitly approved preservation and disposal/recreation of this exact target;
see `local-recovery.md` and the interrupted-command evidence. The successful
postflight plan has no pending migrations, no lock and no incomplete attempts;
status is schema-congruent and ready. Final owned-target disposal is recorded in
`disposal.txt`; the shared MySQL service and other worktrees were retained.

## Junior handoff

1. Use this branch/worktree and retain the existing geography and senior runtime
   changes. The runtime chain above accepted merge `04821fe7` is `7f7eb72e0`,
   `5de5f05c0`, then `6be9ef01d`; `a2cb287f5` supplies the measurement harness.
   Do not cherry-pick the last runtime commit alone onto the old integration base.
2. Review this bounded diff and reconcile with the current integration base once.
   Preserve founder/logout/Developer corrections and all canonical geography
   refusals. If reconciliation changes runtime, run the affected tests and the
   same bounded benchmark on the resulting exact source. Do not repeatedly run
   unchanged local suites or production readiness sampling during local editing.
3. Publish one reviewed candidate for the required hosted CI. These local results
   do not substitute for hosted checks on that candidate. Keep separate preview
   failure/exception handling explicit; this work extends no exception.
4. Production schema/reference application and attended deployment still follow
   the existing separately approved release plan. The remaining capacity work is
   the B17 production-like 10,000-listing/24-hour acceptance; this 120-listing
   diagnostic does not certify it. Do not treat it as national launch acceptance.
5. After the approved geography release, return to the blocked customer journey:
   North Riding selection, private house draft save/reload, image upload/reload,
   then authorized account-specific checks. Homepage legacy location handoff and
   development Place inventory support remain outside this correction's proof.

Reproduction uses the existing opt-in measurement and postflight scripts on a
properly established owned disposable target with the governed release subset,
reference/foundation/scenario roles. Set `NATIONAL_PLACE_BENCHMARK_SOURCE` to the
reviewed runtime commit and `NATIONAL_PLACE_BENCHMARK_OUTPUT` to a new evidence
folder containing its `release-preview-verify.txt`; invoke `pnpm test:authority`
with `SKIP_DB_INIT=1`, `NATIONAL_PLACE_BENCHMARK=1`, project `server` and
`scripts/__tests__/nationalPlaceSearch.measurement.test.ts`. The separate
postflight uses `NATIONAL_PLACE_POSTFLIGHT=1` and its corresponding script.
