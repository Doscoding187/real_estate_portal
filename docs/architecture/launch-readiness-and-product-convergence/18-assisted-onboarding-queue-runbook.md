# Assisted onboarding request queue runbook

| Field | Record |
| --- | --- |
| Status | **Local implementation complete; operational owner and launch disclosures still required.** |
| Related finding | [LRC-SUPPORT-001](03-launch-register.md#lrc-support-001) |
| Related product boundary | [Agency Journey Closure Goals](15-agency-journey-closure-goals.md) |
| Source commit | [`144e90d1531d2e85a407e5dabecfb4124c8394bf`](https://github.com/Doscoding187/real_estate_portal/commit/144e90d1531d2e85a407e5dabecfb4124c8394bf) |
| Intended cohort | Controlled **pre-payment** onboarding only |
| Database target | Task-owned disposable-worktree target; no schema or migration change |

## Purpose and boundary

The public contact paths now provide a bounded, persisted handoff for a person
who needs help entering or continuing the Property Listify onboarding pipeline.
The implementation reuses the canonical `platform_team_registrations` queue;
it does not create a new ticketing schema or support platform.

The request can record contact and onboarding context for one of these existing
areas:

- Agent account or profile access (`agent`)
- Agency workspace or team access (`agency_operations`)
- Developer organisation or team access (`developer_operations`)
- Another onboarding or platform question (`other`)

The form deliberately does not offer the Distribution-manager area. That area
remains an invitation/provisioning workflow with its existing account and
identity requirements.

Submitting a request creates only a pending queue row. It does not:

- create or alter a user account;
- create, remove, or suspend an organisation membership;
- change a role or workspace permission;
- assign lead custody;
- activate a commercial entitlement or payment;
- publish inventory or make a listing public; or
- promise a response time, delivery channel, or emergency response.

The page warns the requester not to place passwords, payment or banking data,
identity documents, or another person’s lead information in the free-text
message. The queue is an intake record, not a secure document exchange.

## Customer paths

These routes render the same assisted-request page:

- `/contact`
- `/company/contact`

Existing support handoffs preserve their context in the query string:

- Agent account/access: `/contact?area=agent&topic=account-access`
- Agency workspace: `/contact?area=agency_operations&topic=agency-workspace`
- Developer team access: `/contact?area=developer_operations&topic=team-access`

The page displays a reference number after the server accepts the request. The
confirmation says that the request is stored for authorised review and that no
membership, permission, publishing, or payment action follows from submission.

## Authorised operator path

The queue is available to a super-admin in the Distribution Managers module:

`/admin/distribution/distribution-managers`

The queue loads all `platform_team_registrations` rows so that assisted
onboarding requests cannot disappear behind a manager-only filter. Each row
shows its requested area and the submitted context.

For a pending non-manager request:

1. Read the contact and onboarding context.
2. Decide whether the request should be recorded as reviewed or closed.
3. Select **Mark reviewed** to record an `approved` queue status with a review
   note, or **Close request** to record `rejected` with a factual note.
4. Use an owner-approved external response process, if one exists, to contact
   the requester. The queue itself sends no response and does not establish
   that a person has been contacted.
5. If the requester needs an account, membership, role, or entitlement change,
   use that surface’s canonical invitation, approval, and commercial workflow
   after independently checking its authority. Do not treat a reviewed queue
   row as approval for any of those changes.

For a pending `distribution_manager` row, the existing **Approve and
provision**, **Resend invite**, and **Reject** controls remain available. Only
this explicit manager area can create or reactivate a Distribution identity in
this queue. A manager approval still requires the invited email to have a user
account, as before.

The server enforces the same distinction. A non-manager approval returns
`reviewOutcome: reviewed`, leaves `userId` null, and performs no identity
insert. A manager approval returns `reviewOutcome: provisioned` only after the
existing account and identity checks succeed. A missing manager account remains
a `PRECONDITION_FAILED` result and leaves the pending row unchanged.

## Operational prerequisites before external onboarding

The code change makes intake durable and reviewable; it does not supply the
human operation that the launch promise requires. Before inviting real outside
stakeholders, the owner must record all of the following in the launch
decision:

1. A named person or team responsible for checking the queue.
2. A check cadence and an escalation owner for unanswered or sensitive cases.
3. An approved reply channel and its verified, monitored destination.
4. The information that may be sent through that channel and the approved
   handling path for account or membership changes.
5. Final launch-specific Terms and Privacy content, including the operator
   identity, contact details, data use, retention, and user-request process.

Those values are intentionally not invented here. The repository currently
contains no validated general support destination and its Terms and Privacy
pages still contain placeholder/drafting content. Until the owner supplies and
accepts these inputs, LRC-SUPPORT-001 remains a launch blocker. A persisted
queue is useful local infrastructure, but it is not evidence of monitoring or
legal readiness.

## Data and security handling

- Keep queue notes limited to the minimum onboarding context.
- Do not paste credentials, financial instruments, identity documents, or
  third-party lead data into the queue.
- Do not use the queue to bypass canonical membership transitions or
  publication/entitlement checks.
- Do not edit rows directly in SQL, reset the target, or use the queue as a
  migration or recovery mechanism.
- A duplicate pending submission for the same normalized email is rejected by
  the existing server-side conflict rule.
- A reviewed non-manager row is an audit record only; it is not a user,
  membership, role, lead, payment, or entitlement record.

## Evidence and limits

The implementation and focused regressions were run on the exact task-owned
worktree. Evidence includes:

- `server/__tests__/distribution-assisted-onboarding-review.test.ts`: three
  tests covering review-only non-manager handling, fail-closed manager
  provisioning without an account, and public submission preserving its area
  without an authority mutation;
- `client/src/pages/AssistedOnboardingRequestPage.test.tsx`: two tests covering
  contextual submission/confirmation and fail-closed query-area handling;
- the existing SettingsPanel and Agent/Agency journey tests, updated to verify
  contextual support handoffs;
- authority-wrapped server execution: **2 files / 8 tests passed**;
- explicit client execution: **4 files / 8 tests passed**;
- database-authority static suite: **35 files / 293 tests passed**;
- `pnpm check`: passed;
- `pnpm build`: passed; and
- targeted ESLint with no errors and `git diff --check`: passed.

The target remained a connected, exact-worktree-owned disposable target at
migration head `0090_retire_disconnected_boost_campaigns.sql`, with no
incomplete attempts. This is local source and execution evidence only. It does
not prove hosted behavior, operator staffing, external message delivery,
finalised legal content, production configuration, or a paid launch.

## Protected-operation boundary

No Azure, TiDB, staging, production, provider, secret, grant, deployment,
payment, entitlement, migration, recovery, or cutover operation is included in
this runbook. Any future protected release requires its own exact-target plan,
approval, acknowledgement, and independent verification.
