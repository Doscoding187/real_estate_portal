# B05 Agency Paid MVP Closure Packet

## A. Status

**B05 — EVIDENCE PASS — REVIEW PENDING.**

The four B05 P1 findings are corrected and the joined Agency paid/member/business
journey passes on the exact owned disposable Database Authority target. The final
commit identity is supplied by the delivery handoff after this packet is committed,
which avoids a recursive commit hash inside its own tree.

## B. Repository identity

| Item | Value |
| --- | --- |
| Branch | feat/b05-agency-paid-mvp |
| Worktree | /home/edwardspc/Desktop/Dev/property-listify-main/.worktrees/property-listify-b05-agency-paid-mvp |
| Starting HEAD / B04 authority | 6ace317eb20220a790cc0ce750e03558dbe34898 |
| Merge base | 6ace317eb20220a790cc0ce750e03558dbe34898 |
| B03 ancestor | c96bfb5ef628633e0008cd6b4e94fa29c434746e |
| Ancestry proof | Both git merge-base --is-ancestor checks returned success before commit. |
| Initial state | Clean dedicated B05 worktree. |
| Final target | mysql://127.0.0.1:3307/listify_wt_b05_agency_paid_mvp_cb26517cd2a6 |
| Target fingerprint | 35478c6b186ce0cf418b4f65e2a858c5566ae7f2ee14b9493c2777be5f06b021 |
| Target class / ownership | disposable-worktree / exact-worktree-owned |
| Migration head | 0090_retire_disconnected_boost_campaigns.sql |
| Final migration/schema status | manifest-head-ready; no incomplete attempts; schema-congruent. |

No protected or production database, deployment, domain, payment provider, or email
provider was accessed. Main was not changed and this branch was not merged.

## C. Senior-plan reconciliation

### P1-1 — Agency product availability

**Confirmed.** Mounted Agency acquisition, billing, and workspace guidance read the
static global commercial flag.

The existing policy now supports a governed test-only exact product selector after
the Database Authority fixture gate succeeds. B05 supplies only
agency_launch_access. Agent and Developer products remain unavailable in that
scenario; malformed selectors fail closed. Normal runtime remains
preparation-only. Mounted Agency surfaces query the exact server decision and
remain closed while loading or on error.

Evidence: commercial policy tests, Agency landing/billing component tests, the B05
browser run, default prepayment regression, and B04 controlled-harness regression.

### P1-2 — Agency once-off billing

**Confirmed.** A selected pending Agency plan disabled the action needed to issue the
first invoice, and mounted billing presented recurring concepts.

The existing B03 checkout authority remains in use. The mounted Agency billing path
now filters to agency_launch_access; presents R999, once-off, 90 days, and no
automatic renewal; exposes selected pending, invoice issued, proof submitted,
finance review, active, and expired stages; requests the first invoice even when
the plan is selected; and continues an outstanding invoice without creating a
duplicate. Monthly/annual choice, cancellation-at-period-end, reactivation, and
recurrence presentation were removed from the required path.

Evidence: billing component tests and the joined browser flow from selected pending
plan through invoice, private proof, finance approval, active Agency term, and
scoped expiry.

### P1-3 — invitation atomicity and tenant governance

**Confirmed.** Acceptance validated invitation state before the membership transaction;
cancel, resend, automatic delivery refresh, and public expiry transitions could race
with acceptance.

Acceptance now locks the authenticated user and candidate invitation in one
transaction, revalidates token/status/expiry/identity/verification/account type/
membership/Agency approval/Agency access, serializes competing Agency invitations,
creates the profile and canonical membership, updates affiliation, and consumes the
token together. Cancel and resend lock and conditionally transition the same row.
Delivery locks token refresh separately from its provider call, so provider failure
leaves a recoverable invitation and never grants membership. Public inspection only
conditionally expires pending tokens; terminal history is preserved. Original issue
time prevents resend from reviving authority after a later left or suspended
membership transition.

Evidence: 32 persisted Agency membership/invitation tests cover valid new and
existing users, wrong identity, unverified user, expired/cancelled/rotated/replayed
tokens, concurrent accept, cancel-versus-accept, resend-versus-accept, competing
Agencies, rollback, and stale suspension/left transitions.

