# B16 current-main delta review preparation — 2026-10-16

**Status: focused lead-lifecycle and enquiry review complete; bounded transition
correction and regression coverage prepared in the task worktree. B16 remains OPEN.**
This packet identifies the exact current integration head and the main changes
since the last recorded B16 convergence point. The focused review and local
correction are not an independent whole-delta review, CI result, deployment
approval, hosted acceptance, or paid GO.

## Exact source and review boundary

| Item | Value |
| --- | --- |
| Integration source | `main`, equal to `origin/main` when inventoried |
| Candidate SHA | `d3a1a8cb33f9ef35d961636183f08fffe137810d` |
| Candidate tree | `d7c5ead7f07cc5f9dd7a33e2ee8a0e635e0fa9b3` |
| Prior recorded B16 convergence point | `4b5ef13255bf5b54ee92eec27969042fa4310f7c` (tree `02bdcb863e7442392b3ba9d5db1d573b82d64288`) |
| Delta size from that point | 1,359 changed paths; 1,043,178 insertions and 12,559 deletions |
| Changes since the prior packet candidate | 141 changed paths; 10,786 insertions and 2,441 deletions, merged in PR #611 |
| Local B13 worker correction | `7000c0432a8019823d9351ae22115996ccef93f5`, included in candidate ancestry |
| B13 unknown/exhausted attention exit | `e43ea6af5`, included in candidate ancestry |

The large delta includes substantial geography data and code, plus product
surfaces outside the paid MVP. This inventory does not establish that the full
delta is reviewed or safe. B16 requires an independent reviewer to examine the
current exact source, its paid-MVP impact and regression boundaries before the
candidate is treated as release-ready.

## Main changes requiring scope reconciliation

The first-parent history from the prior convergence point includes the
following launch-relevant groups. These labels identify review areas; they are
not acceptance results.

| Change group | Included main changes | Gate relationship and remaining limit |
| --- | --- | --- |
| Runtime, release and worker admission | PRs #585–#588, #596–#598, #601 and #604–#606 | Review current API/runtime controls, worker source and admission behavior against B08/B10/B12/B13/B17. The shared-closure publisher-worker correction is integrated, but Railway service admission, effective settings, cron and hosted outcomes remain open. |
| Owner, identity and private-draft paths | PRs #590–#593, #599–#600 and #603 | Check regressions against accepted B04–B07 and the approved private-draft evidence. This packet does not repeat hosted identity, storage or customer-journey acceptance. |
| Legal copy and finance notice paths | PRs #608–#610 | Relate exact source and rendering to B01/B14/B15/B18. Local/decision work is recorded as complete within its scope; exact hosted copy and customer acceptance remain open. |
| Geography and search | PRs #594–#595, #612–#613, including canonical Place work | Paid launch scope excludes Land launch and Explore expansion. Review only required paid-listing interactions and protected public classification boundaries; do not reopen accepted geography decisions or imply broader geography launch. |
| Services V1 | PR #607 | Explicitly excluded from the paid MVP launch scope. Keep it outside the launch candidate unless a separate scope decision is recorded. |
| Agent, Agency and enquiry-workspace journeys | PR #611, merged at candidate SHA `d3a1a8cb3` | Includes the previously separate CRM lifecycle reporting branch, follow-up/viewing timeline work, Agency lead board, Agent microsite changes, and a required phone field on public Agent enquiries. These are user-journey changes, not B13 hosted delivery evidence. Review exact-head role/scope and paid-journey regressions; keep hosted custody and recipient delivery open. |

The remaining main delta must still be reviewed at the file and behavior level.
The table is a handoff index, not a substitute for that review.

## Branch-to-gate triage

- The current launch register records B01–B07 and B12 as accepted within scope.
  Keep those decisions unless the exact-head review finds a concrete regression.
- B13's worker attention exit and publisher-dispatch database propagation are
  already integrated. The register still requires hosted cron, correct-recipient
  custody, retry/backlog and operator-follow-up proof. The checked-in
  `railway.lead-job.json` is a legacy settings fragment; deployment guidance
  says not to use it as Railway Config as Code. It is not proof that a hosted
  cron exists or is enabled.
- CRM lifecycle reporting (original branch head
  `835b9bb27e05801d1bf0a2b3775e4e115f18a429`) is now included through PR #611.
  It improves Agent/Agency lifecycle reporting and includes server query
  changes. It may improve follow-up usability, but it does not satisfy B13's
  hosted delivery and supervised-recovery evidence.
- The public Agent enquiry phone requirement is also included through PR #611.
  Review its input validation and affected paid enquiry journeys at the exact
  candidate; the B13 register does not treat a phone requirement as hosted
  custody or delivery proof.
- B08/B09/B10/B11/B13/B14/B15/B17/B18 retain the provider, owner, storage,
  hosted-exercise, recovery or final-decision evidence recorded in the current
  launch register and shared hosted-closure packet. Local code changes cannot
  manufacture those observations.

## Focused PR #611 review finding

The Agent lead status mutation checked the durable offer-readiness checklist,
but the Agent board's separate stage-move mutation and the Agency status
mutation did not. An assigned Agent could therefore enter Offer or Converted
through one of those routes while the Agent endpoint rejected the same
transition.

The task worktree extracts the checklist lookup into a shared service and
applies it to Agent status changes, the Agent board, Agency status changes,
offer-version submission and acceptance. Opening a draft deal no longer marks
the lead as `offer_sent` or fabricates a contact timestamp. The lead enters
`offer_sent` when an offer is submitted, after the locked lead record passes
the shared readiness and lifecycle checks. Draft offer versions cannot be
accepted directly. Moving a valid `offer_sent` lead to Won does not ask the
user to repeat readiness checks that were required to submit the offer.

The task worktree adds integration coverage for these paths and unit coverage
for the shared guard. Type checking and the non-database unit tests passed. The
database-backed integration tests remain unrun because the worktree's
authority-resolved disposable database service is unavailable. The correction
is uncommitted and B16 remains open.

## No-spend work and handoff

The useful no-Railway work is to complete B16's exact-head source review and
required source checks on the candidate selected by the release owner. The
working correction is on branch
`fix/agent-offer-readiness-cross-surface-20261016` at the candidate parent
`d3a1a8cb3`; it is not yet a new commit. Preserve
the current service/trigger holds until the exact controlled release procedure
is authorized. Reuse the ordered H0–H10 exercise in
[the shared hosted-closure packet](../30-shared-hosted-closure-packet-2026-10-12.md)
when access returns; do not create another worker, storage, or provider setup
plan.

Before B16 can be submitted for acceptance, the independent reviewer must:

1. Review the complete delta from the accepted source baseline to the selected
   exact candidate and record paid-MVP impact, excluded changes, and any
   required corrections.
2. Verify the required CI results and artifact identity at that exact head.
3. Reconcile current deployment triggers and the candidate's intended service
   tuple under the controlled release process.
4. Record the remaining hosted holds without marking them closed by source
   review alone.

## Limits of this preparation

`pnpm check` passed. Focused readiness and lead-transition unit tests passed
(16 tests), and targeted ESLint completed with no errors; the legacy router and
integration files still report warnings. `pnpm db:authority:status` resolved
this worktree's disposable database target but reported the local database
service unreachable. The database-backed integration tests were not run, and
no database queries, seeds or migrations were applied. No GitHub check state,
Railway configuration, deployment trigger, provider, customer account or
external service was inspected or changed. No branch was merged and no gate
was accepted. The candidate and delta identities above are sufficient to
continue independent review, but they do not close B16.
