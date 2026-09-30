# Paid launch deadline audit — 30 September 2026

**Recommendation: target a founder-assisted paid opening on 5–7 October, with a small intake cap and all three approved customer types supported. Do not announce an unconditional tomorrow/48-hour paid launch.** Substantial product work is accepted; the remaining critical path is one integrated release, hosted delivery, controlled database transition and operating proof. Stop expanding the product until that path is complete.

This report audits the original B01–B18 programme for Edward's deadline-driven revenue objective. It is a product-management recommendation and evidence reconciliation, not a new release authority or permission to merge, spend, cut over or open sales. The central launch register remains the disposition authority. Dates below are proposed execution checkpoints in South Africa time, not guaranteed delivery estimates or assigned staff commitments.

## Subsequent founder decision: validate on the live site

Edward has directed release validation on the existing live site to avoid additional preview/staging cost. This supersedes this report's requirement for a successful Vercel Preview or a separately provisioned staging environment. Do not ask for the same scope decision again or purchase an upgrade to clear preview alone.

The reviewed integration is now PR #583, head `4b5ef13255bf5b54ee92eec27969042fa4310f7c`, tree `02bdcb863e7442392b3ba9d5db1d573b82d64288`. Its GitHub database, geography, lint/typecheck, frontend/application builds and unit/integration checks pass. Vercel Preview remains failed with an unestablished cause. Record that check as **founder-accepted non-gating for controlled production validation**; do not relabel it passed or assert that a plan/budget limit caused it. The candidate itself still needs to build and serve correctly on the production hosting path. Diagnose the preview failure opportunistically if existing logs are accessible; a failure shared by production must be corrected.

Proceed toward a controlled release using the existing infrastructure and costs. The operating sequence is an attended production deployment with paid intake closed, controlled live validation, then a separate paid-opening decision after the remaining customer/data/operating outcomes pass. Use existing sales-pause and publication controls; a sales pause does not freeze every application writer. The database transition still needs its own complete writer freeze, final TiDB archive, old-session invalidation and approved Azure release sequence. Use designated controlled accounts and records, with deliberate external-email/payment handling; do not turn on test-fixture bypasses or synthetic entitlements in production.

The release operator should carry this decision into the owned PR #583 register/review packet, refresh its exact identity, and prepare the concrete merge/deploy/configuration sequence. Coordinate automated frontend/backend deployments so no unreviewed incompatible intermediate state is exposed. Existing target-specific protected database approvals, recovery/capacity obligations and commercial opening criteria remain applicable; this is an environment/preview disposition, not a blanket waiver of unrelated release gates. No new paid environment is required by this decision. Later improvements may ship incrementally with focused verification.

This addendum records the founder's direction and updated directive. It does not claim that a merge, deployment, provider change or paid opening has been executed. Earlier sections below retain their dated audit evidence; this section governs the changed preview/staging recommendation.

## What is done, and where we actually are

**Seven packages have recorded acceptance within their defined scope: B01–B07. Eleven still need launch closure: B08–B18.** This is not a percentage-complete estimate: one package may be a policy decision while another contains a full deployment or recovery exercise. Recorded local acceptance does not mean those changes are integrated or available to customers.

The September 25 audit correctly reported three accepted packages at that time. The September 27 B16 packet explicitly carries later acceptance of B03, B05, B06 and B07 alongside B01/B02/B04. It records the accepted paid-product composition as tree `b21f454e215d8b02129e4daa14ba6f8d338406d1`, also present in local commit `a05868c6`. Its older individual packets still contain historical open/review-pending wording. Preserve the later scoped decisions rather than restarting finished work. [E02–E04]

The September 29–30 database work materially improves the position again:

