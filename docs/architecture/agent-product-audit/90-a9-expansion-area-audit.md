# A3-A9 — Expansion Area Audit

| Field | Value |
| --- | --- |
| Slice | `A3-A9` (charter §4.9 Expansion) |
| Status | Draft area audit; synthesis input to A3-B1 |
| Core question | After core value is established, what belongs in Launch Access, what should carry limits, and what becomes an upgrade, add-on or agency scope? |
| Evidence basis | Entitlement/catalog/adjacency inventory at main state `c035c7d5`; CRA S2/S4 non-goals bind all findings |
| Runbook dependence | Governing: charter sequencing rule — packaging is an output candidate only; value-engine evidence (Q3/Q4/Q6/Q8) gates every option below |

## 1. Existing inventory

### 1.1 What Launch Access is today (the package to expand from)

Canonical entitlement set is exactly three keys
(`canonicalCommercial.ts:88–132`, digest-enforced): `max_active_listings: 50`,
`has_commission_tracking: false`, `has_revenue_dashboard: false`. The 50-listing
capacity is race-safely enforced on every publication transition
(`listingPublicationEntitlementService.ts` with owner-row locks and explicit
exhaustion errors). UI lock states are wired across eight agent pages via one
component (`AgentFeatureLockedState.tsx`). No tiers, add-ons, coupons or upsell
SKUs exist for agents; the catalog's promotion object is permanently
`not_configured`; free-trial plans are filtered out of the public catalog by
design.

### 1.2 The headroom map (projected but unused keys)

`DEFAULT_FEATURE_ENTITLEMENTS` (`planAccessService.ts:37–49`) already projects
keys with no Launch Access consumer: `has_ai_insights`, `has_area_intelligence`,
`has_benchmarking`, `has_priority_exposure`, `has_recruitment_funnel`,
`has_team_dashboard`, `has_lead_routing`, `has_managed_mode`. These are
packaging *slots*, not promises — none is marketable under current grades.

### 1.3 Implemented-but-locked capability (nearest expansion candidates)

Commission tracking + CSV export exist, are tested, and are locked solely by
`has_commission_tracking=false` (`AgentEarnings.tsx` honest lock copy). The
revenue-dashboard key likewise has no enabled surface for agents. These are
the only expansion options in the repo that already satisfy the AAE "real
capabilities" test at code level — their commercial grades still govern.

### 1.4 Agency adjacency (the scope boundary)

Agency product grants what solo lacks (`CANONICAL_AGENCY_LAUNCH_ACCESS`):
commission tracking true, revenue/team dashboards true, lead routing true,
500-listing capacity — mirrored by register families AGY-01…AGY-10 (workspace,
roles, shared inventory, routing, accountability, branding, oversight,
performance reporting, deals, commissions), all technically verified but
commercially qualified/unresolved. Solo-agent expansion therefore has a
pre-built ceiling story: individual workflow depth inside Launch Access;
multi-person coordination as agency scope.

### 1.5 Dormant exposure products

`partnerBoostCampaignService` exists unregistered in any offer path
(AGT-16: exploratory, "Not currently marketable"); analytics stub returns
logged zeros. CRA non-goals hold regardless of future demand: no universal
campaign engine, no paid placement mutating organic records, no billing-table
generalization before entitlement read adapters.

## 2. Quality assessment

The packaging foundation is deliberately minimal and mechanically honest:
three entitlement keys, digest-enforced reference data, one lock-state
component, zero hidden SKUs. Expansion readiness is real but narrow — exactly
two implemented capabilities sit behind false flags, and everything else is a
projected key without a capability behind it.

## 3. Agent value analysis

Core question answered conditionally, per the charter's sequencing rule.
What *belongs in* Launch Access is settled by this audit only as observation:
inventory publication up to 50, enquiry receipt, presence/distribution layer,
CRM/showing/follow-up workflow — the value engine A5/A7/A8 examined. What
*could* carry limits later: listing capacity (already limited), commission
tracking (implemented), revenue dashboard (implemented), priority exposure
(prohibited wording territory until an approved delivery authority exists).
What becomes agency scope: multi-person coordination families AGY-01/02/03/04/05.
Every upgrade decision routes to the founder's doc 25 "Agent motion" gate —
this audit produces the option map, takes no decision, per charter §4.9 and §8.

## 4. Gap register

| # | Gap | Type |
| --- | --- | --- |
| G1 | Two implemented capabilities (commission tracking, revenue dashboard) have no activation authority or pricing home | Authority-bound (S1C/motion) |
| G2 | Seven projected entitlement keys have no capability behind them — drift risk if ever flipped casually | Governance note |
| G3 | Boost/campaign foundation dormant with stubbed analytics; no reopening criteria recorded | Dormant channel, CRA-bound |
| G4 | No renewal/continuation product posture ("future normal Agent commercial product" exists as copy only) | Founder motion decision |

## 5. Decision-map row inputs (A3-B1)

| Field | Value |
| --- | --- |
| Existing | One honest product, three enforced entitlements, two locked-but-real capabilities, clear agency ceiling |
| Quality | Mechanically clean; zero packaging debt found |
| Agent value | Expansion value exists only after core value proves — cohort-gated by design |
| Gap | G1–G4 above |
| Decision candidate | **Defer** all packaging moves pending Q3/Q4/Q6/Q8 evidence; **Define** candidates (commission-tracking unlock, continuation product posture) routed exclusively into the founder's doc 25 "Agent motion" inputs — no pricing/tier decisions authorized from inside A3 |

## 6. Implementation-slice candidates

None advance now. The correct next artifact is the founder decision brief
(A3-C1) carrying this option map with evidence grades attached. Any future
slice must pass the AAE future-slice compliance checklist and respect CRA
non-goals verbatim.

## 7. Evidence discipline

Entitlement/catalog statements cite canonical adapters, services and tests
above. Willingness-to-pay for any expansion is Unknown and stays that way
until runbook instruments say otherwise.
