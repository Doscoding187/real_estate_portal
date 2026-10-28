# Property Listify Services V3 Growth Contract (Draft)

**Status:** **DRAFT — awaiting Edward's approval.** Nothing in this document is
active direction until Edward approves the decision register in §3. Until then,
`services-v1-product-contract.md` and `services-v2-product-contract.md` remain
the only active Services contracts.

**Owner:** Edward (product decisions) / product engineering (delivery)

**Relationship to earlier contracts:**

- V1 remains the authority for behaviour that is already shipped on the public
  Services surface. This draft does not amend, weaken, or supersede V1. Any
  change to shipped V1 behaviour remains an explicit V1 amendment.
- V2 remains the active direction contract for the delivered Services product.
  If this draft is approved, it **supersedes V2 §6 ("provider mini-site")
  terminology** with the provider web presence model in §6 of this document —
  the same capability delta, restated under the growth-journey model. V2 §3
  (business model, ratings and reviews, Explore, property journey) is carried
  forward by reference and is restated only where this draft extends it.

**Basis:** `services-v3-growth-journey-gap-assessment-2026-10-28.md` (§3 gaps,
§4 deltas, §5 priorities, §6 guardrails, §7 open decisions), verified against
the working tree at `feat/services-lead-workspace-20261028` / `54165677e`.
Disposition history lives in `services-engine-state-register.md`, which remains
the standing state authority for the Services vertical.

## 1. Why V3 exists

V1 built the engine: provider identity, reviewed publication, listed coverage,
one attributable request, a lead lifecycle, and super-admin review. V2 made it
a product: a first-class destination with its own visual language, a honest
ratings and reviews ladder, and price/availability discovery filters.

What the growth-journey gap assessment showed is that the _provider_ side of
the product stops after conversion. A provider can be discovered, can present
a credible profile, and can receive attributable requests — and then has a
single flat inbox, no measurable responsiveness record, no provider-owned
demand surface, and no handover story. The consumer journey is good; the
provider journey does not yet reward excellent providers for everything they
do after an enquiry lands.

V3 is a provider-side product contract:

1. **Leads are the strategic convergence point.** Every capture surface —
   directory, property journey, future campaigns, future agent handoffs —
   writes the same idempotent `service_leads` row. V3 invests in what keeps
   that single authority valuable: attribution truth, responsiveness evidence,
   and a workspace that makes working the lead a pleasure.
2. **Property context is the differentiator.** An enquiry that arrives with a
   real attached property is not something a pure-play directory can copy.
   V3 builds presence and demand capture on top of that context rather than
   imitating directory competition.
3. **Growth, for the provider, is a five-stage journey.** The contract names
   the stages, records what is shipped at each, and attaches the approved
   deltas to the gaps.

## 2. The provider growth journey

One provider, presented as five stages. Shipped state is stated from the
register; deltas are the V3 investments.

| Stage                    | What shipped today                                                                                                                | V3 deltas                                             |
| ------------------------ | --------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------- |
| 1 — Get discovered       | Six public surfaces, truthful exact-matching taxonomy, sitemap child + JSON-LD + slug canonicalization (DELTA-4)                  | DELTA-10 at scale; DELTA-11 later                     |
| 2 — Build a brand        | Profile with brand plate, gallery, services, coverage, biography; verified reviews; measured response trust fact (DELTA-3)        | DELTA-1 web presence; DELTA-5/6 evidence-gated schema |
| 3 — Convert interest     | One attributable enquiry per provider with property/listing/development context; honest filters                                   | DELTA-2 campaign capture                              |
| 4 — Work the opportunity | Lead lifecycle with mandatory-note status events, CAS custody, filtered workspace, request mix, measured first response (DELTA-7) | DELTA-8 reminders/alerts (fresh domain)               |
| 5 — Retain or hand over  | Platform custody of the lead record through publication withdrawal                                                                | DELTA-9 export/handover                               |

**The consumer journey is unchanged as a matter of authority.** Discover →
compare → one-to-one enquiry remains governed by V1. V3 does not add a second
enquiry authority, a second trust authority, or a second CRM.

