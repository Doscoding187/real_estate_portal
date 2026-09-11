# Database architecture takeover assessment

Status: **P1 accepted after senior review; P2 implemented and review-open; P3–P8 evidence collected with packet review open; P9 in closure audit**. This is the current
assessment for the task-owned worktree `property-listify-database-architecture`,
branch `feat/database-architecture-takeover`.
Completion requires the packet sequence in
`docs/architecture/database-takeover/implementation-plan.md`; this document
does not claim that the full database is correct.

## Mandate and operating rules

Edward authorized a first-principles architecture takeover. The product is
pre-launch, so disposable local data may be replaced while implementing the
target model. Legacy schema shapes, stale fixtures, and disconnected APIs are
not compatibility requirements. Remote or protected databases remain outside
this worktree's scope.

The database-authority skill and repository policy are operating controls.
Canonical schema files, admitted migrations, runtime consumers, and physical
verification are the authority. No schema guessing, alternate-shape retry,
unregistered fallback, or permanent dual write is acceptable. Every packet must
identify one owner for each durable fact, trace all readers and writers, define
authorization and lifecycle, and prove the stated invariant with a real
database where concurrency or integrity matters.

## Current baseline

- `drizzle/schema/index.ts` exports 24 schema modules and 215 canonical
  tables. The current canonical inventory structural digest is
  `69f4bf73e6ac9dc81b2be8b2cc36333e33d7a1ec6917ea392cbcc68466ac73fd`.
- No Drizzle `mysqlView` export or inventory view is present.
- The database-authority status resolves the exact task-owned disposable local
  MySQL target at port 3307. Its expected migration head is
  `0080_service_lead_request_idempotency.sql`; there are no incomplete attempts and
  the schema is congruent. No remote/protected target was accessed.
- A fresh disposable consumer contract passed from an empty target through
  the current admitted lineage, including canonical foundation/geography/scenario,
  schema-congruency, distribution, and Search-to-Lead readiness checks. The
  run used target fingerprint
  `806c61e7e0d23daf1c70942dc80e91884d2778cc31d6c95ebef8a2023ea207ca` and
  migration plan `0b8448faf4e0955992a0f305`.
- Static database-authority validation passes 272 tests in 33 files, including
  utility-authority classification. Mocked consumer tests remain distinct
  from physical concurrency proof.

## Findings that are implemented at the baseline

### Authenticated saved inventory and recent activity

The protected properties procedures now write and read the canonical
`favorites` and `recently_viewed` facts. Favorites are keyed by user and
property; recent views are keyed by user and source listing. Public eligibility
and filtered DTOs prevent unavailable inventory and private fields from
crossing the boundary. The old no-op unauthenticated favorites route is not
the authority.

Guest transfer now validates the complete input set before writing, resolves
public property identities to one available source listing, locks the
authenticated user during the transfer, deduplicates resolved IDs, bounds
inputs, and rolls back if a later write fails. Anonymous requests, invalid
inventory, unavailable or ambiguous projections, and unsupported Commercial
identity are rejected. P1 adds independent-pool MySQL evidence for duplicate
saves and views, guest-transfer replay, a later-write rollback, account
isolation, unavailable removal, projection ambiguity, committed save/remove
ordering, and public withdrawal. It also establishes UTC on every canonical
database connection: the local MySQL service had a non-UTC `SYSTEM` timezone,
which would otherwise shift application-written `TIMESTAMP` strings.

The withdrawal rule is explicit. A private activity fact admitted while the
projection is public may finish after a concurrent withdrawal, but public
readers resolve current eligibility and hide it. Browser verification logs in
through the real UI, transfers guest activity, clears the transferred local
storage record only after success, and proves save/remove persistence across
reloads.

### Retired disconnected models

The unregistered prospects router, stale prospect helpers, and disconnected
recently-viewed widget are not revived. Migrations 0072, 0073, and 0074 retire
`prospect_favorites`, `scheduled_viewings`, and `prospects`. Their removal
is a deliberate pre-launch correction backed by reachability review and
replacement behavior, not a compatibility omission.

### Public inventory

`listings` is authored inventory. `properties` is a public projection and
has a distinct identity. The inventory-link resolver and public eligibility
service reject ambiguous or unavailable source mappings; numeric equality
between IDs is never used as a relationship. P3 owns the remaining source
mapping, publication/revision, withdrawal, and projection rebuild proof.

### Lead delivery

