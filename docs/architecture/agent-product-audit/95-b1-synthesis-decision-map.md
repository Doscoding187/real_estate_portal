# A3-B1 — Synthesis Decision Map

| Field | Value |
| --- | --- |
| Slice | `A3-B1` (charter §6 output contract; §7 sequencing) |
| Status | Draft synthesis; founder review gate before A3-C1 decision brief |
| Input evidence | Nine area audits (`10`–`90` in this directory), each drafted against main states `d4bb6fbd`/`c035c7d5`; charter §6 shape and §8 boundaries bind every cell |
| What this document is | The consolidated map produced by the audit: one decision per area, authority routes, cross-cutting registers |
| What this document is not | A pricing, packaging, motion or instrumentation decision — those remain with the founder (doc 25 gate) |

## 1. Central question, answered once

> **What must be true for the Agent Product to be genuinely worth paying for
> and worth continuing to use?**

The audit's verdict, assembled from nine areas:

1. **The product tells the truth everywhere it speaks** — commercial-truth
   tests, honest zero states, fail-closed gates, canonical price rendering.
   This held in all nine areas without exception.
2. **The value engine exists but is undelivered as an experience**: capture,
   custody, presence and workflow are real (`AGT-07` delivered); proof of that
   value reaches the agent only if they already log in (A8 G1).
3. **The morning-open habit is pipeline-conditional**: daily utility is real
   while enquiries flow and honestly empty when they do not (A5). Retention
   therefore inherits demand risk (A1/A7) until cohort data says otherwise.
4. **A small set of defects and dead affordances sits exactly on the
   highest-intent paths** (checkout entry, renewal, dashboard KPIs) — cheap to
   fix, expensive to ignore.

## 2. Decision map

| Area | Existing | Quality | Agent value | Gap | Decision | Authority route |
| --- | --- | --- | --- | --- | --- | --- |
| Acquisition | Complete truthful entry mesh; free organic presence | High structure; zero measurement | Coherent arrival loop via distribution output | No signup-source instrument anywhere | **Audit deeper** | Founder — measurement-instrument extension decision (charter forbids in-A3 creation) |
| Proposition | Truth-tested funnel mapping to register grades | High fidelity; undifferentiated | Real but conditional on demand belief | Canvassing scope tension; no differentiation layer permitted | **Refine** | Agent product authority (wording); register amendment proposal via owning authority |
| Conversion | Canonical assisted-EFT path, truth-enforced copy | High integrity; money-path traps | Clear expectations; silent-stall risk | Rejected-proof deadlock; role-handoff gap; agent billing silence | **Improve** | Agent product authority → AAE checklist |
| Onboarding | Payment-free identity journey; OS-event funnel | Contract-tested; rates-only metrics | Smooth to publish, then human-wait | No duration metric; no approval aging signal | **Improve** | Agent product authority → AAE checklist; duration metrics to founder instrument decision |
| Workspace | Full DB-backed workspace, honest zeros | Backend strong; frontend untested | High when pipeline flows; near-zero pull otherwise | Dead offers/lead affordances; visible defects; no e2e | **Improve** | Agent product authority → AAE checklist |
| Distribution | End-to-end attribution + reciprocity + microsites | Deeply contract-tested; legible gates | Self-verifiable at both free and paid tiers | Province parity absent; exposure→demand unproven | **Strengthen** | Agent product authority → AAE checklist |
| Leads | Production-grade capture/custody/awareness spine | Delivered grade honoured honestly | Real when enquiries exist; blind to direct-contact majority | Direct-contact intent invisible; latency never surfaced in-product | **Strengthen** | Agent product authority → AAE checklist (`AGT-06` boundary holds) |
| Retention | Honest fixed-term lifecycle; fail-closed lapse | High integrity; near-zero retention design | Renewal justified only by lived experience | Value proof captured but never delivered; renewal-path defects | **Design** | Agent product authority (digest + defects); posture → founder doc 25 gate |
| Expansion | One honest product; three enforced entitlements | Mechanically clean; zero packaging debt | Exists only after core value proves | Two locked real capabilities; dormant channels without reopening criteria | **Defer** | Founder doc 25 "Agent motion" gate (all packaging moves) |

