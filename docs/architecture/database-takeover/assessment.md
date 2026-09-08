# Database architecture takeover

Status: in progress. This document is a working assessment, not a completion claim.

## Mandate and evidence

Edward authorized a first-principles architectural takeover and explicitly stated
that pre-launch legacy data preservation must not determine the target design.
Existing architecture documents and validation gates are evidence, not proof that
the domain model is correct. Changes use the task-owned worktree
`property-listify-database-architecture`, branch `feat/database-architecture-takeover`,
starting at `ad0c4247439a0bd27ebca17d4fba88dd023760f2`.

The product is a multi-party property marketplace. The initial runtime trace shows
private inventory authoring, public discovery projections, authenticated saved
inventory, anonymous activity transfer, enquiry capture and recipient delivery.
The wider domain census includes agencies and transactions, developments,
distribution, services, Land, Commercial, Shared Living, billing and analytics.
Their full write/read/authorization/lifecycle audit remains required.

## Principles being applied

- Each durable fact needs an identifiable owner and one authoritative write path.
- IDs from distinct inventory tables are different identities, even when numeric
  values happen to match. Relationships must express the actual subject.
- Public projections should be rebuildable from authoritative inventory. Product
  actions must not depend on accidental equality between projection and source IDs.
- A successful command means its promised durable effect committed. Storage errors
  must not be reported as an empty list, duplicate record, or successful migration.
- Concurrent commands, retries and process termination are ordinary operating
  conditions. Uniqueness, transaction boundaries and delivery semantics must be
  designed for them, rather than inferred from sequential unit tests.
- Multiple domain profiles are not inherently duplicates. Consolidation requires
  proving they represent the same fact, lifecycle and ownership boundary.
- Keep useful relational integrity and executable validation. Replace model and
  control-plane complexity that cannot justify itself against the product.

## Confirmed findings

| Finding                                                                                                                                  | Evidence                                                                                                                          | State / required outcome                                                                                                                                                     |
| ---------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Registered favorites API returns empty reads and successful no-op writes, without authentication                                         | `server/favoritesRouter.ts`, mounted by `server/routers.ts`                                                                       | Replaced with protected calls to existing property-favorites persistence. Six behavioral tests pass. Database uniqueness and concurrent mutation behavior remain unverified. |
| Guest view migration constructs `propertyId` for `recently_viewed`, whose relationship is `listingId`                                    | `server/guestMigrationRouter.ts`, `drizzle/schema/leads.ts`                                                                       | Open. Resolve the inventory identity deliberately and validate the full guest-to-account workflow.                                                                           |
| Guest transfer catches every per-record error as a duplicate and reports submitted counts as migrated; client then clears guest activity | `server/guestMigrationRouter.ts`, `client/src/hooks/useGuestDataMigration.ts`                                                     | Open. Commit a bounded, idempotent operation and acknowledge only its actual durable outcome.                                                                                |
| Unreferenced prospect helper exports equate public property IDs with listing IDs; read helpers conceal failures                          | `server/db.ts`: `addProspectFavorite`, `removeProspectFavorite`, `trackPropertyView`, `getProspectFavorites`, `getRecentlyViewed` | Open. Confirm full consumer reachability and remove or replace stale contracts.                                                                                              |
| Favorites have separate single-column indexes but no user/property uniqueness                                                            | `drizzle/schema/leads.ts`: `favorites`; `server/db.ts`: `addFavorite`, `server/routers.ts`: `toggleFavorite`                      | Open. Choose an idempotent set operation and enforce its relational invariant; review all writers together.                                                                  |
| Recently-viewed component calls an unregistered `prospects` router under `@ts-nocheck`                                                   | `client/src/components/RecentlyViewedCarousel.tsx`, `server/routers.ts`                                                           | Open. Determine reachability and integrate a real supported read model or retire the disconnected component.                                                                 |

## Hypotheses requiring investigation

Lead delivery stores mutable retry records as JSON on `leads` and calculates a
summary from the final array item. Audit independent recipients, timeout parsing,
claim fencing, retry scheduling, crash recovery and provider idempotency before
choosing a relational delivery/outbox model. Existing row locks are useful but do
not alone prove delivery correctness.

Billing has several similarly named subscription, invoice and payment families.
Prove runtime ownership and financial state transitions before deciding which
represent separate products and which are retired competing authorities.

## Coverage still required

For every schema module, inspect active consumers, identifiers, tenant ownership,
cardinalities, constraints, deletion semantics, mutation transactions, concurrency,
indexes and query access patterns, validation, and fixture coverage. Record keep,
replace or remove decisions with runtime evidence. The census is a scope checklist;
it does not mean those modules have been audited.