### P1-4 — controlled B05 acceptance harness

**Confirmed.** Historic Agency evidence seeded paid state and derived invitation URLs
from SQL.

The dedicated B05 Playwright configuration exposes only agency_launch_access, starts
through the Database Authority wrapper, uses real sessions, canonical geography,
local custody-confirmed media, and a mode-0600 private mail-capture artifact.
The runtime captures an actual application-generated invitation URL only after the
governed Agency-only fixture is proven. The browser follows that captured URL. No
invitation token is queried from SQL or written to committed evidence.

The permitted fixtures are canonical reference/foundation data and the privileged
reviewer/finance actor. The test does not seed the owner, Agency, active term,
successful payment, accepted member, listing, public projection, or final lead.

### Reconciliation finding

The mounted /admin/agencies route pointed at the legacy read-only AgenciesPage even
though AgencyList already contained the existing privileged, audited Agency approval
control. The route now mounts AgencyList. This was a bounded wiring correction, not
a new approval model.

No B03 commercial ownership, payment, entitlement, publication, enquiry custody, or
lead authority was redesigned.

## D. Canonical Agency model retained

| Authority | Final behavior |
| --- | --- |
| Commercial owner | agencies.id through its Agency billable account and Agency-owned B03 subscription. |
| Membership authority | Current effective agency_agent_memberships row; historical users.agencyId and agents.agencyId projections do not authorize ordinary members. |
| Listing attribution | listings.ownerId is the authoring user; listings.agencyId is server-derived from the current principal/membership; listings.agentId is the responsible professional. |
| Public identity | properties.id remains distinct from listings.id and properties.sourceListingId links them. |
| Lead custody | leads.agencyId remains the Agency owner for Agency-property enquiries. |
| Assignment | leads.agentId and leads.assignedTo are operational responsibility only; reassignment does not transfer Agency custody or activity history. |

## E. Joined paid/member/business journey

| Stage | Result |
| --- | --- |
| Acquisition, registration, verification, setup | PASS through mounted Agency pages and application verification endpoint. |
| Organisation/principal and pending subscription | PASS; browser asserts Agency account ownership. |
| Manual Agency approval | PASS through the privileged audited AgencyList route. |
| Billing | PASS; selected pending Agency product creates/continues an R999 once-off invoice. |
| Proof and finance | PASS; private proof alone leaves access inactive; finance reconciliation/approval creates an Agency-owned 90-day term. |
| New-user invitation | PASS; UI creates invitation, controlled transport captures the actual URL, user registers/verifies, and accepts it. |
| Existing-user invitation | PASS; verified user authenticates and accepts a second delivered URL. |
| Member commercial inheritance | PASS; member sees Agency-managed Launch Access and has no personal Agent Launch Access purchase. |
| Sale/rental inventory and media | PASS; two current members, canonical server attribution, real local media reservation/upload/confirmation/attachment, save/reload, 500-Agency cap coverage, and deliberately unequal listing/public IDs. |
| Moderation/discovery | PASS; reviewer approval creates public projection; sale search/detail and proportional rental search/detail pass with Agency/representative/media context. |
| Enquiry and replay | PASS; public enquiry produces one durable Agency-owned lead; replay returns the same lead. |
| Assignment/follow-up | PASS; Agency owner assigns member A then reassigns member B; custody remains unchanged; contact outcome, note, follow-up, and reload persist. |
| Expiry | PASS; governed scoped expiry of the run-owned Agency term stops new paid publication and Agency commercial enquiry while Agency identity, memberships, lead, activities, and historical access persist without personal fallback. |

## F. Invitation integrity

- User-first and invitation-row locking serializes competing acceptance for one person.
- Acceptance re-reads every decision inside the locking transaction and conditionally
  consumes pending token state.
- Cancellation, resend, automatic queued-delivery rotation, and expiry use the same
  invitation-state boundary and cannot overwrite a consumed terminal row.
- Token rotation invalidates the old token; accepted replay cannot create a second
  membership.
- Membership state closed after original invitation issuance blocks stale acceptance,
  including after resend.
- The provider call occurs after the database transaction; delivery failure is
  recoverable and cannot grant membership.

## G. Files changed

