# Database Forward-Integration Charters

**Status:** Decision gate recorded in convergence PR #548; no schema, migration,
runtime query, seed, fixture, or database operation is authorized by this
document.

**Authority used:** Database Authority v3, the active manifest headed by
`0061_sl_messages_authorship.sql`, canonical Drizzle models, and the
Database Authority Policy.

The current root worktree's authority status reports an invalid migration
lineage and non-congruent schema. This charter therefore records the only
safe next step for two recovered database-bearing ideas: product and domain
decisions before a dedicated, current-main Database Authority workstream.
It does not adopt historical migration numbering, tables, or runtime code.

## 1. Development delivery updates

### Recovered intent

Developers should be able to record an operational delivery fact separately
from buyer-facing copy; a buyer-visible update must be deliberate, auditable,
and based on an approved projection rather than an internal risk signal.

The recovered snapshot is
`worktrees/listify-development-delivery-updates-recovery-328334a69ff1/working-tree`.
Its useful design inputs are:

- stable delivery stages and milestone vocabulary;
- an internal fact with confidence, impact, evidence, and next checkpoint;
- a buyer-safe projection that is required before publication; and
- durable event history for the approval transition.

### Why the snapshot cannot be applied

Its implementation creates `drizzle/migrations/0008_30009_development_delivery_updates.sql`,
references the historical `developers` owner, and introduces four legacy-lane
tables. The active authority is manifest-led under `server/migrations/`, while
current Developer Engine ownership is organisation membership plus a
`catalogue_publisher` attached to each development. Reusing its DDL, foreign
keys, or router would introduce a parallel authority.

### Decisions required before implementation

1. Confirm that a buyer-visible delivery update is an approved launch
   capability, rather than an internal Developer workspace note.
2. Select the owner and writer policy from the current model: development,
   catalogue publisher, developer organisation, and the exact active
   membership roles that may create, edit, approve, or revoke an update.
3. Define whether a previously buyer-visible update is immutable, superseded,
   or retractable—and the customer-facing wording for each state.
4. Define the evidence model: opaque reference, canonical media/document
   relation, retention, and who can see internal evidence.
5. Decide whether milestone labels are product-wide vocabulary or
   publisher-controlled configuration. They must not silently become another
   marketing status authority.

### Required current-main implementation boundary

After those decisions, use a dedicated Database Authority branch and one
manifest-approved `server/migrations/` expansion after the then-current head.
The canonical Drizzle model, runtime service, authoring route, public read
surface, scenario/fixture contract, and tests must be introduced together.
The implementation must not read or write the old `developers` relationship,
`drizzle/migrations/`, or any retired migration lane.

Minimum acceptance evidence:

- an unauthorised organisation member cannot create or approve an update;
- an internal risk/fact is not publicly readable;
- buyer visibility requires the approved projection and records actor/time;
- public detail exposes only the approved current projection; and
- migration manifest, canonical-model, consumer, and current journey tests
  pass against an authority-owned fresh worktree target.

## 2. Explore Option A reviewed listing authority

### Recovered intent

The existing allowlisted Explore Option A pilot may need a reviewer-governed
listing authority lifecycle: explicit grant, expiry, revocation/invalidation,
idempotent operation identity, and immutable event evidence.

The recovered snapshot is
`worktrees/listify-explore-authority-841e5b13bd06/working-tree`. Its useful
design inputs are its fail-closed candidate check, reviewer self-grant ban,
exclusive expiry boundary, idempotency, and lifecycle-event requirements.

### Why the snapshot cannot be applied

It creates non-manifest `server/migrations/0076_create_explore_option_a_listing_authority.sql`
and a standalone pair of authority tables whose relationships were designed
against an earlier context. Current `main` already owns a deliberately
allowlisted pilot access policy and a current eligibility service. It has no
approved durable grant/revoke model, so the old schema is design evidence—not
canonical authority.

### Decisions required before implementation

1. Confirm that the Option A pilot is still a product priority and name the
   accountable reviewer/operational owner.
2. Identify the current canonical professional, listing, agency-membership,
   and operator identities to snapshot in an authority record. Do not infer
   eligibility from display text or legacy profile ownership.
3. Define grant duration, regrant semantics, expiry processing, revocation and
   invalidation reasons, and whether any transition affects a public route.
4. Define the allowed evidence bases and the reviewer audit requirements,
   including user-visible versus internal notes.
5. Decide whether the environment allowlist remains only a pilot access gate
   or is replaced by a durable approved authority. The two mechanisms must not
   become competing sources of truth.

### Required current-main implementation boundary

After those decisions, implement one dedicated current-main Database Authority
workstream. It must use a single active migration after the then-current
manifest head, canonical Drizzle models, transactional lifecycle mutations,
and a current discovery router/service. It must fail closed rather than fall
back to old profiles, alternate tables, or environment text.

Minimum acceptance evidence:

- only the approved reviewer role can grant, revoke, or invalidate;
- a grant is idempotent by operation identity and cannot be self-granted;
- expired or invalidated authority is never effective in a public candidate
  read;
- the current eligibility basis is revalidated at mutation and read boundaries;
- each lifecycle transition has immutable actor/time/reason evidence; and
- migration manifest, canonical-model, consumer, pilot-access, and
  public-discovery contracts pass against an authority-owned fresh worktree
  target.

## Handoff rule

This charter keeps both improvements visible in active PR #548 without
pretending the old database implementations are mergeable. Product approval of
the decision lists above is the entry condition for a dedicated implementation
PR; until then, their historical source remains preserved and classified, not
hidden or silently revived.
