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
are recorded in `p5-billing-authority-decision.md`; the typed billable-account
cutover and provider lease fencing are implemented and physically exercised.
P5 also has an explicit senior review in
`reviews/P5-senior-review.md`; the canonical Launch Access scope is accepted,
while non-commercial and partner lifecycle coverage remains separate. P3 has an explicit incomplete-evidence senior review in
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

Distribution access status handling now uses canonical enum values directly;
legacy aliases are no longer normalized or retried. Repository contract and
TypeScript checks pass. Provider integration evidence remains unrun because the
current shell has no disposable `DATABASE_URL`.

The exact disposable target was re-resolved and the distribution referral
integration suite was rerun under `pnpm test:authority`; all 8 tests passed
against the MySQL target. Distribution status behavior now has provider-backed
acceptance evidence; TiDB/provider admission remains open.

Additional provider-backed distribution evidence passed on the same target:
partner-program terms (3 tests) and manager checklist (11 tests), 14 tests
combined under `pnpm test:authority`.

Brand onboarding preset reads no longer turn a missing canonical column into a
valid `null` preset. Schema errors propagate, with explicit write-path handling
preserved. Preset service tests and TypeScript validation pass.

Distribution access writes now require canonical lifecycle timestamp columns;
unknown-column retries that silently omitted lifecycle timestamps were removed.
Canonical status/access tests and TypeScript validation pass.

Distribution access policy no longer synthesizes legacy partnership/access state
from visibility or program presence. Persisted canonical rows are the sole
authority. Provider-backed referral and program-terms suites passed 11 tests;
TypeScript validation passed.

The distribution catalogue listing endpoint no longer retries with a widened
fallback query after an empty result. Its canonical publisher/publication/search
scope is now applied once; schema-guard and authority contracts pass.

Distribution router reads now require current primary-manager and current-tier
rows; arbitrary active-manager and historical-tier fallbacks were removed.
Provider-backed manager-checklist and referral suites passed 19 tests, with
TypeScript passing.

After the distribution authority cleanup, the full `pnpm db:authority:check`
was rerun on 2026-09-11: 33 static suites and 272 tests passed; utility
authority (118 surfaces), schema sanity (215 tables / 81 migrations),
deterministic inventory, and lifecycle checks also passed.

On 2026-09-11, the authority-injected Desktop Chrome consumer journey was
rerun with `pnpm test:browser:authority -- e2e/consumer-activity/persistence.spec.ts
--project='Desktop Chrome' --retries=0`; the single P1 test passed in 20 seconds,
covering guest transfer, save/remove persistence, reload, and canonical recent
view behavior. Broader browser journey coverage remains open.

An authority-injected rerun of `e2e/agency/agency-workspace-smoke.spec.ts` did
not execute the journey. Its fixture loader hard-codes the protected
`listify_local` database; after an exploratory local-target adjustment, the
canonical disposable target lacked the test's `agency-new-buyer@listify.local`
fixture. The exploratory test edit was reverted, generated artifacts were
restored, and agency browser acceptance remains unverified pending a governed
fixture migration or replacement journey contract.

An authority-injected rerun of `e2e/developer/development-home.authenticated.spec.ts`
did not execute the journey because its fixture loader hard-codes the
`listify_test` database. The current authority runner correctly injects the
owned disposable worktree target. Generated browser artifacts were restored;
developer browser acceptance remains unverified pending a governed fixture
migration or replacement journey contract.

The authority-injected provincial discovery browser suite was rerun with a
captured terminal exit code: all 21 Desktop Chrome tests passed in 1.2 minutes
against the disposable target. The suite covered Gauteng and Western Cape
neutrality, canonical location/filter routing, refresh/back/forward behavior,
responsive layouts, keyboard interaction, sparse states, and unavailable
provinces. Expected unavailable monetization resolver responses were asserted
by the journey; generated artifacts were restored.

The governed Desktop Chrome search-routing suite was also run with a captured
exit code. It failed 9 of 11 tests: province and city/suburb searches remained
at `/` or produced null location query parameters, while 2 tests passed. This
is a current route-contract failure, distinct from the authenticated fixture
gaps, and requires a search-routing implementation review before P9 can close.
Generated browser artifacts were restored.

