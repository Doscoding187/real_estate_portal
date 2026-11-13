# Services Launch Readiness Plan

**Status:** Proposed delivery plan. This document is not a launch GO, provider-admission approval, database operation approval, or deployment authorization.

**Companion audit:** [`services-current-state-commercial-audit-2026-11-12.md`](services-current-state-commercial-audit-2026-11-12.md) records the V1/V2/V3 reconciliation, provider application/publication distinction, monetization status, and commercial discovery recommendation.

- **Assessment date:** 2026-11-12
- **Source baseline:** `origin/main` at `93723fdb2` (#761); re-checked against `origin/main` `14696b8e2` on 2026-11-13
- **Pilot decisions:** [`services-pilot-decisions-2026-11-13.md`](services-pilot-decisions-2026-11-13.md) (D1-D10) settle §4 and §8 items 1-2 below.
- **Product decision already recorded:** launch a free, controlled pilot cohort while the commercial model is validated (`services-v2-product-contract.md`, §3.1).

## 1. Outcome

Launch Professional Services as a controlled, public pilot in a small number of service and location combinations where real, reviewed providers are ready to receive requests. Let providers register/apply and complete their profiles; keep each profile private until manual review selects and publishes it. Account creation is not publication or an entitlement to join the public cohort. Expand availability after the team has evidence that discovery, request handling, provider response, review, and support work in live conditions.

The launch product is a provider directory and one-to-one enquiry handoff. A request is not a booking, accepted quote, payment, or promise that work will be completed. Paid placement, subscriptions, lead fees, territory exclusivity, and automated ranking commitments remain out of scope under V2 §3.1.

## 2. Evidence-based starting point

### Public product

- [`https://www.propertylistifysa.co.za/services`](https://www.propertylistifysa.co.za/services) is publicly reachable. On 2026-11-12 the directory showed no published providers.
- The inspection category route also showed no providers.
- [`https://www.propertylistifysa.co.za/advertise/services`](https://www.propertylistifysa.co.za/advertise/services) says provider access is not open yet and describes a small, manually reviewed cohort.
- The live registration experience exposes buyer and agent paths. Source keeps `service_provider` registration unavailable; the server registration allow-list currently accepts `visitor` and `agent`.
- The provider onboarding and super-admin publication review paths exist, but the public application/registration entry is currently held. The intended applicant-to-review journey therefore cannot start from the public site today.
- The public `.co.za` domain is the production surface observed for this assessment. The `.com` domain is parked.

### Existing engine

The current source has the core pilot loop: provider onboarding, reviewed publication, public directory and service pages, an attributable one-provider request, request status history, a provider workspace, and moderated reviews. The publication path is super-admin controlled and rechecks provider readiness. Public provider eligibility is fail-closed.

The engine does not provide booking, scheduling, payment, formal quote handling, or automated provider request alerts and reminders. Review reports and publication decisions require human review. Providers must have a clear way and expectation to check their workspace during the pilot.

An audited super-admin role-management path can assign the `service_provider` role, and the provider onboarding wizard can then collect the profile. This is a candidate controlled-cohort route, not yet an approved operating procedure. Validate it in an isolated environment and document the exact steps before using it for real providers. Do not create or alter production provider records with direct SQL.

### Evidence not yet available

- The exact Vercel frontend SHA and the API/worker artifact serving the live domain were not confirmed in the previous assessment; platform metadata reads failed. Hosting correction (checked 2026-11-13 against `origin/main` `14696b8e2`): the frontend is on Vercel and the API image targets Azure Container Apps (`Dockerfile:3-5`; production environment `cae-property-listify-prod` in `docs/database-authority/evidence/release-plan-20261105/release-plan-20261105.json:26`, executed via an Azure Container Apps job). `.github/workflows` contains no deploy job (`ci.yml` only builds the image, line 612). `docs/railway-release-procedure.md` (last changed 2026-10-12) still describes Railway for `api.propertylistifysa.co.za` and is unreconciled with the Azure Dockerfile (2026-11-04); which platform currently serves live API traffic is unverified and must be resolved in Stage 4.
- A public page response or `/api/health` result does not establish production database readiness. No protected database target was contacted in this planning work.
- `pnpm db:authority:status` could not run in the fresh worktree because dependencies are absent (`tsx: not found`). No dependency installation was attempted. Resolve the actual database target and collect governed readiness evidence in the release phase.
- The prior local journey preview used synthetic data in a disposable worktree. It is not evidence of production supply or hosted end-to-end readiness.

## 3. Architecture and launch guardrails

1. Preserve V1's one-provider, attributable request and existing lead authority. Do not add a second CRM, contact channel, or request store.
2. Preserve the existing reviewed publication gate, public eligibility conjunction, audit trail, and provider-contact privacy boundary.
3. Use canonical Place identity for new provider coverage and request geography. Do not add display-text geography fallbacks or widen a provider's coverage to fill empty results.
4. Show only provider claims supported by submitted or platform-verified evidence. Do not invent insurance, qualifications, response times, ratings, availability, or completion claims.
5. Keep the free controlled cohort. Commercialization and paid ranking need separate research and founder approval.
6. Do not build payments, consumer bookings, scheduling, or schema additions as launch prerequisites. Any new schema or data operation requires its own Database Authority workstream and approval.
7. Keep the first release cohort-scoped. Accept provider applications, but hide or clearly mark category and area combinations that have not passed the supply gate; publish only profiles accepted by the reviewer.

## 4. Proposed launch bar

**Decided 2026-11-13:** supply bar (D3), pilot market (D4), owners and cadence (D5), response expectation (D6) and alert approach (D7) are settled in [`services-pilot-decisions-2026-11-13.md`](services-pilot-decisions-2026-11-13.md). The gates below remain the checklist; the decisions doc resolves the open choices in them.

These are the pilot gates:

- **Supply coverage:** every category and location combination advertised as available has at least two independent, approved, contactable providers with an active service and valid listed coverage. If a specialist category cannot meet that bar, launch it as a clearly limited single-provider option by explicit product decision, or keep it out of the pilot.
- **Provider readiness:** every published profile has complete business details, active services, valid coverage, a working contact channel in the private request workflow, and an accountable provider operator.
- **Request reliability:** an eligible consumer can send one request to the selected provider; retrying the same submission does not create a duplicate; the assigned provider can see and update it; the consumer sees an accurate confirmation/status.
- **Operations:** named owners cover provider admission, publication review, new request monitoring, review/report triage, and customer support. Set the provider response expectation and escalation path before recruitment.
- **Trust and copy:** all public language describes a request/enquiry and platform verification accurately. No copy implies booking, payment, guaranteed acceptance, or completed work.
- **Release evidence:** exact frontend/API artifacts, authentication, email/support paths, production readiness, and rollback/unpublish controls are verified against the intended release candidate. No unresolved critical privacy, security, routing, or data-integrity issue remains.

## 5. Delivery sequence and exit evidence

| Stage | Work | Exit evidence |
| --- | --- | --- |
| **0. Reconcile the authority** | Refresh the Services state register and V1/V3 shipped-state claims against `origin/main` #761. Confirm the first pilot categories, Places, cohort-admission route, supply threshold, response expectation, review owner, and support owner. | A current Services baseline and a recorded pilot scope. Engineering work is not selected from stale queue statuses. |
| **1. Open provider applications and build supply** | Enable provider registration/application while preserving private-by-default profiles and the existing super-admin publication gate. Recruit providers for the chosen category/Place cells. Verify business identity and claims, confirm they accept requests, collect complete profile/service/coverage data through the supported workflow, and publish each selected profile through the reviewed admin action. | A reviewed inventory matrix shows each consumer-advertised cell meets the agreed supply bar. No synthetic or unreviewed provider is public. |
| **2. Confirm onboarding and operations** | Document admission, profile setup, approve/reject/hold communication, request monitoring, response expectations, escalation, unpublish, and review/report triage. | A named owner and repeatable procedure for every manual handoff. New requests have an accountable recipient despite the absence of automated alerts. |
| **3. Prove the full journey in isolation** | With isolated accounts and data, exercise provider onboarding → review → publication → category/Place discovery → profile/service page → consumer login → request → provider workspace/status update → consumer confirmation. Check duplicate-submit idempotency, unauthorized access, unpublished-provider exclusion, review eligibility/moderation, mobile behavior, canonical URLs, and support links. | Recorded acceptance evidence for consumer, provider, and reviewer roles, with no critical defects. Do not use production records as test fixtures. |
| **4. Verify the release target** | Resolve the exact production API, web, worker, and database targets through their authorities. Verify the reviewed source SHA and deployed artifacts. Run the required Database Authority status/readiness/congruency checks using the named protected process. Determine whether any canonical schema work is actually required; if it is, stop and create a separate approved DB workstream. | Target fingerprints and sanitized readiness evidence match the reviewed release. API readiness, database/schema readiness, workers/email, and web artifact are evidenced separately. |
| **5. Open the consumer pilot** | Publish only the approved cohort and selected category/Place cells. Keep provider applications available under the review gate. Monitor applications, supply, request creation, provider response, review queue, support, and errors at the agreed cadence. Use the application review/unpublish controls to remove a provider when needed. | Daily operational ownership during initial opening, with a documented stop/withdrawal path and an initial cohort review date. |
| **6. Decide on expansion** | Review real demand, empty-result rates, provider response, request outcomes, complaints/reports, and support workload. Decide whether to add categories/Places or improve alerts. | A recorded evidence-based expansion decision. Do not introduce paid access until V2's research and founder-approval gate is complete. |

## 6. Acceptance checklist for the pilot

### Consumer

- Every pilot-visible category and area has reviewed provider inventory.
- Search and category routes return only eligible providers with matching active services and listed coverage.
- Profile and service detail pages show accurate business, service, price, coverage, verification, and review information.
- The request makes clear which provider receives it and what happens next.
- Requests require the intended authenticated consumer context; duplicate retries do not duplicate the lead.
- Unpublished, rejected, inactive, or ineligible providers never appear publicly or receive requests.

### Provider

- The approved cohort admission route results in a canonical provider identity and the correct role.
- The provider can finish profile, service, and coverage setup and see the correct private/reviewed state.
- Only the assigned provider can see requester details and update its request.
- Status transitions and response notes are recorded and visible to the appropriate parties.
- The provider knows how often to check the workspace and how to contact support; this is a manual operating step until a fresh notification design is approved.

### Reviewer and operator

- Super-admin publication readiness and decision actions are tested, fail closed, and leave audit evidence.
- Review publication requires a qualifying terminal request and moderation; reports have an assigned triage owner.
- Operators can pause admission, unpublish a profile, and route a consumer/provider issue to a named owner.
- Personal information and provider contact details follow the existing request privacy boundary.

### Platform and release

- Vercel, the API/workers host (Azure Container Apps per `Dockerfile`; confirm against the Railway docs, see §2), email delivery, authentication, and support links are confirmed on the same intended release candidate.
- `/api/readiness` and Database Authority evidence are collected; process liveness alone is not accepted as readiness.
- Service pages, request routes, authentication callbacks, and APIs are checked on mobile and desktop, with error and response-time baselines recorded for the expected pilot load.
- The release owner records the deployed SHA, monitoring window, rollback/withdrawal action, and GO decision. A paid-MVP launch decision is not a substitute for this Services decision.

## 7. Current priority register

| Priority | Finding | Required disposition |
| --- | --- | --- |
| **P0** | Zero live providers make the public directory empty. | Secure and review the initial cohort before announcing consumer availability. |
| **P0** | Provider application/registration is held in both the client and server, although provider onboarding and manual publication review exist. | Open the application path while retaining private-by-default onboarding and explicit admin publication approval. Do not make account registration auto-publish a listing. |
| **P0** | Current Services state documents contradict source history. The register still marks DELTA-1 / PR #704 as pending merge and DELTA-7 / PR #702 as in flight; V3 says DELTA-1 is not yet on main. `origin/main` contains DELTA-1 (#704), DELTA-7 (#702), DELTA-3 (#701), and DELTA-4 (#700). V1's geography description also predates canonical Place coverage. | Reconcile the register and contracts with evidence from #761 before choosing follow-on code work. Preserve valid guardrails and clearly mark superseded facts. |
| **P0** | Production artifact and database readiness were not verified in the previous audit. | Resolve exact targets and collect release-authority evidence before changing production inventory or opening the pilot. |
| **P1** | No automated provider alert/reminder path was found. Review/report triage is manual. | Name a monitoring owner and operating cadence for pilot. If manual response coverage is unavailable, design DELTA-8 as a separate workstream before launch. Do not revive the retired phase-0 notification system. |
| **P1** | The per-service description editing gap identified in the prior audit can leave service detail pages thin. | Confirm the current behavior with a real onboarding rehearsal; improve the existing-data editor if it materially weakens the pilot's provider pages. No schema change is presumed. |
| **P2** | Broader provider web presence, campaigns, export/handover, and commercial tools are not required to prove the approved pilot. | Defer until pilot behavior supplies evidence and the state register authorizes a slice. |

## 8. Immediate next work

1. ~~Reconcile the Services state register and contracts with the current `#761` source and live observations.~~ **Decided/done 2026-11-13:** reconciled in this PR; see [`services-pilot-decisions-2026-11-13.md`](services-pilot-decisions-2026-11-13.md).
2. ~~Record the pilot market: service categories, canonical Places, providers, supply bar, and named operational owners.~~ **Decided 2026-11-13:** D3, D4 (with canonical keys and Place ids), D5 in [`services-pilot-decisions-2026-11-13.md`](services-pilot-decisions-2026-11-13.md). Named providers are still to be recruited.
3. Rehearse provider registration, profile completion, pending-review communication, and manual publication in an isolated environment.
4. Prepare the cohort, update only the copy and surfaces required to reflect actual pilot availability, and complete the acceptance checklist.
5. Resolve current platform and database authority evidence, then make a separate, explicit Services release GO decision.

## 8a. Pilot operations runbook (decisions D5, D6, D7, D10)

Owner for all items: Edward (D5). Cadence: one check per day covering new provider applications, new consumer requests and new review reports.

1. **Applications (D5).** Review each new provider application daily. Registration never publishes (D1); approve publication only through the super-admin publication review.
2. **Requests (D5, D7).** Check new requests daily. There are no automated provider alerts in the pilot. If a request is still unanswered after 1 business day, contact the provider directly.
3. **Escalation (D7).** If any request goes 2 business days unanswered, pull DELTA-8 (new-request email to the provider with no requester personal data; the retired phase-0 notification system is not revived) forward. Otherwise DELTA-8 is the first post-pilot workstream.
4. **Provider expectation (D6).** Tell providers privately, in the admission message and provider onboarding/workspace copy, that they are expected to respond within 1 business day. Never show this to consumers as a claim.
5. **Reports (D5).** Triage review reports on the daily check.
6. **Withdrawal (D10).** To remove one provider, unpublish them through the admin action. To pause the whole consumer journey, re-add `services` to `LAUNCH_HELD_JOURNEYS` in a PR that Edward approves.
7. **Supply check (D3).** Before any release PR removing the hold, confirm every advertised category × Place cell has at least 2 independent approved providers with an active service and valid coverage.

## 9. Authority and non-authorization

This plan follows the V1 contract for shipped public behavior, V2 for the approved free controlled pilot, and the Services state register for workstream tracking. The current V3/status documents need factual reconciliation before they are used to select implementation work. The repo-wide launch register is scoped to the paid MVP and explicitly excludes Services; it does not provide a Services launch GO.

No production database was accessed or changed while preparing this plan. The `pnpm db:authority:status` command failed locally because the fresh worktree has no installed dependencies. Any later production database operation must follow the Database Authority target-resolution, plan, approval, apply, and verification process. This document authorizes no deployment, signup opening, provider promotion, publication, or protected database action.
