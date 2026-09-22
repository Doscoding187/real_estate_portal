# B04 Independent Agent Paid MVP Closure Packet

## A. Status

**B04 — EVIDENCE PASS — REVIEW PENDING.**

All B04-owned application P0/P1 findings are corrected and the governed joined browser
journey passes. No external product, database, or infrastructure blocker remains for B04
engineering evidence. The final commit identity is recorded in the delivery handoff after
this packet is committed, avoiding a recursive commit-hash reference inside its own tree.

## B. Repository identity

| Item | Value |
| --- | --- |
| Branch | `feat/b04-independent-agent-paid-mvp` |
| Worktree | `/home/edwardspc/Desktop/Dev/property-listify-main/.worktrees/property-listify-b04-independent-agent-paid-mvp` |
| Required base | `c96bfb5ef628633e0008cd6b4e94fa29c434746e` |
| Starting HEAD | `c96bfb5ef628633e0008cd6b4e94fa29c434746e` |
| Pre-commit HEAD | `c96bfb5ef628633e0008cd6b4e94fa29c434746e` |
| Merge base with B03 authority | `c96bfb5ef628633e0008cd6b4e94fa29c434746e` |
| B03 ancestry | `git merge-base --is-ancestor c96bfb5ef628633e0008cd6b4e94fa29c434746e HEAD` returned success |
| Initial worktree state | Clean at the reviewed B03 candidate before B04 modifications |
| Final worktree state | Clean after committing the bounded B04 patch |
| Main / merge activity | `main` was not changed; B04 was not merged |
| Database Authority target | Disposable worktree target `listify_wt_b04_independent_agent_paid_mvp_c7ea35e9f349` |
| Target fingerprint | `81d655530e67cc664a81d9507dade9017f8a6d00ce5bad4303460728d5fc6f84` |
| Migration head | `0090_retire_disconnected_boost_campaigns.sql` |

No protected or production database, deployment, domain, or provider was accessed.

## C. Senior-plan reconciliation

### P1-1 — effective product-specific commercial availability

- **Confirmed.** Mounted Agent acquisition, package, journey, and finance controls read
  static preparation activation rather than B03's effective product decision.
- **Root cause.** A contained governed acceptance fixture could authorize the real B03
  product server-side, while the mounted screens stayed preparation-only.
- **Correction.** The existing commercial status authority now exposes a read-only
  `productAvailability` projection derived through B03 policy for approved product keys.
  The client queries the exact `agent_launch_access` decision, fails closed while loading
  or on error, and leaves server mutations authoritative.
- **Containment.** Default production/preparation activation remains disabled. The
  governed marker is scoped to B04/PLE browser runtimes rather than injected into every
  browser test. Other products are not made reachable.
- **Evidence.** Policy tests cover default, governed Agent availability, an unavailable
  product, and failed status lookup. The default prepayment browser suite passes with
  preparation-only UI; the B04 browser suite reaches real R499 invoice, proof, finance,
  and entitlement screens.

### P1-2 — source listing versus public property identities

- **Confirmed.** `agent.getMyListings` returns public-property rows, while the editor
  requires private `listings.id`; the previous UI passed the public ID into edit.
- **Root cause.** `properties.id`, `properties.sourceListingId`, and `listings.id` were
  treated as interchangeable in Agent inventory actions.
- **Correction.** Explicit action-ID helpers preserve the identity boundary: public View
  uses `properties.id`; public Edit uses `properties.sourceListingId`; private listing
  actions use `listings.id`; a public row without a source ID gets a truthful
  unavailable-edit state rather than a guessed ID.
- **Evidence.** Unit/component tests use deliberately unequal IDs (property `913`,
  listing `217`). The joined browser journey proves an automatically generated public
  property ID differs from its source listing ID, then verifies View and Edit navigate
  to their respective canonical routes.

### P1-3 — same-browser listing draft isolation

- **Confirmed.** Private wizard state used one global local-storage key and had no
  authenticated owner.
- **Root cause.** A second Agent on the same browser could hydrate the first Agent's
  title, description, pricing, location, or media progress.