## 3. Decision register

Each decision is **Proposed — awaiting Edward's approval**. The register is
written so that approval of this document activates all of them without
re-decision; objections can be raised per item.

### 3.1 Structuring basis (supersedes V2 §6 vocabulary)

**Decision: the growth-journey model structures V3.** The V2 §6 "mini-site"
direction is restated (not abandoned) as the **provider web presence**: one
canonical business identity per provider whose profile page evolves into the
provider's public homepage. Vocabulary mapping, recorded so no capability is
lost in translation:

| V2 term                                              | V3 term / home                           |
| ---------------------------------------------------- | ---------------------------------------- |
| MINI-1 media library                                 | DELTA-5 (schema, evidence-gated)         |
| MINI-2 case study model                              | DELTA-6 (schema, evidence-gated)         |
| MINI-3 site route/navigation + MINI-4 enquiry wiring | DELTA-1 (code-first, existing data)      |
| MINI-5 multi-branch                                  | Stays deferred (evidence-led, unchanged) |
| "Mini-site"                                          | Provider web presence (§6)               |

V2 §6.4 sequencing carries forward: presence depth on existing data first;
schema only when provider behaviour evidences it.

### 3.2 Provider web presence (DELTA-1)

**Decision: evolve the existing profile page into the provider's public
homepage, adding per-service detail pages and brand surfaces on existing
data first.** No second identity, trust, contact, or service authority may be
created. The full specification, including what it must not become, is §6.

Per-service detail pages are the first net-new surface: each published
service renders on its own canonical, sitemap-listed page with the enquiry
action, so a consumer searching "plumbing Pretoria" can land directly on the
plumbing page of a provider who covers Pretoria.

### 3.3 Campaign landing pages with provider-attributed capture (DELTA-2)

**Decision: provider-owned campaign URLs are approved as direction**, with
these contract clauses:

1. **Attribution honesty.** A campaign request is the existing
   `createLeadFromJourney` request with a structured campaign context
   extension to the validated context allow-list — preserving idempotent
   request identity and replay semantics. No new lead table, no second
   request authority.
2. **`noindex` by default.** Campaign landing routes are excluded from
   indexing unless Edward explicitly approves indexability for a specific
   campaign class; each campaign stage records its indexability decision.
   Doorway-page hygiene is a contract clause: no thin indexable keyword
   variants, ever.
3. **Sequencing.** DELTA-2 is built after DELTA-1 (P1 order); landing pages
   without an excellent base presence are thin.
4. **Platform remains the attribution system of record.** Campaign capture
   deepens attribution; it never moves lead custody out of the platform.

### 3.4 Trust ladder

**Decision: trust claims remain "computed truth only", now with two live
rungs.** Verified-request ratings (V2 §3.3, in force) and measured first
response (DELTA-3, shipped — median only from `service_lead_events`, sample
gated at >= 3 measured requests). Neither rung may be fabricated, and the
ladder does not gain new rungs — no years in business, insurance badges, or
match scores — without a new contract clause that states its evidence basis.

### 3.5 Commercial posture

**Decision: unchanged.** V2 §3.1 remains in force: free controlled cohort, no
paid placement, no lead fees, no tier merchandising; the entitlement schema
surface is preserved for the future. DELTA-11 (commercial model) stays a
founder decision behind research.

### 3.6 Retain-or-hand-over ordering

**Decision (recommendation): DELTA-8 first, then DELTA-9, as recorded in the
gap assessment §5.** Rationale: platform-only operators (the current cohort)
lose leads to silence before they lose anything to absent CRM export, and a
delivered reminder/alert domain is the prerequisite for a mature workspace;
DELTA-9's POPIA consent semantics and export-boundary records can then be
designed against real delivery behaviour. **If Edward judges the CRM-carrying
segment materially larger or commercially nearer, invert the order** — DELTA-9
is contract + POPIA review and is safe to build first. Either way, the retired
phase-0 notification engine stays retired; DELTA-8 is a fresh design with a
defined owner, channel, and delivery contract.

