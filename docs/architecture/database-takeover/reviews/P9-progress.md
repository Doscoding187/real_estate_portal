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

Running agency journey evidence also passed on the current disposable target:
`pnpm test:authority --
server/__tests__/integration.launch-readiness-walkthrough.test.ts` passed 11
physical tests. The walkthrough covers onboarding, billing activation,
invitation acceptance, canonical membership, listing publication, public lead
capture, assignment, agent response, and operating-home coherence. This is
API/integration evidence; a browser-rendered journey and the remaining
provider/rebuild audits are still required.

Earlier browser verification attempt: `pnpm test:browser:authority --
e2e/consumer-activity/persistence.spec.ts --project='Desktop Chrome'` did
not execute a test. The governed Playwright runner timed out waiting 120 seconds
for its `pnpm dev:backend` web server at `http://localhost:5000`; a direct
health check also found no listener. Generated report artifacts were restored.
Browser readiness was therefore initially unevaluated and was not claimed as
passed.

Diagnostic follow-up found the startup refusal: running the backend with the
central local environment directly reached boot, but its runtime schema probes
resolved the protected `clean-main-local` target and refused database access.
This confirmed browser startup needed an authority-injected child environment;
no protected database was mutated or accessed.

Browser launch was corrected on the current branch: Playwright now probes
`/api/health` on IPv4 and launches the authority-injected backend with the
development Vite shell enabled. A rerun reached the canonical property page
and executed the P1 journey. After removing a stale locator interaction that
ran after navigation, the focused Desktop Chrome journey passed with
`--retries=0`; the disposable target remained the authority-injected runtime
database throughout. Browser acceptance is now evidenced for this P1 journey,
while the broader browser and provider/rebuild audits remain open.