A compact rerun of `e2e/provincial-discovery.spec.ts` under the authority browser
runner completed with exit code 0: all 21 Desktop Chrome tests passed in 1.2
minutes. This is fresh public journey evidence; authenticated journeys and
search-routing contracts remain open as recorded above.

The search-routing rerun was captured with an explicit terminal exit code and
confirmed 9 failures out of 11 tests (2 passed). The failures are real route or
fixture integration gaps: province/city/suburb entry remained at `/` or lacked
expected query parameters. No browser artifacts remain in the worktree.

The task-owned disposable target was disposed, recreated, and freshly established
through `pnpm db:authority:consumer-contract` before rerunning search routing.
The rerun still failed 9 of 11 tests (2 passed), proving the failures are not
caused by missing reference data. The current implementation uses the governed
location-authority flow, while this suite expects legacy keyword/quick-link
routing; reconciliation or replacement of that route contract remains open.

On 2026-09-11, a focused rerun after an exploratory canonical-suggestion test
helper confirmed the same boundary rather than establishing a pass: canonical
location suggestions resolve, but the legacy province SEO, quick-link, and
direct-page assertions still fail (10 of 11 tests failed in that exploratory
run). The helper change was reverted and browser artifacts restored. The clean
branch then passed `pnpm check` and `pnpm lint:check` (0 errors; 11,220 existing
warnings). No production behavior or test expectation was weakened.

The Explore analytics unit contract had remained stale after the service was
changed to fail closed on missing canonical schema. It now asserts the required
`PRECONDITION_FAILED` response instead of fabricated zero metrics. The focused
service suite passes 2 tests and `pnpm check` passes; aggregate rebuild and
query-plan evidence remain open.

The Explore recommended and area feed services now distinguish a missing
canonical Explore table from a transient query failure. Missing schema fails
with `PRECONDITION_FAILED` instead of an empty degraded success feed; transient
errors retain the existing explicit degraded response. The focused fallback
contract passes 3 tests, including the missing-schema case, and `pnpm check`
passes.

The remaining legacy Explore catalog procedures (`getCategories`, `getTopics`,
and `getHighlightTags`) now fail with an explicit `PRECONDITION_FAILED` until a
canonical catalog authority exists; they no longer claim successful empty data.
The legacy capability boundary passes 6 tests and `pnpm check` passes.

Billing owner handling now uses an explicit `agent | agency | developer`
allow-list throughout the foundation service. Rows read from the current
varchar owner columns are validated before audit writes, and unregistered owner
types fail with `PRECONDITION_FAILED` rather than entering another polymorphic
path. The provider-independent billing contract passes 8 tests and `pnpm check`
passes. This is an interim boundary; the approved `billable_accounts` migration
and database-enforced ownership remain required for P5 acceptance.

After these changes, `pnpm db:authority:check` was rerun successfully: all 33
static suites (272 tests), utility authority (118 surfaces), schema sanity (215
tables / 81 migrations), deterministic inventory, and lifecycle checks passed.

The billing provider-independent contract now includes a static guard for the
closed interim owner allow-list and runtime validation of owner values. It
passes 9 tests with `pnpm check`; this protects the boundary while the
database-enforced account migration is prepared.

The legacy `explore.getFollowedItems` procedure now fails with
`PRECONDITION_FAILED` until a canonical follow authority exists, instead of
returning an empty structure. The Explore capability boundary passes 7 tests
and `pnpm check` passes.

The governed discovery engagement writer now distinguishes missing canonical
Explore engagement storage from ordinary best-effort write failures. Missing
tables fail with `PRECONDITION_FAILED` instead of being acknowledged as a
successful event; duplicate event IDs remain idempotent. The interaction
authority and discovery engagement suites pass 5 tests with `pnpm check`.

Explore aggregate metrics no longer load the complete engagement event set into
application memory. The service now computes counts, distinct viewers/sessions,
clicks, and JSON watch-time totals in one SQL aggregate query while preserving
the existing metric contract. The focused analytics and authority suites pass
3 tests with `pnpm check`; provider-backed query-plan evidence remains open.

