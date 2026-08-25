# A3-C1 — Founder Decision Brief: Agent Motion

| Field | Value |
| --- | --- |
| Slice | `A3-C1` (charter §6 final output; §7 sequencing) |
| Status | Final workstream deliverable — founder consumption; no decisions taken inside it |
| Purpose | Structured input for the doc 25 "Agent motion" founder decision and any subsequent S1C scoping |
| Input evidence | B1 synthesis (`95-b1-synthesis-decision-map.md`), nine area audits, S1A/S1B registers, CRA S2/S4 |
| Boundary | This brief selects no motion, prices nothing, designs no package, extends no instrument. `AAE_S1C_ENTRY=REQUIRES_FOUNDER_DECISION` is unchanged by the entire A3 workstream |

## 1. The decision before you

Doc 25 entry gate records:

> | Agent motion | Self-service, assisted or hybrid; individual eligibility and activation. | `AGT-15` is qualified and plan/entitlement authority conflicts remain. |

Current state: `AAE_S1C_ENTRY=REQUIRES_FOUNDER_DECISION`. The audit was
mandated (charter §2.4) to assemble evidence for exactly this decision without
entering it. Sections 2–5 are that assembly.

## 2. What nine audits established (the evidence base)

**Held everywhere (the asset):**
- Truthfulness discipline: commercial-truth tests, honest zero states,
  fail-closed entitlement gates, canonical price rendering — no exceptions
  found across Acquisition → Expansion.
- Delivered core: public enquiry capture/custody (`AGT-07`, `CON-07` delivered),
  observable distribution (microsites, reciprocity, presence analytics),
  real DB-backed workflow (CRM/follow-ups/showings).
- A functioning assisted purchase path with verified fixed-term lifecycle
  (S4-tested) and truthful renewal copy ("No automatic renewal").

**The structural gap (the liability):**
- Value proof exists but is never *delivered* to the agent — every number that
  could justify renewal lives behind a login with no habit-forming pull (A8 G1).
- The morning-open habit is pipeline-conditional; at zero leads the product
  honestly reads zero (A5). Platform-wide demand volume is Unknown until Q1/Q2
  run against cohort data.
- Renewal currently requires repeating the full assisted purchase; notices
  stop at T-1; two defects sit on the money path (D1–D2), plus a rejected-proof
  deadlock (D7).

**The measurement holes (the blind spots):**
- No acquisition-source instrument, no per-agent time-to-outcome durations,
  no approval-latency visibility, no in-product response-latency surface.
  All require your authority to extend (charter forbade creating them in A3).

**The packaging headroom (the options inventory):**
- Two real capabilities locked behind false flags: commission tracking and
  revenue dashboard (implemented, tested).
- Seven projected entitlement keys with no capability behind them.
- Agency adjacency as a natural scope ceiling (AGY-01…AGY-10).
- Dormant channels without reopening criteria: Explore publishing, boost/campaign
  foundation (CRA non-goals bind any future exposure product).

## 3. Motion options × audited preconditions

Evidence for each option's readiness. No option is selected here.

### Option A — Self-service

Preconditions the audit found **absent today**:
1. Payment rails beyond manual EFT do not exist (`paymentMethods` hardcodes
   Manual EFT; no gateway integration anywhere). Self-service checkout is
   unimplemented, not merely disabled.
2. Entitlement authority conflict unresolved (`AGT-15`: "Conflicting plan
   authorities"; freshness gated on S1C). Any self-serve entitlement grant
   inherits this conflict.
3. Profile approval is a super-admin human gate (`admin.approveAgent`);
   self-service activation would need either an approval policy change or an
   explicit "unapproved until reviewed" product posture.
4. Prohibition boundary constrains presentation: no trial, performance or
   comparison claims may appear in self-serve merchandising (`PLT-PROP-10`).

What supports it: canonical catalog projection, race-safe entitlement
enforcement, digest-enforced plan data — the plumbing side is clean.

### Option B — Assisted (status quo formalised)

What supports it: the entire S4 lifecycle is contract/integration-tested;
finance verification is an existing activation authority; human review absorbs
the verification-trust problem that `AGT-02` prohibits solving by claim.

What the audit found must be repaired regardless: D1/D2/D7 money-path defects,
agent billing silence during multi-day manual verification (A3 F3), no
pending-verification destination (A3 F4). Assisted motion's bottleneck costs —
approval latency, finance queue depth — are unmeasured today (Q7 covers burden
monthly at cohort scale only).

### Option C — Hybrid

Reads, on the audit evidence, as the smallest-delta path: retain assisted
activation, simplify specific edges (e.g., renewal repurchase currently forces
a full re-run of the original invoice flow; A8 G3). The precondition list is
Option A's list minus whatever edges you carve — each carved edge still needs
its own authority reconciliation under `AGT-15`.

## 4. What the motion decision gates downstream

```
Agent motion decision (yours)
 ├─ Continuation/renewal product posture      (A8 G3/G4)
 ├─ Packaging unlocks: commission tracking,
 │   revenue dashboard, capacity tiers        (A9 G1; agency ceiling)
 ├─ Entitlement authority reconciliation      (AGT-15 — required for ANY motion)
 └─ S1C scoping may then proceed per doc 25
```

Motion-independent findings (B1 slices 1–2): truth restoration D1–D8 and
money-path repairs stand regardless of which option you choose, because they
restore promises the product already makes.

## 5. Evidence timing

Unknowns that would materially change this brief if resolved first:
- **Q6** (renewal conversion in T-7 window): direct evidence on whether the
  current term design retains anyone.
- **Q1/Q2** (lead existence, mix, latency): charter §5.2's rule applies — a
  platform-wide zero-leads state invalidates demand-side arguments entirely
  and keeps acquisition prioritised.
- **Q3/Q4** (return habit without leads): tests whether workspace utility can
  carry retention independent of enquiry flow.

Deciding before these land is your prerogative; the audit's only finding on
timing is that **no current instrument produces them automatically** — they
require the runbook cadence on a live cohort, plus the instrument extensions
listed in B1 §5.4 should you approve them.

## 6. Non-declarations

This brief does not: select a motion; set or imply pricing; design package
tiers; approve instrumentation changes; amend any AAE document; or alter
`AAE_S1C_ENTRY=REQUIRES_FOUNDER_DECISION`. Every packaging, posture and
instrument item above remains reserved to you (B1 §5).

## 7. Compliance answers

Audience unchanged (S1B solo agents); outcome framing unchanged from
`AGT-PROP-01`–`04`; all cited capability rests on delivered/qualified register
rows; no unverified claims introduced (`PLT-PROP-10` held throughout A3);
commercial motion not selected (checklist item answered "not selected —
evidence assembled"); no pricing/entitlement effect authorised; no AAE
amendment required by this brief; authorities reviewed: charter §9.9 set plus
all ten A3 documents.
