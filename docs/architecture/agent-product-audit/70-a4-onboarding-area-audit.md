# A3-A4 — Onboarding Area Audit

| Field | Value |
| --- | --- |
| Slice | `A3-A4` (charter §4.4 Onboarding) |
| Status | Draft area audit; synthesis input to A3-B1 |
| Core question | From registration to first meaningful outcome: what does the journey demand, where does approval sit, and can time-to-first-outcome be measured with today's authority? |
| Evidence basis | Registration/wizard/approval/funnel inventory at main state `c035c7d5` |
| Runbook dependence | Q7 (activation/approval/renewal operational burden, monthly) |

## 1. Existing inventory

### 1.1 Journey steps

1. **Register** (`client/src/pages/Login.tsx`): combined login/register surface,
   role cards, phone mandatory for agents (zod :79–82); success page at
   `/agent/success`.
2. **Role selection** (`RoleSelection.tsx`, `/role-selection`): routes agents →
   `/agent/setup`.
3. **Setup wizard** (`AgentSetupWizard.tsx`, 5 steps): identity + photo
   (presigned S3), coverage areas via typed location autocomplete (≤20),
   focus/specializations, bio/license/experience, socials + public slug.
   Every step persists on save-and-continue; only step 1 is mandatory;
   server-side validation mirrors client bounds; slug collision-safe.
   Unlock ladder stated in-product: publish ≥70% score, directory ≥80% +
   photo + areas; dashboard unlocks from step 3.
4. **Publish** (`publishProfile`): rejects rejected/suspended profiles; returns
   `approvalState: 'live' | 'pending_approval'`; emits
   `agent_profile_published` once when live.
5. **Approval** (super admins): queue `admin.getPendingAgents`,
   `approveAgent`/`rejectAgent` write status + notification ("Profile approved"
   / "Profile needs attention") + audit rows; pending count surfaces in the
   admin overview action items.

### 1.2 First-meaningful-outcome machinery

A full OS-event funnel exists: `agent_profile_completed → agent_profile_published
→ agent_listing_created/submitted/live → agent_lead_received →
agent_lead_stage_updated / agent_crm_action_logged → agent_showing_booked`
(`agentOsEventService.ts:6–21`; emitters verified in profile save, listing
publication, lead capture). Super-admin readiness report computes distinct-user
rates against fixed thresholds (publish .6 … first-showing .15, weekly-active
tiers). Email verification returns to `/agent/setup?verified=true`.

**Measurement limit:** the funnel reports rates/counts only — **no per-agent
duration metric exists** (no days-to-milestone computation anywhere).
Time-to-first-outcome is therefore computable today only by founder SQL under
runbook Q7 discipline.

### 1.3 Approval dependency

Human approval gates public presence (`isPublic = status === 'approved'`) and
every downstream distribution gate (A6). In-product, the waiting agent sees
honest states and can keep preparing; approval latency itself is unmeasured
in-product (admin action-item count is the only signal).

## 2. Quality assessment

Identity progression deliberately does not require payment (contract-tested:
unpaid agents are never bounced off identity surfaces,
`contract.agent-onboarding-journey.test.ts`). Validation is mirrored
client/server; every step saves; the unlock ladder is transparent inside the
wizard. Weaknesses: no e2e Playwright coverage of the journey; approval-burden
cost lands entirely on super-admin humans with no SLA signal; the funnel's
rate-based reporting cannot answer "how long does activation take?" without
founder SQL.

## 3. Agent value analysis

Core question answered: the journey demands little (one mandatory step),
persists everything, tells the agent exactly which threshold unlocks what, and
never asks for money before identity exists. The first meaningful outcome — a
live listing producing an enquiry — is instrumented as an event chain, so the
concept exists; its duration dimension does not (yet). Q7's monthly cadence is
the current authority for activation/approval burden; this audit adds nothing
to it and records that approval latency is Unknown by design until that query
runs on real cohort data.

## 4. Gap register

| # | Gap | Type |
| --- | --- | --- |
| G1 | No per-agent time-to-outcome duration computation (rates only) | Instrument gap — authority decision required |
| G2 | No approval-latency visibility (queue depth only; no aging view for admins) | Operational gap |
| G3 | No e2e test drives register→setup→publish→approval | Coverage gap |
| G4 | Rejection feedback loop ends at one notification; resubmission guidance is generic | Minor UX |

## 5. Decision-map row inputs (A3-B1)

| Field | Value |
| --- | --- |
| Existing | Complete, low-friction, payment-free identity journey with honest unlock ladder and OS-event funnel |
| Quality | High contract-test coverage of journey truth; e2e absent; duration metrics absent |
| Agent value | Smooth to publish; then waits on human approval with honest but passive states |
| Gap | G1–G4 |
| Decision candidate | **Improve** (G2 admin aging signal, G4 guidance — existing-capability wiring via AAE checklist); G1/G3 recorded for the owning authority; **Audit deeper** on Q7 evidence once cohort operates |

## 6. Implementation-slice candidates

Candidate slice: admin approval-aging signal + richer rejection guidance
(no new metrics authority needed — both read existing data). Must pass the AAE
future-slice compliance checklist before backlog entry.

## 7. Evidence discipline

Journey mechanics cited above. Activation duration, approval latency and
drop-off timing are Unknown pending Q7 observations on real cohort data.