The analytics authority contract now guards that implementation shape: the
aggregate path must contain SQL `COUNT(DISTINCT)`, conditional `SUM`, and JSON
watch-time extraction, and must not regress to in-memory event filtering. The
focused analytics/contract suites pass 4 tests with `pnpm check`.

The remaining query-plan audit found that `explore_engagements` currently has
only its event-identity unique key; the aggregate's period and content join
would benefit from a provider-verified `(created_at, content_id)` index. Adding
that index requires a new manifest migration and TiDB admission review, so no
manual or historical migration was altered. This is recorded as an explicit
schema-performance follow-up rather than claimed as complete.

The authority gate was rerun after the latest billing boundary work: all 33
static suites (272 tests), 118 utility surfaces, 215 canonical tables, 81 active
migrations, deterministic inventory, and lifecycle checks passed again. No
schema or migration drift was introduced.

The exact disposable target readiness check was rerun on 2026-09-11 and
returned `applicationReady: true`. Ownership, connectivity, migration head
0080, schema congruency, canonical geography, Search-to-Lead scenario data, and
required-data checks are ready. Commercial reference, consumer API, browser,
release, and full-diagnostics layers remain intentionally separate and
unevaluated.

The combined authority physical packet was rerun on the same target: billing
foundation (2 tests), Shared Living (6 tests), and development publication
lifecycle (21 tests) passed, 29 tests total. This revalidates billing proof
state, Shared Living publication/privacy, and development approval,
publication, withdrawal, and ownership behavior after the latest changes.

The approved analytics performance follow-up is now implemented as migration
0081 (`0081_explore_analytics_query_index.sql`). The Drizzle model, migration
manifest, migration-tree authority, and compatibility-exception register agree
on the composite `explore_engagements(created_at, content_id)` index. The
governed runner applied it to the exact disposable worktree target, advancing
the ledger from 0080; schema congruency now matches digest
`3ee40c54f68e8d30f4498743f12ff7429d2a601434d989557fbb1e27f56ce370` and
readiness reports `applicationReady: true`. A provider-backed EXPLAIN contract
passed under `pnpm test:authority`, confirming the index is visible to the
period-filtered aggregate query. TiDB admission and protected-environment
verification remain open.

Post-migration verification also completed `pnpm lint:check` with exit 0. The
repository reports 11,229 pre-existing warnings and zero errors; no warning
cleanup was included in this takeover packet.

`pnpm db:schema:tidb-audit` was rerun at the 0081 digest and remains
intentionally non-admitted. It reports the existing 12 FK/CHECK interaction
reviews across catalogue publishers, development supersessions, Land claims
and conflicts, and provider-location mappings; no new interaction was added by
the analytics index migration.

The P2 relational delivery packet was rerun after migration 0081: its
authority-injected independent-connection suite passed 8 tests, and the
lead-delivery/public-capture contract suites passed 53 tests. These cover
claim races, capture rollback, queued restart visibility, lease recovery,
unknown provider outcomes, retry budgets, notification separation, route
supersession, and capture idempotency. P2 still requires independent senior
authorization/reconciliation review and deployment-provider evidence before
acceptance.

The Explore batch interaction writer now handles each event independently:
duplicate event identities are no-op replays, unrelated events still commit,
and counter updates are derived only from newly inserted events. The focused
interaction/discovery suites pass 6 tests with TypeScript validation. This
closes a batch-replay correctness gap while retention and abuse controls remain
open in P8.

Commercial marketing-media attachment now treats a repeated confirmed upload
key as an idempotent replay and returns the existing media ID before allocating
another row. The focused Commercial boundary/idempotency contracts pass 5
tests with TypeScript validation. This closes one public-media duplication path;
cross-supply rebuild equivalence remains open.

Migration 0082 (`0082_explore_engagement_retention_indexes.sql`) adds
`(session_id, created_at)` and `(user_id, created_at)` indexes to bound Explore
history scans used for retention and abuse review. The governed runner applied
it after 0081 on the exact disposable target; schema congruency matches digest
`7fcb8f0410fb14b023b679eb953caff71bcbb7057f64aa587fea9f7b7c6cce36`, and
readiness remains `applicationReady: true`. The authority-injected EXPLAIN
contract now proves the content aggregate, session history, and user history
queries all expose their intended indexes.