- **Correction.** Persisted state carries `persistedOwnerId`; hydration waits for
  resolved authentication; a mismatch or legacy unowned state clears persisted and
  in-memory private data; same-owner recovery remains available. User-keyed server
  draft references remain unchanged.
- **Evidence.** State tests prove same-user recovery, mismatch clearing, and legacy
  state rejection. The B04 browser suite creates a draft as Agent A, uses mounted
  logout, registers and verifies Agent B in the same browser context, and proves no
  resume dialog, title input, or persisted draft remains.

### P1-4 — rejected-profile reconsideration

- **Confirmed.** A rejected Agent could correct profile fields, but the admin screen
  only offered approval controls for pending rows.
- **Root cause.** The existing privileged approval mutation and audit authority were
  not reachable from the rejected-profile UI state.
- **Correction.** The reviewer screen exposes `Approve Corrected Profile` for rejected
  records through the existing privileged approval path. The server permits
  pending/rejected approval, blocks suspended accounts, records prior status in audit
  context, and does not set a professional verification badge or payment state. The
  Agent setup UI permits correction without re-publishing the profile.
- **Evidence.** Component and integration tests prove rejected -> corrected ->
  privileged approval with audit, no badge/payment side effect, and suspended rejection.
  The joined paid journey separately uses the normal pending -> approved reviewer UI
  path.

### Supporting P1 correction — governed-browser fixture containment

- **Confirmed during implementation.** The shared Playwright wrapper exported the
  governed commercial-fixture marker into unrelated browser suites.
- **Correction.** The wrapper now passes only Database Authority environment; B04 and
  PLE configs scope the marker to their API runtime. The default prepayment suite
  remains preparation-only.
- **Evidence.** B04, default prepayment, and PLE browser suites all pass with their
  intended distinct commercial states.

No senior-plan contradiction required a B03 policy, entitlement, payment, public
eligibility, media-token, or lead-custody redesign.

## D. Canonical journey result

| Stage | Result | Governed evidence |
| --- | --- | --- |
| Agent acquisition | PASS | Mounted `/advertise/sell/agents` exposes the exact effective Agent decision in the contained B04 runtime and shows R499 once-off. |
| Registration | PASS | New Agent account is created through `/api/auth/register`; an unverified pending Agent profile is observed. |
| Email verification | PASS, B10 local transport substitution | Application-generated local-email token is consumed through `/api/auth/verify-email`; no database token extraction is used. |
| Profile setup | PASS | Agent uploads a profile image, saves contact/professional fields, and selects canonical Sandton coverage through product screens. |
| Governance approval | PASS | Privileged reviewer approves the pending profile through `/admin/agent-approvals`; corrected rejection is separately covered. This is manual platform approval, not PPRA/FFC certification. |
| Package selection | PASS | Mounted Agent package screen consumes `agent_launch_access`, presents R499, manual EFT, once-off, 90 days, and no automatic renewal. |
| Invoice | PASS | Agent requests the canonical B03 Launch Access invoice through the UI. |
| Payment proof | PASS | Agent submits a private EFT proof through the UI; stored payment is `under_review` and subscription remains `payment_under_review`. |
| Finance review | PASS | Reviewer uses `/admin/finance`, records explicit `49900` cents and a reconciliation note, and approves through the UI. |
| Entitlement | PASS | B03 creates one active `agent_launch_access` term with a 90-day interval; Agent refresh sees active access. |
| Listing authoring | PASS | Activated Agent creates a sale House through `/listings/create`; canonical server ownership and Agent attribution are asserted. |
| Property scope | PASS | Authoring retains the five approved classes and sale/rent paths; deferred Land is not offered by the shared authoring taxonomy. |
| Listing media | PASS, B11 local storage substitution | Five real acceptance image files follow reservation/upload/object-verification/confirmation/attachment, survive listing save, and supply a public primary gallery image. |
| Moderation/publication | PASS | Agent submits a readiness-complete listing; privileged reviewer approves and public projection is created with `sourceListingId`. |
| Inventory identities | PASS | Joined journey exercises unequal public and source IDs: View uses public property ID; Edit uses source listing ID. |
| Sale discovery | PASS | Buyer finds the approved sale listing on the primary canonical Sandton search path and opens `/property/:id`. |
| Detail | PASS | Detail shows listing facts, price, primary/gallery media, Agent attribution, and enquiry CTA. |
| Enquiry | PASS | Separate public buyer context submits a real enquiry; server resolves receiving `agents.id`, preserves property/prospect context, and replay returns the same durable lead. |
| Agent lead workspace | PASS | Agent opens `/agent/leads`, sees prospect and property, records contact, schedules follow-up, reloads, and sees durable state. |
| Rental/mobile | PASS | At 390x844, Agent creates/moderates a rental House; primary rental search/detail show R18,500/month and 12-month minimum. |
| Expiry | PASS | After real finance activation, the controlled disposable test term is moved past end time: new public enquiry and paid listing submission stop; legitimate historical lead, contact outcome, and follow-up remain accessible. |

