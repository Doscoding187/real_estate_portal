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

`agencyListingScopeCondition` allows an agency to see owner-authored listings
when the owner is linked to the agency, or when an unassigned listing's agent is
linked to it. This product rule is now covered by the persisted listing
performance integration: an outside agency cannot read an assigned listing,
and an owner-authored listing with `agency_id` and `agent_id` cleared remains
invisible to the other agency. The rule is enforced at the scoped query
boundary; no schema change is justified because the ownership relationship is
intentionally reassigned over the listing lifecycle.
