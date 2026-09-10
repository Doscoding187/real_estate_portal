# P9 closure audit progress

Status: incomplete; packet review and required journey/provider evidence remain open.

The exact task-owned disposable target was rechecked on 2026-09-10:

- `pnpm db:schema:congruency` passed. Desired and actual digest:
  `69f4bf73e6ac9dc81b2be8b2cc36333e33d7a1ec6917ea392cbcc68466ac73fd`.
- `pnpm db:readiness -- --purpose=database-takeover` passed application
  readiness. The target is owned, connected, at migration
  `0080_service_lead_request_idempotency.sql`, and all 215 canonical tables
  are present.
- Canonical reference data and the `search-to-lead-v3` acceptance scenario
  are ready. Commercial reference, consumer/API smoke, browser journey,
  release, and full diagnostics layers remain explicitly not evaluated by
  this command.

The current branch has physical evidence packets for P1–P8 corrections,
including demand rollback, media tenant isolation and deletion invalidation,
and agency deal acceptance races. This document does not convert those
packet-level results into senior acceptance. Projection rebuild equivalence,
provider-specific semantics, unresolved billable-owner modelling, remaining
packet review findings, and the complete public/private journey audit remain
required before P9 can close.

Fresh establishment evidence was completed after disposing and recreating the
owned target:

- `pnpm db:authority:consumer-contract` passed from an empty database.
- All migrations through `0080_service_lead_request_idempotency.sql` applied.
- Canonical geography, Launch Access foundation, and Search-to-Lead scenario
  preparation and verification passed.
- The scenario exercised Search-to-Lead replay idempotency, conflicting replay
  rejection, lead custody, public eligibility negatives, and owner-versus-
  unrelated-user authorization.
- Schema congruency and Search-to-Lead readiness both passed with digest
  `69f4bf73e6ac9dc81b2be8b2cc36333e33d7a1ec6917ea392cbcc68466ac73fd`.

The target is populated again by this contract, as expected. This proves
fresh canonical establishment and the governed Search-to-Lead acceptance
scenario; it does not close browser, provider-specific, packet-review, or
projection-rebuild requirements.

Provider audit result: `pnpm db:schema:tidb-audit` completed with
`admitted: false`. The structural audit reports 12 FK/check-constraint
interactions requiring explicit DDL-action provenance or domain lifecycle
review, spanning catalogue publisher authority shape, development
supersession lifecycle checks, Land claim/conflict checks, and exact-target
location provider mappings. MySQL disposable acceptance does not establish
TiDB behavior for these interactions; the provider audit remains an explicit
P9 blocker until those decisions and deployment-provider verification are
recorded.
