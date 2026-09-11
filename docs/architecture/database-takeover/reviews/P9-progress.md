# P9 closure audit progress

Status: incomplete; packet review and required journey/provider evidence remain open.

P3 rebuild evidence is now physical: the authority-enabled
`integration.agency-listing-performance-mvp.test.ts` passed on the disposable
target, covering revision approval, public projection refresh, and preservation
of the canonical projection identity.

After the subsequent empty-target rebuild, the same authority-injected Desktop
Chrome P1 browser journey was rerun with `--retries=0` and passed. This proves
the browser persistence path remains valid after canonical migration and
scenario re-establishment, rather than relying on pre-existing target state.

The rebuilt target also passed the three physical listing/development authority
suites (`development-publication-lifecycle`, `listing-publication-readiness`,
and `agency-listing-attribution`): 25 tests passed. This revalidates publication
gating, withdrawal/readiness behavior, projection identity, and agency
attribution after a fresh canonical migration.

The rebuilt target also passed the billing authority packet: the persisted
foundation acceptance and provider-independent contract suites passed 10 tests
(2 physical billing tests and 8 contract tests), covering EFT proof protection,
entitlement activation, duplicate approval idempotency, rejection/correction,
and partial-payment non-activation.

The rebuilt target also passed the agency deal engine packet: 4 physical tests
covered immutable offer terms, generated transaction rollback, and concurrent
offer-acceptance serialization. The separate canvassing integration remains
profile-skipped on this worktree and is not counted as fresh physical evidence.

The rebuilt target also passed the P8 demand/media boundary packet: 4 physical
tests covered complete demand-routing rollback, media reconciliation, and
tenant/deleted-listing authorization. These results remain independent of
provider-specific TiDB admission.

The rebuilt target also passed the tenant-boundary packet: agency membership
maintenance and principal bootstrap passed 12 physical tests, including
suspension/reactivation closure, invitation identity consistency, incompatible
principal denial, concurrent bootstrap serialization, and rollback/retry.

The rebuilt target also passed the Land/geography packet: the authority-run
Land search geography, public router, and authoring router suites passed 24
tests, including canonical-location resolution and mixed-authority rejection.

The rebuilt target also passed Shared Living and Commercial office coverage:
6 physical Shared Living tests and 20 Commercial office contract tests passed,
covering private practitioner/owner boundaries, moderation and enquiry
delivery, and ordered commercial availability/economics semantics.

The full database-takeover readiness gate was rerun after these packets and
returned `applicationReady: true`: target ownership, connectivity, migration
head 0080, schema congruency, canonical geography, Search-to-Lead scenario,
and required-data checks were all ready. Commercial reference, consumer API,
browser, release, and full-diagnostics layers remain intentionally separate.

Cross-cutting verification was rerun after the rebuilt-target packet sweep:
`pnpm check` passed, and `pnpm db:authority:check` passed all 33 static
authority suites (272 tests). No authority-contract regression was introduced
by the packet changes.

The rebuilt target's launch-readiness agency walkthrough was rerun and passed
all 11 physical tests, covering onboarding, billing activation, invitation
acceptance, membership, listing publication, public lead capture, assignment,
agent response, and operating-home coherence.

The rebuilt target also passed the independent agent launch journey: its
physical publish-to-receive test passed, covering approved paid solo-agent
publication, public inventory attribution, and enquiry delivery.

The rebuilt target also passed the durable services-engine idempotency test,
covering repeated service-lead requests and provider-scoped request identity
against the relational service-lead schema.

After all physical packet runs, `pnpm db:schema:congruency` still reports an
exact match: desired and actual digest
`69f4bf73e6ac9dc81b2be8b2cc36333e33d7a1ec6917ea392cbcc68466ac73fd`, with no
differences or omitted items.

The rebuilt target also passed the full consumer activity persistence packet:
9 physical tests covered concurrent save/view cardinality, guest-transfer
idempotency and rollback, projection ambiguity, withdrawal removal, isolation,
and committed save/remove ordering. The injected failure log is expected test
evidence, and all assertions passed.

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

The existing unauthenticated development-wizard smoke was also run under the
same authority. It reached the application shell, but its legacy expectation
of a `Basic Info`/`Step 1` heading failed because the current wizard entry
requires authenticated developer context; the backend logged expected
`UNAUTHORIZED` responses for developer queries. This is recorded as a
journey-contract mismatch, not as a database-authority failure.

On 2026-09-11, `pnpm db:authority:status` resolved the exact disposable
worktree target (`806c61e7…`) with manifest-head-ready, schema-congruent
state, and application readiness ready. `pnpm db:authority:check` passed all
33 static authority suites and 272 tests. This revalidation did not evaluate
reference or scenario data, so it does not replace the fresh consumer
contract evidence above.

The disposable target was then explicitly disposed and recreated with the
required fingerprint acknowledgement. `pnpm db:authority:consumer-contract`
completed from the empty schema, reapplied migrations through 0080, restored
canonical reference/foundation/scenario data, and returned the target to
schema-congruent/application-ready state. This is a fresh-establishment
rerun, not evidence against the still-open TiDB provider gate.

The P2 authority packet was independently rerun on the same target. The
7-test lead-delivery suite initially revealed that an unscoped worker consumed
unrelated queued scenario obligations; the worker now supports an explicit
lead scope and the suite passes all 7 tests, including provider-unknown crash
recovery. Live-provider replay and final reconciliation/authorization review
remain open.
