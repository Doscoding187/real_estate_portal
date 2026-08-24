# A3-A5 — Agent Workspace Area Audit

| Field | Value |
| --- | --- |
| Slice | `A3-A5` (charter §4.5 Agent workspace) |
| Status | Draft area audit; synthesis input to A3-B1 |
| Core question | Once logged in, why would an agent open the dashboard tomorrow morning? |
| Evidence basis | Workspace route/router/component inventory at main state `d4bb6fbd`; S1A grades per doc 11 |
| Runbook dependence | Q3 (return frequency with no new leads), Q4 (which workflows create repeat use), Q7 (activation/approval burden — onboarding edge) |

## 1. Existing inventory

### 1.1 Authenticated surfaces (all role-gated `agent`)

`client/src/App.tsx`: `/agent/dashboard`, `/agent/listings`, `/agent/leads`,
`/agent/canvassing`, `/agent/marketing`, `/agent/analytics`,
`/agent/productivity`, `/agent/settings`, `/agent/setup`, `/agent/select-package`
plus authoring workspaces (`/agent/land/create`, `/agent/commercial/office/create`)
and public presence (`/agents`, `/agents/:slug`). `/agent/calendar` and
`/agent/referrals` are redirects; unmatched `/agent/*` renders the dashboard.

### 1.2 Server truth

`server/agentRouter.ts` (~2.5k lines, `agentProcedure`): dashboard stats,
lead pipeline + stage moves with transition validation, follow-up queue with
transactional completion, showings booking/status against canonical property
links, commissions + CSV export, performance analytics (real SQL),
presence summary over `analyticsEvents`, notifications CRUD, profile publish
with slug collision handling. REST: `/api/agent/onboarding-status`,
`select-package`, `request-launch-access-invoice`.

### 1.3 Morning-open loops that genuinely exist

1. Alerts hero: top-2 unread notifications with typed badges; bell polls 30 s.
2. Action queue (`AgentProductivity.tsx`): overdue follow-ups (red), upcoming
   showings, unread alerts — each deep-linked.
3. Follow-up closure: one-click Complete writes `lastContactedAt`/
   `firstRespondedAt` shared with agency managers.
4. Pipeline pulse + sidebar badge of non-closed leads.
5. Today's schedule KPI and calendar dots.
6. Presence proof panel (30-day anonymous public interactions vs prior window)
   with honest zero-state coaching.

Zero states are honest by design ("No active leads in the pipeline yet.",
"You do not have active listings yet.") — no fake numbers anywhere found.

### 1.4 Structural dead weight (verified absences)

- "Offers in Progress" KPI counts an `offers` table **no production code writes**
  → permanently zero; metric structurally dead.
- `offer_received` notification type has icons/badges/filters but **no producer
  exists in `server/`** → unreachable decoration.
- TopNav "Log Lead" targets `/agent/leads?action=add`; no code parses it. No
  manual lead creation exists ("Submit Offer" likewise dead).
- `getActivationMilestones` is invalidated by pages but never read — dead endpoint.
- `quickUpdateProperty` has no client caller.
- ~900 lines orphaned legacy pages (EnhancedAgentDashboard, AgentCalendar,
  AgentCommission, AgentMarketing, a literal "coming soon" stub) plus 7 unused
  components.
- Earnings permanently locked under current Launch Access entitlement;
  commission tracker implemented but unreachable.
- No messaging inbox — honestly declared in-product instead of faked.
- No Playwright spec drives any `/agent/*` flow; zero client tests for
  dashboard/status/presence/pipeline components.

### 1.5 Defects observed

- `AgentStatusStrip.tsx:96–105`: renewal CTA ternary rendered as literal text
  (missing JSX braces) — expired agents see raw code as button label.
- Dashboard Active Listings subtitle fallback chain ends in `'Awaiting payout'`.
- `/api/agent/onboarding-status` failure redirects paying agents to setup
  (`catch { setLocation('/agent/setup') }`) — transient error evicts a working user.

## 2. Quality assessment

Backend layer is strong: real queries, validated transitions, audit trails,
OS events, fail-closed entitlement checks. Frontend layer carries the product:
the daily loop is real but thin, and three affordances point at capabilities
that do not exist (offers, manual leads). Test coverage is inverted versus risk:
public presence pages are heavily contract-tested while the paid workspace —
where paying agents spend their time — has no client tests and no e2e path.

## 3. Agent value analysis

Core question answered: today the honest reason to open the dashboard tomorrow
morning exists **only while the enquiry pipeline flows**. With live leads, the
alerts → action queue → follow-up → showing loop is genuinely useful and
truthful. At zero leads, every panel truthfully reads zero and the dashboard
becomes a status page — useful weekly (presence check), not daily. Retention
pressure therefore sits almost entirely on demand-side areas (A1/A7), exactly
as charter §4.8 anticipated. Money-loop tools (earnings, offers) that create
habit in comparable products are absent or locked.

Runbook mapping: Q3/Q4 answer whether return survives empty pipelines —
currently Unknown; the audit predicts "no" for solo agents without pipeline
flow and marks this a synthesis-level dependency on cohort data.

## 4. Gap register

| # | Gap | Severity |
| --- | --- | --- |
| G1 | Dead offers KPI + unreachable `offer_received` type misrepresent platform state to paying users | High (trust cost) |
| G2 | Dead "Log Lead"/"Submit Offer" affordances | Medium |
| G3 | No deal/mandate tracking for solo agents (`AGT-12/13/14` are agency-reach only) — progression story stops at viewing | Structural |
| G4 | Entry fragility: onboarding-status failure bounces paying agents to setup | Medium |
| G5 | Zero client/e2e test coverage on paid workspace components | Medium (risk, not value) |
| G6 | Orphaned legacy pages invite future drift/misleading audits | Low |
| G7 | Cosmetic defects (StatusStrip label, payout subtitle) | Low but visible |

## 5. Decision-map row inputs (A3-B1)

| Field | Value |
| --- | --- |
| Existing | Full authenticated workspace; real DB-backed daily loop; honest empty states |
| Quality | Backend high; frontend untested; dead affordances contradict displayed state |
| Agent value | High when pipeline flows; near-zero daily pull at zero leads |
| Gap | G1–G7 above; money/progression layers absent |
| Decision candidate | **Improve** for G1/G2/G4/G7 (small truth-restoring fixes via Agent product authority); **Audit deeper** for the return-habit question pending Q3/Q4 evidence; **Develop** for solo-agent progression tooling routed through AAE before any backlog entry |

## 6. Implementation-slice candidates

Truth-restoration set (remove or wire dead offers/lead affordances; fix
StatusStrip expression; soften error-redirect; delete orphaned pages) is the
natural first slice and must pass the AAE future-slice compliance checklist
before backlog entry. Progression-tool development is a future-slice proposal
only; it makes no promise beyond delivered capability.

## 7. Evidence discipline

All inventory statements cite files/endpoints above. Usage claims (does anyone
open it daily?) remain Unknown until runbook Q3/Q4 produce observations.