P5 billing was independently rerun against the exact disposable target after
the 0082 migration: billing foundation (2 tests), provider-independent billing
(9 tests), and developer subscription/commercial contracts (6 tests) passed,
17 tests total. These validate the current agency EFT and entitlement
boundaries, but the polymorphic owner-key model and provider event semantics
remain unresolved; this evidence does not constitute P5 acceptance.

Migration 0083 (`0083_billing_provider_event_identity.sql`) establishes the
canonical `billing_provider_events` ledger. Provider and event identity are
unique, payload and lifecycle state are durable, and processing timestamps and
failure reasons are explicit. The migration was applied through the governed
runner after 0082 on the exact disposable target. Its physical uniqueness
contract passed under `pnpm test:authority`, proving duplicate provider events
are rejected; provider webhook consumer wiring and out-of-order event
semantics remain intentionally open for the subsequent P5 cutover.

The new billing provider-event ledger now has an owned processing boundary in
`billingProviderEventService.ts`: intake replays return the existing event,
claims lock only received/failed rows, and completion/failure use
compare-and-set updates from `processing`. Its authority contract and
TypeScript validation pass. No webhook route is enabled yet; adapter wiring
and out-of-order business-event semantics remain gated on the P5 cutover.

The physical provider-event lifecycle test exposed and corrected a timestamp
format defect: completion had written ISO-8601 `T...Z` text into a MySQL
 timestamp column. The service now normalizes processing timestamps to UTC
MySQL format. Duplicate-identity and claim/complete fencing tests both pass
under `pnpm test:authority`, with TypeScript validation passing.

The provider-event physical suite now also proves failed-event recovery: a
failed claim can be reclaimed once, completed, and then remains fenced from
further claims. Three lifecycle/identity tests pass against the disposable
target, establishing durable retry behavior before any provider adapter is
enabled.

Provider-event intake now validates and normalizes provider identity, event
type, payload shape, and optional occurrence timestamps before persistence.
Malformed identities and timestamps cannot enter the billing ledger. Contract
and physical lifecycle suites pass after this boundary hardening; provider
adapter wiring remains gated on the full P5 ownership cutover.

The P3 projection rerun on the current 0083 target passed the persisted agency
attribution and performance/revision scenarios (2 physical tests). It confirms
source-listing identity, public-field refresh after a revision, and ownership
continuity for the exercised property supply. Cross-supply equivalence for
Development, Commercial, Land, and Shared Living remains unproven.

The broader supply lifecycle rerun passed 31 physical tests: Development
publication (21), Commercial capacity/publication (1), Land marketing-media
authority (3), and Shared Living publication/privacy (6). These strengthen
ownership, approval, availability, and withdrawal evidence across all four
supplies, but they do not yet prove that a rebuild preserves projection row
identity and fields for every supply family.

The cross-supply projection-authority contract now passes 3 tests. It guards
that Commercial, Development, and Shared Living remain on their dedicated
public projection identities and cannot call the generic property writer. This
closes the authority-boundary regression risk; physical repeated-rebuild
equivalence is still required for P3 acceptance.

After adding the billing provider-event table, the full Database Authority gate
was rerun successfully: 33 static suites (272 tests), 118 utility surfaces,
216 canonical tables, 84 active migrations, deterministic inventory, and
lifecycle checks all passed. The gate initially caught a stale hard-coded
215-table expectation; that authority contract now reflects the canonical 216
table inventory.

Migration 0084 (`0084_billing_provider_event_retry_budget.sql`) adds explicit
`attempt_count` and `max_attempts` to the provider-event ledger. Claims now
stop once the configured budget is exhausted (bounded to 1–10 at intake), while
failed events remain reclaimable until then. Four authority-injected physical
identity/lifecycle tests pass, including retry exhaustion. Schema congruency
matches digest `1e98d8bbb1c4504fda1e45053218afde66c17ca7a291a3e3895fadbad6b810f5`.

