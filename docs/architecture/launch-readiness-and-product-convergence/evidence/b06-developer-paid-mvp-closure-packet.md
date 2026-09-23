# B06 Developer Paid MVP Closure Packet

## A. Status

**B06 — EVIDENCE PASS — REVIEW PENDING.**

The six B06 launch-critical findings are corrected and the joined Developer paid-value journey passes through real mounted application paths. The final commit identity is supplied in the delivery handoff after this packet is committed, avoiding a recursive self-reference.

## B. Repository identity

| Item | Value |
| --- | --- |
| Branch | feat/b06-developer-paid-mvp |
| Worktree | /home/edwardspc/Desktop/Dev/worktrees/property-listify-b06-developer-paid-mvp |
| Starting HEAD / B05 authority | e8b813917268d9a707ecb31e8261be5a585c8c18 |
| Merge base | e8b813917268d9a707ecb31e8261be5a585c8c18 |
| B03 / B04 / B05 ancestry | c96bfb5ef628633e0008cd6b4e94fa29c434746e / 6ace317eb20220a790cc0ce750e03558dbe34898 / e8b813917268d9a707ecb31e8261be5a585c8c18 |
| Ancestry proof | git merge-base --is-ancestor succeeded for B03, B04, and B05 before implementation and commit. |
| Initial state | Clean dedicated B06 worktree. |
| Database target | mysql://127.0.0.1:3307/listify_wt_b06_developer_paid_mvp_b7611429cb57 |
| Target fingerprint | 46f7559f85952d402c6eade3482914ed2b658793db44cddf082e330e7c847466 |
| Target class / ownership | disposable-worktree / exact-worktree-owned |
| Migration head / digest | 0090_retire_disconnected_boost_campaigns.sql / a511e70ae06ffbae4027cf02b1de8cc0f586ff7c23cb7cb11a0990606cf728ed |
| Final migration/schema status | manifest-head-ready; no incomplete attempts; schema-congruent. |

No protected or production database, deployment, domain, payment provider, or email provider was accessed. Main was not changed and this branch was not merged.

## C. Senior-plan reconciliation

### B06-01 — Exact Developer commercial availability

**Confirmed.** Mounted Developer acquisition, plan, billing, overview, and workspace guidance read a static activation state rather than the exact B03 product decision.

Those surfaces now use useCommercialProductAvailability('developer_launch_access'). Loading, errors, and an absent product remain unavailable. Paid presentation shows only R1,499, once-off, 90 days, and no automatic renewal. Billing resumes a pending invoice and refreshes billing, subscription, and workspace projections after proof or finance changes. Availability never creates entitlement.

Evidence: exact-product component coverage, B03 commercial contract regressions, and the B06 browser run. The controlled runtime exposes developer_launch_access only; Agent and Agency products remain unavailable and normal runtime remains preparation-only.

### B06-02 — Unique Developer organisation resolution

**Confirmed.** Commercial and workspace paths had divergent organisation lookup patterns, including a first-row shape in some consumers.

developerActorResolution.ts now supplies one transaction-safe actor contract. Zero active memberships returns no Developer authority; exactly one active membership plus coherent first-party publisher proceeds; multiple active memberships raise an explicit CONFLICT; a publisher mismatch fails closed. Billing, plan access, identity, workspace, publication, enquiry, and ordinary operational authority use this same canonical result. No one-user-one-org schema constraint or switcher was added.

Evidence: focused integration covers zero, one, multiple, transaction-handle, unapproved, and publisher-coherence cases.

### B06-03 — Confirmed Developer media authority

**Confirmed.** Development and unit write paths accepted shaped public URLs without proving uploader, tenant, publisher, scope, object existence, or confirmation.

The new narrow authority binds a signed receipt to uploader, Developer organisation, first-party publisher, draft/development/unit scope, storage key, category, MIME type, size, confirmation, and expiry. The mounted flow is reserve → upload bytes → verify stored object → confirm → attach receipt → canonical storage-key persistence → public rendering. The shared development write boundary verifies every new attachment; existing authorised attachments may be retained, reordered, or removed without re-uploading.

