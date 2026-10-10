# Compatible application release — senior review, 10 October 2026

**Decision: ACCEPT the pinned source and this revised controlled application release plan. Production execution is not yet authorized.** The schema/reference stages are accepted; this stage connects the compatible application to them and proves the original private North Riding draft/image journey.

Reviewer: Codex, senior product architect. Junior preparation: `948c50bfbbed4e1a8ff718ac8cfac7c1e4662f90`. Application source: `57ea5f5e98ff031a4d0f0814998e60fe27a82b2b`; tree: `d832836d40746d36401b6fb1a3603466e6660a00`. Do not deploy moving main or the older B12 diagnostic source. No application source changes are required for this plan.

| Evidence | Senior finding |
| --- | --- |
| Junior preparation | Independently ran all 108 offline checks; exact source/archive, frontend files, evidence and custody bindings passed. |
| Exact-source CI | Run [38040419705](https://github.com/Doscoding187/real_estate_portal/actions/runs/38040419705), attempt 1, push at the pinned source: all five jobs passed. No unchanged suite/build/CI was repeated. |
| Protected data | Retain accepted 0111, 112 ledger entries, 39 enforced CHECKs, 16,944 Places, 157,728 assertions and all 720 exclusions. No database connection, DDL or reference apply occurred during this review. |
| Runtime | Fresh provider projection: API/email/lead offline, no active deployments/pending work; Redis retained. Saved old application configuration is not compatible-source execution. |
| Custody | 32 archive hashes verified; own timers/services inactive. Exact runner was already removed. [Custody closeout](custody-closed.json) completes this stage; no new runner is needed. |
| Search checker | Senior corrected continued dispatch after failure. [Three mocked real-client cases](operator-validation.json) pass; existing requests drain and new jobs stop. This is not hosted search proof. |
| Ingress | [Fresh observations](ingress-review.json): both API origins return the prepared maintenance response; frontend returns its previous page. No blanket claim of frontend/all-route maintenance is made. The Vercel firewall read returned `404 not_found`, not a verified firewall policy. |

## Reviewed corrections and decisions

1. **Remove the known package launchers from the API start command.** [API settings](api-release-settings.json) deliberately set `configFile=null`, preserve the build/network/other variables, bind `BUILD_SHA`, and use `node --import tsx server/_core/start.ts`. Keeping `railway.json` would reinstate the old pnpm command. Restart policy is explicitly ON_FAILURE/max 10. Pinned shutdown regressions already passed with this Node loader. Local loader resolution passed; actual hosted process tree, signal delivery and exit remain observation boundaries. Do not claim an unobserved production clean exit.
2. **Build the frontend at the exact Git SHA using the sealed production project environment.** The junior tar is build evidence, not the final deployable frontend: its public inputs did not preserve every existing journey/CDN/Maps/analytics/title/logo setting. [The reviewed Vercel request](frontend-release-request.json) declares the origin/version/mock overrides and preserves all other project inputs without decrypting environment values. Explicit build/install/output settings may persist for following deployments; capture their effective result and review/rebind the source/version command before any future release. Keep automatic main deployments disabled. A production deployment may assign aliases, so verify API containment and effective aliases before and after it. [Provider API reference](https://vercel.com/docs/rest-api/deployments/create-a-new-deployment).
3. **Keep email execution, lead execution and lead cron held.** Installing the lead config could activate its five-minute cron, and starting email can immediately send queued messages. They are separate later admission decisions after backlog/recipient review. API startup can write its normal commercial-term scheduler notices/events; that writer transition belongs in the application authorization. Paid sales and the saved-search scheduler remain disabled.
4. **Use the corrected search checker and preserve existing budgets.** Capture request identity/status/time and stop new dispatch after any request/semantic failure. Historical slow results at `04821fe…` are not measurements of this optimized candidate. Current hosted performance is pending. Private draft/media proof can establish the original blocker's resolution; full national public-search/capacity acceptance remains separate. Never publish an artificial inventory fixture to manufacture a positive result.

## Execution and acceptance boundary

[EXECUTION.md](EXECUTION.md) is the senior-operated sequence. It supersedes the junior checklist where launcher, frontend artifact/settings and worker-admission instructions differ; unchanged customer/private-address/image and recovery rules remain bound by [reviewed input hashes](reviewed-input-hashes.json).

Required human decision is **one controlled API/frontend release at the pinned source**, including the listed configuration, normal API startup writes, and one existing-account private draft/media proof. Edward stays reachable for a fresh 90-minute incident window; he need not watch technical commands. The previous data approval expressly held deployment/reopening and its window is closed, so it does not authorize this transition. No application deployment or admission is performed by this review.

No new runner, schema/reference write, grant/firewall widening, worker start, email, cron activation, organisation approval, property publication, payment activation or public reopening is included. Preserve the accepted database and recovery evidence. A pre-0111 application writer is not a rollback option.

After actual hosted checks, the senior records deployment/source/configuration, joined readiness, private draft/media persistence, any search results and unresolved limits. This review does not certify all four runtime services, public launch, or capacity. The junior can prepare evidence; only the senior submits acceptance to management.
