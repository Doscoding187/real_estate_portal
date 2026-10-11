# PR #599 application release packet — senior review only

Status: **prepared; no deployment or production customer proof executed**. The senior's source integration acceptance supersedes the earlier CI-pending and P1-open records. This packet prepares one application-only release. Only the senior performs final review, production execution and management acceptance.

## Frozen source and artifacts

| Binding | Exact value |
| --- | --- |
| API and frontend deployment source | `f6d2e9c532b8110770777e8b20889d2b8b7f9058` |
| Accepted candidate | `53ced9efb149273fa09b33d3a8d8d3265dcf42a9` |
| Identical accepted tree | `db97cbe05ad4fa4a0d69905dd489b4b074c26f20` |
| Production / rollback source | `c927351b2a0db4972b8cbc244102c795e2588d3c` |
| Rollback tree | `359d6ca6352414168d2f8bf994d65a0f7db16d34` |
| Accepted CI | run 38168216251, attempt 1, five pipeline jobs and all nine PR checks passed |
| Private artifacts/evidence | `/home/edwardspc/.local/state/property-listify/private-draft-release-packet-20261011/` |

The exact Git source and rollback tar archives, SHA-256 digests, private provider readbacks and input-name bindings are indexed in [release-bindings.json](release-bindings.json). Git tar commit headers independently match both source SHAs. Each source tar is approximately 695 MiB. They contain committed source only, with no worktree environment, dependency installation or packet edits.

The API runs source TypeScript directly. No backend bundle is required; `pnpm build:railway` delegates to the existing no-op backend build. The frontend source archive is **not** a built static bundle or Vercel build-output manifest. New hosted deployment IDs, actual build artifacts and frontend file hashes remain pending senior execution. The prior geography local frontend tar carried another SHA and is excluded.

A new local frontend build was not necessary for this packet. Ten existing production VITE inputs are encrypted, including CloudFront, public journey releases, Maps, analytics, title and logo. Their IDs/targets/types were inspected without decryption. Use the frozen-source hosted production build retaining those inputs; a local build with only the three origin/environment inputs cannot certify the existing product configuration. No staging preview is promoted as production.

## Authority and production readback

Railway project `8cdd7515-ddd2-4252-bbee-df5a5c209d4b`, production environment `63070d99-357a-40ba-99c3-6d1368f61652`, API service `db88a720-2d1f-4afc-a3a8-6228b6b08d3e`. The live service source is pinned to the rollback SHA, with deployment `e947ec0d-6464-4f15-9371-f10e33b52e03` SUCCESS, snapshot `68872c82-f9d7-4406-849d-8c5a1373426d`; provider readback says it can roll back and redeploy.

Vercel project `prj_Xf9Sfzemo9c0Bfq6cgzRb5PGHTtN`, team `team_wGNClVbXptfEtznBC5p1YfO2`. Existing production deployment `dpl_Dv23xoKFYsaYJ3HVWvYUVeXTNAXx` is READY and a rollback candidate, source `c927351b2a0db4972b8cbc244102c795e2588d3c`, URL `real-estate-portal-hvh1bx1g7-edwards-projects-29c395d1.vercel.app`. Its aliases include `www.propertylistifysa.co.za` and `propertylistifysa.co.za`. A fresh canonical frontend `/version.json` read reports that SHA / production.

Email worker `59c0d8f8-abe2-4696-ad9c-de1037723b66` and lead job `e1e32aa8-0b85-4c91-af18-843f1bc52d9f` have no current deployment and no cron schedule. Redis remains SUCCESS. Preserve these bindings and all holds.

**Runtime proof is absent:** bounded public API `/api/health`, `/api/version` and `/api/readiness` reads returned HTTP 403, HTML, no source header. This is a transport refusal, not a failed schema proof or a successful readiness certificate. Do not repeat the requests as a workaround or change public access. The senior must use the previously reviewed private verification transport; if it is unavailable, stop before release verification/customer writes and preserve the refusal.

The accepted database target fingerprint is `b23d640cdf242812e80a28d10bc4079a3ff0b48a05173a392b9af47853495ced`, head `0111_properties_canonical_place_reference_fk.sql`. Retain accepted physical schema, reference data and runtime permissions. Source comparison confirms migrations, canonical schema, package/lockfile, root Railway and Vercel configuration are unchanged from the rollback source. A merge or health endpoint does not authorize protected database work.

## Application rollout for senior execution