Evidence: unit and integration coverage rejects foreign organisation/development/unit receipts, unconfirmed or expired receipts, missing objects, invalid MIME/size, and invented URLs. The browser creates confirmed development hero, unit gallery, and unit floor-plan media through the real local storage flow and sees canonical media publicly.

### B06-04 — Developer lead assignment

**Confirmed.** Ordinary Developer assignment accepted an unchecked client-supplied assignee identifier.

Assignment now derives the canonical Developer actor and accepts only self-assignment, unassignment, or an active authorised operator of that same Developer organisation. It rejects unrelated, other-Developer, Agency, removed, and suspended targets. Assignment changes responsibility only; lead_deliveries retains canonical Developer organisation and publisher custody.

Evidence: focused assignment integration plus browser self-assignment, status, activity, note, next-action, reload, and custody assertions.

### B06-05 — Account-scoped onboarding drafts

**Confirmed.** Browser-local Developer organisation and development drafts used unowned keys and could cross an account change in the same browser.

The setup wizard stores an authenticated-user envelope and does not hydrate until identity resolves. Owner mismatch discards old state, including obsolete unowned legacy data. The mounted development wizard similarly scopes local state to authenticated user and canonical publisher. Same-user reload remains supported; server-owned drafts remain cross-session authority.

Evidence: setup and development wizard tests cover same-user recovery, account-switch isolation, and no premature hydration.

### B06-06 — Joined Developer paid acceptance

**Confirmed.** Existing tests covered fragments but did not prove the full paid value loop from new registration through expiry retention.

playwright.b06-developer-paid-mvp.config.ts and e2e/b06/developer-paid-mvp.spec.ts provide a Developer-only Database Authority browser harness. It uses real sessions, real routes, actual application-generated verification mail captured privately, real finance/reviewer actions, real local media, and an exact-target terminal expiry operation only after the successful lifecycle.

## D. Canonical Developer model

| Authority | Final behavior |
| --- | --- |
| Commercial owner | developer_organisations.id through its Developer billable account and B03 subscription/term; a login user never substitutes for it. |
| Principal/operator relationship | An active developer_organisation_memberships relationship is request authority. B06 adds no invitations, switching, or role matrix. |
| Publisher | A coherent developer_first_party catalogue_publishers row belongs to the same organisation and is server-derived. |
| Development ownership | Authoring resolves canonical organisation/publisher server-side; client owner, legacy Developer, organisation, and publisher fields cannot redirect it. |
| Unit ownership | Unit types remain aggregate inventory owned by their target development; foreign development/unit IDs are rejected. |
| Enquiry custody | lead_deliveries retains Developer organisation and publisher primary custody; public input cannot reroute it. |
| Assignment | A valid same-org operator may take responsibility; custody, term ownership, and history do not move. |

## E. Joined paid-value journey

| Stage | Result |
| --- | --- |
| Acquisition, registration, unverified denial, verification | PASS through mounted Developer acquisition/login/setup and an application-generated verification link captured privately. |
| Organisation, membership, publisher | PASS; browser asserts exactly one pending organisation, active owner membership, and coherent first-party publisher. |
| Privileged organisation approval | PASS through a distinct reviewer session; approval alone leaves no subscription or active term. |
| Exact billing and invoice continuation | PASS; R1,499 once-off, 90 days, no automatic renewal; a second selection resumes one pending invoice without duplication. |
| EFT proof and finance | PASS; proof stays under review; a distinct finance action creates verified payment, billable account, developer_launch_access, and exact 90-day active organisation term. |
| Residential development and units | PASS through mounted wizard with Selling residential inventory, price, beds, baths, size, and six aggregate available units. |
| Confirmed media and edit/reload | PASS; development hero, unit gallery, and unit floor plan reserve/upload/confirm/attach through the app; actual draft review edit retains them. |
| Moderation and discovery | PASS; Developer submits, distinct reviewer approves, public Johannesburg discovery/detail renders Developer identity, facts, media, unit type, and availability. |
| Public enquiry and replay | PASS; buyer UI creates one durable unit enquiry. Replaying the captured application request returns the same record and preserves organisation/publisher custody. |
| Operational follow-up | PASS; canonical principal self-assigns, records Contacted, a call, note, and two-day follow-up; Contacted route reload proves history. |
| Scoped expiry | PASS; exact run-owned term expiry denies fresh publication and fresh public enquiry, hides this run's development from fresh discovery, and retains identity, inventory, enquiry, and activity history. |

