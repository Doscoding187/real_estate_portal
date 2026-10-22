# Developer Inventory Release Contract

**Status:** Product and domain contract proposal; not database-authority approval  
**Date:** 2026-10-18

This contract describes how the Developer Engine should control marketable
inventory. It is intended to guide the Developer implementation and its read
contract with Distribution. It does not authorize schema changes, migrations,
database application, or changes in the Distribution worktree.

## Product outcome

The Developer Engine is the authority for what a development can offer for
sale or rent. The workspace should let an authorized team prepare a phase,
release selected supply, see what is marketable by transaction mode, and explain
why each item is or is not marketable.

The engine records inventory consequences of commercial activity. It does not
need to replace a developer's CRM or reproduce every lead and deal workflow.
CRM stages do not themselves change inventory state.

## Separate controls

These facts have different owners and must not be collapsed into one status:

| Control               | Meaning                                                                                      | Does not mean                                           |
| --------------------- | -------------------------------------------------------------------------------------------- | ------------------------------------------------------- |
| Campaign publication  | The development's marketing content is approved for a public surface.                        | That any inventory is currently for sale or rent.       |
| Development lifecycle | The campaign is launching, selling, sold out, or otherwise in its lifecycle.                 | That all inventory has been released.                   |
| Phase lifecycle       | A phase is being prepared, is commercially active, is paused, or is archived.                | That its inventory is automatically public.             |
| Batch release         | Specific inventory or a well-defined quantity is authorized for selected channels and modes. | That a buyer has reserved it.                           |
| Inventory commitment  | A hold, reservation, offer, contract, sale, lease, or legal restriction affects an item.     | That the development campaign is published.             |
| Transaction mode      | The item is offered for sale, rent, or an explicitly supported combination.                  | The item's physical condition or construction progress. |

Phase activation is a macro eligibility decision. Batch release is the explicit
decision that exposes supply. A phase may be selling while some or all of its
inventory remains unreleased.

## Marketability rule

An item or pool allocation is marketable for a selected mode only when all
applicable conditions pass:

1. The development is publication-eligible under the canonical Developer
   publication authority.
2. The development lifecycle permits marketing. Sold-out fails closed for both
   sale and rent until the source model and projection expose mode-specific
   lifecycle explicitly.
3. If the inventory is phase-scoped, its phase is selling and is not archived
   or paused.
4. An active, authorized release covers the exact item or an explicitly scoped
   pool quantity, selected transaction mode, and channel.
5. The item or pool allocation is available for that mode and has valid
   mode-specific commercial terms.
6. No active commitment or restriction blocks the proposed marketing action.

Missing scope, release, lifecycle, price, or channel authority means hidden.
Development-wide aggregate counts must not be treated as phase-scoped stock.
Distribution additionally requires an active Distribution opportunity and
access for the requesting partner. Distribution does not calculate or mutate
Developer marketability.

## Release requirements

A release action must identify what supply it affects. It may cover:

- named inventory items; or
- a quantity from a pool whose phase, product definition, transaction mode,
  price basis, and allocation rules are explicit.

An aggregate `available_units` value alone cannot safely represent a release
of ten particular homes, prevent two users allocating the same home, or prove
which homes are protected by an existing commitment. Until item identity or a
properly governed pool-allocation authority exists, the workspace must not claim
that a specific subset was released.

Every confirmed release records, at minimum, the actor and authority, time,
reason, development and phase, item set or pool quantity, transaction mode,
channel scope, commercial-terms snapshot, and resulting projection revision.
The historical release record is not silently rewritten when inventory,
pricing, or channel policy later changes. Pausing or withdrawing a release is a
new audited action.

Preparing a phase or release is a draft operation. Confirmation is an
authorized command that revalidates eligibility and current inventory in the
same transaction that records the state change and audit event. A stale screen
must not override a concurrent reservation or release.

## Inventory commitment and sale/rent changes