## 3. Cross-cutting register 1 — truth-restoration defects

Small fixes with outsized trust value; found repeatedly across areas:

| # | Defect | Found in | File |
| --- | --- | --- | --- |
| D1 | Renewal CTA renders raw ternary as button label | A5/A3/A8 | `client/src/components/agent/AgentStatusStrip.tsx:96–105` |
| D2 | Expiry email CTA links unsubstituted `{{ACTION_URL}}` | A8 | `server/_core/emailService.ts:449` |
| D3 | Offers KPI reads a table no production code writes; permanently zero | A5 | `server/agentRouter.ts` (`offersInProgress`) |
| D4 | `offer_received` notification type has no producer | A5 | server-wide absence |
| D5 | "Log Lead" / "Submit Offer" TopNav affordances target nothing | A5 | `AgentAppShell.tsx`, `/agent/leads?action=add` unparsed |
| D6 | Active-listings subtitle falls through to "Awaiting payout" | A5 | `AgentDashboardOverview.tsx:994–1002` |
| D7 | Rejected payment proof leaves invoice unrecoverable in UI | A3 | `billingFoundationService.ts:2297–2304`, `AgentPackageSelection.tsx:194` |
| D8 | Stale router header claims endpoints return 501 while one is live | A1/A6 | `server/monetizationRouter.ts` header |

These constitute the recommended first implementation slice after this map is
approved — pure truth restoration, no new claims, no new capability.

## 4. Cross-cutting register 2 — questions only cohort evidence can answer

Recorded Unknown throughout the audit; each blocks its area's deeper verdict:

| Question | Area | Runbook instrument |
| --- | --- | --- |
| Does return survive an empty pipeline? | Workspace/Retention | Q3, Q4 |
| What share of intent arrives outside the form? How fast do agents respond? | Leads | Q1, Q2 |
| Do agents renew when the T-7 notice lands? | Retention | Q6 |
| Does approval/approval-burden suppress activation? | Onboarding | Q7 |
| Does delivered proof-of-value move engagement? | Retention | Q8 |

## 5. Cross-cutting register 3 — items reserved to the founder

Routed exclusively into the doc 25 "Agent motion" inputs (A3-C1):

1. Commercial motion selection context (self-service / assisted / hybrid).
2. Continuation/renewal product posture beyond the launch term (A8 G3/G4, A9 G4).
3. Packaging candidates: commission-tracking unlock, revenue-dashboard unlock,
   listing-capacity tiers (A9 G1; agency adjacency as scope ceiling).
4. Measurement-instrument extensions: acquisition-source capture, per-agent
   time-to-outcome durations, approval-latency visibility (A1 G1, A4 G1/G2).
5. Dormant-channel reopening criteria: Explore publishing, boost/campaign
   foundation (A6 G3, A9 G3).

## 6. Sequencing recommendation

```
B1 (this map, approved)
 └─ Slice 1: truth-restoration defects (D1–D8)          — Agent product authority
 └─ Slice 2: money-path repairs (conversion F1–F4)      — Agent product authority
 └─ Slice 3: strengthen set (leads latency surface,
             province parity, full-inventory path)      — AAE checklist per item
 └─ C1 founder brief → doc 25 motion decision
      └─ then: instrument extensions, packaging posture (founder-gated)
 └─ Q3/Q4/Q6/Q7/Q8 continue on runbook cadence;
    zero-leads state keeps acquisition prioritised (charter §5.2)
```

Every slice above must individually pass the AAE future-slice compliance
checklist before entering any backlog (charter §6). Nothing here amends AAE
documents or takes a reserved decision.

## 7. Compliance answers

AAE future-slice compliance checklist, workstream level: audience unchanged
(S1B solo agents); problem/outcome unchanged; layers supported within S0
model; findings rest only on delivered/qualified capability; no new claims
introduced (`PLT-PROP-10` held); commercial motion not selected; no
pricing/entitlement effect authorised; no AAE amendments required by this
map; authorities reviewed are listed in charter §9.9 plus the nine area
audits; promise/experience consistency enforced by evidence-grade citation
throughout.