## F. Media authority

- Reserve derives principal, organisation, publisher, development, and unit server-side.
- Receipt signature protects storage key, category/type, MIME, size, ownership, confirmation, and expiry.
- Confirmation verifies actual stored bytes and object metadata before a confirmed receipt is issued.
- Development persistence accepts new media only from confirmed scoped receipts and serializes canonical URLs from verified storage keys.
- Edit persistence permits existing authorised attachment retention/reorder/removal only.
- Tests reject cross-Developer reserve/confirm/attach, foreign unit/development scope, expired/missing/unconfirmed receipts, and arbitrary URLs.
- Platform-curator authority remains separately governed; normal Developer requests do not acquire it.

## G. Owner-resolution result

| Active Developer relationships | Result |
| --- | --- |
| None | No Developer commercial/workspace authority. |
| One coherent active organisation and publisher | Canonical organisation/publisher proceeds. |
| More than one active organisation | Explicit CONFLICT; no first-row selection or implicit switch. |
| Organisation not approved | Existing launch governance denies paid commercial action. |
| Missing/mismatched first-party publisher | Explicit conflict; no commercial, publication, enquiry, or operational authority. |

## H. Assignment result

| Target | Result |
| --- | --- |
| Current active canonical principal | Allowed self-assignment. |
| Active operator of same Developer organisation | Allowed where represented by current membership authority. |
| No target | Allowed unassignment. |
| Unrelated, other-Developer, Agency, removed, or suspended user | Rejected server-side. |
| Custody after an allowed action | Original Developer organisation/publisher delivery rows remain unchanged. |

## I. Files changed