The expiry movement is the sole controlled database state transition in the joined test.
It occurs only after the UI has completed real invoice, proof, and finance approval, and
is permitted solely to isolate the existing B03 expiry rule. It does not seed identity,
approval, payment, entitlement, listing, media, publication, or lead success.

## E. Implementation performed

### Commercial decision and mounted consumers

- `server/services/commercialActivationPolicy.ts` — adds the read-only effective
  product availability projection through existing B03 policy.
- `server/services/billingFoundationService.ts` — returns product/owner information
  already needed to associate finance controls with the applicable product.
- `server/services/__tests__/commercialActivationPolicy.test.ts` — covers the
  product-specific policy projection.
- `client/src/hooks/useCommercialProductAvailability.ts` — new fail-closed,
  product-specific read-only status hook.
- `client/src/hooks/useAgentOnboardingStatus.ts` — surfaces exact Agent product
  availability with existing server-derived journey state.
- `client/src/lib/agentJourney.ts` and `client/src/lib/agentJourney.test.ts` — use
  effective Agent availability for journey actions.
- `client/src/pages/advertise/AgentProductLandingPage.tsx` and
  `client/src/pages/advertise/AgentProductLandingPage.commercialTruth.test.tsx` —
  render the Agent commercial entry truthfully.
- `client/src/pages/agent/AgentPackageSelection.tsx` and
  `client/src/pages/agent/AgentPackageSelection.test.tsx` — consume the exact product
  decision for canonical invoice/proof presentation.
- `client/src/pages/admin/SubscriptionManagementPage.tsx` — applies the applicable
  product decision to existing finance verification controls.
- `client/src/components/agent/AgentDashboardOverview.tsx`,
  `client/src/components/agent/AgentStatusStrip.tsx`,
  `client/src/components/agent/AgentTopNav.tsx`,
  `client/src/pages/AgentDashboard.tsx`, `client/src/pages/AgentAnalytics.tsx`,
  `client/src/pages/AgentLeads.tsx`, `client/src/pages/AgentSettings.tsx`,
  `client/src/pages/agent/AgentCanvassing.tsx`,
  `client/src/pages/agent/AgentEarnings.tsx`,
  `client/src/pages/agent/AgentMarketingHub.tsx`,
  `client/src/pages/agent/AgentProductivity.tsx`,
  `client/src/pages/agent/AgentReferrals.tsx`, and
  `client/src/pages/agent/AgentTrainingSupport.tsx` — keep every mounted Agent action
  on the same fail-closed, product-specific journey decision.

### Listing identities and draft custody

- `client/src/lib/agentListingActionIds.ts` and
  `client/src/lib/agentListingActionIds.test.ts` — new explicit source/public identity
  mapping and unequal-ID coverage.
- `client/src/pages/agent/AgentListings.tsx` — uses explicit ID targets and presents
  unsupported edit when no source listing exists.