The relational `lead_deliveries` and append-only `lead_delivery_attempts`
tables now own capture, publisher delivery, routing correction, custody audit,
conversion reporting, developer funnel, agent views, and super-admin filters.
The old `deliveryAttempts` JSON authority was removed from the active model.
P2 remains review-open for independent live-provider replay evidence and final
reconciliation/authorization review; injected-provider crash tests prove the
durable unknown-outcome fence.

## Coverage status

The complete physical inventory, runtime surface census, packet assignment, and
explicit evidence gaps are in
`docs/architecture/database-takeover/coverage-register.md`. The decision
index and relationship diagram are in
`docs/architecture/database-takeover/architecture-decisions.md`.

P0 is complete and committed. P1 is the first behavioral packet and is
accepted after review of its implementation and correction commits. P2 through P8 remain mandatory
domain coverage; an “open” row means that the owning packet must trace it, not
that the model is automatically wrong.

| Packet                         | Current status                            | Next evidence                                                                       |
| ------------------------------ | ----------------------------------------- | ----------------------------------------------------------------------------------- |
| P0 baseline                    | Complete and committed                    | Packet record and current inventory are committed at `3d842600`                     |
| P1 consumer integrity          | Accepted after senior review               | Evidence and disposition in `reviews/P1-implementation.md` and `reviews/P1-senior-review.md` |
| P2 lead delivery               | Implemented; review open                  | Live-provider replay, reconciliation, authorization                                 |
| P3 listings/projection         | Boundary implemented; audit open          | Duplicate writers, concurrent publish, withdrawal, rebuild                          |
| P4 account/tenant              | Core evidence implemented; audit open     | Broader ownership and token lifecycle census                                        |
| P5 billing                     | Core evidence implemented; audit open     | Explicit billable-account model and entitlement race proof                          |
| P6 agency/distribution         | Acceptance race fixed; audit open         | Assignment, commission and showing consistency                                      |
| P7 domain supply/geography     | Open                                      | Land authority contract, geography, development, Commercial, Shared Living          |
| P8 platform/supporting domains | Partial corrections implemented; open    | Durable jobs, media/content, services, demand, analytics rebuildability             |
| P9 closure                     | Not started                               | Full physical, query-plan, journey and release review                               |

## Known risks carried into implementation

- P1 establishes MySQL locking and UTC behavior only. TiDB concurrency and
  session-timezone semantics remain an explicit provider-validation item for
  P9 or any migration that changes these facts.
- Lead delivery has claim, external-provider, retry, and route-correction
  uncertainty. A provider acceptance cannot be described as recipient delivery,
  and a crash window cannot be hidden by a success flag.
- Billing families, agency/deal families, and domain-specific inventory may
  represent separate products. Similar table names are not consolidation
  evidence.
- The public Land journey must use one geography authority per request and the
  central `LAND_PUBLIC_CLASSIFICATIONS` allow-list. P7 must read and follow
  `docs/architecture/land-consumer-journey-contract.md`.
- Runtime/query matches include debug and test-only files. The coverage
  register requires reachability classification before a writer is treated as
  active or removed.

## Historical P0 verification record

The following evidence was recorded before this P0 documentation change:

| Command/evidence           | Result                                                      | Limit                                                    |
| -------------------------- | ----------------------------------------------------------- | -------------------------------------------------------- |
| `pnpm db:authority:status` | Task-owned disposable target, head 0074, congruent schema   | Target must be re-resolved after mutation                |
| Fresh consumer contract    | Passed through 0074 from an empty disposable database       | Does not prove packet-specific races                     |
| `pnpm db:authority:check`  | 271 static authority tests passed in the prior baseline run | Static checks do not prove product invariants            |
| Consumer contract tests    | Favorite and guest transfer contracts passed                | Mock transaction boundary; physical locking remains open |
| `pnpm check`               | Passed at the prior baseline                                | Re-run after P0 artifacts                                |
| `pnpm lint:check`          | Prior terminal exit was not captured                        | Must be run to completion before claiming green          |

P0's documentation files do not change schema or runtime behavior. After this
packet is committed, run `pnpm check`, `pnpm lint:check`,
`pnpm schema:inventory:check`, `pnpm schema:sanity`, and
`pnpm db:authority:check` again and record their terminal results in
`reviews/P0-implementation.md`.

## Historical notes

Earlier versions of this notebook recorded 216 tables, a 0065 migration head,
an unadmitted uniqueness prototype, open guest-transfer defects, and a
reachable prospects router. Those statements describe superseded checkpoints.
They are retained only here as history so they cannot be mistaken for current
status. The current inventory, migration head, runtime code, and review packets
take precedence.