| File | Reason |
| --- | --- |
| client/src/components/developer/BillingPanel.tsx | Exact availability, truthful once-off billing stages, continuation, and query refresh. |
| client/src/components/developer/BillingPanel.preparation.test.tsx | Exact availability fixture for fail-closed preparation coverage. |
| client/src/components/developer/DeveloperSetupWizardEnhanced.tsx | Authenticated-user-owned onboarding local state. |
| client/src/components/developer/LeadsManager.tsx | Removes unsupported Agency assignee presentation. |
| client/src/components/developer/Overview.tsx | Exact availability workspace guidance. |
| client/src/components/developer/Overview.preparation.test.tsx | Unavailable exact-product guidance coverage. |
| client/src/components/developer/__tests__/DeveloperSetupWizardEnhanced.states.test.tsx | Setup draft recovery and account-switch isolation. |
| client/src/components/development-wizard/DevelopmentWizard.tsx | User/publisher-scoped mounted wizard local state. |
| client/src/components/development-wizard/DevelopmentWizard.test.tsx | Development draft isolation coverage. |
| client/src/components/development-wizard/phases/FinalisationPhase.tsx | Review Edit controls now use real workflow steps. |
| client/src/components/development-wizard/phases/LocationPhase.tsx | Validated manual-coordinate fallback fields. |
| client/src/components/development-wizard/phases/MediaPhase.tsx | Confirmed Developer media receipts. |
| client/src/components/development-wizard/phases/UnitTypesPhase.tsx | Confirmed gallery/floor-plan receipts. |
| client/src/hooks/useDevelopmentWizard.ts | Receipt/key fields through draft and submit state. |
| client/src/lib/developmentSubmitPayload.ts | Receipt-preserving canonical submit mapping. |
| client/src/lib/developmentSubmitPayload.test.ts | Receipt-mapping coverage. |
| client/src/pages/DeveloperPlans.tsx | Exact availability and B03 pending-invoice continuation. |
| client/src/pages/DeveloperPlans.test.tsx | Exact-product fixture. |
| client/src/pages/DeveloperRoutes.tsx | Exact availability mounted workspace guidance. |
| client/src/pages/__tests__/DeveloperRoutes.developmentHome.test.ts | Exact-product fixture. |
| client/src/pages/__tests__/DeveloperRoutes.onboardingFailure.test.tsx | Exact-product fixture. |
| client/src/pages/__tests__/DeveloperRoutes.preparationNavigation.test.tsx | Exact-product fixture. |
| client/src/pages/advertise/DeveloperProductLandingPage.tsx | Exact Developer product projection. |
| client/src/pages/advertise/DeveloperProductLandingPage.commercialTruth.test.tsx | Fail-closed and exact enabled product presentation. |
| scripts/mvp-local-runtime.mts | Separately guarded Developer private email-capture mode. |
| server/_core/email.ts | B06 capture only under governed test guard and private file mode. |
| server/_core/localMediaRoutes.ts | Existing local signing flow accepts Developer scoped receipts. |
| server/developerRouter.ts | Canonical actor/media scope and assignment enforcement. |
| server/services/developerActorResolution.ts | New shared canonical Developer actor resolution. |
| server/services/developerMediaAuthority.ts | New signed receipt, confirmation, and attachment authority. |
| server/services/billingFoundationService.ts | Canonical Developer resolution in billing transactions. |
| server/services/developerFunnelService.ts | Same-org assignee authority and custody preservation. |
| server/services/developerIdentityService.ts | Canonical Developer actor resolution. |
| server/services/developmentService.ts | Receipt-backed media at shared development/unit write boundary. |
| server/services/planAccessService.ts | Canonical Developer commercial-owner resolution. |
| server/test-utils/developerMediaTestFixture.ts | Controlled receipt/object integration fixtures. |
| server/services/__tests__/developerMediaAuthority.test.ts | Receipt signature, scope, confirmation, expiry, and object protections. |
| server/__tests__/integration.developer-actor-resolution.test.ts | Zero/one/multiple/unapproved/publisher/transaction resolution tests. |
| server/__tests__/integration.developer-lead-assignment-authority.test.ts | Valid/denied targets and custody tests. |
| server/__tests__/integration.developer-media-authority.test.ts | Reserve/upload/confirm/attach and tenant negatives. |
| server/__tests__/integration.development-card-data-flow.test.ts | Receipt-backed card data-flow regression. |
| server/__tests__/integration.development-publication-lifecycle.test.ts | Lifecycle, custody, and expiry regression. |
| server/tests/unitTypeRefactor.test.ts | Aggregate unit media mapping regression. |
| playwright.b06-developer-paid-mvp.config.ts | Dedicated Developer-only Database Authority browser configuration. |
| e2e/b06/developer-paid-mvp.spec.ts | Joined registration-to-expiry Developer acceptance. |
| docs/architecture/launch-readiness-and-product-convergence/evidence/b06-developer-paid-mvp-closure-packet.md | This evidence and handoff record. |

## J. Database changes and controlled mutations

- **Schema and migrations:** none. Existing B03 organisation, billable account, invoice/payment/subscription/term, publisher, development, unit, and enquiry models remain authoritative.
- **Prepared data:** canonical reference geography, Launch Access foundation, controlled scenario, and privileged reviewer/finance fixtures were prepared through Database Authority.
- **Disposable state created:** new Developer principal, generated verification, pending organisation, membership, publisher, invoice, proof, verified payment, organisation term, development, aggregate unit, confirmed media, moderation, public discovery, enquiry, operational history, and scoped expiry.
- **Terminal mutation:** only the run-owned subscription was expired through an exact-target governed disposable operation after application unpublish of the same run-owned development.
- **Protected resources:** none touched.

## K. Joined browser evidence and controlled substitutions

~~~sh
pnpm test:browser:authority -- --config=playwright.b06-developer-paid-mvp.config.ts
~~~

**PASS: 1 browser journey in 1.4 minutes** on target fingerprint 46f7559f85952d40.

The browser starts its own frontend/backend processes with reuseExistingServer false, uses real sessions/routes, and does not seed a paid, published, or completed Developer. It captures an actual application-generated verification message only to a mode-0600 JSONL file under /tmp; raw verification URLs/tokens are neither queried from SQL nor committed. B10 is controlled transport capture, not a production provider. B11 is the real local storage reserve/upload/confirmation/attach path. Finance/reviewer actions use governed privileged fixtures; terminal expiry is limited to the run-owned disposable term.