- Azure was upgraded to MySQL 8.4.9 and verified at canonical migration head 0094, with congruent schema, enforced constraints and unchanged commercial reference values. Runtime connectivity from the backend network was demonstrated. This is much further along than the old “Azure spend gate” summary. [E09]
- Edward explicitly chose **fresh accounts on Azure and archival of TiDB**. Do not plan a legacy account/customer-data import or reopen that choice. Old sessions must be invalidated because fresh numeric account IDs can overlap old ones. [E08]
- The preliminary encrypted TiDB archive captured 218 table schemas and 152 rows and passed authenticated and structural readback. It is not the final writer-frozen capture, an off-machine backup, or restore proof. [E10]
- The governed geography release implementation and local physical materialization are ready. The retained Azure target still needs a fresh reviewed plan, protected apply and verification; the earlier plan digest is invalidated by the province-status correction. [E11]
- PR #582 at `b625a6dd` has seven successful GitHub check runs plus a successful Vercel status, independently read through the GitHub connector during this audit. These checks belong to the database/geography candidate, not the combined paid release. [E01]

**The biggest delivery gap is integration.** GitHub main remains `4e012b30`; PR #580 is still draft at `e8974ec3`, older than the later accepted paid-product composition. PR #582 is a separate draft database/geography candidate. Their common base is main; #582 does not contain the later paid activation policy files. Neither branch alone is the complete proposed paying-customer release. [E01, E03, E12]

## Audit of the existing reporting

| Reporting problem | Effect on launch decisions | Correction |
| --- | --- | --- |
| Central register headline still says “3 closed; 15 remain,” while later acceptance packets carry B03–B07 closure. Main's register is older still and says no findings. | Completed work is repeatedly assigned again; progress looks smaller than it is. | B16 owner reconciles one register against the accepted source/evidence identities before final release review. This report does not silently rewrite another workstream's authority. |
| Uncommitted/staged accepted work and evidence exist across several task worktrees; published PR #580 is older. | A green PR or a branch name can be mistaken for the accepted release. | Preserve and integrate the exact accepted changes and evidence in one owned release candidate; record its commit/tree and provider configuration. |
| September 25 payment-gate, Agency browser and Developer browser failures remain visible in old reports. | Resolved issues become new engineering projects. | Carry forward the later containment correction and successful journey evidence; refresh affected journeys on the combined release. |
| Old B09 census/transfer plans predate the fresh-account decision and the September 30 archive. | Unnecessary legacy migration work can consume the deadline. | B09's immediate release task is final preservation, writer freeze, session invalidation and approved archive custody; do not import legacy application data. Retained archive privacy obligations still need an owner. |
| Old B08 wording describes only establishment and an egress/spend gate. | New connectivity, upgrade and integrity proof is ignored. | Reuse those results. Verify the current stable network/service binding and actual remaining costs rather than asking for the same historical decision again. |
| PR #580 has an old preview failure; #582's preview is now successful. | Either “Vercel is broken” or “preview is fixed” can be overclaimed. | Require a successful preview and hosted proof for the combined release. The passing database preview does not validate the paid candidate. |
| Original 4–6-week forecast predates most later closure evidence. | An obsolete estimate can become a new launch deadline. | Estimate remaining tasks from current artifacts and owner availability. October 5–7 is a conditional target, not a claim that the old estimate was wrong when written. |

## The original 18 blockers, reconciled

“Accepted” below means acceptance recorded in the inspected workstream evidence. This audit did not rerun the product suite or independently repeat those prior reviews. “Open” means the remaining release obligation is not evidenced as complete, even where implementation is ready.

