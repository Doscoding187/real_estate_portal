# P4 tenant boundary audit

The account and agency paths use `users.agencyId` plus the canonical
`agency_agent_memberships` lifecycle row. Active membership is evaluated with
half-open effective windows, and the membership writer uses the unique
`(agency_id, agent_id)` key with an atomic duplicate-key update. This prevents
concurrent activation from creating two canonical membership facts.

Agency lead, listing, property, showing, deal, transaction, and team-member
readers consistently require the authenticated agency identifier. Agent
assignment checks require both the agent's agency and approved status. The
existing integration suite covers membership reactivation and inactive-member
rejection.

One boundary remains deliberately open for implementation: `agencyListingScopeCondition`
allows an agency to see owner-authored listings when the owner is linked to the
agency or the listing's agent is linked to it. This is a product rule, not a
database foreign-key invariant, and needs explicit cross-tenant negative tests
before P4 can be accepted. No schema change is justified until that rule is
resolved against agency ownership and reassignment semantics.
