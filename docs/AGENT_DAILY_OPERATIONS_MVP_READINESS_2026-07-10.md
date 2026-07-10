# Agent Daily Operations MVP Readiness - 2026-07-10

## Decision

Agent Daily Operations is the second part of the paid Agency workspace, not a
separate product or a second CRM. Its MVP gives an activated agency member one
place to work the inventory and demand assigned to them: listings, leads,
lead-stage updates, notes, showings, and scheduled follow-ups.

The canonical daily workflow is:

`agency-assigned listing or attributable enquiry -> assigned agent lead ->
stage/note/follow-up/showing -> manager-visible agency record`

This engine does not own listing publication, public search, public-property
media, agency billing, or Explore. It consumes the Agency and Listing
contracts and writes activity against the canonical lead record. A separate
agent task product is deliberately out of scope for launch.

The next engine sequence remains:

1. Complete and verify the Agent Daily Operations release gates below.
2. Stabilize the Listing lifecycle and its public projection.
3. Verify public Discovery converts into correctly attributed agency leads.
4. Define Explore as a dedicated video-discovery engine before resuming its
   implementation.

## MVP Scope

The release scope includes:

- An agent dashboard with assigned listing, lead, showing, notification, and
  performance context.
- An assigned-agent lead pipeline with stage updates and historical lead
  activities.
- Agent-owned CRM notes and contact history on leads assigned to that agent.
- Creation, management, and calendar visibility of agent showings.
- A persisted follow-up queue backed by `leads.nextFollowUp`, including
  scheduling, rescheduling, completion, and an activity-trail entry for each
  action.
- A Productivity view that surfaces due and overdue follow-ups alongside the
  existing showing and notification workload.
- Agency-manager visibility through the same canonical lead and activity
  records, without a duplicate reporting store.

## Invariants

- `leads` is the canonical sales-work record. `leads.nextFollowUp` is the
  canonical scheduled follow-up field; it is not mirrored into `agentTasks` or
  a new task table.
- An agent may read or mutate only a lead assigned to their agent profile.
  Agency-level operations retain their own authorized scope and observe the
  same lead record.
- Follow-ups cannot be scheduled or completed by an agent for a `converted`,
  `closed`, or `lost` lead. Terminal leads are excluded from the agent
  follow-up queue.
- Scheduling or completing a follow-up updates the lead lifecycle fields and
  appends a `leadActivities` audit entry. It does not silently change the lead
  stage, agency ownership, listing ownership, or public-property state.
- Listing publication and public visibility remain Listing/Discovery concerns.
  An agent workspace action cannot make draft, rejected, archived, or private
  inventory public.
- Public enquiries continue to derive ownership server-side from the source
  listing, assigned agent, and legacy owner fallback. Agent CRM interactions
  cannot override that attribution.
- `agentTasks` remains reserved for its existing AI/session task use. It is
  not a substitute for client follow-ups, deadlines, or sales activity.

## Verification Evidence and Release Gates

Before declaring Agent Daily Operations live in production:

1. Run type checking and the focused agent dashboard/showings/follow-up suite
   against a persisted local or disposable staging database.
2. Verify an assigned agent can schedule a follow-up, see it in Productivity,
   complete it, and find the corresponding activity on the lead.
3. Verify a different agent cannot list, schedule, or complete that lead's
   follow-up, and that converted/closed/lost leads remain absent from the
   follow-up queue.
4. Run a staging browser journey covering agent sign-in, assigned listings,
   pipeline stage change, note, follow-up, and showing creation. Confirm the
   agency manager sees the same lead history.
5. Run the Agency activation, Listing, and Discovery release gates as part of
   the combined launch acceptance; agent operations require an active agency,
   canonical inventory, and attributable leads.
6. Run production launch preflight with production-safe email, storage,
   billing, public URL, and database configuration before the first paid
   agency is onboarded.

## Deferred Agent Work

- A separate task, deadline, recurring-reminder, or personal productivity
  model. It needs an explicit domain decision rather than overloading CRM
  follow-ups or AI session tasks.
- Territory planning, canvassing, recruitment, route optimization, and richer
  area intelligence.
- SLA automation, escalation rules, saved views, bulk lead operations, and
  advanced manager scorecards.
- Deeper offer/transaction workflow consolidation and financial performance
  reporting beyond the existing operational views.
- Native mobile notifications and offline-first field workflows.

## Explore Deferral

Explore is intentionally not part of this MVP. The intended Explore product is
a video-centric discovery engine, but its content model, listing-media
relationship, publishing rules, moderation, ranking, and agency-feed boundary
are not yet a settled contract. The current Agent engine must therefore remain
independent of an Explore feed.

When Explore resumes, it must consume only canonical published listing and
media data. It must not introduce a second inventory record, bypass Listing
publication, or make agent workspaces responsible for a separate video
publishing system.

## Top Risks

1. A seemingly small follow-up feature can become a conflicting task system,
   fragmenting the sales record between CRM, AI tasks, and personal reminders.
   Prevention: preserve `leads.nextFollowUp` as the only launch follow-up
   contract and require an approved domain model before adding general tasks.
2. Agent convenience actions can accidentally broaden access across an agency
   or revive work on terminal leads. Prevention: enforce agent assignment and
   terminal-status checks server-side, and retain contract coverage for both
   forbidden access and the terminal queue exclusion.

## Files Touched

- `docs/AGENT_DAILY_OPERATIONS_MVP_READINESS_2026-07-10.md`