| ID / purpose | Work completed | Remaining before paying customers | Disposition |
| --- | --- | --- | --- |
| **B01 — Paid offer** | Founder-approved Agent R499, Agency R999, Developer R1,499; once-off 90-day access; manual EFT; no auto-renewal. | Carry identical terms into pages, invoice and operator script. | **Accepted policy.** Do not reopen pricing or build new checkout. |
| **B02 — Fresh database CI** | Fresh-schema/Developer enquiry defect corrected and accepted. New database release also has passing hosted DB checks. | Verify the composed release and its required post-merge checks. | **Accepted defect closure.** Integration obligation belongs to B16. |
| **B03 — Money and access** | Product/owner containment correction accepted; payment, term, expiry and existing-history protections covered. | Real bank-to-invoice reconciliation and hosted lifecycle proof on final release. | **Accepted engineering.** No payment-system rebuild. |
| **B04 — Independent Agent** | Joined paid journey 2/2 plus focused server/client regressions recorded. | Final hosted mobile/desktop path with real delivery/storage. | **Accepted application scope.** |
| **B05 — Agency/member journey** | Later dedicated Agency flow 1/1; member invitation, custody, revocation/history evidence. Adjacent PLE expectation corrected, then 10/10. | Hosted Agency/member flow and actual invitation receipt. | **Accepted application scope.** Do not carry the old profile failure as unresolved. |
| **B06 — Developer journey** | Later complete Developer run records 370 passing steps and authority result 31/31; prior Gauteng failure remains historically unattributed. | Hosted organisation-to-inventory-to-enquiry path; retained independent expiry proof. | **Accepted application scope.** Passing steps are not 370 independent browser tests. |
| **B07 — Security/containment** | Corrected paid policy, API/tenant/role/revocation matrix; 99-test earlier matrix and focused final 5-test role rerun recorded. | Preserve protections through integration; verify hosted sessions, origin/proxy and provider boundaries. | **Accepted engineering.** No waiver of tenant or payment isolation. |
| **B08 — Launch database** | Azure 8.4 upgrade, 0094 congruency, constraints, runtime-path reads and commercial references verified. Geography release implementation and local materialization ready. | Integrate reviewed authority; refresh/apply/verify geography; bind API/workers to approved Azure identities; prove owner access/fresh registration and readiness. | **Open, advanced. Critical.** Old egress blocker requires current reconciliation, not automatic repetition. |
| **B09 — Existing data** | Founder chose fresh accounts/archive. Preliminary encrypted TiDB capture and authenticated readback complete. | Proven writer census/freeze, final capture/readback, independently protected archive/key custody, old-session invalidation and approved retention. | **Open, narrowed. Critical.** Legacy import and classification for migration are removed from the immediate plan. |
| **B10 — Essential email** | Transactional worker and policy engineering/local capture evidence prepared. | Verified sending identity; actual verification/reset/invitation/payment mail receipt; bounce/failure handling and supervisor/restart proof. | **Open. Critical.** Manual sales assistance cannot substitute for working account recovery. |
| **B11 — Media/payment proofs** | Private-proof configuration/access guardrails and local media handling prepared. | Real durable public media, separate private proof storage and credentials; anonymous/cross-tenant denial, authorised retrieval and recovery evidence. | **Open. Critical.** No public bucket for financial proofs. |
| **B12 — Hosted runtime** | Contract/preflight prepared; newer Azure runtime connectivity verified; #582 preview passes. | Combined frontend/API identity, healthy readiness, TLS/URLs, sessions/origins/proxy, Redis and supervised services; controlled hosted rehearsal. | **Open. Critical.** September 27 readiness 503, apex TLS mismatch and HTML version fallback are latest inspected public observations, not reverified current outages. |
| **B13 — Lead delivery** | Durable custody/retry and attention handling implemented; recovery runbook prepared. | Hosted cron/worker schedule, real enquiry-to-correct-recipient-to-follow-up, retry/replay and alert ownership. | **Open. Critical.** A paying customer's enquiry cannot disappear. |
| **B14 — First-customer operations** | Founder-only model and operating schedule accepted: weekdays 09:00–17:00 SAST, excluding public holidays; normal one-business-day activation target; bounded sales window/pause. | Real inbox/bank/moderation checks; absence, missed renewal, pause/resumption and preservation rehearsal. | **Open rehearsal.** One trained founder is sufficient if demonstrated capacity matches intake. |
| **B15 — Customer commitments** | Company/contact/privacy facts, founder review ownership and draft copy recorded through v0.6; no need to ask for those facts again. | Final provider/retention/cookie facts; unresolved disclosure checks; dated exact-copy approval; working Terms/Privacy/acceptance and invoice consistency. | **Open. Critical minimum.** This audit supplies no legal certification or new requirement to hire reviewers already replaced by recorded founder ownership. |
| **B16 — One release** | Accepted paid composition, corrected PLE proof, and independently checked database PR available. | Combine them; resolve actual conflicts; current checks/journeys and whole-change review; controlled merge/post-merge verification. | **Open. Immediate engineering priority.** Hold auto-deploy before a merge intended to precede cutover. |
| **B17 — Recovery/capacity** | Probes/runbook; real pre-upgrade backup/recovery-copy equivalence; Azure integrity/engine rehearsal evidence. | Representative final-application 24-hour workload, peaks/backlog/restart, continuous alerts, independent backup and application recovery/PITR evidence against agreed thresholds. | **Open, partial proof exists. Critical.** Engine upgrade success is not application capacity acceptance. |
| **B18 — Paid opening** | Exact-artifact acceptance checklist prepared. | All three customer types plus buyer enquiry/follow-up pass on approved release; controlled cutover; writes-closed smoke; Edward's GO; first-customer observation. | **Open. Final gate.** |

