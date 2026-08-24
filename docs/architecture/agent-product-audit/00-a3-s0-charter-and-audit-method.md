# A3-S0 — Agent Product Audit & Value Proposition Charter

| Field | Value |
| --- | --- |
| Programme | `A3 — Agent Product Audit & Value Proposition` |
| Status | Draft charter; awaiting founder approval before area audits begin |
| Predecessor | Agent Launch MVP merged through PR #491 (A2-S1 + R1–R5) and PR #496 (A2-S4 activation-to-renewal continuity) |
| Scope | Whole-product audit of the agent experience from first discovery through retention and expansion; production of an evidence-graded value map and decision register |
| Non-scope | Implementation, schema, routes, public copy, pricing decisions, package tiers |
| Governing authorities reviewed | AAE-S0/S1A/S1B including doc 25 entry gate; Commercial Revenue Architecture (S2/S4); Founding Cohort Evidence Runbook (durability-audit mandate §8) |
| Relationship to AAE | **Aligns** with AAE-S0 baseline and S1A evidence boundary; **uses** S1B agent propositions as qualified inputs; **does not authorise or enter AAE-S1C** |

## 1. Mandate

PR #491 established the Agent Launch MVP foundation. The next risk is no longer
missing implementation; it is unexamined product value. A3 steps back from
implementation slices and audits the complete agent product from the agent's
perspective.

The audit is governed by one question:

> **What must be true for the Agent Product to be genuinely worth paying for
> and worth continuing to use?**

It is explicitly not the question "what features can we add?" Feature ideas are
admissible only as outputs of value findings, never as audit inputs.

## 2. Position relative to governing authorities

This section records the alignment required by the AAE mandatory review rule.

1. **AAE-S0 baseline (aligns).** The audit examines how the agent journey
   expresses the approved Discovery → Trust → Operations → Progression model.
   It may reclassify maturity within layers but does not amend the master
   proposition or audience structure.
2. **AAE-S1A evidence boundary (extends usage).** Every audit finding about a
   platform capability must cite the atomic capability register (`AGT-*`,
   `CON-*`, `RTE-*`, `CLM-*`, `PRF-*`) with its delivered/qualified/prohibited
   grade. Findings may not upgrade a grade; they may propose reclassification
   with evidence, routed to the owning authority.
3. **AAE-S1B agent propositions (qualified inputs).** `AGT-PROP-01`–`AGT-PROP-04`
   supply the working problem hypothesis: present opportunities, receive
   supported enquiries, organise listing/lead/viewing/mandate/deal work in one
   context. Their recorded limits stand: entitlement and availability remain
   unresolved; verification, performance, CRM, ROI, trial and pricing claims
   remain prohibited under `PLT-PROP-10`.
4. **AAE-S1C entry gate (feeds, does not enter).** Doc 25 lists "Agent motion —
   self-service, assisted or hybrid; individual eligibility and activation" as
   a founder decision required before S1C. A3's output is structured input to
   that decision. A3 makes no motion, pricing, offer, entitlement or
   availability decision. `AAE_S1C_ENTRY=REQUIRES_FOUNDER_DECISION` is
   unchanged by this workstream.
5. **Founding Cohort Evidence Runbook (binds).** The runbook approved under the
   durability-audit mandate §8 is the only measurement instrument this audit
   may use for cohort behaviour. Its Observed/Unknown evidence model governs:
   numbers exist only when a real agent generates them; Inferred claims are
   never promoted into decisions. A3 must not create a parallel analytics or
   metrics authority.
6. **Commercial Revenue Architecture (respects).** S2 canonical independent-
   agent commercial authority and S4 paid Launch Access generalization define
   the implemented commercial truth the audits observe. Commercial non-goals
   (no unified campaign engine, no paid placement mutating organic records, no
   premature billing generalization) bound every Expansion finding.
7. **Land consumer journey contract (unaffected).** A3 performs no Land
   geography search or authoring work.

## 3. Audit sequence

Every element below is examined against the full journey spine:

```
Discover → Understand → Consider → Convert → Onboard → Activate →
Operate → Get discovered → Receive leads → See value → Return → Grow
```

The spine starts before onboarding. `/agent/setup` is mid-journey, not the
beginning.

## 4. Audit areas

### 4.1 Acquisition

Where does an agent encounter Property Listify at all?

- Homepage professional surfaces
- Google/SEO: sitemaps, location pages, property pages
- Agent directory and presence pages
- Explore and other discovery surfaces
- Referrals and other professional entry points

Core question: which of these actually produce agent arrivals today, and which
merely technically could?

### 4.2 Proposition

What exactly is promised to an agent, and why should they care?

- What Launch Access includes, limits, and deliberately excludes
- Whether the promise is stronger than "list your properties"
- Which promises are repository-truthful versus aspirational
- How the promise maps to `AGT-PROP-01`–`AGT-PROP-04`

### 4.3 Conversion

Landing page, pricing presentation, CTAs, proof, objections, trust, payment,
and what happens immediately after payment.

Constraint: conversion findings must respect the S1B prohibition boundary —
no finding may recommend adding proof, claims or comparisons the evidence
registers prohibit.

### 4.4 Onboarding

Registration, identity, approval, profile completion, listings, activation and
first meaningful outcome. Includes measuring time-to-first-outcome against the
runbook's operational questions (Q7 approval/renewal burden).