1. Review this packet and bind the attended application release and controlled private customer-proof scope. Recheck exact source/tree, artifact hashes, current deployments and rollback candidacy immediately before dispatch. The documentation branch/commit is not a deployment source. Do not deploy moving main or the older candidate.
2. Read pending provider changes before any API action. Patch `398fb997-eeee-4b51-904e-6d4c01fd0aed` contains exactly the destructive deletion of stopped runner service `aa916378-feb3-40e7-b9e5-4f790d77ea1a`. It is unrelated to this release and still requires dashboard two-factor verification. **Never use environment-wide accept-deploy here:** its tool has no service-selection parameter and would include that deletion. Do not clear, retry, combine or bypass the pending operation.
3. Bind an **existing-service, API-only, immutable-SHA** deployment transport. The reviewed desired diff is only API source `source.commitSha=f6d2e9c532b8110770777e8b20889d2b8b7f9058` and full source identity `BUILD_SHA=f6d2e9c532b8110770777e8b20889d2b8b7f9058`; retain the repository/branch and all other configuration. Verify the operator's actual service-scoped transport does not commit the pending environment patch or enable Git triggers. If it cannot isolate the API, stop and hand that limitation to the senior. The MCP create-deployment operation creates a new service and is unsuitable.
4. Deploy API once, then capture its exact deployment ID and effective configuration. Require RAILPACK, `pnpm build:railway`, `node --import tsx server/_core/start.ts`, 30-second drainage, `/api/readiness`, 300-second healthcheck budget, no pre-deploy commands, and root `railway.json` restart policy ON_FAILURE / 10 retries. Preserve existing regions, networking, credentials, Redis, CORS/session/media configuration and holds. Inspect effective process/start logs; saved dashboard values alone do not establish the process command.
5. Observe SUCCESS for that exact submitted deployment before proceeding. A queued upload, CLI exit zero or a different concurrent deployment is insufficient. On FAILED/CRASHED/unknown outcome, stop new dispatch and preserve scoped logs/status. Provider restart policy is existing application policy, not authority to retry an ambiguous protected operation.
6. Through the reviewed private transport, require API version/health/readiness all at `f6d2e9c532b8110770777e8b20889d2b8b7f9058` and production. Full BUILD_SHA takes precedence over provider metadata; reject any stale override. Compare real runtime identity/target against the senior's accepted identity evidence and protected fingerprint. Require `db.applicationReady=true`, accepted head/congruency/reference layers, clear incomplete-attempt state, Redis for cache/auth/public-lead limits, required S3 configuration, hosted origins/configuration and scheduler health. No grant/seed/schema repair follows a refusal or mismatch.
7. After API acceptance, create the frontend production build from this **same frozen Git SHA**, on the existing Vercel project/team. Retain all encrypted production inputs, automatic Git trigger hold and existing delivery/security settings. Require `VITE_DEPLOY_ENV=production`, `VITE_APP_URL=https://www.propertylistifysa.co.za`, `VITE_API_URL=https://api.propertylistifysa.co.za`; any existing API-base alias must agree. Full `VERCEL_GIT_COMMIT_SHA` supplies source metadata; no production BUILD_SHA/COMMIT_SHA/GITHUB_SHA override name was observed, but recheck before dispatch. Do not use `withLatestCommit` or promote the staging-configured preview.
8. Capture the exact frontend deployment ID, READY verdict, actual build/output metadata, source SHA, production environment, aliases and relevant artifact hashes. `vercel.ts` requires `pnpm build:frontend`, `dist/public`, security headers and production sitemap/API routing. `git.deploymentEnabled.main=false` remains held. Require the canonical alias `/version.json` and API version to agree with the frozen SHA.
9. Apply the existing joined source/readiness/identity evaluator using actual fresh responses, exact origins, full frozen SHAs, protected fingerprint and unchanged existing release ID. The evaluator is `scripts/launchRuntimeProbeCheck.ts`; it checks Redis/S3/configuration and commercial-term scheduler success within its existing 45-minute budget. The public CLI probe currently cannot pass the HTTP403 transport; do not substitute status-only evidence or invent a bypass. Preserve existing readiness/search budgets. National/public search reopening is outside this proof.
10. Execute [the bounded private acceptance journey](private-verification.md) once the senior admits its scope. Success must bind real requests and fresh server/media readbacks to the same draft ID and actual deployments. Keep submission separate; leave public reopening, workers, cron, payments and automated production deployments held.