Package sources: original audit and September 25 reconciliation [E02]; accepted paid composition [E03–E04]; B14/B15 updates [E05–E06]; fresh Azure and archive work [E08–E11]. B10/B11/B13 have prepared engineering evidence but no later real-provider acceptance found in the inspected packets.

## Minimum product we should sell

Sell the existing approved 90-day Launch Access proposition. Keep Independent Agents, Agencies and Developers in scope; their core engineering is already accepted. The launch promise is: a legitimate customer can register and recover access, understand the offer, pay, receive the correct entitlement, publish approved real inventory, receive a buyer enquiry and follow it up. The buyer can find that inventory and submit an enquiry successfully on a phone.

**Proposed opening model:** appointment-led onboarding, initially no more than five paying customer organisations/independent agents in the first week and no more than two new activations per staffed day. Those are proposed operating caps, not existing platform limits or evidence of demand. Start with one observed activation, verify the delivered outcome, then invite the next customer. Use the existing sales-pause control and invitation process; do not build a new quota system for this cap.

Manual EFT, founder bank matching, manual moderation and direct support are acceptable launch operations. Use the existing audited application paths. Do not activate access with ad hoc SQL, accept a proof image as bank receipt, or move financial proofs into an unreviewed public/consumer sharing channel. Pause new intake when the founder cannot meet the recorded support/activation promise; preserve existing paid access.

If a customer type develops a new release-blocking defect, bring Edward a concrete proposal to postpone that type and suppress its public purchasing routes. Do not silently relabel an Agent-only launch as completion of the approved three-audience MVP. Reducing customer types also does not eliminate shared database, security, email, storage or recovery work.

## What we can defer

| Defer until after paid opening | Minimum that stays before launch |
| --- | --- |
| Card gateway, recurring subscriptions, automatic bank reconciliation and renewal automation. | Existing manual EFT path, exact owner/product/amount, confirmed funds, correct 90-day term and safe expiry. |
| Self-service onboarding for volume, CRM/helpdesk purchase, additional support staff and 24/7 coverage. | Founder-assisted process, functioning support channels, honest hours, daily finance/moderation checks and sales pause. |
| Services marketplace/PR #581, Explore, Land launch, boosts/placement, referral expansion and unsold collaboration features. | Server-side containment and truthful public routes; hidden navigation alone is insufficient. |
| Dashboard redesign, advanced analytics/AI, broad visual polish and repository-wide lint-warning cleanup. | Mobile completion, understandable errors, correct customer/inventory/lead state and basic operating measurements. |
| National coverage expansion and recovery of original geography sources for future regeneration, where the existing frozen approved projection suffices. | Verified current catalog integrity, physical geography provisioning and launch-area authoring/search proof. If the approved projection cannot support the launch area, that is a real blocker. |
| TiDB legacy-account migration, historical product feature parity and preservation of experimental schemas in Azure. | Final protected archive, approved retention/custody and invalidation of old sessions under the fresh-account decision. |
| A new monitoring dashboard and large-scale performance optimisation. | Existing probes wired to a reachable person; recovery proof and the agreed representative capacity test. |

No archive deletion, weaker isolation, unverified payment activation or untested recovery is proposed as a deadline shortcut. Conversely, no speculative feature improvement should enter the launch queue without an observed failure of the paying-customer promise.

## Execution plan: now through first week of October