P5 billable-account cutover has now started with migration 0085
(`0085_billing_billable_accounts.sql`). It establishes one typed
`billable_accounts` identity per user, agency, or developer organisation,
populates the exact disposable target, and adds foreign-key-backed transitional
`billable_account_id` columns to the active foundation tables. The columns are
intentionally nullable during this staged cutover; making them mandatory is
blocked until every active writer and reader has been migrated and independently
verified. The migration and exception record are registered in the manifest;
provider event semantics and legacy-family retirement remain open.

The active manual-EFT billing service now resolves or admits a typed billable
account inside its transaction before writing subscriptions, invoices, payment
proof, and audit facts. The agency billing acceptance suite passed both physical
scenarios after this cutover, and an authority-injected account suite proved
owner cardinality and rejection of mismatched account kinds. Existing billing
rows on the disposable target have no null staged account references; read-path
authorization and retirement of the remaining billing families are still open.
The plan-access entitlement projection and subscription writer now resolve the
same typed account identity, while broader router and reporting readers remain
to be migrated.

The agency billing router's subscription, invoice, and payment workspace reads
now filter by the typed billable-account foreign key. Its focused authority-
injected contract and billing acceptance checks pass; other billing reports and
legacy-family readers remain open.

Developer publication eligibility now requires the developer subscription to
join through `billable_accounts`, and the dedicated developer publication
access service applies the same typed-account predicate. The 21-test physical
development publication lifecycle suite passes after this read-path change.

Listing publication entitlement now uses a typed-account `EXISTS` predicate for
agency and independent-agent subscriptions. Publication readiness fixtures
admit billable accounts explicitly, and the entitlement/readiness suites pass
21 tests, preserving the adapter contract while removing owner-pair
authorization from this gate.

The public agent profile entitlement lookup now requires the personal agent
subscription to resolve through the typed account identity. Its agent-serving,
profile, and launch-journey contracts pass (27 tests); remaining lead and
reporting readers still require migration.

Public lead capture now checks personal agent entitlements through the typed
billable-account identity in both assigned-agent eligibility paths. The
public-lead contract and agent launch journey passed 51 tests after the change.

The developer billing workspace now scopes its subscription, invoice, and
payment reads through the typed billable-account foreign key. Developer billing
contracts remain green; remaining billing report and adapter readers are open.

The foundation billing workspaces now scope agency and independent-agent
subscription and invoice reads through the typed account foreign key as well.
The pre-lock outstanding-invoice observation uses that same account identity,
closing the workspace/report owner-pair read path.

Agency invitation delivery now gates effective paid access through the typed
agency billable-account identity. The invitation delivery and commercial-access
authority contracts pass 13 tests; legacy billing report and adapter readers
remain open.

Agency access-state, canonical-status, and onboarding checks now resolve the
agency billable account before reading subscriptions. Foundation type-checks
and the agency operating-home/commercial authority contracts remain green.

Public property eligibility now admits only personal-agent subscriptions whose
typed billable account matches the agent user. The public inventory authority
contracts pass 12 tests after this read-path cutover.

Core billing subscription upserts, launch-state locks, outstanding-invoice
checks, and agency cancellation/restore flows now use the typed account foreign
key for reads and locking. Type-checks plus provider-independent and developer
subscription contracts pass 15 tests.

Agency onboarding's existing-record integrity check now requires a typed agency
account and resolves its subscription through that account identity.

Agency manual-EFT outstanding-invoice locking now uses the subscription's typed
billable-account foreign key for both SQL locking and row selection.

The finance payment queue now resolves agency and developer display entities
through the invoice's typed billable account instead of polymorphic owner pairs.

The governed publication-entitlement adapter now requires the exact typed agency
billable account and writes its subscription foreign key, preventing canonical
fixtures from introducing null staged ownership.

The homepage journey preview and Search-to-Lead scenario adapters now require
typed agent, agency, and developer accounts and populate subscription foreign
keys when creating fixture access. The complete static authority suite remains
green at 33 suites and 272 tests.

