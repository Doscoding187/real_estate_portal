# Database architecture takeover assessment

Status: **in progress**. This is the current assessment for the task-owned
worktree `property-listify-database-architecture`, branch
`feat/database-architecture-takeover`, at baseline HEAD `a14fec15`.
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

- `drizzle/schema/index.ts` exports 24 schema modules and 213 physical
  tables. The canonical inventory structural digest is
  `845a2cf0fae772496af2a313e3be11dbec82a1550b1dfaf9c0e43d497e2a653d`.
- No Drizzle `mysqlView` export or inventory view is present.
- The database-authority status resolves the exact task-owned disposable local
  MySQL target at port 3307. Its expected migration head is
  `0074_retire_legacy_prospects.sql`; there are no incomplete attempts and
  the schema is congruent. No remote/protected target was accessed.
- A fresh disposable consumer contract previously passed from an empty target
  through 0074, including canonical foundation/geography/scenario,
  schema-congruency, distribution, and search-to-lead readiness checks. The
  acknowledgement and target fingerprint are evidence for that run only and
  must be re-resolved after later schema changes.
- Static database-authority validation previously passed 271 tests in 33
  files, including utility-authority classification. Mocked consumer tests are
  not physical concurrency proof.

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
identity are rejected. The contract tests cover these decisions with a fake
transaction boundary; P1 still needs independent database connections and
row-level race evidence.

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

`leads` remains the capture, consent, and custody root, but its
`deliveryAttempts` JSON array is an unresolved operational authority. It
currently serves capture, publisher delivery, routing correction, custody
audit, conversion reporting, developer funnel, agent views, and super-admin
filters. JSON cannot enforce delivery uniqueness, typed recipient ownership,
indexed due work, or lease fencing. P2 is the next high-impact implementation
packet and must replace this shared mutable structure with a relational
delivery/attempt model and update every consumer.

## Coverage status

The complete physical inventory, runtime surface census, packet assignment, and
explicit evidence gaps are in
`docs/architecture/database-takeover/coverage-register.md`. The decision
index and relationship diagram are in
`docs/architecture/database-takeover/architecture-decisions.md`.

P0 is complete when those artifacts are committed with a review packet and the
repository checks below have terminal completion. P1 is the first behavioral
packet. P2 through P8 remain mandatory domain coverage; an “open” row means
that the owning packet must trace it, not that the model is automatically
wrong.

| Packet | Current status | Next evidence |
| --- | --- | --- |
| P0 baseline | Docs and inventory reconciliation in progress | Register every table and active execution surface; commit review packet |
| P1 consumer integrity | Implemented behavior, physical proof open | Independent-connection races, isolation, rollback, withdrawal |
| P2 lead delivery | Decision established, implementation open | Relational state machine, worker/recovery, provider uncertainty |
| P3 listings/projection | Boundary identified, audit open | Mapping/cardinality, publish/withdraw/rebuild |
| P4 account/tenant | Open | Membership, revocation, ownership, token lifecycle |
| P5 billing | Open | Monetary facts, provider idempotency, entitlement transitions |
| P6 agency/distribution | Open | Workflow states, assignment, commission and showing consistency |
| P7 domain supply/geography | Open | Land authority contract, geography, development, Commercial, Shared Living |
| P8 platform/supporting domains | Open | Durable jobs, media/content, services, demand, analytics rebuildability |
| P9 closure | Not started | Full physical, query-plan, journey and release review |

## Known risks carried into implementation

- The current consumer unit and contract tests do not establish MySQL/TiDB
  locking or isolation behavior. P1 must use independent connections and
  controlled barriers.
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

## Verification record for this baseline

The following evidence was recorded before this P0 documentation change:

| Command/evidence | Result | Limit |
| --- | --- | --- |
| `pnpm db:authority:status` | Task-owned disposable target, head 0074, congruent schema | Target must be re-resolved after mutation |
| Fresh consumer contract | Passed through 0074 from an empty disposable database | Does not prove packet-specific races |
| `pnpm db:authority:check` | 271 static authority tests passed in the prior baseline run | Static checks do not prove product invariants |
| Consumer contract tests | Favorite and guest transfer contracts passed | Mock transaction boundary; physical locking remains open |
| `pnpm check` | Passed at the prior baseline | Re-run after P0 artifacts |
| `pnpm lint:check` | Prior terminal exit was not captured | Must be run to completion before claiming green |

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
