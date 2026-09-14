# Senior Product Architect Escalation Report

Date: 2026-09-14 (updated after senior direction and bounded support continuation)
Status: **RESOLVED FOR BOUNDED CONTINUATION**
Audience: senior product architect and launch coordination manager

This report records the agency journey closure evidence through Goals 1–10,
the Land containment work that followed, the verification error that paused the
work, the subsequent senior resolution, and the bounded assisted-onboarding
continuation. It is an escalation record. It is not a release approval, a
production-verification record, or permission to resume protected operations.

## Senior decision and resolution

Senior review approved the hard-deferred Land direction, found no database
recovery indication, and authorized two bounded corrections before continuation:

1. treat an active canonical Land link as authoritative regardless of the
   listing type label; and
2. map only a known Land-policy rejection to the generic-workflow precondition,
   while retaining unexpected lookup/database failures as internal operational
   errors with their diagnostic cause.

Commit `335838dff0c746b860eaaf2930412d4b38540db5` implements those corrections
and passed the final scoped checks recorded below. The accidental unscoped
Vitest invocation remains an uncredited tooling diagnostic, not evidence of a
database incident. No migration retry, database recovery, provider operation,
payment activation, entitlement activation, protected database operation,
deployment, cutover, merge, or push occurred.

## Source identity and authority

| Item | Recorded value |
| --- | --- |
| PR #577 merge SHA | `4e012b3044628fc06da7489c0055e9ce01bdc8d9` |
| PR #577 first parent | `c2158b5da27a4fde9e4329e276024e9ade570e4a` |
| PR #577 accepted head / second parent | `5260e2233c708139aa618322d32bb40753f7385a` |
| Accepted-head and merge tree | `24731de54ebc739546b550376fe456eaf9731135` |
| Closure source recorded by the prior packet | `c8c35fde44d00ff8b2ce83ca73fcb32dd522e9bc` |
| Task branch HEAD before paused Land edits | `34e66d2fe8b8602387a2f673368242c6dc14b078` |
| Land containment correction | `335838dff0c746b860eaaf2930412d4b38540db5` |
| Assisted-onboarding intake correction | `144e90d1531d2e85a407e5dabecfb4124c8394bf` |
| Current task branch source HEAD | `144e90d1531d2e85a407e5dabecfb4124c8394bf` |
| Branch | `verify/mvp-closure-post-577` |
| Task-owned worktree | `/home/edwardspc/Desktop/Dev/worktrees/property-listify-mvp-closure-post-577` |
| Disposable target fingerprint | `a560e9f2971e7676…` (full value remains in the local authority record) |
| Target class | `disposable-worktree` |
| Migration head | `0090_retire_disconnected_boost_campaigns.sql` |
| Database state before the pause | schema-congruent, target-connected, canonical foundation ready, no incomplete attempts |

