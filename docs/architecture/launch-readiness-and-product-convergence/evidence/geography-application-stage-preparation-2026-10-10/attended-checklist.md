# Attended application release checklist — senior execution only

Preparation status: NOT EXECUTED. The senior owns final review and all production operations. Check off with timestamped actual evidence; a prepared template is not a pass. The earlier reference authorization does not start an application release.

## Preflight while maintenance/writers remain held

1. Record the application's authorized scope/window, senior operator, target fingerprint, exact application SHA/tree and source/archive/frontend digests. Recheck `source-artifact.json`, existing exact-source CI and artifact expiry; reject moving main, older diagnostic artifacts and unreviewed source overlays. If public inputs change, rebuild with the pinned source and record new immutable digests.
2. Refresh exact project/environment/service IDs, running/deployment state, staged changes, automatic deploy triggers, build hooks, worker schedules and all effective config. No runner is needed or proposed. Keep API/email/lead offline; leave Redis available. Confirm maintenance on all production/provider aliases from the completed freeze packet, using body/status evidence; do not interpret HTTP 403 alone as complete route containment. Current three-origin GET hashes in `maintenance-readback.json` are supporting observations.
3. Review the whole configuration diff. Bind DB fingerprint `b23d640cdf242812e80a28d10bc4079a3ff0b48a05173a392b9af47853495ced`, API runtime identity, workers' worker identities and Redis; record variable names/digests privately. `DATABASE_MIGRATION_URL` must not be a persistent app variable. No grant/credential/firewall changes are part of this packet.
4. In the approved service environment, run only static `pnpm --silent hosted:preflight` from exact source with the planned `BUILD_SHA`. Preserve sanitized JSON and exit. It opens no dependencies. Inspect effective predeploy hooks: no migration, seed, reference apply or admission command. Do not run `release:predeploy:production` as a generic build hook; it is a separate protected read-only workflow, not deployment startup.
5. Reconcile existing accepted schema/reference evidence and, within the senior's existing read-only protected inspection authority, refresh head 0111, no pending/incomplete attempts, structural/CHECK congruency, reference counts/digests and zero pending reference rows. Use canonical verifiers and inspector identity; never run an apply, seed or fallback because an application prerequisite fails. Preserve connection-closed evidence.
6. Resolve final frontend public inputs and project delivery settings. Review supplemental journey manifest and CDN/Maps behavior; do not silently change other domains/journeys. `dist/public` alone is not Vercel `--prebuilt` output. Preserve manual exact-source provenance and all aliases/maintenance; no implicit main deployment.

## Application operations inside the authorized window

7. The senior admits compatible API execution at pinned source. API startup may run the commercial-term scheduler; this is the writer transition. Capture deployment/artifact/source and effective config. Keep email/lead/cron held initially. Build success or liveness alone is insufficient.
8. From the approved attended access path, capture `/api/version`, `/api/health`, `/api/readiness`. Require production and exact SHA, the accepted DB fingerprint, `applicationReady=true`, required-data/target/head/attempt readiness, Redis-backed cache/auth/public-lead rate limits, media configuration and fresh successful term scheduler. The natural-shutdown fix must be present. Stop on blocked/stale/mismatched readiness; do not open an alternate old writer.
9. Review worker backlog, intended recipients/claims, provider behavior and enabled scope before any worker start. Email supervisor consumes/sends immediately; lead executes immediately on start. Keep paid sales paused and saved-search scheduler disabled. Bind worker source/version/config in provider/log evidence; there is no invented HTTP worker version endpoint. Enable lead scheduling only after an explicit senior scheduling decision and effective config readback. Preserve unknown/exhausted/retry outcomes; never rerun unknown delivery as a fresh attempt.
10. Admit matching frontend delivery with reviewed production public environment. Capture deployment ID, source SHA, artifact digest, `/version.json`, effective aliases and relevant browser build/version. Maintain containment until the senior's evidence/reopening decision.
11. Run the existing joined probe from pinned application source with these nonsecret inputs. Set `LAUNCH_PROBE_RELEASE_ID` to the existing reviewed release ID from `/api/version` and the commercial configuration; use `none` only if that reviewed value is null. Do not invent or activate a paid release to pass it.

```sh
LAUNCH_PROBE_FRONTEND_URL=https://www.propertylistifysa.co.za \
LAUNCH_PROBE_API_URL=https://api.propertylistifysa.co.za \
LAUNCH_PROBE_FRONTEND_SHA=57ea5f5e98ff031a4d0f0814998e60fe27a82b2b \
LAUNCH_PROBE_API_SHA=57ea5f5e98ff031a4d0f0814998e60fe27a82b2b \
LAUNCH_PROBE_TARGET_FINGERPRINT=b23d640cdf242812e80a28d10bc4079a3ff0b48a05173a392b9af47853495ced \
LAUNCH_PROBE_ENV=production \
pnpm --silent launch:probe
```

This read-only probe reaches the actual public origins; if maintenance blocks it, record that fact and use the senior's approved attended route arrangement. It does not authorize a firewall change or a public reopening. Its successful output still does not prove the private customer/media journey or search capacity.

12. Execute the bounded private draft/image proof and approved hosted search measurement plan. Capture sanitized references to private evidence and real outcome/time/resource metrics. Never run the local national synthetic-fixture tests against production. No publication/payment/pending-organisation change to unblock proof.
13. Review all actual results once. Failed thresholds, missing positive inventory or incomplete media proof remain visible. The senior decides whether controlled unpaid access may reopen; readiness or a successful migration/load cannot decide that automatically. Senior alone submits management acceptance. If any start/probe fails, use `recovery.md` and retain schema/reference data.