Sale and rent availability, counts, and price bases are independent facts.
Purchase prices and monthly rents must never be combined into one range or
count. A specific home may have a different price from another home of the
same plan or type; type-level price ranges are summaries, not promises for an
individual item.

The default policy is that a unit has one active allocation/commitment at a
time. Whether the same uncommitted unit may be advertised for sale and rent at
once is a developer policy that must be explicit; the system must not infer it
from a shared availability count.

Changing an item's offered mode is an explicit, audited inventory command. It
must recheck that no incompatible hold, reservation, offer, contract, completed
sale, tenancy, or legal restriction is active. If a tenancy or contract permits
a sale subject to that commitment, that requires an explicit supported policy
and recorded terms; it is not a silent status flip. A failed validation leaves
the existing state unchanged and explains the blocking commitment.

Any price or mode terms captured by an active reservation, offer, or contract
remain a historical snapshot. A later price change affects future marketability
only and must not rewrite existing terms.

## Failed commitments and return to market

- An expired short hold may be released automatically only under a defined
  expiry policy, after rechecking that it has not been extended or progressed
  to a later commitment. Expiry is an auditable transition; deleting the hold
  is not the history.
- A failed offer or contract requires a recorded outcome and authorized
  review. Returning the item to public or partner channels requires a new or
  explicitly reactivated release decision after the blocking commitment is
  cleared.
- A completed sale that is later reversed is a separate legal/operational case.
  It cannot return to market through ordinary cancellation or a status edit.
- A re-listed item retains its prior history and receives a new marketability
  decision. It is never made public solely because a deal record was removed.

This workspace contract does not determine legal validity or manage deposit,
refund, conveyancing, or buyer-document workflows. Those require their own
validated boundaries.

## Audit, authorization, and concurrency invariants

Every state-changing command must be server-authorized and scoped to the
developer organization and development. It records actor, role, action,
effective time, reason, before/after state, affected item or allocation, linked
release or commitment, and a stable request identity for safe retries.

The state change and its audit event succeed or fail together. Concurrent
release, reserve, expire, cancel, and mode-change actions must enforce current
state at the database command boundary; a UI read followed by an unguarded
write is not sufficient. Repeating the same command must not duplicate an
allocation or event.

Public and partner read projections expose only current marketable totals and
commercial terms permitted for that channel. They do not expose internal item
identifiers, buyer information, private commitment details, or unrestricted
storage URLs.

## MVP acceptance boundary

The first safe release slice should demonstrate that:

1. A planned phase can be prepared without becoming visible or marketable.
2. An authorized phase activation does not release all of its inventory.
3. A confirmed batch names its affected items or a governed pool quantity and
   records an auditable, immutable decision.
4. Public and partner marketability is derived from publication eligibility,
   lifecycle, phase scope, active release, mode-specific availability and
   channel permission.
5. Sale and rent counts and price bases remain separate; sold-out inventory
   fails closed for both modes.
6. A reservation or other commitment cannot be overwritten by a phase edit,
   release edit, price edit, or sale/rent switch.
7. Failed commitments return to market only through the appropriate guarded
   recovery and release action.
8. Every command revalidates authority and current state atomically and leaves
   a traceable history.

If the current aggregate model cannot satisfy an acceptance condition, the
workspace must show the limitation and keep the affected supply hidden. It
must not simulate item-level control by adjusting aggregate counts.

## Implementation gate

The current canonical baseline has phase planning and publication controls but
does not establish a complete item/pool release ledger, authorized batch
commands, or commitment lifecycle. The candidate migrations being reconciled in
the separate integration worktree are not approval to implement against an
assumed schema.

Before database-backed release work begins, the Developer owner must confirm
the canonical schema and migration sequence, the authority for itemized versus
pooled inventory, and the transaction boundaries for release and commitment
commands. Until then, this contract is a product/domain target only; no schema
or migration is approved by it.