The prior packet records the hosted post-merge checks:
[Post-merge CI Pipeline 34730845978](https://github.com/Doscoding187/real_estate_portal/actions/runs/34730845978)
and [Frontend Build Guard 34730845947](https://github.com/Doscoding187/real_estate_portal/actions/runs/34730845947).
Those runs apply to the merged revision, not the later task-branch edits.
The preserved MySQL Community 8.4.7 admission evidence remains limited to
isolated compatibility and bounded credential/constraint checks; it does not
prove Azure, TiDB, production grants, restoration, capacity, or customer
journeys.

## Agency journey evidence through Goal 10

The following statuses mean **verified on the task branch and exact disposable
target within the stated boundary**. They do not mean hosted or production
verified.

| Goal | Result | Evidence and material limit |
| --- | --- | --- |
| 1 — Trusted agency foundation | **VERIFIED locally** | `cf1f93e6` removed profile-supplied agency affiliation, required canonical membership, and covered owner setup, invitation, forged/absent/suspended membership, reassignment, and removal. The governed run passed 3 files / 14 tests, with supporting authority tests, typecheck, build, and database-authority checks. Hosted and production membership verification remain open. |
| 2 — Agency-member workspace authority | **VERIFIED locally** | `af9fd6f2` made current membership select the agency commercial owner and prevented an unnecessary individual billing path. Exact HTTP evidence covered invitation acceptance, pending activation preparation state, suspension/reinstatement, and stale-claim denial; supporting server/client checks passed. No payment or entitlement mutation was performed. |
| 3 — Agency commercial-entitlement authority | **VERIFIED locally** | `16a23cd9` made paid capability owner-scoped and fixed-term. Exact-target acceptance covered expiry, wrong/missing/malformed terms, agency projection, and the permitted Vitest-only finance fixture. The fixture is not a normal runtime activation and did not contact a provider. |
| 4 — Agency listing preparation | **VERIFIED locally** | `a403d31d` exercised the real invitation/listing/media routes. A member uploaded five local media objects, persisted canonical Gauteng/Johannesburg/Sandton geography, reopened and edited a private draft, and was denied by cross-tenant checks. Submission remained behind `subscription_required`; no public projection was created. |
| 5 — Submission, review, publication | **VERIFIED locally within an isolated enabled fixture** | `74bff0f9` plus `9acfea2f` covered submission, structured rejection, correction, resubmission, entitlement recheck, approval, projection, and media coherence. The 5-file / 59-test run passed using a task-local term; normal runtime payment activation and hosted publication remain unproven. |
| 6 — Public discovery | **VERIFIED locally** | `9acfea2f` proved canonical `suburb:<id>` search, exact geography, matching detail/media, private-before-approval absence, and rejection of mixed geography authority. Browser, hosted, and production discovery remain unproven. |
| 7 — Public enquiry and custody | **VERIFIED locally** | `c4df6600` exercised the real public route: one durable lead, canonical agency/agent ownership, stable replay, conflicting replay rejection, and unrelated-tenant denial. External notification delivery was not claimed. |
| 8 — Assigned-agent and agency CRM | **VERIFIED locally** | `c4df6600` proved existing-custody access after entitlement expiry, agent contact/stage/follow-up, agency oversight, reassignment, former-agent denial, replacement access, and preserved custody. It does not prove hosted customer operation. |
| 9 — Notification/recovery handling | **VERIFIED for the scoped internal fallback** | `f9086ef4` covered a deliberately interrupted platform-managed delivery, audit/queue visibility, authorized recovery, and replay-safe completion. The exact-target run passed 1 file / 9 tests with 5 supporting files / 32 tests. External mail reliability, worker supervision, and production recovery remain open. |
| 10 — Complete agency journey | **VERIFIED as one local operating slice** | `fbf592cc` exercised registration through verification, agency approval, canonical invitation, private media/geography draft, the permitted isolated finance fixture, reject/correct/resubmit/approve, public search/detail, enquiry/replay, CRM, expiry, and reassignment. The 1-file acceptance and 4-file companion run passed. It is not a paid-launch authorization. |

The complete source reasoning and individual verification records remain in the
[agency journey closure tracker](15-agency-journey-closure-goals.md) and the
[post-merge closure packet](../database-transition-and-launch/mvp-closure-report.md).

## Land finding and completed task-branch correction

The senior review identified an L0 containment defect: the dedicated Land
approval path could make Land public while commercial activation was false.
Navigation hiding alone did not contain direct routes or APIs. The Land
geography contract and the four central public classifications were to remain
unchanged.

The completed task-branch correction implements the following bounded disposition:

- an immutable shared policy marks Land `deferred_first_cohort` with
  `enabled: false`; there is no environment toggle or payment bypass;
- direct Land public search/detail and lead-custody reads return no records
  before a database connection is opened;
- Land authoring, evidence, submission, reviewer queue, and review transitions
  fail with a precondition response before state mutation;
- the generic listing lifecycle, revision, media-mirror refresh, approval
  queue, agency workspace, generic public projection, search, location
  analytics, similar-property, saved-search, sitemap, and discovery paths
  exclude Land or fail closed;
- stale public, authoring, and reviewer URLs render a no-query deferred page;
  stale client journey state does not forward Land geography or filters; and
- no schema, migration, Land geography, classification, payment, entitlement,
  provider, or protected setting was changed.

The correction was validated after the two senior-directed fixes:

- `pnpm test:authority --` on the 10 affected server files: **10 files / 144
  tests passed** on the exact task-owned target;
- explicit client configuration (`vitest.client.config.ts`) on 8 affected
  files: **8 files / 48 tests passed**;
- `pnpm test:db-authority:static`: **35 files / 293 tests passed**;
- `pnpm check` passed;
- targeted ESLint reported no errors; and
- `git diff --check` passed before commit.

These results are local evidence only. The Land correction is committed at
`335838dff0c746b860eaaf2930412d4b38540db5`, but hosted CI has not run on it and
it has no integrated or production verification. Land has no separate
commercial policy or acceptance slice, and it must remain outside the controlled
pre-payment onboarding cohort and public exposure until that work is authorized
and independently accepted. An isolated paid-entitlement fixture proves only
lifecycle behavior; it does not establish a live paid onboarding route.

## LRC-SUPPORT-001 bounded continuation

The senior direction permitted a bounded correction for the placeholder contact
path, while expressly prohibiting invented operator identity, contact details,
retention practices, or legal assurances. Commit
`144e90d1531d2e85a407e5dabecfb4124c8394bf` implements that correction without
changing any commercial, membership, payment, entitlement, or protected-system
authority.

`/contact` and `/company/contact` now create a persisted review-only request
in the existing `platform_team_registrations` queue. The public form is limited
to Agent, Agency, Developer, or Other onboarding context and returns a request
reference. It never offers the manager-provisioning area. The super-admin
queue now visibly separates non-manager requests from manager invitations:
reviewing the former records an audit decision only, and it neither requires an
account nor creates an identity. The existing manager flow remains account
gated and is the only branch that can provision a Distribution identity.

Focused local checks passed: authority-wrapped server tests **2 files / 8
tests**, client tests **4 files / 8 tests**, database-authority static tests
**35 files / 293 tests**, TypeScript check, production build, targeted ESLint,
and diff validation. The local target remained exact-worktree-owned,
schema-congruent at `0090`, and had no incomplete attempts.

This resolves the code-level placeholder handoff. It does not resolve the
operational or legal condition: no named queue owner, staffed cadence,
monitored reply channel, escalation procedure, or finalized Terms/Privacy
content is present in repository authority. The full operating boundary and
explicit prerequisite list are recorded in the
[assisted-onboarding queue runbook](18-assisted-onboarding-queue-runbook.md).
LRC-SUPPORT-001 therefore remains **in progress** and blocks external
real-world onboarding until those owner inputs are supplied and accepted.

## Verification error that caused the pause

### Primary observed error: an unscoped client command entered the full workspace

The intended check was a client-only run. The command used was equivalent to:

```text
pnpm test -- client/src/components/__tests__/EnhancedHero.journey-selection.test.tsx ...
```

At repository root, `pnpm test` invokes the root Vitest workspace declared by
`vitest.config.ts`. The command therefore started server and client projects,
rather than only the named client files. Because this invocation did not use
the database-authority wrapper and did not set `NODE_ENV=test`, server setup
reported:

```text
[Test Setup] DATABASE_URL: undefined
```

During that unintended server work, `exploreDiscoverySchema.test.ts` emitted:

```text
Table explore_content not found. Run migration first: TypeError: db.execute is not a function
⚠️  Failed to connect to database. Skipping schema tests.
```

Other database-gated integration cases were skipped for the same missing
configuration. The process was stopped after the unintended workspace run was
identified. It has no credited exit status and is **not** evidence that the
product database or schema is broken. No governed target was used and no data
mutation or protected operation occurred.

The scoped replacement command was then run explicitly:

```text
pnpm exec vitest run --config vitest.client.config.ts --reporter=basic <named client files>
```

It passed 8 files / 48 tests. That result is the only client result credited
for this checkpoint.

### Secondary diagnostic: test-double serialization warning

The same unintended workspace invocation also logged this warning from a
listing lifecycle mock:

```text
[Mock DB] Could not parse where condition: TypeError: Converting circular structure to JSON
```

The affected test passed. The message comes from a mock attempting to serialize
a Drizzle table object; it is a test-adapter diagnostic, not a production SQL
failure. It is recorded so the senior architect can decide whether the mock
should fail fast or avoid logging this misleading error.

### Resolved test-double drift during the Land correction

The first authority run after introducing the generic Land guard exposed that
two existing module mocks did not provide the new exported guard. Those mocks
were updated to preserve the production contract, and the targeted rerun passed
51 checks. This was test-double drift, not an authorization failure in the
application. It is included because it explains why an earlier broad result
could not be credited until the mocks were corrected.

## Classification and impact

| Question | Finding |
| --- | --- |
| Is a production customer or protected system affected? | No. The unintended run had no governed database target, no provider credentials, and no deployment access. |
| Is the `explore_content` schema proven missing in the canonical target? | No. The message came from an unscoped setup with no `DATABASE_URL`; the governed static and exact-target checks passed. |
| Is the client Land containment result invalidated? | No. The explicit client run and governed server runs passed. The accidental workspace run itself is discarded. |
| Is a release candidate available? | A task-branch source candidate exists through `144e90d1`; hosted CI, integration, named support operation, and protected-release evidence remain absent. |
| Does this require database recovery? | No evidence supports recovery. No migration was attempted, retried, or changed. |

The exception-mapping concern is resolved in `335838df`: only
`LandLaunchContainmentError` becomes `PRECONDITION_FAILED`; unexpected lookup
failures become `INTERNAL_SERVER_ERROR` with the original cause retained. The
focused contract test covers both branches.

## Approved continuation sequence

1. Keep the accidental unscoped-test result recorded as a discarded tooling
   diagnostic. Do not alter database state, add fallback SQL, or reopen Land
   code solely because of it.
2. Treat Land containment and the bounded `LRC-SUPPORT-001` intake as locally
   implemented. Preserve their remaining support/disclosure and integration
   blockers; do not invent an external operation or legal policy.
3. Reconcile references to a paid first cohort: the approved near-term journey
   is controlled pre-payment onboarding. The commercial gate remains intact;
   an isolated paid fixture is not a live activation path.
4. Escalate only missing real-world operating information, authority changes,
   protected operations, or a material lifecycle conflict.

## Protected-operation boundary and current worktree

The Land implementation (`335838df`) and assisted-onboarding intake
(`144e90d1`) are separate reviewable commits after Goal 10. The prior two
Stage 1 targets and their ownership records were preserved; the task-owned
disposable target was not reset, repaired, reused, or disposed.

No Azure/TiDB access, protected migration, migration-history edit, production
deployment, cutover, merge, feature push, secret/provider-setting change,
payment activation, entitlement activation, or recovery action occurred. Any
future protected operation requires its own explicit authorization and evidence
packet.