- `client/src/components/dashboard/EntityStatusCard.tsx` and
  `client/src/components/dashboard/EntityStatusCard.agentIds.test.tsx` — preserve
  public-view versus private-edit identity boundaries on dashboard actions.
- `client/src/hooks/useListingWizard.ts` and
  `client/src/hooks/__tests__/useListingWizard.ownerIsolation.test.ts` —
  authenticated persisted-owner isolation, mismatch/legacy clearing, and state proof.
- `client/src/components/listing-wizard/ListingWizard.tsx` — gates draft hydration,
  rendering, autosave, edit reads, and server-draft pointers on resolved owner identity.

### Profile reconsideration and security regression coverage

- `server/adminRouter.ts` — permits privileged approval of pending/rejected profiles,
  excludes suspended profiles, and captures previous status in audit context.
- `client/src/pages/admin/AgentApprovals.tsx` and
  `client/src/pages/admin/AgentApprovals.reconsideration.test.tsx` — expose the audited
  reviewer recovery action and truthful manual-governance language.
- `client/src/components/agent/AgentSetupWizard.tsx` and
  `client/src/components/agent/AgentSetupWizard.test.tsx` — allow a rejected Agent to
  correct data without falsely re-publishing or self-approving.
- `server/__tests__/integration.agent-profile-reconsideration.test.ts` — verifies
  audit/no-badge/no-payment and suspended-account boundaries.
- `server/__tests__/integration.listing-media-tenant-boundary.test.ts` — adds
  cross-Agent private listing/edit/media-reservation negatives.
- `server/__tests__/integration.agent-lead-transitions.test.ts` — adds cross-Agent
  lead visibility, activity, note, and follow-up mutation negatives.

### Governed acceptance harness and evidence

- `playwright.b04-independent-agent.config.ts` — B04-only controlled runtime,
  report/result paths, and scoped fixture marker.
- `e2e/b04/independent-agent-paid-mvp.spec.ts` — joined sale, rental/mobile,
  financial lifecycle, media, moderation, public enquiry, durable follow-up, expiry,
  identity, replay, and same-browser draft proof.
- `scripts/runPlaywrightUnderDatabaseAuthority.mts` and
  `scripts/mvp-local-runtime.mts` — prevent global commercial-fixture leakage.
- `playwright.ple-agency-operating.config.ts` and
  `e2e/ple/agency-operating-journey.spec.ts` — preserve PLE's explicitly scoped
  governed fixture behavior after harness containment.
- `docs/architecture/launch-readiness-and-product-convergence/evidence/b04-independent-agent-paid-mvp-closure-packet.md` — this packet.

## F. Database changes

- **Schema:** none.
- **Migrations:** none.
- **Reference data:** none created or changed; canonical geography and existing B03
  Agent Launch Access product were verified.
- **Disposable mutations:** registration users/profiles, profile approvals, invoice,
  private proof, finance approval, subscription term, listings, confirmed media,
  moderation/public properties, lead/activity/follow-up rows, and controlled expiry of
  the test term after activation.
- **Cleanup:** B04 browser teardown archives its exact named listings through canonical
  `listing.archive`. Scenario preparation/verification passes after B04 runs.
- **Protected access:** none.

The B04 browser harness uses database reads for assertions and the one explicitly
bounded expiry transition. It never directly inserts an approved Agent, paid
subscription, listing, media attachment, public projection, or lead to manufacture
customer-flow success.

## G. Joined browser proof

**Command:**

~~~sh
pnpm test:browser:authority -- --config=playwright.b04-independent-agent.config.ts
~~~

**Result:** 2 passed on the exact owned disposable target.

**Contexts and screens exercised:**

1. Desktop Agent context: mounted acquisition route, registration, actual verification
   endpoint, profile image/coverage setup, package selection, invoice, proof, active
   entitlement, sale listing/media/submission, published inventory actions, Agent lead
   workspace, contact, follow-up, reload, rental authoring at mobile viewport, and
   expired-term historical access.
2. Separate reviewer context: `/admin/agent-approvals`, `/admin/finance`, and listing
   moderation/reviewer approval screens.
