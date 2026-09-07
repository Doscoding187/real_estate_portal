# TiDB convergence design for review

Status: proposed implementation contract; not production authorization. Read
`tidb-convergence-audit-2026-09-07.md` for completed evidence and limitations.

## Decision to implement

Retain Drizzle as the intended model, one manifest, one connection authority,
one migration runner, and the existing history/attempt ledgers. Introduce a
versioned establishment checkpoint within that authority. Existing databases
advance through an explicit convergence transition; verified empty databases
establish the same checkpoint directly. Future incremental migrations have
one parent checkpoint regardless of how the database reached it.

The checkpoint is necessary because a repair appended after migration 0065
cannot prevent an earlier CREATE TABLE failing on TiDB with CHECKs enabled.
Editing applied migrations or recording skipped migrations as executed is not
an acceptable implementation of the checkpoint.

The checkpoint must contain immutable SQL, its digest, the intended model
digest, the superseded manifest digest, and the actual establishment receipt.
It must not invent successful history rows for 0000–0065 on a fresh database.
Preserve that historical manifest and all existing production history as
evidence. The runner must explicitly understand both receipt forms and reject
mixed, incomplete, unknown, or fabricated lineage. This requires a reviewed
manifest-format and policy change before activation; the current manifest is
not changed by this proposal.

## Referential lifecycle

All 22 canonical CHECK predicates remain enforced. Restrictive relationships
that overlap CHECKs use omitted FK actions only after provider tests prove
both parent deletion and parent-key updates remain prohibited. Do not infer
this from INFORMATION_SCHEMA's effective NO ACTION spelling.

Land claims require a model decision, not just different SQL rendering. The
authoring service retains withdrawn claims for review, while current CASCADE
relationships can remove claims and their verification descendants. The
proposed lifecycle retains claim-bearing assets and parcels. Withdrawal is an
update to claim state; hard deletion of a referenced subject is rejected.
Implement this in Drizzle and the checkpoint/convergence contract together,
with application and database tests. No automatic data deletion or repair is
part of convergence. A later intentional erasure workflow needs its own domain
contract and authorization.

## One protected forward transition

The offline audit now emits a deduplicated `foreignKeyImpacts` inventory. The
current model has 12 affected keys, not the 13 keys in the operator CSV:
`development_supersessions.verified_by_actor_id` has no CHECK dependency and
is outside the repair scope. Do not use normalized logical FK names as SQL
constraint names; resolve the actual name from the verified physical snapshot.

| Table / referencing columns | Historical DDL | Candidate disposition |
| --- | --- | --- |
| catalogue_publishers / developer_organisation_id | 0010 | Remove explicit restrictive action spelling, preserve restriction |
| development_supersessions / source_development_id, replacement_development_id, activated_by_actor_id, reversed_by_actor_id | 0006 | Remove explicit restrictive action spelling, preserve restriction |
| location_provider_mappings / province_id, city_id, suburb_id | 0004 | Omit both DELETE and UPDATE clauses, preserve restriction |
| land_claims / land_asset_id, parcel_id | 0024 | Change lifecycle to retain claim-bearing subjects; requires model and consumer tests |
| land_conflict_cases / conflicting_land_asset_id, conflicting_listing_id | 0030 | Historical DDL already omits actions; preserve if SHOW CREATE confirms it |

Thus the historical DDL suggests ten replacements and two provenance-only
checks. This is a proposed scope, not a live plan: any physical mismatch must
be reported and reviewed before SQL is generated. The unaffected FKs on these
tables retain their existing behavior. No global replacement of CASCADE,
RESTRICT, or NO ACTION across the schema is permitted.

The new operation consumes the exact failed v1 attempt and produces one new
durable attempt. It must never restart the v1 loop or erase its failure.

1. Resolve and authorize the production fingerprint and separate migration
   credential using the existing connection authority.
2. Inventory the complete physical schema, exact FK names and rendered
   definitions, enforced CHECK definitions, successful history, all incomplete
   attempts, server identity/version, and capability state. The known v1
   failure and its digest must match; every other incomplete attempt blocks.
3. Prove the intended starting shape. Count orphan references and violating
   CHECK rows, including SQL NULL/UNKNOWN semantics. Preserve row counts and
   a reproducible content-preservation digest for affected application data.
   Unexpected rows or drift stop planning; the operation cannot fix data.
4. Emit the complete ordered transition and digest: each FK replacement, every
   CHECK addition, exact preconditions, expected postconditions, checkpoint
   identity, and the specific v1 evidence being superseded. Include the
   capability change already performed by v1 as an observed side effect.
5. Apply only with approval for this new transition and an exact plan digest.
   Acquire the existing migration lock and repeat the plan checks under it.
   The application must be quiesced for the FK transition: the migration lock
   serializes migration runners but does not stop application writers.
6. Record durable intent before each DDL statement and durable verification
   after it. FK replacement may create an interval without an enforced FK;
   quiescence and pre/post orphan checks are mandatory. Do not describe DDL as
   transactionally rolled back or claim multi-action ALTER is atomic without
   direct provider evidence.
7. Independently verify the entire target model, all 22 enforced checks, FK
   rejection behavior on disposable fixtures, and preserved application data.
   Publish the checkpoint receipt and mark the historical attempt superseded
   only after this succeeds. Keep the original error and progress evidence.
8. Resume runtime access and verify database-backed application readiness and
   representative consumer journeys using the normal runtime credential.

## Interrupted transition

Every DDL boundary has three physical states: the recorded precondition, the
recorded postcondition, or an unexpected state. A new read-only recovery plan
may classify the first two; the third requires investigation. No startup or
ordinary release silently resumes an interrupted transition.

A command failure after server-side success must be recognized through exact
physical postconditions, not through statement counters alone. Any continuation
requires a new reviewed digest and retains its predecessor evidence. In
particular, failure after dropping an FK must leave application writes paused
until referential enforcement has been restored and verified.

## Required executable evidence before release

| Proof | Acceptance condition |
| --- | --- |
| Fresh MySQL and TiDB establishment | Same intended physical model; CHECK enforcement enabled throughout |
| Historical MySQL head | Transition preserves rows and reaches the checkpoint |
| Historical TiDB head, checks absent | Reproduces the known failure state, then converges all objects |
| Explicit versus omitted FK actions | CHECK creation and parent delete/update behavior observed on pinned TiDB |
| Land claims | Withdrawal preserves history; subject deletion rejects; verification descendants remain |
| Fault injection at each DDL boundary | Evidence survives, ordinary release blocks, continuation classifies exact physical state |
| Drift and approval failures | No DDL on wrong digest, wrong target, unknown schema, orphan rows, or unrelated failed attempts |
| Consumer contracts | Search-to-lead, distribution, publisher ownership, Land review, and reference data pass |

Pin the provider binary/image by digest and record its actual version. A
standalone TiDB unistore test establishes SQL/DDL behavior only; it does not
prove TiDB Cloud permissions, distributed failure behavior, or production
availability. Production requires a fresh read-only plan and a separately
approved apply after review of the implementation and disposable results.