### 3.7 Hygiene disposition

**Decision (recorded, executed): the client hygiene sweep folded into
DELTA-7**, which shipped in `feat/services-lead-workspace-20261028` together
with the dead `ProProfilePage` loose-end resolution (§4.2 of the register).
No separate hygiene slice is pending.

## 4. Scope of this contract

### 4.1 Shipped and governed (reference)

The register `services-engine-state-register.md` is the authoritative shipped
state, including: the directory surfaces and publication chain (V1), the V2
MVP surfaces, verified-request reviews, sitemap/JSON-LD/slug infrastructure
(DELTA-4), measured response performance (DELTA-3), and the filtered lead
workspace (DELTA-7). This contract adds no authority that contradicts it.

### 4.2 Approved next build (pending §3 approval): DELTA-1

| #    | Requirement                                                                                                           | Notes                                                                          |
| ---- | --------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| P1-1 | Per-service detail pages between profile and enquiry, on existing `service_provider_services` data                    | Code-only; canonical URLs from the shared slug authority                       |
| P1-2 | Brand-surface upgrades on the profile (homepage treatment) using existing data                                        | No schema; imagery stays provider-supplied metadata until DELTA-5 evidences it |
| P1-3 | Reuse of the single enquiry action with source/context attribution intact                                             | V1 enquiry privacy unchanged                                                   |
| P1-4 | Sitemap child participation and per-page `applySeo` (title/description/canonical/social)                              | Builds on DELTA-4 infrastructure                                               |
| P1-5 | Contract tests: eligibility reuse (no weaker public bar than the directory), canonical paths, no new trust vocabulary | Engine-side selection must go through publication/eligibility authority        |

DELTA-2 (campaign capture, §3.3) is the following approved build, requiring
its own context-vocabulary design note before code.

### 4.3 Evidence-gated and deferred

| Delta                                         | Gate                                                                                                              |
| --------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| DELTA-5 media library / DELTA-6 content model | Provider behaviour evidences the schema; own Database Authority workstream each                                   |
| DELTA-10 coverage geography convergence       | Pre-existing recorded Place Authority consumer slice; prerequisite for `service × place` discovery pages at scale |
| DELTA-11 commercial model                     | V2 §3.1 research gate                                                                                             |
| Multi-branch (V2 MINI-5)                      | Evidenced requirements from real provider behaviour                                                               |

### 4.4 Decisions consolidated for Edward

| #   | Decision                                                              | State                                                                                                                                                         |
| --- | --------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A   | Approve this contract as the Services V3 direction (activates §3)     | Open — this document                                                                                                                                          |
| B   | Confirm DELTA-1 as the next build                                     | Recommendation: yes, as P1-1..5                                                                                                                               |
| C   | DELTA-8 before DELTA-9                                                | Recommendation: keep §3.6 order; inversion is safe and supported if the CRM segment is nearer                                                                 |
| D   | P0 ordering and hygiene-sweep disposition (gap assessment §7.2, §7.4) | Already executed under Edward's per-slice approvals: DELTA-4 → DELTA-3 → DELTA-7 (+ hygiene fold). No further decision needed; recorded here for completeness |

## 5. Boundaries this workstream must not cross (V3 additions and restatements)

1. The reviewed publication transition, fail-closed readiness gate, audit
   record, public eligibility conjunction, and deterministic named sorts —
   unchanged (gap assessment §6.1–6.2).
2. V1 enquiry privacy: the enquiry action is the only publisher of provider
   contact; inbox contact exposure stays exactly as V1 defines it.
3. No invented trust signals — §3.4 holds across every new surface.
4. No second request authority, no second CRM, no second profile identity:
   every capture surface writes `service_leads` under the same idempotency
   rules (gap assessment §6.7).
5. Campaign landing pages must not create thin indexable variants; §3.3.2 is
   enforceable at review time, not aspirational.
6. No commercialization surface (V2 §3.1 restated).
7. No Explore integration, engagement mutation, or `explore` source acceptance
   outside a separately approved slice (V2 §3.4).