3. Separate unauthenticated buyer context: public search, public detail, enquiry, and
   exact request replay.
4. Same-browser draft context: Agent A private draft -> mounted logout -> Agent B
   registration/verification -> no private draft hydration.

**Artifacts:**

- HTML report: `/tmp/property-listify-b04-independent-agent-paid-mvp-browser-report/index.html`
- Result directory: `/tmp/property-listify-b04-independent-agent-paid-mvp-browser-results`
- Controlled API runtime log: `/tmp/property-listify-b04-independent-agent-paid-mvp-browser-runtime.log`

Successful runs produced no retry trace or failure screenshot, as configured. Runtime logs
contain local verification URLs and are not a user-facing artifact; no token is recorded
in this packet.

**Local substitutions:** the application emitted and consumed its real verification token
through controlled local email log transport (B10 boundary); confirmed media used the
application upload/confirmation/attachment flow against the controlled local storage
adapter (B11 boundary). Neither substituted a database seed or mock business success.

## H. Security and negative evidence

| Negative | Result | Evidence |
| --- | --- | --- |
| Cross-Agent private listing read/edit | PASS | Integration tenant-boundary test rejects outsider `getById` and `update`. |
| Cross-Agent media manipulation | PASS | Outsider media reservation is forbidden; attachment remains user-bound. |
| Cross-Agent lead custody/activity/follow-up | PASS | Pipeline hides Agent A lead; status/note/follow-up mutations reject Agent B. |
| Same-browser private draft | PASS | Browser Agent A -> logout -> Agent B proves no hydration; owner-isolation state tests cover same-user recovery and legacy clearing. |
| Unapproved profile/publication | PASS | B03 publication preflight remains unavailable before required profile/commercial conditions. |
| Payment proof only | PASS | Browser proof observes `under_review`/`payment_under_review`; submit CTA remains unavailable before finance approval. |
| Expired paid publication | PASS | Expired Agent sees preparation state and no listing submission control. |
| Expired new enquiry | PASS | Public detail no longer exposes enquiry action after current term ends. |
| Historical lead after expiry | PASS | Existing lead, contact outcome, and follow-up remain readable in Agent workspace. |
| Enquiry replay | PASS | Replay returns same request/capture ID; durable lead count remains one. |
| Unapproved/rejected inventory exposure | PASS | Existing publication-readiness and scenario negatives exclude noneligible inventory. |
| Deferred Land authoring | PASS | Shared authoring taxonomy retains only approved five classes. |

## I. Validation record

### Unit and component

~~~sh
pnpm vitest run --config vitest.client.config.ts \
  client/src/lib/agentJourney.test.ts \
  client/src/lib/agentListingActionIds.test.ts \
  client/src/components/dashboard/EntityStatusCard.agentIds.test.tsx \
  client/src/hooks/__tests__/useListingWizard.ownerIsolation.test.ts \
  client/src/pages/agent/AgentPackageSelection.test.tsx \
  client/src/pages/advertise/AgentProductLandingPage.commercialTruth.test.tsx \
  client/src/components/agent/AgentSetupWizard.test.tsx \
  client/src/pages/admin/AgentApprovals.reconsideration.test.tsx \
  client/src/components/agent/AgentStatusStrip.test.tsx --reporter=basic
~~~

Result: 9 files, 37 tests passed.

~~~sh
pnpm vitest run --config vitest.server.config.ts \
  server/services/__tests__/commercialActivationPolicy.test.ts --reporter=basic
~~~

Result: 6 tests passed.

### Database integration and B03 consumers

~~~sh
pnpm test:authority -- \
  server/__tests__/integration.agent-launch-journey.test.ts \
  server/__tests__/integration.agent-lead-transitions.test.ts \
  server/__tests__/integration.agent-profile-reconsideration.test.ts \
  server/__tests__/integration.listing-publication-readiness.test.ts \
  server/__tests__/integration.listing-media-tenant-boundary.test.ts \
  server/__tests__/integration.listing-media-reconciliation.test.ts \
  server/__tests__/commercial-launch-access-s4.integration.test.ts