Treat the 11 remaining package numbers as **five coordinated workstreams**, not 11 sequential projects. Role labels below are proposed accountability; actual availability must be established before the dates become commitments. Edward already owns founder/finance/support/data/copy decisions in the inspected records. A named release engineer and independent reviewer are still needed; do not assume that staffing exists.

| Workstream / accountable role | First concrete action | Completion evidence | Packages |
| --- | --- | --- | --- |
| **1. Assemble the sellable release — release engineer; independent reviewer** | Compare accepted paid tree `b21f454e…` with #582 `b625a6dd…`; preserve accepted runtime fixes, canonical migration checksums and newer geography/archive authority. Prepare controlled auto-deploy hold. | One reviewed SHA/tree; all required checks and affected Agent/Agency/Developer journeys pass; post-merge identity recorded. | B16; consumes B01–B08 |
| **2. Complete Azure transition — database/release operator; Edward owns data disposition** | Reuse successful upgrade/network evidence. Refresh geography plan on exact reviewed source; prepare writer inventory, final archive and session reset sequence. | Geography verified, correct runtime/worker target identities, fresh login/owner/bootstrap proof, final archive and independent custody; no alternate TiDB writer. | B08/B09/B12 |
| **3. Prove service delivery — application/release engineer; Edward receives alerts** | Bind existing email worker, lead schedule and public/private storage; run a joined real-provider rehearsal. | Mail received; private proof inaccessible to other users; public media survives restart; enquiries arrive once with correct custody; alerts and restarts work. | B10–B13 |
| **4. Make the offer operable — Edward** | Finish exact customer copy from supplied facts and actual provider configuration; rehearse one invoice/bank-match/moderation/support cycle and absence/pause. | Approved rendered Terms/Privacy/consent/payment copy; monitored contacts; timed queue exercise; observed pause/return behavior. | B14/B15 |
| **5. Admit and open — release operator/reviewer; Edward makes GO decision** | Start recovery and 24-hour capacity exercise as soon as the representative integrated hosted candidate is stable. | Measured recovery/load/alert results; all-three-actor and buyer acceptance; controlled cutover and first paid activation observed. | B17/B18 |

**Avoid circular gates:** B16 integration preparation can proceed while provider setup and copy review continue. Do not require final B18 production acceptance before constructing a deployable candidate. However, merging is itself operationally sensitive here: September 30 evidence reports Railway auto-deploys main with `checkSuites=false`. Verify and hold that trigger through the controlled release procedure before a merge intended to remain undeployed. Do not merge #582 alone as a shortcut to the full paid product.

| Date / checkpoint | Planned result | Decision if missed |
| --- | --- | --- |
| **30 September, remaining staffed time** | Freeze non-revenue scope; name release/review coverage; identify the one candidate composition; make remaining provider/spend requirements concrete. Reuse supplied founder decisions. | Do not spend the evening starting new feature work or repeating closed reviews. Confirm the next staffed release window. |
| **1 October** | Reviewable integrated candidate; current tests/preview; concrete hosted configuration and cutover plan. Finalise actual-provider/copy facts in parallel. | If candidate, operator access or necessary resources remain unresolved, October 2 paid opening is not credible. Continue assistance/preparation without collecting payment for unavailable service. |
| **2 October** | Controlled hosted deployment with sales closed; geography/service delivery and account/owner smoke pass; recovery exercise and representative 24-hour run started early enough to finish before review. | If the joined path or recovery prerequisite fails, fix only that failure. Reforecast 5–7 October rather than waive the test. |
| **3–4 October** | Capacity run may continue automatically. Observe and rehearse only if explicitly staffed; preserve the existing weekday support promise. | No assumed weekend founder coverage or unattended new paid intake. The test clock is not a substitute for an alert recipient. |
| **5 October, staffed opening window** | Review evidence; complete final archive/cutover/writes-closed checks; obtain GO; onboard the first paying customer with founder present. | Keep sales closed if any critical condition below is unmet. Use 6–7 October for bounded correction and relevant revalidation. |
| **6–7 October** | Expand toward the proposed small cohort only after first-customer payment, access, publication and enquiry/follow-up succeed. | If critical gates still fail, move paid opening with the exact failed outcome and next estimate. Do not reset into another broad 18-blocker programme. |

