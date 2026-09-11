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

The protected release boundary was also exercised: the TiDB convergence
release-plan command refused the disposable worktree with
`release-plan is not allowed for disposable-worktree`. This confirms release
planning remains isolated from pre-launch disposable validation.

A combined rerun of consumer persistence and services-engine idempotency also
passed all 10 physical tests on the rebuilt target, confirming the P1/P8
durable-write paths do not interfere when exercised in one authority run.

The rebuilt target's launch-readiness agency walkthrough was rerun and passed
all 11 physical tests, covering onboarding, billing activation, invitation
acceptance, membership, listing publication, public lead capture, assignment,
agent response, and operating-home coherence.

After the marketing-authority quarantine and placeholder-module removal,
`pnpm db:readiness -- --purpose=database-takeover` was rerun and returned
`applicationReady: true`. The target remains owned and schema-congruent at
manifest head 0080 with canonical geography and Search-to-Lead data ready;
consumer API, browser, release, and full-diagnostics layers remain separately
unevaluated.

The rebuilt target also passed the independent agent launch journey: its
physical publish-to-receive test passed, covering approved paid solo-agent
publication, public inventory attribution, and enquiry delivery.

The rebuilt target also passed the durable services-engine idempotency test,
covering repeated service-lead requests and provider-scoped request identity
against the relational service-lead schema.

The rebuilt target also passed the authenticated agency workspace smoke test:
login/session-cookie issuance, current-user resolution, tenant-scoped agency
data access, and logout all completed successfully.

The rebuilt target also passed the agency viewings workflow: 4 physical tests
covered tenancy, lifecycle transitions, rescheduling, notification idempotency,
reassignment permissions, timezone day boundaries, and structured lead
follow-up.

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
and agency deal acceptance races. The identified P6 offer-acceptance race is
now accepted in `reviews/P6-senior-review.md`; broader P6 lifecycle coverage
remains open. P5's billable-owner alternatives and recommended future model
are recorded in `p5-billing-authority-decision.md`, but implementation is not
complete. P5 also has an explicit incomplete senior review in
`reviews/P5-senior-review.md`; billable-account migration and entitlement race
proof remain open. P3 has an explicit incomplete-evidence senior review in
`reviews/P3-senior-review.md`; its writer census and cross-supply rebuild proof
remain open. P4's exercised tenant and principal boundaries are accepted in
`reviews/P4-senior-review.md`; account, credential, and complete fallback-path
closure remain P9 work. This document does not convert the remaining packet-level results
into senior acceptance. P7 has an incomplete senior review in
`reviews/P7-senior-review.md`; public mixed-authority journey, Commercial
economics races, and provider validation remain open. Projection rebuild equivalence,
provider-specific semantics, unresolved billable-owner modelling, remaining
packet review findings, and the complete public/private journey audit remain
required before P9 can close.

P8 now has an explicit incomplete senior review in
`reviews/P8-senior-review.md`; public media rebuild, analytics rebuild/query
proof, and retention/abuse controls remain open.

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
8-test lead-delivery suite initially revealed that an unscoped worker consumed
unrelated queued scenario obligations; the worker now supports an explicit
lead scope and the suite passes all 8 tests, including provider-unknown crash
recovery and scoped expired-claim recovery. Live-provider replay and final reconciliation/authorization review
remain open.

On 2026-09-11, a follow-up runtime census found three disabled monetization
procedures returning fabricated empty/null values. `getAllRules`, `getHeroAd`,
and `getFeaturedDevelopers` now fail closed with `PRECONDITION_FAILED` until a
canonical placement authority is approved; the admitted `getRecommendedAgents`
resolver remains available. The focused agents-serving-location contract passed
7 tests and TypeScript check passed. This removes a silent-fallback surface but
does not close the outstanding P8 analytics/media/provider work.

The same follow-up removed an Explore analytics schema-error fallback that
returned zero-valued aggregate metrics. Missing canonical analytics schema now
produces an explicit `PRECONDITION_FAILED`; the focused authority contracts
pass 8 tests combined. Aggregate rebuild and query-plan evidence remain open.

Demand campaign listing and agent lead-summary queries likewise no longer
return empty/default success data when the canonical schema is unavailable or
a read fails. They now fail with `PRECONDITION_FAILED`; the focused demand
authority contract passed and TypeScript check passed.

The disabled suburb-review mutation was also changed from a nominal failure
payload to an explicit `PRECONDITION_FAILED` before any write acknowledgement.
The location-insights authority contract and TypeScript check pass; review
storage and read-path authority remain open.

Price insights runtime schema guessing and error-to-empty responses were also
removed. Hierarchy queries now use canonical physical location columns and
unavailable reads fail with `PRECONDITION_FAILED`; the focused price-insights
authority contract and TypeScript check pass. Query-plan evidence remains open.

The underlying micromarket query no longer swallows database errors as an
empty result; errors reach the router's explicit unavailable-state boundary.

Distribution partner terms now require the canonical `brochure_config_json`
field and no longer retry against an alternate schema or serve partial terms.
Focused distribution contracts and TypeScript validation pass.

Authenticated agency and super-admin dashboard analytics no longer convert
database failures into zero-valued success data. Missing agency membership is
also rejected explicitly. Dashboard authority and agency workspace smoke
checks pass; broader analytics evidence remains open.

Required-document reads no longer retry legacy columns or convert missing tables
into empty/zero success data. Canonical reads propagate errors, and the write
boundary retains its explicit `PRECONDITION_FAILED` response. Updated service
and distribution guard tests pass.

Required-document reads no longer retry legacy columns or convert missing tables
into empty/zero success data. Canonical reads propagate errors, while the
mutation boundary retains explicit `PRECONDITION_FAILED` handling. Updated
service and distribution guard tests pass.

Distribution access lookups now propagate missing-schema errors instead of
turning them into absent rows that could trigger an accidental upsert. Focused
access-policy and repository authority contracts pass with TypeScript
validation.

Distribution access repository lookups now propagate missing-schema errors
instead of treating an unavailable table as an absent row, preventing accidental
upsert behavior against an unknown authority. Focused access-policy and
repository authority tests pass.
