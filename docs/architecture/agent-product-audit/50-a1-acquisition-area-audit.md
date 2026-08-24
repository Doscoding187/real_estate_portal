# A3-A1 — Acquisition Area Audit

| Field | Value |
| --- | --- |
| Slice | `A3-A1` (charter §4.1 Acquisition) |
| Status | Draft area audit; synthesis input to A3-B1 |
| Core question | Which surfaces actually produce agent arrivals today, and which merely technically could? |
| Evidence basis | Public navigation/sitemap/directory/funnel inventory at main state `c035c7d5` |
| Runbook dependence | None available — Q1–Q8 measure cohort behaviour after arrival; no instrument measures acquisition source. Recorded explicitly: this audit cannot answer its own core question with today's authority |

## 1. Existing inventory

### 1.1 Surfaces capable of producing an agent arrival

| Surface | Route / file | Promise or hook |
| --- | --- | --- |
| Homepage professional band | `client/src/sections/home/ProfessionalEntrySection.tsx`, rendered in both `HomeDesktopView`/`HomeMobileView` (:48) | "Your property business, powered by Property Listify." CTAs → `/advertise/sell/agents`, `/agents` |
| Navbar professionals mega-menu | `client/src/components/ProfessionalsMegaMenu.tsx`; destinations `client/src/lib/publicNavigation.ts:695–774` | "Grow your property business"; Agent onboarding → `/advertise/sell/agents` (`LIMITED_BUT_VALID`) |
| Buyer-side paths into directory | hero journey `find_agent` "Find an Agent", buyers item "Find an estate agent" → `/agents` | Consumers arrive at the directory whose header recruits: "Are you an agent? Get your own presence" (`Agents.tsx:74`) |
| Footer | `client/src/components/ModernFooter.tsx:11–13` | Agents · Advertise/List Property |
| Advertise funnel | `/advertise` hub → `/advertise/sell` chooser → `/advertise/sell/agents` landing | Full commercial-truth-tested funnel |
| SEO | `server/routes/sitemap.ts`: `/sitemap-agents.xml` (approved agents, weekly, 0.6), `/sitemap-static.xml` includes `/agents` 0.7; `seoHead.ts` serves `index, follow` + canonical on every profile | Every approved agent profile is organically indexed |
| Referral network | `/distribution-network` (+apply/login) | Serves referrer/partner identities, **not** agent acquisition |

### 1.2 What gates visibility

Directory cards, `sitemap-agents.xml` and profile SEO require **approved status
only** — no payment, no badge (`agentPublicProfileService.ts:19`,
`sitemap.ts:210`). Unpaid agents get full organic presence; exposure products
begin at the location-reciprocity layer (see A6).

## 2. Quality assessment

Every surveyed entry point exists, is routed, and is truthful. Navigation test
coverage is strong (`publicNavigation.test.ts`, e2e nav-seo spec). The funnel
is coherent: discovery surface → directory → recruiting CTA → landing →
package selection. What does not exist anywhere is **measurement**: no signup-source
capture, no per-surface arrival attribution for professional accounts (lead
UTM fields apply to enquiries, not registrations). The repo can enumerate
doors; it cannot count who walked through which one.

## 3. Agent value analysis

Core question answered honestly: all listed surfaces *technically could*
produce arrivals; which *actually do* is Unknown under the charter's evidence
rules. The strongest structural bet is inverted acquisition — agents arrive by
seeing other agents' presence (directory, microsites, reciprocity modules),
i.e. the product's distribution output doubles as its acquisition input. That
loop is fully built. Charter §5.2 already anticipates the consequence: until
leads exist platform-wide, acquisition attention dominates — yet acquisition
itself has no instrument. Adding one would breach the charter's hard boundary
(no new metrics beyond the runbook), so this is recorded as a founder-facing
instrumentation finding, not a work item.

## 4. Gap register

| # | Gap | Type |
| --- | --- | --- |
| G1 | No acquisition-source measurement for professional signups (signup UTM/referrer not persisted) | Instrument gap — requires authority decision |
| G2 | `ProvincePage` renders no "professionals serving" module while City/Suburb do | Parity gap (cross-ref A6) |
| G3 | Explore closed to agents (`publisher_submissions_not_open`) though agent attribution slots exist in feed code | Dormant channel |
| G4 | Legacy `Footer.tsx` lacks Agents/Advertise links (only `ModernFooter.tsx` carries them) | Minor inconsistency |
| G5 | Stale hazard: `monetizationRouter.ts` header claims all endpoints 501 while `getRecommendedAgents` is live | Documentation rot |

## 5. Decision-map row inputs (A3-B1)

| Field | Value |
| --- | --- |
| Existing | Complete, truthful entry-point mesh; free organic presence for approved agents |
| Quality | High structural quality; zero acquisition measurement |
| Agent value | Arrival experience coherent; loop between distribution and acquisition built |
| Gap | G1–G5 |
| Decision candidate | **Audit deeper** (the area's core question is evidence-blocked); **Define** candidate: minimal acquisition instrumentation proposal routed to the founder as an authority decision (charter forbids creating it inside A3) |

## 6. Implementation-slice candidates

None inside A3 boundaries. G2/G4/G5 are tiny hygiene fixes routable through
the AAE checklist by the owning authority; G1 is explicitly out of scope until
the founder approves extending the measurement instrument.

## 7. Evidence discipline

All surface/gate statements cite code above. Arrival counts, channel mix and
conversion-by-source are Unknown — no estimate recorded, per charter §5.
