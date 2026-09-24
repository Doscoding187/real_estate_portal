# First-cohort lead custody recovery runbook

| Field | Record |
| --- | --- |
| Status | Local operating procedure for the first agency cohort. It supports internal CRM custody and explicitly platform-managed exceptions; it does not establish external email-provider reliability. |
| Related goal | [Goal 9 — notification, recovery, and operational handling](15-agency-journey-closure-goals.md#goal-9--complete-notification-recovery-and-operational-handling) |
| Operational surface | Super-admin [Ecosystem Overview](/admin/ecosystem), including the Property Listify operations queue and Lead Routing Audit. |
| Authority boundary | A super-admin may record a real manual contact or resolution only for an explicitly platform-managed primary custody obligation. This procedure does not authorize payment, entitlement, provider, deployment, credential, or database-recovery operations. |

## Scope and operating promise

A public agency-listing enquiry is accepted when the application atomically
persists the lead and its canonical primary custody obligation. For an agency
or assigned agent, that obligation is internal CRM custody; a later email alert
is optional notification and is not evidence that the prospect's enquiry was
received.

This procedure covers the exceptional queue where the current primary custody
is explicitly `platform_managed` with a `manual` recipient. The queue exists so
Property Listify operations can account for that prospect rather than silently
losing the enquiry. Customer-owned agent, agency, developer, and publisher
custody remains in its authorized CRM workspace and must not be completed via
the platform operations action.

The first cohort must not promise dependable external email alerts. A provider
outcome that is `unknown` is deliberately not retried automatically because a
previous process may already have caused delivery. Provider reconciliation,
provider credentials, worker supervision, and live external-email proof remain
protected-release work.

The scheduled one-shot lead worker prints redacted result/backlog counts and
exits with code 2 when an unknown or exhausted delivery remains. Its scheduled
run must be reviewed as an attention signal, including a platform-managed
manual-custody item; this exit never authorizes an automatic resend.

## Trigger and cadence

An assigned Property Listify operations owner checks `/admin/ecosystem` during
the agreed staffed operating period and after a reported delivery exception.
Act immediately when either surface shows a lead requiring attention:

- **Property Listify operations queue:** an explicitly platform-custodied
  buyer enquiry is awaiting action.
- **Lead Routing Audit:** the lead appears with
  `platform_custody_review`, `attention_required`, or another custody/routing
  issue.

The operating owner records the lead identifier and a sanitized outcome in the
normal operational record. Do not copy prospect contact details into this
repository or a public release record.

## Recovery procedure

1. Sign in as a super-admin and open `/admin/ecosystem`. Refresh the Property
   Listify operations queue and Lead Routing Audit.
2. Inspect the lead's context, current recipient, and custody state. Confirm
   it is a current **platform-managed/manual** primary custody obligation with
   no assigned agent or agency. The operations action is intentionally rejected
   for customer-owned or historic/superseded custody.
3. Select the appropriate route.
   - If it is platform-managed/manual, contact the prospect using the approved
     operational process. Select **Mark contacted** only after real contact,
     or **Mark resolved** only after a factual resolution. Add a concise,
     factual note when it helps the next operator understand the outcome.
   - If a canonical agent, agency, developer, publisher, or other customer
     recipient owns the lead, do **not** mark it complete in the platform
     queue. Verify its authorized CRM route. A genuinely incorrect canonical
     route requires the separate super-admin routing-correction procedure and
     its own evidence; never invent a recipient from client input or display
     text.
   - If an external-provider outcome is ambiguous, do **not** resend or reset
     it. Preserve the `unknown` outcome and escalate it for separately
     authorized provider reconciliation.
4. Refresh the queue and audit after the action. A completed platform action
   must no longer appear as an outstanding platform-custody item or a
   `platform_custody_review` attention item.
5. If the browser retries the same **Mark contacted** or **Mark resolved**
   action, the system treats that exact action as idempotent: it preserves the
   existing completion rather than adding a second delivery completion or CRM
   activity. Do not choose a different action merely to clear a transient UI
   error; refresh and verify the state first.

## Evidence and escalation

For every completed platform action, retain the operational lead identifier,
action, acting super-admin, timestamp, concise factual note, and before/after
queue state in the authorized operational record. The application also writes a
completed delivery attempt and a lead activity inside the same transaction; a
repeat of the exact action preserves that single audit activity.

Escalate without mutating the delivery when:

- the lead is not explicitly platform-managed/manual;
- membership, ownership, or routing cannot be resolved from canonical data;
- the provider outcome is unknown or an external alert is part of a proposed
  customer promise; or
- the queue/audit does not clear after a completed action.

Do not reset, recreate, or manually alter delivery rows. Do not change provider
settings, credentials, payment state, entitlement state, deployment state, or
protected database targets as part of this procedure.

## Local acceptance evidence and limit

On 2026-09-14, task-branch commit
[`f9086ef4`](https://github.com/Doscoding187/real_estate_portal/commit/f9086ef4ee3a6fa664256a9dbebedd7e1fd9ce28)
ran `server/__tests__/integration.lead-delivery-authority.test.ts` on the
worktree-owned disposable database target. The test deliberately interrupted a
worker, observed the lead in both the audit and platform queue, completed it
through the super-admin route, replayed the same action, and confirmed one
completed custody record and one CRM activity before the lead disappeared from
both attention surfaces.

This is exact-target local evidence for the internal custody and manual
operations fallback. It is not hosted, production, provider, or end-to-end
first-customer evidence and does not authorize a paid launch.