| Module                      | Declared tables | Audit coverage                 |
| --------------------------- | --------------: | ------------------------------ |
| `agencies.ts`               |              13 | Open                           |
| `agencyDeals.ts`            |              10 | Open                           |
| `analytics.ts`              |              11 | Open                           |
| `billing.ts`                |              16 | Open                           |
| `canvassing.ts`             |               4 | Open                           |
| `commercial.ts`             |               7 | Open                           |
| `core.ts`                   |               7 | Open                           |
| `demand.ts`                 |               5 | Open                           |
| `developerIdentity.ts`      |               3 | Open                           |
| `developments.ts`           |              14 | Open                           |
| `distribution.ts`           |              27 | Open                           |
| `explore.ts`                |               8 | Open                           |
| `googlePlacesMonitoring.ts` |               4 | Open                           |
| `land.ts`                   |              14 | Open                           |
| `leads.ts`                  |              15 | Partial consumer tracing; open |
| `listingPerformance.ts`     |               2 | Open                           |
| `listings.ts`               |              10 | Partial consumer tracing; open |
| `locations.ts`              |               7 | Open                           |
| `marketplace.ts`            |              13 | Open                           |
| `media.ts`                  |               2 | Open                           |
| `partners.ts`               |               3 | Open                           |
| `referrals.ts`              |               4 | Open                           |
| `servicesEngine.ts`         |               8 | Open                           |
| `sharedLiving.ts`           |               9 | Open                           |

## Verification evidence and limits

- `pnpm db:authority:status`: resolves the exact disposable worktree target at
  local port 3307; service unreachable. No physical schema or data audit yet.
- `pnpm db:authority:check`: passed 252 tests in 31 files, classified 118 utility
  surfaces, validated 216 tables / 66 active migrations and deterministic inventory.
  This does not prove business invariants or consumer completeness.
- `pnpm exec vitest run --project server server/__tests__/favorites-persistence.test.ts`:
  six tests passed; mocked persistence boundary, not real-database proof.
- No remote or protected database accessed. No schema or database data changed.

Completion requires implementation of the justified target model across its
consumers, real-database migration/integrity/concurrency evidence, product journey
verification, and repository checks. None of those broad claims is established yet.

### New evidence

`server/__tests__/guest-migration.contract.test.ts` passes two tests proving explicit
projection-to-source mapping, actual insert counts, and rejection of unknown
public identities. This remains mocked contract evidence; physical database
constraints and concurrent guest migrations still require integration proof.

| The UI requests `trpc.prospects.getRecentlyViewed`, but no `prospects` router is composed | `client/src/components/RecentlyViewedCarousel.tsx`; `server/routers.ts` | Open. This is a disconnected consumer, not evidence that the underlying helper should be exposed. A supported authenticated read contract must be designed before wiring it. |

### Migration admission finding

A proposed uniqueness migration for favorites/recent activity was rejected by migration authority validation because its SQL and manifest head were not admitted against the canonical lineage. It was reverted without applying anything. The underlying duplicate-action invariant remains a required future migration, with a bounded dialect-valid deduplication plan and serialized manifest review.

### Lead delivery decision

The JSON delivery-attempt array is consumed by public capture, publisher delivery,
agent views, routing correction, audit, conversion reporting, and super-admin
queries. It is a shared operational fact, not merely presentation metadata. JSON
cannot enforce uniqueness per `(lead, deliveryKey)`, recipient foreign keys, or
indexed retry scheduling, and every consumer must reimplement parsing. The target
architecture is a relational delivery-attempt/outbox aggregate with a stable
idempotency key, recipient ownership, attempt state, and provider reference.
Migration requires an expand/transition/contract sequence; this worktree records
the decision and does not invent an unadmitted migration.

### Prospect reachability correction

Earlier notes incorrectly treated unreferenced widgets as an active application
journey. `ProspectTrigger` references `ProspectDashboard`, which references
`RecentlyViewedCarousel`; no application consumer imports the trigger or quick
view. The live `prospectJourneyRouter` already uses `prospect_identities` and is
consumed by the user dashboard. The task-created `prospects` router and its tests
were removed: reviving `prospects` preferences and listing-based favorites would
create competing identity and saved-inventory authorities. Reachability must be
proven before implementing methods merely mentioned in unused client files.

### Atomic guest transfer

Guest transfer now runs inside one transaction and locks the authenticated user
before observing activity. It validates all identities before writing, deduplicates
resolved listing IDs, rejects missing source mappings rather than silently losing
views, bounds input to 500 positive integer IDs per collection, and rejects
Commercial inventory consistently with the generic favorites boundary. SQL string
timestamps replace Date values for string-mode columns.

Eight guest-transfer contract tests pass, including rollback after a later favorite
write failure, replay counts, explicit identity mapping, anonymous denial and
invalid inventory/input. The fake models commit/rollback; it does not prove MySQL
row locking. Database uniqueness across every writer remains open. Six favorites
boundary tests also pass. Type checking is still pending; no new schema or remote
database changes were made.