Platform analytics paid-subscription counts now admit only subscriptions linked
to typed agency billable accounts, removing the last broad dashboard count based
solely on the polymorphic owner type.

Developer test-context cleanup now deletes subscriptions through the typed
developer account before removing the organisation, preserving FK ownership
integrity in disposable test lifecycles.

Homepage journey fixture verification now resolves its three Launch Access
subscriptions through typed billable accounts rather than owner-pair predicates.

Public property eligibility now relies on the typed personal-agent account
match itself rather than treating the polymorphic subscription owner type as an
independent authority. Its 12 public inventory contract tests remain green.

Physical commercial-capacity and agency-operating-home fixtures now create and
attach typed agency/agent billable accounts before inserting subscriptions.

The exact disposable target had zero null staged account references across all
five active billing tables. Migrations 0086 and 0087 now enforce those columns as
non-null, and authority status reports manifest-head-ready and schema-congruent
at migration head 0088.

Additional physical agency fixtures (performance, scorecard, and attribution)
now create typed billable accounts and populate subscription foreign keys, so
real-database runs remain compatible with the non-null authority.

The physical billable-account invariant now verifies exact typed-owner shape and
non-null account references for every active billing fact. It no longer assumes
every newly created non-billable user or organisation must have an account;
runtime admission remains explicit at the first billing operation.

Migration 0087 adds due-time and lease-token state to provider events. Claims
can recover expired workers, and completion/failure writes are fenced to the
active claim token; authority validation and the full static gate pass at head
0087.

The authority-injected provider-event suite now exercises duplicate identity,
single-claim fencing, due retry recovery, and bounded exhaustion: 4 physical
tests pass.

Payment-proof mutations now consume the invoice's mandatory typed account
reference directly; the former null-account resolution fallback was removed
after migration 0086.

Migration 0088 retires the empty, unreachable `agency_subscriptions`,
`billing_transactions`, and historical `invoices` families. The exact
disposable target was verified at zero rows before application; schema
congruency and the full authority gate pass with 214 canonical tables and 89
active migrations.

The current P8 physical rerun also passed 6 tests: listing-media reconciliation,
tenant/deletion invalidation, Explore analytics query planning, service-lead
idempotency, and demand-routing rollback. P8 remains open only for the
unexercised public media rebuild comparison, aggregate rebuild proof, and
retention/abuse review.

The latest authority checkpoint confirms the exact disposable worktree target
is target-owned and connected, has no incomplete migration attempts, is
schema-congruent at manifest head 0088, and reports the canonical Launch Access
foundation ready. Protected or shared databases were not accessed.

The P8 media boundary was extended with reassignment invalidation evidence:
`pnpm test:authority -- server/__tests__/integration.listing-media-tenant-boundary.test.ts`
passed 3 tests on the exact disposable target. A token issued to the former
owner is rejected after listing custody changes; public media rebuild
equivalence remains open.

The P6 distribution transition boundary was tightened so commission-schema
failures abort the enclosing deal transaction instead of returning a successful
stage change without a commission fact. The focused commission and router
transaction suites passed 15 tests; broader commission settlement lifecycle
coverage remains open.

P8 analytics authority cleanup retired the zero-row, unreachable
`analytics_aggregations` table through migration 0089 after a repository census
found no active consumers. The canonical model inventory was regenerated and
the retirement is recorded as an approved pre-launch exception. Retained
aggregate rebuild and query-plan evidence remains open.

The location-page authority boundary now propagates database failures for
public eligibility, province inventory sections, and suburb price analytics,
preventing incomplete data from being reported as a valid empty page. Focused
hierarchy and location-insights tests passed 9 tests, with TypeScript passing.

Explore feed query failures now propagate instead of being converted to empty
success feeds. The missing-schema precondition remains explicit, and focused
fallback/authority tests passed 5 tests with TypeScript validation passing.

Location-page trending-suburb and suburb preview failures now propagate rather
than presenting incomplete empty sections. The hierarchy suite passed 8 tests
and TypeScript validation passed.

Unimplemented partner analytics benchmark and boost-ROI procedures now fail
explicitly instead of returning empty success data. The monetization smoke suite
passed 36 tests and TypeScript validation passed.