### 4.5 Agent workspace

Once logged in, why would an agent open the dashboard tomorrow morning?

- What do they see, what needs attention, what can they accomplish?
- What tells them Property Listify is helping their business?
- Where does daily utility come from when presence panels honestly read zero?

### 4.6 Distribution

Exposure surfaces: agent presence, listings, suburb/city pages, detail pages,
search, Explore.

Core question: is distribution a *meaningful product benefit* an agent can
observe and verify, or something that happens to be technically implemented?
R2 location reciprocity made distribution true end-to-end; the audit asks
whether it is *evidenced* to agents.

### 4.7 Leads

Not "can an enquiry technically be captured?"

- Where demand comes from and how it reaches the agent
- Speed: enquiry-awareness latency (runbook Q2)
- What the agent does next, and whether the platform supports it
- Direct-contact intent capture versus form capture (runbook Q1)

### 4.8 Retention

The major missing strategic layer. What makes an agent think "I need Property
Listify" rather than "I paid R499 once and put my listings there"?

- Reporting, presence proof, leads, listing performance, visibility
- Workflow dependence and future expansion hooks
- Renewal posture at the T-7 final week (runbook Q6) and engagement linkage (Q8)

Retention findings must distinguish what can be designed now from what only
cohort evidence can answer.

### 4.9 Expansion

Only after core value is established:

- What belongs in Launch Access; what should have limits
- What becomes an upgrade, a paid add-on, or agency scope
- Where professional services could eventually plug in

Sequencing rule: establish the value engine first, then package it. Package
tiers are an output candidate, never a starting assumption. Any packaging
recommendation routes to the founder's S1C agent-motion decision, not to
implementation.

## 5. Method and evidence rules

1. Repository evidence first. Each area audit inventories what exists, citing
   routes, services and tests, graded through the S1A register where applicable.
2. Cohort behaviour comes only from runbook queries Q1–Q8 with their cadence
   and interpretation discipline. Missing data invalidates dependent findings
   and shifts attention explicitly (for example, zero platform-wide leads
   invalidates lead-latency conclusions and prioritises acquisition).
3. Honest empty states are respected: an absent number is recorded Unknown,
   not estimated.
4. Classifications in the output map are produced by the audit, never assumed
   in advance.
5. One agent is anecdote; three is signal; the full cohort is evidence.

## 6. Output contract

The synthesis deliverable is a decision map in this shape:

| Area | Existing | Quality | Agent value | Gap | Decision |
| --- | --- | --- | --- | --- | --- |
| Acquisition | *(filled by audit)* | | | | |
| Proposition | | | | | |
| Conversion | | | | | |
| Onboarding | | | | | |
| Workspace | | | | | |
| Distribution | | | | | |
| Leads | | | | | |
| Retention | | | | | |
| Expansion | | | | | |

Each Decision cell takes exactly one of: `Refine`, `Audit deeper`, `Improve`,
`Define`, `Strengthen`, `Develop`, `Design`, `Defer`, plus the authority route
any change requires. Alongside the map, each area produces implementation-slice
candidates that must individually pass the AAE future-slice compliance
checklist (AAE index, ten questions) before entering any backlog.

Final output: an agent-value decision brief suitable as founder input for the
doc 25 "Agent motion" decision and any subsequent S1C scoping.

## 7. Workstream sequencing

| Slice | Deliverable |
| --- | --- |
| A3-S0 | This charter (approval gate) |
| A3-A1…A9 | One area audit document per section-4 area, numbered in audit order |
| A3-B1 | Synthesis decision map |
| A3-C1 | Founder decision brief (agent motion input; no decisions taken) |

Area audits may proceed in parallel once this charter is approved; synthesis
waits for all nine.

## 8. Hard boundaries

- No application code, schema, migration, route or UI changes.
- No public copy, claims, pricing, offers, trials or entitlement statements.
- No new metrics collection beyond the existing runbook instrument.
- No package-tier design ahead of the value-engine finding.
- No amendment of AAE documents; proposed amendments are recorded as findings
  with their authority route.

## 9. AAE compliance checklist answers

Answering the AAE future-slice compliance checklist for this workstream:

1. **Audience:** Individual agents (S1B), with agency adjacency noted where
   affiliation affects the solo-agent journey.
2. **Problem/outcome:** Fragmented inventory, profile and demand workflows;
   outcome is supported listing, enquiry and progression work in one context
   (`AGT-PROP-02`).
3. **Layer support:** All four layers audited; primary weight on Operations
   and Trust, where agent-perceived value concentrates.
4. **Real capabilities:** Findings cite S1A atomic IDs; nothing rests on
   undelivered capability.
5. **Unverified claims:** None introduced; prohibition boundary `PLT-PROP-10`
   applies to all outputs.
6. **Commercial motion:** Not selected. Evidence is assembled for the founder's
   self-service/assisted/hybrid decision.
7. **Pricing/entitlements effect:** None authorised; dependencies recorded.
8. **Authority amendment required:** No. Aligns and extends usage within
   existing authority.
9. **Authority reviewed:** AAE index; docs 00, 11, 21, 22, 25; Commercial
   Revenue Architecture S2/S4; Founding Cohort Evidence Runbook.
10. **Promise/experience consistency:** Enforced by requiring every public-
    facing recommendation to carry its evidence grade and route.