**Tomorrow / 48-hour interpretation:** tomorrow can credibly be an integration and release-preparation milestone. A paid opening within 48 hours is a stretch case only if one final candidate, available owners/resources, working providers and the required complete recovery/capacity evidence all arrive inside that window. None of that completion is established by this audit. The 24-hour representative test alone creates a real elapsed-time floor. With one person covering development, release and operations serially, the October 5–7 target has materially less confidence.

Retain the existing B17 criteria: a representative 24-hour exercise with two expected peaks and a 30-minute 2× peak; zero lost accepted writes/duplicate durable outcomes/tenant leaks; unexpected errors under 0.1%; backlog drained within 15 minutes, plus the latency/resource/restart criteria in the master plan. Its proposed recovery objectives include in-region RPO ≤15 minutes/RTO ≤4 hours and regional RPO/RTO ≤24 hours. A reduced cohort can justify a documented workload forecast before testing; it does not silently waive integrity, recovery or the current acceptance contract. [E13]

## The actual GO decision

Open paid intake only when the review record can answer all of these with evidence tied to the same release:

1. **Can we take money correctly?** Approved offer/copy, invoice owner/product/amount, private proof, funds matched, correct access/expiry and safe retry/correction.
2. **Can we deliver the paid value?** Fresh Agent, Agency/member and Developer journeys; real inventory/media, moderation, phone/desktop discovery, enquiry and recipient follow-up.
3. **Can people access the service safely?** Verified registration/recovery mail, valid TLS, correct frontend/API build identities, sessions/revocation, tenant isolation and healthy readiness.
4. **Can we protect and recover records?** Final TiDB preservation and fresh-account session reset; durable Azure/media, usable backups, measured recovery/capacity and routed alerts.
5. **Can Edward run tomorrow's queue?** Working support/bank/moderation access, realistic intake cap, absence/pause rehearsal and explicit GO during an attended window.

After opening, immediately pause new sales for incorrect money/access, exposed private data, lost accepted enquiries, unavailable essential account recovery, or a broken recovery/monitoring obligation. Preserve existing customers' paid access while the incident is contained, wherever safe. After Azure accepts writes, use the approved forward-recovery path; do not switch back to a stale TiDB writer.

## Next blockers after opening

Use observed customer outcomes to select the next work, without manufacturing another large feature checklist.

| Period | Priority | Measure using existing records |
| --- | --- | --- |
| First 72 staffed hours | Failed activation, account recovery, listing/media publication, enquiry delivery and customer support problems. | Every paid invoice maps to one correct active owner/term; each customer reaches first published inventory; every accepted enquiry has custody and follow-up. |
| First 7 days | Remove the largest repeated founder/customer friction. Add automation only where manual work exceeds the intake plan. | Time from matched funds to activation; time to first publication; manual minutes per customer; support causes; delivery failures and refunds/corrections. |
| Days 8–14 | Carefully raise intake if service promises and capacity hold; review actual spend and backup/recovery health; review TiDB retention separately. | Activation/support within the published target, no unresolved money/isolation/data-loss incident, acceptable worker backlog and resource headroom. |
| Thereafter | Prioritise the feature that helps acquire or retain the next paying customer, supported by interviews/use. | Conversion, repeat usage, usable inventory, enquiries/follow-up and reasons customers do or do not renew. |

Do not promise lead volume or sales that the platform cannot substantiate. Onboarding revenue proves willingness to try the offer; delivered inventory and working enquiries establish the value loop; renewal is a later signal. A simple founder-maintained log is enough initially.

## Evidence, provenance and limitations

Inspection completed on 30 September 2026. GitHub main/PR/check state was read live through the connected GitHub API. Shell Git fetch failed because this environment could not resolve github.com; the connector independently established current main and PR heads. Public HTTP refresh through the web tool failed to access the requested URLs, so September 27 public diagnostics remain explicitly historical. No September 30 public readiness result is claimed.