8. No schema change in the DELTA-1/DELTA-2 code slices; each schema delta keeps
   its own Database Authority workstream and gate.
9. The retired phase-0 notification engine is never resurrected; DELTA-8 is a
   fresh design (gap assessment §6 and register warnings).

## 6. Provider web presence specification

**Status:** specification for DELTA-1 (approved-pending build) plus
evidence-gated depth. This section restates V2 §6 under the §3.1 vocabulary
mapping; the capability obligations of V2 §6.1 are preserved verbatim in
meaning.

### 6.1 Shape

The provider's profile page and its direct children form the provider's
public homepage: one canonical identity under Property Listify, with its own
SEO surface, carrying business name, headline, logo, verification state,
services with price ranges, listed coverage, biography, business details, and
exactly one enquiry action routed to the existing request authority.

| Region            | V3 home                                       | Source of truth today                                                | New capability needed                               |
| ----------------- | --------------------------------------------- | -------------------------------------------------------------------- | --------------------------------------------------- |
| Identity and hero | Profile page                                  | `partners`, `service_provider_profiles`                              | None                                                |
| Service set       | Profile + **per-service detail pages (P1-1)** | `service_provider_services`                                          | None (canonical routing only)                       |
| Coverage          | Profile + localized pages                     | `service_provider_locations`                                         | None                                                |
| Credentials       | Profile                                       | `service_provider_profiles`                                          | None                                                |
| Trust             | Profile trust facts                           | Recomputed review aggregates (V2 §3.3) + measured response (DELTA-3) | None                                                |
| Imagery           | Profile gallery                               | Provider-supplied metadata URLs + `partners.logoUrl`                 | DELTA-5 when evidenced                              |
| Case studies      | Per-service pages, depth content              | None                                                                 | DELTA-6 when evidenced                              |
| Enquiry           | Profile and per-service pages                 | `createLeadFromJourney`                                              | None                                                |
| SEO               | All presence pages                            | DELTA-4 infrastructure                                               | Per-service canonical paths + sitemap participation |

### 6.2 What it must not become

- No ratings, review counts, or response metrics except the computed-truth
  rungs of §3.4; no other trust vocabulary.
- No plan, price, tier, badge, or placement advantage.
- No visitor-visible contact fields; the enquiry action remains the only
  route to the provider.
- No second request authority; a per-service page enquiry is the same
  idempotent `service_leads` row.
- No second trust or identity authority; the presence reads the same
  publication/eligibility chain as the directory.
- No general-purpose "profile engine": the presence does not own listings,
  developments, property search, or trust decisions.

### 6.3 Sequencing

1. **DELTA-1 (code-only)** — per-service detail pages + homepage treatment
   against existing data (V2 §6.4 step 1 carried forward).
2. **DELTA-2 (code + contract)** — campaign capture on top of the built
   presence.
3. **DELTA-5 / DELTA-6 (schema, evidence-gated)** — only when provider
   behaviour demands them; each with its own Database Authority workstream.
4. Multi-branch remains deferred.

## 7. Definition of done for the DELTA-1 slice

1. Each published provider service renders a canonical per-service detail
   page whose eligibility rules are no weaker than the public directory's,
   served from the same publication/eligibility authority.
2. The presence surfaces carry per-page `applySeo` metadata, canonical paths,
   and services-sitemap participation built on DELTA-4.
3. The enquiry action is reused as-is, with correct source/context
   attribution and unchanged V1 privacy posture.
4. No schema change; no new trust vocabulary; no commercial surface
   (boundaries §5 verified in review).
5. Typecheck, lint, and the Services client and server suites pass with no
   new failures; new surfaces carry their own contract tests.
6. The register records the slice, and V1 and V2 remain unamended.

---

_Sources:_ `services-v1-product-contract.md`, `services-v2-product-contract.md`,
`services-v3-growth-journey-gap-assessment-2026-10-28.md`,
`services-engine-state-register.md`; implementation evidence at
`feat/services-lead-workspace-20261028` (`54165677e`).
