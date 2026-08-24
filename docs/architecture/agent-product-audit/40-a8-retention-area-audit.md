# A3-A8 — Retention Area Audit

| Field | Value |
| --- | --- |
| Slice | `A3-A8` (charter §4.8 Retention) |
| Status | Draft area audit; synthesis input to A3-B1 |
| Core question | What makes an agent think "I need Property Listify" rather than "I paid R499 once and put my listings there"? |
| Evidence basis | Commercial term services, notice scheduler, lapse gates, value-reporting surfaces at main state `d4bb6fbd`; CRA S4 non-goals |
| Runbook dependence | Q6 (renewal conversion in the T-7 final-week window), Q3/Q4 (return habit), Q8 (does proof-of-value affect engagement) |

## 1. Existing inventory

### 1.1 Commercial truth (what was bought)

Fixed 90-day once-off Launch Access: `activatePaidLaunchAccessForOwner`
requires finance-verified payment; period end = start + 90 days; auto-renewal
explicitly false and enforced (`billingFoundationService.getLaunchPlanForOwner`
rejects any other configuration; invoice line reads "… · 90 days · once-off").
Lifecycle contract-tested end to end
(`commercial-launch-access-s4.integration.test.ts`).

### 1.2 Renewal posture

- T-7/T-1 notices via `commercialTermNoticeScheduler` (15-min tick, idempotent
  keys): in-app notification + email; copy "Renew before expiry to keep your
  enquiry pipeline open."
- Renewal = repeating the original assisted purchase
  (`requestPaidLaunchAccessInvoice` expires the lapsed row and re-issues a
  fresh once-off invoice). No one-click renew, no stored payment method
  (manual EFT by design), no gateway.
- Public copy tells the truth about all of this (landing page: "expires
  without automatic renewal"; catalog `renewalLabel: 'No automatic renewal'`).
- After expiry: no outreach of any kind. Win-back is the founder's manual SQL
  (runbook Q6).

**Defects:** expiry email CTA renders unsubstituted `{{ACTION_URL}}`
(`emailService.ts:449` — placeholder never replaced); renewal button label on
`AgentStatusStrip.tsx:96–105` renders raw ternary text. Both sit directly on
the money path.

### 1.3 What lapse takes away (fail-closed everywhere)

Listing visibility/custody eligibility, enquiry delivery ("The assigned listing
agent is not an eligible active recipient."), demand-engine routing, directory
presence, CRM UI (leads stay stored behind a locked state — data preserved,
access gated). Keeps: login, dashboard reads, profile/settings data. Badged
(`isVerified`) agents are the only lapse-exempt recipients.

Lapse is cliff-edge: `graceEndsAt`/`grace_period` exists and counts as
entitled, but no code ever places a launch-access subscription into grace.
Expiry sweep is lazy (flips status only on next authenticated read or checkout).

### 1.4 Value-proof surfaces (the actual retention lever)

In-app and real: Presence Proof panel (30-day anonymous interactions vs prior
window), performance analytics (leads contacted, closings, conversion),
dashboard KPIs, per-listing enquiry counters. Absent: any emailed or periodic
value report (the strongest retention lever never reaches an inbox);
per-listing impressions/views performance view is agency-only
(`mapAgencyListingRow`); boost analytics returns logged zeros (stubbed);
no streaks/habit mechanics; saved-search alerts are consumer-scoped.

### 1.5 Churn mechanics

None for agents: no self-serve cancellation (agency-admin gated endpoint), no
churn-reason capture, admin churn widgets are placeholder copy. An agent's only
exit is doing nothing.

## 2. Quality assessment

The commercial spine is honest, verified and deliberately minimal — exactly
what CRA S4 approved. Retention architecture as such barely exists yet: notices
exist, value proof exists *in-app only*, everything else (digests, win-back,
grace, churn learning) is absent. The two defects on the renewal path are
small but sit precisely where money is recovered.

## 3. Agent value analysis

Core question answered: today nothing creates "I need Property Listify"
beyond live enquiry flow. The product an agent renews is access to a pipeline;
if their 90 days contained no enquiries (platform-wide plausible until cohort
data says otherwise), the truthful renewal pitch is empty, and cliff-edge lapse
correctly takes the product away. The honest zero-state discipline that
distinguishes this platform also means retention cannot be argued into
existence — it must be produced by observed value (Q8) and measured renewal
behaviour (Q6). The audit's structural finding: **value proof is captured but
never delivered** — every number that could justify renewal lives behind a
login the agent has no habit-forming reason to open.

## 4. Gap register

| # | Gap | Type |
| --- | --- | --- |
| G1 | No periodic value report/digest to agents (in-app proof only) | Structural, highest-leverage |
| G2 | No post-expiry win-back; notices stop at T-1 | Design gap |
| G3 | Renewal requires full assisted repurchase; posture for a "normal" future product is explicitly deferred to founder motion decision | Authority-bound (doc 25) |
| G4 | Cliff-edge lapse; unused grace machinery | Design choice |
| G5 | Per-listing exposure reporting agency-only; boost analytics stubbed zeros | Parity gap |
| G6 | No churn-signal capture of any kind | Instrument gap |
| G7 | Broken renewal email CTA + broken renewal button label | Defects on money path |

## 5. Decision-map row inputs (A3-B1)

| Field | Value |
| --- | --- |
| Existing | Verified fixed-term lifecycle, honest expiry truths, fail-closed lapse, real in-app value proof |
| Quality | High integrity; near-zero retention design beyond notices |
| Agent value | Renewal justified only by lived enquiry experience; value proof exists but undelivered |
| Gap | G1–G7 above |
| Decision candidate | **Design** (G1 value digest within `AGT-06` operational boundary; G7 defect fixes via Agent product authority); **Define** (G3/G4 renewal-product posture) routed exclusively to the founder's doc 25 "Agent motion" decision — no pricing/entitlement decisions taken here; **Audit deeper** pending Q6/Q8 evidence |

## 6. Implementation-slice candidates

Slice candidates: (a) fix the two renewal-path defects; (b) monthly value
digest built from already-recorded presence/performance data — no new metrics
collection (charter hard boundary), no ROI wording (`PLT-PROP-10`,
`AGT-06`). Both must pass the AAE future-slice compliance checklist before
backlog entry. Renewal-product changes are out of scope for any slice until
the founder motion decision lands.

## 7. Evidence discipline

All statements cite services/tests above. Renewal likelihood, digest impact
and engagement linkage are Unknown pending Q6/Q8 observations; recorded, not
estimated.