| File | Reason |
| --- | --- |
| server/services/commercialActivationPolicy.ts | Adds exact governed fixture product selection with default fail-closed behavior. |
| server/invitationRouter.ts | Makes acceptance, cancel, resend, and expiry terminal transitions atomic. |
| server/services/agencyInvitationDeliveryService.ts | Locks delivery-time refresh/rotation while keeping provider delivery outside transactions. |
| scripts/mvp-local-runtime.mts | Adds the private governed B05 outgoing-invitation mail capture boundary. |
| client/src/pages/advertise/AgencyProductLandingPage.tsx | Uses exact Agency availability. |
| client/src/features/agency/operations/AgencyOperationsWorkspaces.tsx | Corrects mounted once-off Agency billing path and stages. |
| client/src/features/agency/shell/ActivationBanner.tsx | Uses exact Agency availability. |
| client/src/features/agency/workspace/useAgencyWorkspaceData.ts | Uses exact Agency availability for workspace guidance. |
| client/src/lib/agencyJourney.ts | Removes static global commercial fallback. |
| client/src/components/agent/AgentStatusStrip.tsx | Tells qualifying members that their Agency manages Launch Access. |
| client/src/pages/admin/adminRouteRegistry.tsx | Mounts the existing audited Agency approval screen. |
| client/src/pages/advertise/AgencyProductLandingPage.commercialTruth.test.tsx | Covers Agency exact availability presentation. |
| client/src/features/agency/operations/AgencyOperationsWorkspaces.preparation.test.tsx | Covers fail-closed and once-off pending invoice presentation. |
| client/src/components/agent/AgentStatusStrip.test.tsx | Covers Agency-managed member copy. |
| server/services/__tests__/commercialActivationPolicy.test.ts | Covers Agency-only and malformed selector policy. |
| server/services/__tests__/agencyInvitationDeliveryService.test.ts | Covers locked delivery rotation behavior. |
| server/__tests__/integration.agency-membership-authority.test.ts | Adds invitation race/terminal/rollback/identity coverage. |
| server/__tests__/integration.agency-listing-attribution.test.ts | Reuses canonical Agency Launch Access foundation instead of an ad hoc recurring plan. |
| e2e/b05/agency-paid-mvp.spec.ts | Adds the joined controlled B05 browser acceptance. |
| playwright.b05-agency-paid-mvp.config.ts | Adds Agency-only controlled browser configuration and private artifacts. |
| e2e/prepayment/agent-onboarding.spec.ts | Removes historic SQL invitation-token acceptance shortcut from the default prepayment regression. |
| this packet | Records evidence and handoffs. |

## H. Database changes and controlled mutations

- **Schema and migrations:** none.
- **Canonical data:** reference geography, Launch Access foundation, and the
  Search-to-Lead scenario were prepared and verified through Database Authority.
- **Disposable state created by B05:** real registrations, Agency, pending subscription,
  invoice, private proof, finance approval, members, media, moderated listing/public
  projection, enquiry, lead/activity/follow-up, and a scoped term expiry.
- **Target lifecycle:** an initial generic scenario check was invalid after the B05
  public sale increased its fixed global search count. The exact disposable target was
  recreated through acknowledged Database Authority lifecycle commands; the generic
  consumer contract passed on the clean target before the final B05 browser run.
  A first non-persistent migration invocation left a running attempt; it too was
  discarded only through the exact acknowledged disposable lifecycle, then the same
  canonical migration was completed in a persistent session. Final status is healthy.
- **Protected resources:** none touched.

## I. Browser evidence and substitutions

Command:

~~~sh
pnpm test:browser:authority -- --config=playwright.b05-agency-paid-mvp.config.ts
~~~

Result: **1 passed in 2.3 minutes** on fingerprint 35478c6b186ce0cf.

The browser uses separate owner, new-member, existing-member, reviewer, buyer, and
same-browser-switch contexts. It traverses real registration/login, app verification,
Agency setup, privileged approval, billing, proof, finance, team UI, member acceptance,
listing wizard, media, moderation, public search/detail, enquiry, lead operations, and
expiry paths.