Location insights now fail explicitly when their AI provider is unavailable or
fails, rather than returning fabricated mock content. Focused authority and
hierarchy tests passed 9 tests with TypeScript validation passing.

The similar-properties history route now fails explicitly until recent-view
ranking is implemented, removing another fabricated empty success response.
Its authority contract passed and TypeScript validation passed.

Similar-properties media attribution now uses the canonical Explore
`reference_id` property mapping. Log-only engagement and unimplemented weight
refinement no longer acknowledge success; the authority contract passed 2 tests
with TypeScript validation passing.

Admin revenue analytics now fails explicitly until canonical billing analytics
is approved, removing an empty-object success response. Its authority contract
and TypeScript validation passed.

Feed ranking now propagates campaign, quality-score, and partner-trust query
failures instead of silently ranking with empty maps. Its authority contract
passed 1 test and TypeScript validation passed.

The retired boost-campaign service now fails explicitly for analytics, campaign
lists, lifecycle mutations, tracking, and expiry checks instead of returning
fabricated state. Focused authority and monetization tests passed 38 tests with
TypeScript validation passing.

Public media rebuild equivalence is now exercised on the exact disposable
target. An approved agency listing projects its initial image, canonical media
replacement updates the source manifest, and two explicit mirror rebuilds
produce identical public image rows. The agency attribution integration test
passed under `pnpm test:authority`; aggregate rebuild and retention/abuse
evidence remain open.

Explore analytics now has physical aggregate rebuild evidence on the exact
disposable target. A fixed event sequence was aggregated, deleted, replayed
under new event identities, and aggregated again to the same complete metrics
contract. The event facts, rather than a retired aggregate table, are the sole
authority. Retention and abuse controls remain open.

Explore engagement persistence now fails closed on unexpected write errors.
Duplicate event IDs remain idempotent, but single and batch writes no longer
swallow schema or infrastructure failures. The interaction authority contract
passed 3 tests with TypeScript validation; retention and abuse controls remain
open.

The disconnected boost-campaign authority is now retired. The repository census
found no mounted campaign router or reachable campaign writer, and the exact
disposable target contained zero `boost_campaigns` rows. The orphan ranking read,
service, router, and documentation were removed; migration 0090 dropped the
table through the canonical runner. Schema congruency, migration-tree and
manifest validation, and the full 33-suite authority gate passed at 212 tables
and 91 active migrations. Future paid placement requires a new authority that
defines ownership, entitlement, billing, delivery, attribution, and reporting
together. Broader P8 retention and abuse controls remain open.

Authentication user upsert and canonical user lookups now fail explicitly when
the database is unavailable. Login, session revalidation, password reset, and
email verification can no longer interpret an unavailable user authority as a
missing account. The auth mapping, session-security, and runtime-bootstrap
tests passed 16 tests with TypeScript validation.

Agency viewing creation now locks and re-reads the canonical lead inside its
write transaction before validating the status transition. Concurrent lead
updates can no longer create a showing from a stale preflight status. TypeScript
validation passed; the disposable integration suite was correctly skipped when
the test database environment was absent.

Agency transaction updates now lock and re-read the canonical transaction row
before deriving status, risk, commission, and settlement transitions. Concurrent
operators therefore cannot overwrite newer commission state from a stale
preflight read. TypeScript validation passed.

The protected TiDB CHECK-convergence repair is now intentionally bounded to the
22 checks proven absent in the reviewed production audit. It verifies every
repair check against the current Drizzle definition without refusing later,
unrelated canonical checks such as the billable-account ownership constraint.
The two historical release-recovery fixtures now derive the current manifest
head instead of freezing a former head. The protected recovery suites passed
13 tests and TypeScript validation passed.

The full-suite checkout/approval race exposed a pre-lock snapshot introduced by
billable-account resolution. Agency, agent, and developer billing now acquire
the owner lock before resolving the account, so a waiting checkout reads the
subscription state committed by finance. The agency principal bootstrap and
billing foundation suites passed six physical tests on the disposable target,
including concurrent checkout/approval and duplicate activation checks.
This focused result does not close the remaining full-suite failures.