The audit read source/evidence across task worktrees without changing them. Several later evidence packets are uncommitted; their hashes, paths and source status are captured in the adjacent [evidence index](evidence/paid-launch-deadline-audit-2026-09-30.json). GitHub green checks were independently observed; local/browser counts below are prior recorded results, not newly executed tests. No product tests were needed for this documentation-only deliverable. The mandatory Database Authority status check was run read-only in the inspected B16 worktree: exact disposable ownership, expected head 0094, local service unreachable; ledger/schema not evaluated. It proves no hosted database state. No protected database/provider mutation, payment, message, merge or deployment was performed by this audit.

| Ref | Source and evidence boundary |
| --- | --- |
| E01 | Live GitHub: [main](https://github.com/Doscoding187/real_estate_portal/tree/4e012b3044628fc06da7489c0055e9ce01bdc8d9), [PR #580](https://github.com/Doscoding187/real_estate_portal/pull/580), [PR #582](https://github.com/Doscoding187/real_estate_portal/pull/582), [#582 CI](https://github.com/Doscoding187/real_estate_portal/actions/runs/36720183715). Heads/statuses preserved in evidence index. |
| E02 | Original `19-paid-mvp-launch-blocker-audit.md` and `23-paid-mvp-senior-reconciliation-2026-09-25.md` in `property-listify-paid-mvp-audit-20260925`; baseline criteria and historical three-package acceptance. |
| E03 | `evidence/b16-integration-review-packet-2026-09-27.md` in `property-listify-b16-no-spend-convergence`; later scoped B03–B07 acceptance, composition and PLE 10/10. Untracked packet, hashed at inspection. |
| E04 | `evidence/b04-b07-security-matrix-2026-09-26/review-packet.md` and machine summaries in the B16 worktree; security/journey results with stated local-provider limits. |
| E05 | `evidence/b14-schedule-reconciliation-implementation-2026-09-27.md` in `property-listify-b14-schedule-reconciliation-review`; accepted documentation, no operational rehearsal. |
| E06 | `evidence/b15-copy-approval-preparation-2026-09-27-v0.6.md` in `property-listify-b15-founder-privacy-input-2026-09-27`; supplied facts/review ownership and unresolved copy. Its older B09 state is superseded by E08/E10. |
| E07 | `evidence/b12-public-diagnostics-2026-09-27.json` in B16; historical 503/TLS/build-identity/staging observations. |
| E08 | [Fresh-account/archive decision](https://github.com/Doscoding187/real_estate_portal/blob/b625a6dd0be7b105e100383dbc8f919a64d8b0bb/docs/database-authority/azure-fresh-account-transition-2026-09-29.md). |
| E09 | [Azure upgrade/runtime readiness](https://github.com/Doscoding187/real_estate_portal/blob/b625a6dd0be7b105e100383dbc8f919a64d8b0bb/docs/database-authority/azure-fresh-transition-readiness-2026-09-29.md). Recorded protected evidence; no repeat connection by this audit. |
| E10 | [Preliminary archive](https://github.com/Doscoding187/real_estate_portal/blob/b625a6dd0be7b105e100383dbc8f919a64d8b0bb/docs/database-authority/tidb-preliminary-archive-2026-09-30.md). No archive bytes/key accessed by this audit. |
| E11 | [Geography release](https://github.com/Doscoding187/real_estate_portal/blob/b625a6dd0be7b105e100383dbc8f919a64d8b0bb/docs/database-authority/azure-geography-reference-release-2026-09-30.md) and catalog-integration report in the same directory; protected apply pending; auto-deploy observation. |
| E12 | Local Git tree/ancestry comparison: accepted paid tree `b21f454e…`; database PR `b625a6dd…`; merge base `4e012b30…`. Source contents show paid activation policy files absent from the database candidate. No merge attempted. |
| E13 | `docs/architecture/database-transition-and-launch/master-plan.md` on the database release branch, capacity/recovery thresholds. This audit proposes no threshold waiver. |

**Delivery:** report and sanitized evidence index only, on `docs/paid-launch-deadline-audit-20260930` in its own task worktree based on current published main. The plan is ready for execution prioritisation; release GO remains unsupported until the listed outcomes are proven.
