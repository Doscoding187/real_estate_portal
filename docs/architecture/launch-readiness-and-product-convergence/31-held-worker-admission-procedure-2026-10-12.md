# Held worker admission — one-shot inspection

Status: source implementation and controlled release preparation. No worker
deployment, protected connection, queue mutation or delivery is approved by
this document. B08/B10/B16 remain open; B01–B07 and B12 retain acceptance.

## Why this command is needed

The normal email worker consumes events and sends due deliveries as soon as it
starts. The lead worker also recovers claims and processes a batch immediately.
Neither command is a read-only admission check. Both production services are
currently held without deployments, on an older source pin. Starting either
normal command before inspecting the queue can act on unreviewed work.

`pnpm launch:worker-admission` uses the same canonical `worker-connect`
authorization and runtime pool factory as the workers. It resolves authority
once, requires the existing protected operation/fingerprint approval, leases
one connection, reads session identity/TLS/UTC and exact worker grants, tests
two zero-row read denials, and reports aggregate email/lead queue states.
It releases the connection and awaits pool shutdown on success or failure.
It imports no provider or business dispatch services and performs no event
consumption, recovery, claim, application DML, DDL, grants or email delivery.
The connection factory's normal UTC session configuration remains in use.

The expected role is `propertylistify_job_worker` with the canonical 16-table
worker allow-list. A table-not-found, authentication failure or timeout is not
accepted as a permission-denial result. Both the migration ledger and private
payment-document reads must return MySQL table-access denial 1142. Exact grant
comparison rejects broad privileges, roles, grant options and unexpected
objects before queue inspection. No additional grant is requested.

## Concrete execution scope

Use the existing project `8cdd7515-ddd2-4252-bbee-df5a5c209d4b`, Production
`63070d99-357a-40ba-99c3-6d1368f61652`, target fingerprint
`b23d640cdf242812e80a28d10bc4079a3ff0b48a05173a392b9af47853495ced`.
The schema/reference release remains head0111 / 16,944 approved Places; this
operation does not reinstall, migrate, seed or change it.

| Service | Exact ID | Temporary admission process | Held final command |
| --- | --- | --- | --- |
| Email | `59c0d8f8-abe2-4696-ad9c-de1037723b66` | Admission command, restart NEVER, no cron, one replica | `pnpm email:supervisor`, ALWAYS; deployment held |
| Lead | `e1e32aa8-0b85-4c91-af18-843f1bc52d9f` | Admission command, restart NEVER, no cron, one replica | `pnpm lead-delivery:worker`, NEVER; cron and deployment held |

No new service, bucket, database, network range or paid resource is proposed.
Inspect effective credentials, strict TLS and per-service egress/network
admission privately; variable names do not prove values or successful access.
Stop if the worker identity differs or the connection requires a new firewall
range. Any network change requires its own exact reviewed scope.

1. Merge the reviewed command after required checks pass. Record the exact
   accepted main SHA/tree. Do not deploy the pre-command integration base
   `46d4d05da014c2837741fb0317b1d5c8318afd03` as if it contains this command.
2. Complete a private execution manifest with that source, both service IDs,
   fingerprint, `worker-connect` approval, attended UTC window, incident owner,
   permitted effects (read-only admission), provider operation details and
   containment. This plan does not start or renew an execution window.
3. Read effective provider configuration and unrelated staged work. Patch
   `398fb997-eeee-4b51-904e-6d4c01fd0aed` belongs to another workstream. Do not
   accept, modify, discard or consume it. Validate that the chosen per-service
   configuration/deployment operation leaves that patch untouched; stop if the
   provider cannot isolate it.
4. Obtain the exact scoped release/connection approval required by the
   [database entry contract](../../database-authority/00-database-authority-agent-entry.md#operation-rules)
   and [shared closure packet](30-shared-hosted-closure-packet-2026-10-12.md#5-ordered-shared-hosted-exercise).
   Prior Agency verification/recovery/setup windows are completed and cannot
   authorize this operation. Source/CI acceptance does not lift worker holds.
5. Configure and deploy one service at a time on the accepted source with the
   temporary admission command and NEVER restart. No API healthcheck, frontend
   serving, scheduler or recurring cron belongs on this one-shot process.
6. Supply full expected source, target and provider IDs as arguments, plus an
   exact UTC deadline within 30 minutes. The command checks the window before
   connecting and between reads; each inspection query has a ten-second driver
   timeout. A failed read has no automatic retry. Keep execution and logs in
   the protected evidence directory.
7. Record deployment-effective source/settings, instance/result, aggregate
   queues, actual identity/TLS/grant digest/denials and per-service network
   evidence. Process completion and `deliveryAuthorized:false` are required.
8. Stop/remove any remaining admission deployment, restore the held command
   and restart policy without deploying it, and independently verify no active
   worker instance, no cron and no change to the unrelated staged patch.
   Close the manifest/window. Public maintenance, paid closure and production
   automatic-deployment holds remain in force throughout.

Example command structure (replace source and deadline from the approved
manifest; these placeholders are deliberately not executable release inputs):

```text
pnpm launch:worker-admission --sha=<accepted-main-sha>
  --fingerprint=b23d640cdf242812e80a28d10bc4079a3ff0b48a05173a392b9af47853495ced
  --project-id=8cdd7515-ddd2-4252-bbee-df5a5c209d4b
  --environment-id=63070d99-357a-40ba-99c3-6d1368f61652
  --service-id=<exact-email-or-lead-service-id>
  --expires-at=<approved-UTC-deadline>
```

## Interpretation and next boundary

An `ok:true` result proves only the recorded service's worker connection,
session, privilege/read-denial boundaries and aggregate queue inspection.
It never authorizes delivery, even if both queues are empty. Nonzero rows need
private source/owner/recipient reconciliation before a separately bounded
normal worker run; ambiguous outcomes must never be blindly resent.

This evidence advances B08 service admission and B16 process admission. Actual
event consumption, recipient lookup, provider acceptance, independent mailbox
delivery, restart/retry/dedup and lead execution remain B10/B13 hosted work.
Email ALWAYS supervision and lead NEVER/five-minute cron must be verified from
the eventual normal deployment, not inferred from this temporary process.
The already completed Agency inbox/recovery/business setup and Agent
geography/draft/image evidence are reused, not rerun.
