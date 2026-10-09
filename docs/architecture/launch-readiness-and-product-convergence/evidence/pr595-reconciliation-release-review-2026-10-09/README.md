# PR #595 — reconciled source and geography release review

**Source reconciliation is complete, with no conflicts or manual resolution. Merge, protected application, deployment and payments remain held.** The geography customer draft/image blocker is not claimed resolved by this packet.

## Source identities

| Boundary | Exact source |
| --- | --- |
| Passing PR #595 candidate | `9c28b3aa852daac33eb269cec8876e6ebbc14a24` |
| Accepted geography integration base | `04821fe7ae6401e781925adce099a93ead08490a` |
| Current main: B12 / merged PR #596 | `1ead53cd5857fc84b846d3d5e4f420f77f824936` |
| Reconciled runtime merge | `b36fcfbb8acd6f5e4ce53b8ebc6904e19dbab847` |
| Reconciled runtime tree | `7beb7ba094e569463558a26606f2bea73593943b` |

The runtime merge has the passing candidate and pinned B12 main as parents. The commit publishing this packet adds documentation/evidence only; its server/client/shared/schema/migration/configuration/dependency tree must match the runtime merge. Record the published PR head and hosted run separately, rather than pretending a document can contain its own commit SHA. [Machine reconciliation and source hashes](reconciliation.json).

## Actual integration findings

The changed-path intersection between B12 and #595 is empty. B12 contributes exactly eight files: its CI push-branch declaration, readiness assessment/probes, hosted readiness monitor, snapshot monitor and their tests. Those files match `1ead53cd` exactly after the merge. No manual fix, fixture change, schema transition, geography rule or access-control exception was needed.

- **Search:** the seven runtime hashes in both senior measurement reports still match. Province filtering against candidate inventory, fresh ancestry validation, batching of discovery ancestors, canonical labels, exact city/locality scope and mixed-input rejection are unchanged.
- **Readiness:** B12 adds assessment/phase start, completion, target/deployment attribution, verdict and timing diagnostics. Observer failures cannot change the readiness outcome or cleanup result. The monitor still runs one strict assessment at a time and fails closed for absent/expired/context-invalidated evidence; the 30-second freshness bound and 5-second nominal refresh delay remain. This affects deployment triage and evidence capture, not geography membership or customer persistence.
- **Runtime interaction:** hosted readiness background work and logging can consume runtime resources. The prior local search diagnostic did not certify a hosted workload with concurrent readiness sweeps. Reuse its bounded search result; do not extrapolate a production tail or capacity guarantee from unchanged hashes.
- **Release and customers:** migrations through `0111`, Drizzle definitions, admission/source pins, Place release adapters, dependencies, deployment configuration and the listing/draft/media/frontend consumers are unchanged. B12 does not introduce a browser private server-save action or migrate the homepage hero.
- **CI:** the added push trigger targets B12's branch and does not introduce another push CI run for this PR branch. The reconciled PR revision receives its normal integration CI; none is manually rerun. Frontend Build Guard path filters are unchanged.

No performance run, unchanged focused suite, authority suite, typecheck or build was repeated during reconciliation. No disposable database was recreated. The local authority status resolves the previously disposed task-owned target; its unavailability is not a product regression. No protected database, live customer session or hosting control was accessed in this reconciliation.

## Reused evidence and its limits

[PR #595 CI run 37804796498](https://github.com/Doscoding187/real_estate_portal/actions/runs/37804796498), attempt 1, passed all five jobs for `9c28b3aa`. B12 candidate `7b046961` passed both its [PR integration run](https://github.com/Doscoding187/real_estate_portal/actions/runs/37898566119) and [isolated push run](https://github.com/Doscoding187/real_estate_portal/actions/runs/37898563026), attempt 1. [Exact prior CI identities/results](existing-hosted-ci.json). These are component evidence; neither is a passing hosted result for the new combined source. Track that source through [PR #595](https://github.com/Doscoding187/real_estate_portal/pull/595).

[The senior search packet](../national-place-search-senior-2026-10-08/README.md) retains both measurements on `6be9ef01`: 20-client p95 **733.33 ms / 738.69 ms** against **750 ms**, with zero unexpected errors across 440 HTTP calls. All windows meet p99 ≤2,000 ms and acquisition p95 ≤250 ms. Its 94 focused tests, 696 authority tests, authority gate, typecheck, lint and build are preserved. Both reports and all packet checksums were verified, and their search/runtime hashes match the reconciled source. No result was selected or remeasured.

The repeat has **11.31 ms headroom**. The 120-listing local workload, local MySQL version, archived-row comparison limitations and two semantic postflights remain as originally recorded. The B17 10,000-listing/24-hour production-like acceptance and hosted interaction are not certified. The licensed release remains **16,944 Places**, excluding **720 OSM-only Places and their dependants**; no scope, threshold or exclusion changed.

## Protected release and customer sequence

[The concrete release sequence](release-sequence.md) binds the intended Azure target, migration order, Place reference policy, compatible source/deployment checks, stop conditions and focused North Riding/customer proof. Its approval boundaries are:

1. Approve exact reconciled source integration after its hosted results; record final merge SHA/tree. This is not production approval.
2. Prepare a fresh read-only target-specific schema plan from the accepted merged source, review it and approve its exact digest/target before applying `0097–0111` once.
3. Verify the physical schema; prepare the now-applicable Place reference-data plan and approve its fresh digest separately before transactional application and verification.
4. Approve an attended compatible deployment of that exact source, preserve automatic holds, and run the established actual-release checks once.
5. After successful release checks, resume canonical North Riding private house server save/reload, three confirmed image uploads, persisted image order/details, then the dependent Developer and actual customer-entry discovery/detail/enquiry checks.

[The previous protected plans](historical-protected-plans-2026-10-08/) are included as **dated planning evidence only**. They were produced on October 8 from `04821fe7`, not freshly against this source/target today. Their schema manifest and release inputs remain identical, but current target state has not been re-inspected. Their null reference plan digest cannot approve a data apply. Refresh through the named protected process after source acceptance; do not use historical approval, a green CI result or this packet as apply authority.

[Customer continuation and proof boundaries](customer-continuation.md) preserves IKaya's existing organisation/pending status and the prepared private-test images. It explicitly distinguishes API server draft persistence from browser-local recovery and keeps the private draft out of public discovery. Completed founder-login, logout and Developer-registration corrections remain closed without regression evidence.

Payments remain closed until separate commercial launch acceptance. They do not block the approved controlled unpaid engineering journeys. The Vercel preview failure/exception remains separate and unchanged; no deployment success is claimed here.
