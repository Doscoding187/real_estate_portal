# P4 senior review

Status: accepted for the exercised tenant and principal boundaries; broader
account and credential lifecycle coverage remains open for P9.

Reviewed the current P4 audit, the membership and principal-bootstrap call
paths, and the authority-run physical evidence on the task-owned disposable
target.

The canonical boundary is `users.agencyId` plus the
`agency_agent_memberships` lifecycle row. Membership activation is serialized
by the unique `(agency_id, agent_id)` authority and effective windows are
half-open. Listing and lead readers require the authenticated agency scope;
agent attribution also requires current membership and approved status.

Independent verification:

- `pnpm test:authority -- server/__tests__/integration.agency-membership-authority.test.ts server/__tests__/integration.agency-principal-bootstrap.test.ts`
  — 12 tests passed.
- Evidence covers suspension/reactivation, revoked attribution, invitation
  identity consistency, incompatible-principal denial, concurrent bootstrap,
  and rollback/retry.

Finding: none for the exercised P4 boundaries. This review does not accept
credential/session retention, every account deletion path, or all owner/agent
fallback predicates as globally closed; those require explicit P9 traces.
