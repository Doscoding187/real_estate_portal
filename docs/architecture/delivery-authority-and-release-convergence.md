# Delivery Authority and Release Convergence

Status: active repository authority for normal code delivery, local acceptance,
and production-convergence investigations.

This contract operationalizes the source-of-truth hierarchy for work performed
after it is merged. Historical launch-readiness audits remain evidence of their
recorded dates; they do not turn an old worktree, dashboard state, or dated
statement into current delivery authority.

## Decision

Property Listify has one normal code-promotion path:

`feature worktree → reviewed pull request → GitHub main → exact-SHA provider deployment`

There is no permanent release branch and no independent local-main authority.
The remote-tracking `origin/main` reference is the approved code source after a
pull request is merged. A local `main` worktree and the local integration
preview must mirror it; neither may accumulate independent commits or edits.

## Authority map

| Surface                       | What it is for                                                | Authority condition                                               | It must not become                                                      |
| ----------------------------- | ------------------------------------------------------------- | ----------------------------------------------------------------- | ----------------------------------------------------------------------- |
| Feature worktree              | Build and test one bounded change                             | Its branch SHA is a review candidate only                         | A deployment source or a substitute for `main`                          |
| Pull request                  | Review, required checks, and controlled promotion             | Its accepted head is merged through GitHub controls               | Proof that a provider deployed without provider evidence                |
| GitHub `main` / `origin/main` | Approved production code source                               | Exact merged SHA                                                  | A place for direct edits, commits, or ad-hoc conflict resolution        |
| Local control `main`          | Clean local mirror for repository control and synchronization | Exact `origin/main` SHA after an owner-authorized fast-forward    | A separate source authority                                             |
| Local integration preview     | Full-product local acceptance of approved code                | Clean, documented preview worktree at the exact `origin/main` SHA | A drifting branch, a direct-edit location, or a second code authority   |
| Vercel / Railway deployment   | Hosted frontend/backend runtime artifact                      | Provider shows the exact source SHA and the target is healthy     | Proof of source, configuration, data, or health by a deploy badge alone |
| Hosted configuration and data | Inputs that shape an artifact or its runtime behavior         | Explicit provider/configuration and governed database evidence    | Assumed parity merely because code SHAs match                           |

The integration preview currently uses the `preview/integration-local` branch.
If its branch or location changes, record the replacement before treating it as
the integration preview. It remains a mirror: not a second code authority or a
second promotion path.

## Local preview model

Two local previews serve different purposes:

1. A **feature preview** runs a feature worktree so the bounded candidate can
   be developed and reviewed before its pull request merges. It is not the
   whole-product truth.
2. The **integration preview** runs the clean `origin/main` mirror so Edward
   can inspect what approved code says the full product should do locally. It
   is the local acceptance truth only for that exact commit and its declared
   local environment.

If several unmerged changes need joint acceptance, use a separately approved,
short-lived exact-SHA candidate. Do not turn the integration preview into a
permanent candidate branch or silently merge feature work into it.

## Required convergence record

When a task mentions a release, deployed behaviour, a local/live discrepancy,
or asks which state is "truth", establish and report this record before making
a conclusion:

| Evidence            | Required statement                                                                                                                        |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| Approved source     | Fresh `origin/main` SHA and the time it was checked                                                                                       |
| Local control       | `main` SHA, clean/dirty state, and whether it exactly matches `origin/main`                                                               |
| Integration preview | Worktree/branch, SHA, clean/dirty state, and whether it exactly matches `origin/main`                                                     |
| Candidate, if any   | Feature or short-lived candidate SHA and explicit status as unmerged/merged                                                               |
| Vercel              | Deployment source SHA, environment, build/configuration limitation, and smoke result when frontend behaviour is relevant                  |
| Railway             | Deployment source SHA, environment, runtime health/version or API result, and configuration limitation when backend behaviour is relevant |
| Classification      | `converged`, `code divergence`, `build-time configuration divergence`, `runtime/data divergence`, or `unknown`                            |

An uninspected provider state is **unknown**, not presumed synchronized. A
successful build or "Active" deployment status does not prove that a process
is listening, an API is healthy, or its configuration is correct.

## Synchronization and promotion rules

1. Create and change code in one dedicated feature worktree. Run appropriate
   focused validation there.
2. Push the feature branch and open a pull request only when the owner asks.
   A push does not alter `main` or production.
3. Merge through the protected GitHub pull-request path only when authorized.
   The merged `origin/main` SHA becomes the approved code source.
4. After an owner-requested merge/synchronization, fast-forward the clean local
   control `main` and integration-preview mirror to that exact SHA. Do not
   merge, rebase, reset, repair, or resolve conflicts in either control
   worktree; report a blocker instead.
5. Let the configured providers deploy from `main`, or request a deployment
   when a provider needs one. Verify the resulting Vercel and Railway artifacts
   against the exact approved SHA and appropriate health/smoke evidence.
6. Record the final convergence state and its limitations. If anything differs,
   investigate the classified layer before calling the release complete.

No agent may push, open a pull request, merge, change hosted variables,
redeploy, or mutate a database merely because the preceding technical step
passed. Each is a separately authorized external action.

## Configuration, runtime, and data boundaries

The same commit can legitimately render or behave differently across local and
hosted environments. Diagnose the layer instead of guessing:

| Observation                                                            | First investigation                                                                                                                                                      |
| ---------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Frontend feature is present locally but absent on Vercel               | Compare exact deployed SHA, then Vercel build-time public configuration; public `VITE_*` values are bundled at build time and require a fresh deployment after a change. |
| Frontend and backend have matching source SHA but an API request fails | Verify Railway runtime startup and API health; an Active deployment may still be unhealthy.                                                                              |
| API is healthy but content differs or is absent                        | Separate code/runtime evidence from the governed database/data investigation. Do not make manual database changes.                                                       |
| Local preview differs from a feature preview                           | Identify their distinct branch SHAs and local environment state before changing either.                                                                                  |

For database-bearing investigation or work, the Database Authority rules in
`AGENTS.md` remain mandatory. This contract never authorizes a direct TiDB,
Railway, Vercel, or production-data action.

## Agent behavior and handoff

An agent must say which layer it has verified and what remains unknown. It must
not describe a local screen as production, a branch as `main`, or a provider
deployment as healthy without the corresponding evidence.

At the end of a delivery-related task, return a concise convergence snapshot:

```text
Approved source: <origin/main SHA, checked time>
Local control / integration preview: <SHA + clean state for each>
Vercel: <SHA + health/config limitation, or unknown>
Railway: <SHA + health/config limitation, or unknown>
Verdict: <converged or exact divergence classification>
Next authorized action: <none, investigation, push/PR, merge, redeploy, or other owner decision>
```

This is a repository-owned operating contract. It guides agents working in
this repository through `AGENTS.md`; it does not create cross-project memory,
background automation, credentials, or authority over a chat that is not
operating in this repository.