## L. Security negatives

- Cross-Developer private development read/edit/delete/submit/availability and client owner-field spoofing are covered by Developer lifecycle integration.
- Actor tests prove zero, multiple, unapproved, and publisher-mismatch relationships fail closed; no first-row identity selection remains.
- Media tests reject foreign organisation/development/unit receipts, unconfirmed/expired receipts, absent objects, and invented URLs at the shared write boundary.
- Assignment tests reject unrelated, Agency, removed, and suspended targets; valid responsibility changes preserve lead_deliveries custody.
- Public enquiry checks prove development/unit/publisher input cannot redirect custody, replay is idempotent, and another Developer cannot operate the lead.
- Approval and proof alone create no entitlement/public eligibility. Moderation remains independent.
- Scoped expiry blocks fresh publication/enquiry while preserving organisation, publisher, inventory, enquiry, notes, contact/status, and follow-up.
- Same-browser account-switch tests prove onboarding/development local state does not transfer.
- The controlled selector accepts only developer_launch_access; malformed/default/production configuration remains fail-closed and selection alone grants no term.

## M. Verification commands

| Command | Result |
| --- | --- |
| pnpm test:browser:authority -- --config=playwright.b06-developer-paid-mvp.config.ts | PASS; 1 joined browser journey in 1.4 minutes. |
| pnpm test:authority -- server/__tests__/integration.developer-actor-resolution.test.ts server/__tests__/integration.developer-lead-assignment-authority.test.ts server/__tests__/integration.developer-media-authority.test.ts server/__tests__/integration.development-publication-lifecycle.test.ts | PASS; 4 files, 31 tests. |
| pnpm test:authority -- server/__tests__/commercial-launch-access-s4.integration.test.ts server/__tests__/developer.subscription-commercial.contract.test.ts | PASS; 2 files, 13 tests. |
| pnpm vitest run setup/wizard/payload/media focused files | PASS; 46 tests and 3 pre-existing skipped refactor tests. |
| pnpm vitest run Developer billing/plans/routes/landing focused files | PASS; 17 tests. |
| pnpm vitest run DeveloperProductLandingPage.commercialTruth.test.tsx | PASS; 5 tests including exact enabled product state. |
| NODE_ENV=test APP_ENV=test pnpm db:scenario:verify | PASS; reference/search-to-lead scenario and custody checks. |
| pnpm db:authority:check | PASS; 36 files, 298 tests plus utility, schema, and lifecycle checks. |
| pnpm check | PASS. |
| pnpm lint:check | PASS; 0 errors. Existing repository baseline emitted 12,104 warnings. |
| pnpm build | PASS; Vite production build completed in 53.44 seconds. |
| git diff --check | PASS before commit; repeated in final handoff. |

## N. Later blocker handoffs

- **B10:** production transactional-email delivery, bounce handling, and delivery monitoring. B06 proves application message generation through private capture.
- **B11:** durable hosted object storage. B06 proves the application media contract using governed local storage.
- **B12:** hosted runtime, domain, cookie, and session configuration.
- **B14:** human finance/reviewer staffing and operational rehearsal.
- **B15:** final legal and customer wording review; B06 presents R1,499/once-off/90-day/no-auto-renewal.
- **B16:** integration, merge, and independent release approval.
- **B17:** backup, restore, and monitoring.
- **B18:** production artifact acceptance.

## O. Accepted launch debt

- **P2 — manual team provisioning:** B06 supports one verified principal and active same-organisation operators only where manually provisioned. It provides no self-service invitations, switching, differentiated roles, or team administration.
- **P3 — broader CRM/portfolio expansion:** reminders, round-robin, automation, serial-unit stock, phases, integrations, document centres, richer analytics, future tiers, Land, auctions, and deferred commercial inventory remain outside B06.

No B06-owned P0 or P1 remains.

## P. Proposed disposition

B06 is ready for independent senior closure review. It is not merged to main, and this packet does not claim senior closure.
