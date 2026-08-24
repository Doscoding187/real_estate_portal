# A3-A2 — Proposition Area Audit

| Field | Value |
| --- | --- |
| Slice | `A3-A2` (charter §4.2 Proposition) |
| Status | Draft area audit; synthesis input to A3-B1 |
| Core question | What exactly is promised to an agent, and why should they care? |
| Evidence basis | Repository inventory at `d4bb6fbd` main state; S1A register doc 11; S1B propositions doc 21; prohibition boundary `PLT-PROP-10` |
| Runbook dependence | None direct; cohort demand answers feed Acquisition/Leads, not wording truth |

## 1. Existing inventory

### 1.1 Public promise surfaces

| Surface | Route | Promise (verbatim) |
| --- | --- | --- |
| Agent product landing hero | `/advertise/sell/agents`, `client/src/pages/advertise/AgentProductLandingPage.tsx:463` | "Run your listings, enquiries and follow-ups from one place." Sub: "…bring the work around every listing into one connected Agent workspace…" |
| Homepage professional band | Home desktop/mobile → `client/src/sections/home/ProfessionalEntrySection.tsx` | "Your property business, powered by Property Listify." Body: "Build your professional presence, market your listings, work your enquiries and prospect for new business from one operating workspace." CTAs: "Get Agent Launch Access" → landing; "See agent presences" → `/agents` |
| Landing pillars | `AgentProductLandingPage.tsx:50–88` | Inventory control · interest connected to the property · attention next · professional presence · analytics views |
| Inclusion list | same file `:98–123` | "Publish and manage inventory", "Participate in normal discovery", "Bring interest back with context", "Keep the next action visible", "Move the relationship forward" |
| Pricing presentation | `client/src/components/advertise/PricingPreviewSection.tsx:272` | "…make it discoverable, capture enquiries and use the strongest supported business tools for 90 days." |
| Segment benefits | `client/src/components/advertise/SegmentationLayer.tsx:31–32` | "Listing management", "Property enquiry access", "Agent follow-up tools" |
| FAQ honesty layer | `client/src/components/advertise/FAQSection.tsx:91,142–144`; landing FAQ `:130–165` | "It is not a monthly subscription."; "Are leads, enquiries or sales guaranteed?" → "No." ; "What happens after 90 days?" |
| Expiry truth-telling | `AgentProductLandingPage.tsx:157` | "Launch Access expires without automatic renewal. A future normal Agent commercial product will be required…" |

Copy-truth is mechanically enforced: `FAQSection.commercialTruth.test.tsx`,
`AgentProductLandingPage.commercialTruth.test.tsx` render-check R499/90-day terms
and forbid trial/monthly/guarantee phrasing.

### 1.2 Register alignment of every implied claim

| Promise element | Register ID | Grade (doc 11) |
| --- | --- | --- |
| Professional presence/profile | `AGT-01` | static implementation / **qualified** — publication not runtime-observed at register time |
| Verification trust | `AGT-02` | **prohibited** to claim verified status ("PPRA verified") |
| Listing creation/publication | `AGT-03`, `AGT-04` | test-backed & runtime-contract verified / **qualified** — plan/eligibility authority conflict remains |
| Enquiry access/capture | `AGT-07`, `CON-07` | runtime-contract verified / **delivered** (the only delivered agent-facing grade) |
| Analytics views | `AGT-06` | qualified — metrics cannot support ROI/reach claims |
| Entitlement framing ("what's included") | `AGT-15` | qualified — conflicting plan authorities, freshness gated on S1C |
| Prospect-for-new-business (homepage) | `AGT-11` | qualified — register records agency-operator reach; agent-role wrapper exists in code (`/agent/canvassing`) but is unregistered |

## 2. Quality assessment

- Copy is unusually disciplined: commercial-truth tests make aspirational drift
  a failing build, not a review hope.
- Every pillar maps to an existing workspace surface (verified against A5 audit).
- Two tensions found:
  1. Homepage promises "prospect for new business"; the register's canvassing
     record (`AGT-11`) scopes that to agency operators. Either the register
     needs an agent-scope amendment proposal or the copy narrows.
  2. Presence is promised while `AGT-01` publication remains only
     register-qualified — accurate but fragile until runtime observation lands.
- The proposition is deliberately outcome-free (per `PLT-PROP-10`). It sells
  workflow and access, not results. That is truthful and currently
  undifferentiated: nothing on the page could not be typed by a competitor.

## 3. Agent value analysis

Core question answered: the promise is stronger than "list your properties" —
it is *run listing, enquiry and follow-up work in one place* (`AGT-PROP-01`
through `AGT-PROP-04` working hypothesis), and every word of it is currently
true. But its persuasive force depends entirely on the agent already believing
enquiry flow matters. For an agent with zero leads, the honest proposition
reads as infrastructure without demand — which is correct today (platform-wide
lead volume is Unknown until runbook Q1/Q2 have data).

Repository-truthful vs aspirational: all surveyed claims are
repository-truthful; none observed crossing the prohibition boundary.

## 4. Gap register

| # | Gap | Type |
| --- | --- | --- |
| G1 | No differentiation beyond workflow truth; proof/testimonial layer prohibited under `PLT-PROP-10` until evidence authority changes | Structural, authority-bound |
| G2 | `AGT-02` verification capture exists but cannot be claimed; trust signal absent from proposition | Authority-bound (compliance unassigned) |
| G3 | Canvassing promise vs `AGT-11` agency-scope mismatch (homepage wording wider than register) | Registration inconsistency |
| G4 | Proposition cannot state what happens *when* a lead arrives (no response-time expectation; `CON-07` prohibits "guaranteed response") | Boundary, correct as-is |

## 5. Decision-map row inputs (A3-B1)

| Field | Value |
| --- | --- |
| Existing | Full public funnel with enforced copy-truth tests; promise maps to qualified/delivered register rows |
| Quality | High fidelity to repository truth; two registration tensions (G3) and one fragility (G2) |
| Agent value | Real but conditional on demand belief; zero-lead agents receive an infrastructure pitch |
| Gap | Differentiation, verification trust, canvassing scope reconciliation |
| Decision candidate | **Refine** — wording precision pass routed through Agent product authority; G3 resolved by either narrowing copy or proposing an `AGT-11` scope amendment via the owning authority |

## 6. Implementation-slice candidates

None advance directly. Wording refinements must individually pass the AAE
future-slice compliance checklist before any backlog entry. Packaging or offer
wording changes route to the founder's doc 25 "Agent motion" decision, not to
implementation.

## 7. Evidence discipline

All statements above cite repository files or register rows. Cohort-side
questions (does the promise convert? does it retain?) are recorded Unknown
pending runbook instruments; this audit does not estimate them.
