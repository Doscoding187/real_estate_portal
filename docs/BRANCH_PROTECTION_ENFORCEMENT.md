# Branch Protection Enforcement

## Objective
Convert dominance validation from guidance into mandatory merge gates.

## Target Branch
- `main`

## Required Settings
In GitHub repository settings -> Branches -> Add branch protection rule:

1. Require a pull request before merging: enabled
2. Require approvals:
   - minimum 1 approval (baseline)
   - high-risk PRs require 2 approvals (team policy; enforced via reviewer assignment + PR template)
3. Dismiss stale approvals when new commits are pushed: enabled
4. Require status checks to pass before merging: enabled
5. Required checks:
   - `pnpm check`
   - `Dominance Validation Pipeline`
6. Require branches to be up to date before merging: enabled
7. Restrict who can push to matching branches: enabled (maintainers only)
8. Do not allow bypassing the above settings: enabled
9. Disallow force pushes: enabled
10. Disallow deletions: enabled

## Risk Policy Overlay
- `Low`: 1 approval
- `Medium`: 1 approval from relevant layer owner
- `High`: 2 approvals including revenue/platform owner

Risk is declared in `.github/pull_request_template.md`.

## Go / No-Go Merge Rule
Merge only if:
- required checks are green
- no critical failures in `test-results/dominance/validation-report.json`
- no reconciliation drift beyond tolerance in `test-results/dominance/reconciliation-report.json`
- no load SLO breach in `test-results/dominance/load-report.json` for affected PRs

No exception path outside emergency process.

## Emergency Process (Production Incident Only)
- Use temporary admin override with incident ticket reference.
- Open post-incident hardening PR within 24 hours.
- Record root cause and corrective action in dominance audit trail.

## Dominance Audit Trail
- Control-plane changes must be written to `dominance_audit_log`:
  - pricing floor changes
  - cap and pacing logic changes
  - ranking weight changes
- Every entry must include:
  - actor identity
  - approver identity
  - before and after state
  - validation status at change time (`passed`, `failed`, `not_run`, `unknown`)
