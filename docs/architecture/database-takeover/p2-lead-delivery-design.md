# P2 lead delivery design

Status: implementation design for `feat/database-architecture-takeover`  
Date: 2026-09-09  
Depends on: accepted P1 (`c378e12ce21362cb25047f2ba6c660bf2507cbe4`)

## Boundary

`leads` remains the capture, consent, and custody root. Delivery operations
move to two canonical relational tables:

- `lead_deliveries` is one durable obligation for one lead, purpose, routing
  revision, channel, and explicit destination. Its idempotency key is unique.
- `lead_delivery_attempts` is append-only operational history for claims and
  provider outcomes. A retry creates a new attempt number; a completed attempt
  is never edited into a later retry.

The existing `leads.delivery_status`, `delivery_last_attempt_at`,
`delivery_next_attempt_at`, `delivery_last_error`, and
`delivery_provider_reference` columns remain only as a lead-level read
projection. They have one writer (`leadDeliveryService`) and are updated in
the same transaction as the relational rows. `delivery_attempts` JSON is
removed. No runtime reader parses or writes JSON delivery history.

## Delivery authority

Each delivery has:

- a stable ID and lead foreign key;
- `purpose` (`primary_custody`, `notification`, or `platform_action`);
- `routing_revision`, `channel`, and a unique idempotency key;
- explicit recipient type and typed nullable foreign keys for agent, agency,
  developer organisation, publisher, or user. Platform manual custody has no
  recipient FK. The service rejects any shape with a mismatched recipient;
- destination name/address snapshots and a JSON provider metadata snapshot;
- custody and supply-origin values captured at admission;
- state, due time, retry budget, and timestamps.

The current primary obligation is the greatest routing revision for the lead
and purpose. A route correction marks the old obligation `superseded` and
creates a new revision. History remains queryable, while lead summaries and
customer-facing custody use only the current revision.

## State transitions

| Surface | States | Rules |
| --- | --- | --- |
| Delivery | `queued → claimed → accepted → completed` | Claim is committed before provider work. Internal inbox handoff may enter `completed` with an immutable completed attempt. |
| Delivery | `claimed → retryable_failed → queued` | A bounded retry is scheduled with a UTC due time. |
| Delivery | `claimed → unknown` | Provider outcome is ambiguous (for example, process loss after an unsupported provider accepted the request). Operations reconciliation is required before retry. |
| Delivery | `retryable_failed → exhausted` | The retry budget is consumed; no automatic claim remains. |
| Delivery | `queued/claimed → cancelled/superseded` | Cancellation or route correction makes the obligation ineligible for future claims. |
| Attempt | `queued → claimed → accepted/completed/retryable_failed/exhausted/unknown` | Each attempt has a unique number and immutable claim generation. An expired claim becomes `unknown`; it requires reconciliation before another external invocation. |

`delivered` in the existing API is a compatibility label for a relational
`completed` custody obligation. It does not claim that a person read a message
or that an external mailbox delivered it. Provider acknowledgements are named
`accepted`; unsupported-provider ambiguity is returned as `unknown` and is not
silently retried.

## Claim and recovery

Workers select due current deliveries with a bounded limit, lock the delivery
row, and insert or claim one attempt while assigning a random lease token and
generation. The transaction commits before the provider callback runs.
Completion requires the delivery ID, attempt ID, lease token, and routing
revision. A stale or expired worker therefore cannot overwrite a newer attempt
or correction. Expired claims and their deliveries are marked `unknown` because
the worker may have died after provider acceptance. Neither ordinary claiming
nor retry requests may dispatch them again. A definite provider rejection can
schedule a bounded retry; lease expiry cannot. The worker API accepts an
injected dispatcher so tests can prove restart and provider uncertainty without
calling a real provider.

## Capture and consumer map

Public capture inserts the lead, consent, required primary delivery, and any
domain context in one transaction. A repeated `captureRequestId` returns the
same lead and delivery idempotently; a changed payload conflicts. Optional
analytics and notification side effects remain after the custody commit and
cannot change its acknowledgement.

All delivery readers and writers must use the relational service:

- `publicLeadCaptureService` admits the primary obligation and reads the
  current delivery snapshot on replay;
- `publisherLeadService` claims, dispatches, and completes publisher email
  obligations;
- `leadRoutingCorrectionService` supersedes old revisions and records manual
  platform actions;
- `leadRoutingAuditService`, `leadRoutingConversionReportService`, and
  `developerFunnelService` read current relational custody/attempts;
- agent, Shared Living, and super-admin routes read current summaries and
  typed destinations; none inspect an array tail;
- fixtures and the Search-to-Lead scenario create relational delivery rows
  through the same service or explicit canonical inserts.

## Deletion, authorization, and provider limits

Delivery and attempt history cascades with its lead. A delivery destination is
authorized from current canonical supply ownership at admission; its snapshot
preserves what was attempted after ownership changes. Only the owning agent,
agency, developer organisation, or platform operations role may inspect or
act on an obligation. Lead and tenant predicates remain required in every
reader. A provider boolean without a stable id is not exactly-once evidence;
the unsupported-provider crash window remains explicitly `unknown` for
reconciliation.

## Migration and evidence gate

Migration `0076_lead_delivery_relational_authority.sql` is an admitted
pre-launch exceptional migration. It creates both relational tables and drops
the obsolete JSON column after the runtime cutover. Existing disposable rows
may be discarded under the task-owned target plan; no legacy backfill or
alternate schema reader is permitted. The packet must prove fresh
establishment, incremental application, independent-worker races, capture
rollback, restart/expiry recovery, provider uncertainty, route supersession,
authorization, and all listed consumer journeys.