The API's existing commercial-term scheduler can write notices/events during startup. It remains part of the senior's reviewed application execution scope; this packet does not start it, expand that scope or treat startup as a read-only operation.

## Rollback and failure containment

Rollback is application-only, performed by the senior after assessing in-flight/unknown operations. The exact **compatible post-0111** API rollback is deployment `e947ec0d-6464-4f15-9371-f10e33b52e03` / snapshot `68872c82-f9d7-4406-849d-8c5a1373426d`; frontend rollback is `dpl_Dv23xoKFYsaYJ3HVWvYUVeXTNAXx`. Both bind `c927351b2a0db4972b8cbc244102c795e2588d3c`. The private rollback Git source tar is a fallback source artifact, not proof of a newly rebuilt deployment. Never select a pre-0111 application or restore a database backup to undo this release.

- **API fails before frontend:** leave the old frontend and public containment in place. Preserve the exact API failure, requests and readiness layers; restore the named compatible API release with its matching source metadata/configuration only after the senior checks active requests and scheduler work.
- **Frontend fails after API succeeds:** leave the known-good frontend alias on the rollback deployment where possible. Revert its alias to that exact deployment if it moved. The senior decides whether to retain the compatible new API or restore the pair; record the temporary source mismatch and do not claim joined acceptance.
- **Private persistence or isolation fails:** stop new saves/uploads/submission immediately; preserve the actual draft/media IDs, request correlations and responses. An unknown create/upload is reconciled through authenticated owned inventory/server confirmation, never blindly retried. Do not delete a possibly committed draft/image to make a test pass.
- Before an approved API rollback, assess in-flight work and use the established natural shutdown path with 30-second provider drainage (existing application watchdog is 20 seconds). No alarm, expiry or failed probe automatically kills, removes, restarts, retries or revokes anything.
- Restore API source metadata to `c927351b2a0db4972b8cbc244102c795e2588d3c` when rolling back. Verify restored provider deployment SUCCESS, effective configuration, source/version/readiness and frontend alias/version. A rollback to the old frontend removes the new save/restoration UI; preserve server draft/media data and evidence for later recovery.
- Database head, accepted references, runtime permissions and credentials remain intact. No down migration, reference replay, grant/revoke, SQL repair or backup restore. Unknown work remains protected beyond expiry.

Release rejection conditions include source/tree/artifact mismatch; accidental pending-patch inclusion; wrong target/runtime identity; access or readiness refusal; wrong origin/environment; Redis/S3/configuration failure; blank/stale restore, missing confirmed media, changed draft ID, duplicate create dispatch, owner leak or automatic submission. These conditions stop progression and route evidence to senior review.

## Preparation evidence and remaining boundary

Repository/database authorities and senior restoration, geography application and runtime recovery packets were read. Required read-only `pnpm db:authority:status` ran once: this preparation worktree resolves an exact disposable-worktree identity, hash `609d1197da8bf6a61f1fae6d142fbf9aeb9998c649dc36f0cc9fe801fd881a60`; its local database is unreachable and not initialized. That expected local diagnostic is not production readiness and creates no need to provision a database. Protected database connectivity was not opened by the junior.

Dependencies were installed from the frozen lockfile offline with lifecycle scripts disabled for the required status command. No product suites, hosted CI, migrations, reference loads, grants or local frontend build were repeated. Private provider reads and bounded public metadata HTTP requests were the only remote actions.

The existing transient custody timer was absent on inspection. Its unchanged notification/read-only observer was restored at the existing 30-second cadence; historical warning/expiry receipts remain intact, the expired window was not extended, and no alarm was rescheduled. Current provider access is verified and the old runner service remains present. The private custody-resume receipt records the gap between observations completed at 12:49:33 UTC and 20:31:02 UTC on 11 October. Continuous observation during that gap is not claimed.

Only local packet documentation is changed on branch `prep/private-draft-application-release-20261011`, worktree `/home/edwardspc/Desktop/Dev/worktrees/property-listify-private-draft-release-20261011`. No push, deployment, provider configuration mutation, customer write or management submission occurs in preparation. The next phase is senior review, then separately admitted execution.

References: senior acceptance/handoff in Codex Audits, `2026-10-11 - PR 599 Source Integration Acceptance and Release Handoff.md`; private `source-integration-acceptance.json`; merged restoration review; prior geography application `customer-proof-plan.md` and `recovery.md`; repository database authority entry/playbook; Railway deployment guide. Earlier packets' SHA/window/runner-apply steps are historical and must not be replayed.