The B10 substitution is a local private JSONL capture at
/tmp/property-listify-b05-agency-paid-mvp-email-capture.jsonl with mode 0600. It receives
recipient plus the application-generated invitation URL; raw token-bearing artifacts
remain outside the repository and are not reported. The B11 substitution is controlled
local storage while still using the application's reservation/upload/confirmation/
attachment contract. The only terminal database mutation is the scoped expiry of the
run-owned Agency term after the live lifecycle completes.

## J. Security and regression evidence

- Agency-only controlled availability: Agent and Developer products unavailable; normal
  runtime stays preparation-only.
- Default prepayment browser regression: 10 passed in 1.5 minutes with no commercial
  activation and no SQL invitation-token acceptance shortcut.
- B04 controlled commercial-harness regression: 2 passed in 2.1 minutes.
- Invitation integrity: 32 persisted tests passed.
- Cross-Agency inventory, media, private listing, member/admin, lead visibility,
  reassignment, removed/suspended member, wrong-email, unverified, replay, and
  competing-invite negatives pass in focused integration/browser evidence.
- The browser asserts that client-supplied Agency identity does not self-affiliate,
  ordinary members cannot administer the team or finance, and a same-browser user
  switch does not reveal another user's private draft.

## K. Verification commands

| Command | Result |
| --- | --- |
| NODE_ENV=test APP_ENV=test DATABASE_CONSUMER_CONTRACT_PHASE=post-migration pnpm db:authority:consumer-contract | PASS; canonical migration, reference, foundation, scenario, distribution, schema, and readiness. |
| pnpm test:browser:authority -- --config=playwright.b05-agency-paid-mvp.config.ts | PASS; 1 browser journey. |
| pnpm test:authority -- server/__tests__/integration.agency-membership-authority.test.ts | PASS; 32 tests. |
| pnpm test:authority -- server/__tests__/integration.agency-listing-publication-lifecycle.test.ts server/__tests__/integration.agency-listing-attribution.test.ts server/__tests__/contract.agency-lead-visibility-followup.test.ts server/__tests__/contract.agency-listing-inventory.test.ts | PASS; 4 files, 12 tests. |
| pnpm vitest run client/src/pages/advertise/AgencyProductLandingPage.commercialTruth.test.tsx client/src/features/agency/operations/AgencyOperationsWorkspaces.preparation.test.tsx client/src/components/agent/AgentStatusStrip.test.tsx server/services/__tests__/commercialActivationPolicy.test.ts server/services/__tests__/agencyInvitationDeliveryService.test.ts --reporter=basic | PASS; 5 files, 35 tests. |
| pnpm vitest run client/src/pages/admin/__tests__/adminRouteRegistry.guard.test.ts | PASS; 2 tests. |
| pnpm test:browser:authority -- --config=playwright.prepayment-onboarding.config.ts | PASS; 10 browser tests. |
| pnpm test:browser:authority -- --config=playwright.b04-independent-agent.config.ts | PASS; 2 browser tests. |
| pnpm check | PASS. |
| pnpm build | PASS; built in 46.81 seconds. |
| pnpm lint:check | PASS; 0 errors, 12,015 existing repository warnings. |
| pnpm db:authority:check | PASS; 36 files, 298 tests; utility and lifecycle checks passed. |
| git diff --check | PASS. |

## L. Later blocker handoffs

- **B10:** production transactional-email delivery, bounce/monitoring, and operational
  recipient handling. B05 proves trigger and generated URL through private capture.
- **B11:** production durable media storage. B05 proves the application contract.
- **B12:** hosted runtime/domain/session configuration.
- **B14:** staffing and operational rehearsal.
- **B15:** final legal and customer wording review.
- **B16:** release integration, merge, and whole-release approval.
- **B17:** backup, recovery, and monitoring.
- **B18:** production artifact acceptance.

## M. Accepted launch debt

- **P3 — generic scenario cohabitation:** the generic Search-to-Lead verifier asserts
  a fixed public result count and therefore must run before a disposable test publishes
  extra Agency inventory, or the test data must be cleaned afterwards. B05 runs it
  before the public journey and separately proves B05 discovery. This is test-target
  isolation work, not a paid Agency runtime defect.

No B05-owned P0 or P1 remains.

## N. Proposed disposition

B05 is ready for independent senior closure review. It is not merged to main and this
packet does not claim senior closure.
