# A3-A6 — Distribution Area Audit

| Field | Value |
| --- | --- |
| Slice | `A3-A6` (charter §4.6 Distribution) |
| Status | Draft area audit; synthesis input to A3-B1 |
| Core question | Is distribution a *meaningful product benefit* an agent can observe and verify — or something that happens to be technically implemented? |
| Evidence basis | Attribution/reciprocity/microsite/search inventory at main state `c035c7d5`; R2 reciprocity contracts |
| Runbook dependence | Indirect: presence events feed the in-app proof panel; whether exposure produces demand is Q1/Q2 territory |

## 1. Existing inventory

### 1.1 Where an agent's identity and inventory actually appear

| Surface | What appears | Gate to appear |
| --- | --- | --- |
| Listing detail "Agent Overview" card (`PropertyDetailPage.tsx:1315–1368`) | Avatar, badge, name, agency subline, enquiry intro; **"View agent profile" → `/agents/{slug}`** | Full public eligibility chain incl. paid/badged recipient rule |
| Search result cards (`ListingResultCard.tsx`, `PropertyCard.tsx`) | Identity chip linking the microsite | Same eligibility chain |
| Public search (`propertySearchService.ts:612–653, 901–925`) | Agent name/phone/WhatsApp/email/slug on every eligible listing; joins only approved agents + verified agencies | Eligibility; ranking strictly neutral (price/date/suburb, tiebreak id) — payment buys nothing, exactly as the landing page promises |
| Agent directory `/agents` + sitemap + SEO | Card with direct phone/email; weekly-priority indexed profile pages | **Approved status only** (free) |
| Location reciprocity modules ("Property professionals serving {area}") on City + Suburb pages (`RecommendedAgents.tsx` via `LocationPageLayout`) | Top-8 agents, microsite links, verified-agency branding | **Paid personal entitlement OR verified-agency affiliation**; exact-match fail-closed area claims (`agentPublicProfileService.ts:462–548`; contract-tested) |
| Microsite `/agents/:slug` (+`/a/:slug`, numeric redirects) | Hero, bio, WhatsApp/Call/Email actions, local-market focus link, current-inventory grid (each listing independently eligibility-checked), areas-served chips (fail-closed), conversion CTAs | Approved only (free) |
| Explore | **Nothing — hard-closed to agents** (`publisher_submissions_not_open`); dormant agent attribution slots exist in feed code | n/a |

### 1.2 Observability delivered to the agent

The eight bounded presence events (profile view, listing click, area-guide
click, WhatsApp/call/email clicks, contact CTA, share) are emitted across the
microsite with PII-free payloads, validated server-side, aggregated into two
30-day windows, and rendered in the workspace Presence Proof panel with
honest zero-state coaching. R2 location reciprocity closed the loop the
charter references: distribution is now true end-to-end — inventory eligible →
identity attributed → reciprocity module placement → measurable interactions.

### 1.3 Verified absences

No agent filter in public search (consumers cannot browse "all listings by
agent X" from search); no province-level reciprocity module
(`ProvincePage.tsx` renders none); no component tests for `RecommendedAgents`;
directory ordering uses an admin-controlled `isFeatured` flag with no stated
public policy.

## 2. Quality assessment

Distribution is contract-tested unusually deeply for its layer
(`contract.agents-serving-location.test.ts` covers entitlement inclusion,
verified-agency inclusion of unbadged members, partial-claim rejection;
sitemap/SEO/analytics contracts all present). The gate matrix is coherent and
deliberate: free organic presence everywhere, paid advantage confined to the
reciprocity module and lead custody, zero ranking influence for money. The
stale `monetizationRouter` header (claims 501s; endpoint live) is the one
documentation hazard found.

## 3. Agent value analysis

Core question answered: **distribution is observable and verifiable by the
agent today** — that is what distinguishes it from merely-implemented. An
agent can see their microsite, find themselves on a city page, and watch the
presence counters move; unpaid agents can verify the free layer honestly.
What remains unproven is the step beyond visibility: whether impressions
become demand. That is precisely the Q1/Q2 boundary recorded in A7 — the
platform counts attention (events) and intent (enquiries) separately and
truthfully, and today only the agent can join them mentally, not the product.

## 4. Gap register

| # | Gap | Type |
| --- | --- | --- |
| G1 | Province pages lack the reciprocity module (City/Suburb only) | Parity gap |
| G2 | No agent-filtered browsing path from search to a full inventory view (microsite grid is capped at a 6-card preview + link) | Small reachability gap |
| G3 | Explore attribution slots dormant; channel closed with no stated reopening condition | Dormant channel |
| G4 | `isFeatured` directory boost has no documented policy surface | Governance gap |
| G5 | Presence-vs-enquiry conversion never shown side-by-side anywhere | Cross-ref A7 G1 |

## 5. Decision-map row inputs (A3-B1)

| Field | Value |
| --- | --- |
| Existing | End-to-end truthful distribution: attribution, reciprocity, microsites, SEO, honest analytics |
| Quality | High; deep contract coverage; gates deliberate and legible |
| Agent value | Real and self-verifiable at both free and paid tiers; demand-conversion proof still absent |
| Gap | G1–G5 |
| Decision candidate | **Strengthen** (G1 parity module; G2 full-inventory path — existing-capability work via AAE checklist); **Audit deeper** on exposure→demand once cohort data exists |

## 6. Implementation-slice candidates

Slice candidates: province-page reciprocity parity; microsite "view all
properties" first-class path; monetization-router header correction. None
touch ranking or placement rules (CRA non-goals hold). Each must pass the AAE
future-slice compliance checklist before backlog entry.

## 7. Evidence discipline

Surface/gate statements cite code and contracts above. Whether observed
exposure converts to enquiries is Unknown pending runbook instruments;
recorded, not estimated.