~~~

Result: 7 files, 20 tests passed. The pre-existing B03 lifecycle test that uses
approved/active fixture data remains supporting regression evidence only; the B04 browser
acceptance does not use seeded paid state.

### Browser / E2E

~~~sh
pnpm test:browser:authority -- --config=playwright.b04-independent-agent.config.ts
pnpm test:browser:authority -- --config=playwright.prepayment-onboarding.config.ts
pnpm test:browser:authority -- --config=playwright.ple-agency-operating.config.ts
~~~

Results: B04 2 passed; default prepayment 10 passed; PLE 10 passed. The default suite
proves normal runtime remains preparation-only after scoped fixture changes.

### Typecheck, lint, build, and diff hygiene

~~~sh
pnpm check
pnpm lint:check
pnpm build
git diff --check
~~~

Results: typecheck passed; lint exited 0 with no errors (repository-wide baseline warnings
remain); build passed with existing chunk-size advisory; diff hygiene passed before final
packet creation and is re-run for handoff below.

### Database Authority

~~~sh
pnpm db:authority:status
pnpm db:authority:check
NODE_ENV=test APP_ENV=test pnpm db:schema:congruency
pnpm db:scenario:prepare && NODE_ENV=test APP_ENV=test pnpm db:scenario:verify
NODE_ENV=test APP_ENV=test DATABASE_CONSUMER_CONTRACT_PHASE=post-migration \
  pnpm db:authority:consumer-contract
~~~

Results: Authority status reports exact disposable-worktree target and canonical migration
head; authority check passed 36 files / 298 tests; schema desired/actual digest matched
with all 23 physical checks enforced; scenario preparation/verification passed; consumer
contract passed canonical migration, reference, foundation, scenario, schema congruency,
distribution contract, and search-to-lead readiness checks.

## J. Later-blocker handoffs

| Workstream | B04 result and handoff |
| --- | --- |
| B10 | Real application token generation/consumption and resend contract are exercised using controlled local transport. Production Resend configuration, authenticated domain, and mailbox delivery remain B10. |
| B11 | Real upload, confirmation, attachment, reload, and public retrieval are exercised. Durable production provider, policy, and delivery configuration remain B11. |
| B12 | Local real session/role behavior is exercised. Hosted domains, cookies, runtime, and shared infrastructure remain B12. |
| B14 | Reviewer/profile/finance/moderation screens are usable and auditable. Staffing, rehearsal, and support continuity remain B14. |
| B15 | Current product/payment/manual-approval language is truthful. Final terms, privacy, regulatory, and refund wording remain B15. |
| B16 | B04 has clean B03 ancestry and no merge. Whole-release integration/merge approval remain B16. |
| B17 | Application preserves lead history across term expiry. Backup, restore, monitoring, and recovery remain B17. |
| B18 | Governed local candidate acceptance passes. Exact production artifact and real-provider acceptance remain B18. |

None is a B04 application-contract failure.

## K. Accepted launch debt

No B04-owned P0/P1 remains. Deferred P2/P3 items are intentionally unchanged:

- P2: easy early-renewal navigation and future normal-product copy after expiry.
- P2: polished invalid-verification recovery.
- P2: genuine one-click media retry and lead-fetch retry presentation.
- P2: dedicated rented-inventory terminal tab.
- P3: unused/mock `AuthContext` cleanup and unused alternate Agent UI components.
- P2: B03 term-notice deduplication and broad discovery candidate
  materialisation/scaling.

## L. Proposed disposition

The Independent Agent paid MVP application journey is ready for senior closure review:

`join -> verify -> Agent setup -> manual approval -> R499 invoice -> EFT proof ->
finance approval -> 90-day access -> listing/media -> moderation -> public discovery ->
enquiry -> correctly attributed Agent lead -> durable contact/follow-up -> expiry history`

passes without entitlement bypass, cross-tenant exposure, deferred property classes, or
seeded paid-state substitution.

B04 is ready for independent senior launch-oriented closure review. This packet does not
self-declare B04 closed.
