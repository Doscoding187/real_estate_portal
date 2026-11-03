# Services V3 Growth-Journey Gap Assessment

**Status:** Draft assessment for founder review. This document records findings only.
It does not amend `services-v1-product-contract.md` (authority for the published
Services surface), `services-v2-product-contract.md` (approved MVP direction), the
launch register, or any database authority. Nothing here authorizes or schedules work.

**Date:** 2026-10-28
**Task branch:** `feat/services-growth-journey-gap-assessment-20261028` (worktree `property-listify-services-gap-assessment-20261028`, read-only investigation; this document is the only change)
**Method:** Read-only audit of the integrated Services engine source on `main` at `026586690` plus the two Services contracts and the canonical sitemap/navigation code.

## 1. Purpose and evaluation lens

Edward's approved product direction for Services is a **service business growth
platform**, not a directory: the platform helps a service provider get discovered,
build a credible brand presence, convert interest into attributable enquiries, work
the opportunity, and retain or hand over the customer relationship. This document
maps what the Services engine **actually implements today** against that journey and
classifies every capability as:

| Class | Meaning |
| --- | --- |
| **Shipped** | Implemented, contract-governed, verified in the audited source |
| **Partial** | Useful core exists with named, bounded gaps |
| **Missing** | Does not exist in the engine |
| **Out-of-authority** | Exists only as typed-but-rejected, blueprint, or retired form; work would require new contract and, where it touches data, database authority |

The five-stage journey used as the lens:

1. **Get discovered** — search, SEO/AI discovery, local intent, referral surfaces
2. **Build a brand** — public web presence, media, per-service personalization
3. **Convert interest** — trust signals, enquiry capture, fail-closed routing
4. **Work the opportunity** — inbox, status, follow-up, first-response discipline
5. **Retain or hand over** — platform custody, export/external handover, measurement

One architectural principle governs the vision: *platform-attributed demand and
provider-attributed demand must converge into the same attributable lead record.*
Everything below is evaluated against it.

## 2. Baseline inventory (shipped)

### 2.1 Public consumer surfaces

| Surface | Route | Notes (file → line) |
| --- | --- | --- |
| Services home | `/services` | Hero search, ranked category rail, featured providers, spotlight, trust panels; canonical indexable; queries `directorySearch` limit 50 sort `rating` (`client/src/pages/services/ServicesHomePage.tsx:95-131`) |
| Category directory | `/services/:category` | All six categories; filters surfaced (query, price, availability, sort); unmatched-request banner; indexable (`ServicesCategoryPage.tsx:110-136`) |
| Localized directory | `/services/:category/:city/:province` | Canonical 3-segment redirect; indexable (`ServicesLocalizedCategoryPage.tsx:120-184`) |
| Provider profile | `/services/provider/:slug` | Brand plate, verified chip, availability chip, ratings only when `reviewCount > 0`, 4 tabs (overview / services / areas / contact); fact-only trust cards; external website CTA + one request CTA; indexable (`ServiceProviderProfilePage.tsx:158-574`) |
| Reviews page | `/services/reviews/:providerId` | Verified-request submission, moderation copy, report flow; `noindex` (`ServiceProviderReviewsPage.tsx:88-95`) |
| Request flow | `/services/request/:category` | One attributable request; idempotency key in sessionStorage; `noindex` (`ServicesRequestPage.tsx:89-172`) |
| Lead confirmation | `/services/results/:leadId` | Status chip, provider attribution, journey context echo, privacy boundary card; `noindex` (`ServicesResultsPage.tsx:54-254`) |
| SEO topic pages | `/services/{home-loans, property-valuation, legal-services, home-insurance, interior-design}` | 5 curated topic landings inside the category route; indexable; sitemap-listed (`ServiceTopicPage.tsx:16-140`) |
| Provider acquisition | `/advertise/services` | Truthful small-cohort copy, no paid plans (`AdvertiseServicesPage.tsx:41-75`) |
| Admin review | `/admin/services-review` | Publication queue + review moderation + report triage (`adminRouteRegistry.tsx:143-146`) |
| Provider workspace | `/service/dashboard` | Inbox, status transitions, stats, onboarding checklist; gated on publication or assigned requests (`ProDashboardPage.tsx:48-76`) |
| Provider editor | `/service/profile` | Onboarding wizard (6 steps) or full profile editor; services/coverage replacement authority (`ProviderOnboardingWizard.tsx`, `ProProfilePage.tsx`) |

### 2.2 Server engine (`server/servicesEngineRouter.ts`, `server/services/servicesEngineService.ts`)

- **Directory search** (router 443; service 2590–2810): eligibility conjunction
  `partners.isActive ∧ verificationStatus='verified' ∧ directoryActive=1 ∧ subscription ∈ {trial, active} ∧ ≥1 active service ∧ ≥1 coverage-valid location`
  (2626–2727). Filters: text query, category, serviceCode, ZAR price overlap,
  `accepting` availability, province/city/suburb **exact** matching (593–639).
  Sorts: `relevance` (deterministic Bayesian rating + completeness + supply, 326–341),
  `rating`, `name`; universal name/id tiebreak (2780–2781). Candidate scan bounded
  at 1000 rows (823).
- **Provider public profile** (1077–1110): returns identity, headline/bio, website
  URL, ratings, gallery (metadata URLs, max 12, 308–315), services, listed coverage,
  published reviews. Deliberately excludes contact email/phone, tiers, radius
  (252–267, 1064–1074).
- **Reviewed publication** (2011–2119): single writer of
  `partners.verificationStatus` + `service_provider_profiles.directoryActive`;
  fail-closed readiness recompute inside the transaction; audited
  (`audit_logs`, 2095–2108). Queue and transition share one readiness
  computation (1751–2010), so they cannot disagree.
- **Attributable request** (2812–3131): stable request id `sv1:sha256(...)`
  (2830–2832); requester row locked; provider re-validated under row locks
  (641–724); context allow-list `{sourceDetail, reasonKey, propertyLinked,
  serviceCode}` (361–390); property/listing/development context validated against
  canonical records server-side (2953–3022); explore rejected (2833–2835);
  agent/developer attributions role-gated (2842–2854); replays must match the
  normalized original on every material field or fail
  (`Request key has already been used`); unreadable stored context fails closed
  (`SERVICE_REQUEST_REPLAY_UNAVAILABLE`, 396–397). Router adds IP rate limiting
  (router 720–726).
- **Lifecycle** (3133–3215): `new → accepted|expired|lost`, `accepted →
  quoted|won|lost|expired`, `quoted → won|lost|expired`; terminal states have no
  outgoing edges (726–740). Mandatory response note; optimistic CAS on status
  (3174–3191); every transition writes `service_lead_events` (3204–3213).
- **Provider dashboard** (3405–3452): windowed counts, `totalLeads`,
  `activePipeline`, `conversionRate` (won / terminal-with-response), per-status and
  per-source counts. Does **not** read `service_lead_events`; no response-time, trend,
  revenue, or per-service metrics.
- **Verified-request reviews** (1186–1460): eligibility = terminal `won|lost` lead
  with the provider; one review per reviewer per provider; `pending` by default;
  moderation and report triage with audited decisions and bounded report quota
  (1462–1565); aggregates recomputed transactionally from published reviews only
  (1264–1289).
- **Entitlement surface** (`drizzle/schema/servicesEngine.ts:22-32`):
  subscription tier vocabulary `directory | directory_explore | ecosystem_pro` and
  status `trial | active | past_due | cancelled` exist and are honoured by the
  eligibility conjunction; no tier is sold and `billingEligible` is always written
  `0` (3102) — unwired by design, which preserves V2 §3.1.
- **Explore boundary**: `service_explore_videos` table retains a moderation gate
  (230–268); the runty `/service/explore` route does not exist client-side and the
  `explore` source surface is rejected server-side — hidden per V1 contract.

### 2.3 Attribution capture (client)

- Journey injections already fire into the request page from property actions
  (`PropertyServiceActions` maps, `features/services/propertyServiceActions.ts:19-110`),
  the consumer dashboard (`UserDashboard.tsx:1036,1279,1839,1857`), and the agent
  dashboard (`AgentServicesReferral.tsx:54-63`, "No publishing access required").
- Enumerated `sourceSurface` (`directory | journey_injection | agent_dashboard`) and
  eight `intentStage` values are the canonical request-context taxonomy.
- **No UTM/campaign capture** exists in any services surface (grep: zero matches);
  UTM handling exists only in developer-lead surfaces.

### 2.4 SEO infrastructure (shared sitemap authority)

- `shared/sitemapIndex.ts:6-12`: children are listings, developments, agents,
  static, guides — **no services child**.
- `server/routes/sitemap.ts:324-345`: `/services` plus the **five topic pages only**
  are listed under `sitemap-static.xml`. Category pages, localized category pages,
  and provider profiles are **not sitemap-listed** (contract tests lock agents and
  guides sitemaps as editorial-publication systems; services has no equivalent).
- `client/src/lib/seo.ts:74-143`: `applySeo` supports managed JSON-LD structured
  data; **no services page passes it** (grep: zero `structuredData:` calls in
  services). The Advertise engine has a full WebPage/Service/Organization/
  Breadcrumb schema set (`components/advertise/StructuredData.tsx:135-144`);
  Services has none — no `LocalBusiness`, no `AggregateRating`, no breadcrumbs.
- `noindex` is correctly set on request/results/reviews/workspace; indexables set
  canonical URLs. Category page does **not** redirect non-canonical slug spellings
  (underscore aliases keep a separate URL form; `ServicesCategoryPage.tsx:129-136`),
  while the localized page does redirect (120–135) — inconsistent.

## 3. Gap analysis by journey stage

### Stage 1 — Get discovered

| Capability | Class | Facts |
| --- | --- | --- |
| Public directory surfaces | Shipped | §2.1 — home, category, localized, profile, topics; truthful exact-matching taxonomy of "listed coverage" |
| Provider structured data (JSON-LD) | **Missing** | No LocalBusiness/Service/Organization/AggregateRating anywhere in Services; the capability exists in `applySeo` and the pattern exists in Advertise |
| Services sitemap (providers, categories, localized) | **Missing** | Only `/services` + 5 topic pages are listed; providers/categories/localized rely on crawl alone |
| Canonical place geography in coverage | Out-of-authority by recorded deferral | Display-text province/city/suburb, exact non-widening matching, V1 deferral reaffirmed 2026-10-21; typed Place references are a governed Place Authority consumer slice |
| Radius/proximity search | Out-of-authority | `radiusKm` stored (schema 160) but never used in matching (service 593–639) — truthful as listed coverage, not a distance claim |
| AI-discovery content depth | Partial | Topic pages are thin content; provider profiles are the crawlable business asset; guideline posts (V1 deps) have no services-specific guidance content |
| Page slug hygiene | Partial | Un-canonicalized category aliases create duplicate indexable URL shapes; localized pages canonicalize, category pages do not |
| Directory scale bound | Partial | Candidate scan capped at 1,000 providers (823) with in-memory filtering — a ceiling to revisit before growth, flagged for a governed slice when triggered |

### Stage 2 — Build a brand

| Capability | Class | Facts |
| --- | --- | --- |
| Public business presence (profile as homepage) | Partial | Strong single profile page with tabs, brand plate, gallery, services, coverage, biography — the correct seed of the V3 "web presence"; no per-provider deeper pages (service detail pages, case studies, projects) |
| Provider media library | Missing (schema) | Gallery is provider-supplied URLs in `service_provider_profiles.metadata` max 12 (308–315); no ownership/moderation/ordering model — V2 §6 MINI-1, requires database authority |
| Case studies / project content | Missing (schema) | V2 §6 MINI-2; no content model exists |
| Campaign/landing pages | **Missing** | Defined in the new direction but nothing exists: no campaign entity, no source-capture beyond `sourceDetail`, no landing route family, no noindex-by-default policy mechanism |
| Ratings/reviews as brand trust | Shipped | Verified-request only, moderation-gated, transactionally recomputed — the platform's honest trust ladder |
| Offers/plans/badges in consumer surface | Correctly absent | No tier badge, plan, or paid placement rendered anywhere (V2 §3.1 prohibition holds) |

### Stage 3 — Convert interest

| Capability | Class | Facts |
| --- | --- | --- |
| One attributable enquiry action per provider | Shipped | Card/profile CTA → request flow; no mass-matching; unmatched → fail-closed banner, never sent to an unrelated provider |
| Journey/property context on enquiries | Shipped | Server-validated property/listing/development linkage (2953–3022) — **the differentiated asset**: an enquiry that arrives with a real attached property; no pure-play directory has this |
| Availability filter | Shipped | Provider-declared `accepting`/`waitlist` metadata (302–306); surfaced as locked verified-only checkbox + filter |
| Alternative conversion channels (call/WhatsApp/booking) | Correctly absent / contract decision | Public profile excludes contact fields (72, contract rule: enquiry is the only contact route); any new channel is a V1 amendment, not drift |
| Quote artifacts | Missing (deferred) | `quoted` is a status only; formal quote semantics are V1 remaining dep #4, not built |
| Trust signal breadth | Partial | Ratings supported but organic review volume is zero in a new cohort — measured-response metrics (below) would be the second honest rung |

### Stage 4 — Work the opportunity

| Capability | Class | Facts |
| --- | --- | --- |
| Lead inbox with requester contact + context | Shipped | Contact exposed to assigned provider only (3380–3399) per V1 contract; property/listing/development context carried |
| Status lifecycle with notes | Shipped | §2.2 lifecycle, mandatory note, CAS, event writes |
| Inbox search/filter/totals | **Missing** | No status filter, search, or total count on the provider inbox (3356–3403) |
| First-response latency measurement | **Missing** | No response-time computation anywhere in the engine; `firstResponseOverdueSql` exists only in the property-lead system (`leadTransitionService.ts:40`). The event stream already contains everything needed (created vs first accepted/quoted event) |
| Follow-up reminders / due lists | **Missing** | No reminder, timer, or scheduler capability. The retired phase-0 notification engine is archive-only and must not be resurrected; a delivered reminder domain needs a fresh owner and design |
| Auto-expiry for stale leads | **Missing** | `expired` reachable only by manual provider transition; no scheduler by design |
| Dashboard depth (trends, per-service, per-source conversion) | Partial | Counts/`byStatus`/`bySource` shipped; the dashboard never reads `service_lead_events` — events such as `provider_card_clicked`, `recommendations_shown`, `results_empty_shown` are written but unused as analytics |
| Notifications (new-request alert channel) | Missing | No email/notification wiring inside the engine; transactional email infrastructure exists in the repo (`transactionalEmailProvider.ts`) but is not connected; delivery domain needs defining before any wiring |

### Stage 5 — Retain or hand over

| Capability | Class | Facts |
| --- | --- | --- |
| Platform custody of the lead record | Shipped | Single `service_leads` authority, idempotent replay, requester-row locking; provider retains custody of assigned requests even after publication withdrawal (V1 46) |
| Export/handover to external CRM | **Missing** | No export, sync, webhook, or file capability exists in the engine; POPIA contact-consent semantics for export are undefined |
| Lead delivery notifications to provider | Missing | As above — fresh delivery domain required |
| Outcome measurement surfaced to providers | Partial | Dashboard counts + conversion rate only |

### Cross-cutting findings

1. **The eligibility/publication chain is bedrock and must survive the V3 migration
   unchanged** — fail-closed readiness, audited single-writer publication,
   public re-verification of the conjunction, deterministic named sorts. Nothing in
   the growth direction touches these.
2. **Blueprinted-but-unrendered weight exists in the client**: unused components
   (`ServicesSkeletons`, `TrustBar`, `DemandCarousel`, `PopularProjectsGrid`,
   `CostGuidesSection`, `ServiceHeroSearch`, `LeadRequestWizard`, `MatchQualityBadge`),
   unused catalog content (`POPULAR_PROJECTS`, `COST_GUIDES`), a lone lazy `ProProfilePage`
   import with no route. Cleanup candidates, not authority issues.
3. **Small consistency defects** (worth sweeping in a hygiene slice):
   - Reviews page uses `/login?redirect=…`; request page and shared helper use
     `/login?next=…` (`ServiceProviderReviewsPage.tsx:372` vs `publicNavigation.ts:1159`).
   - `service_provider` canonical account destination: `/service/profile`
     (`publicNavigation.ts:1190`) vs `/service/dashboard` (`SmartDashboardRedirect.tsx:32-33`).
   - Dashboard links use underscore category aliases (`UserDashboard.tsx:1036`)
     that never canonicalize.
4. **Unwired surfaces that are consistent with pilot scope**: `explore` surface
   (rejected server-side), subscription tiers (preserved entitlement columns),
   `billingEligible` (always 0), footer newsletter (recorded as proposed, not
   rendered). Each stays until its own authority record says otherwise.

## 4. The V3 contract deltas this assessment supports

Each delta names its work type. Schema/DB items additionally require their own
database-authority workstream per `docs/architecture/database-authority-policy.md`.

| # | Delta | Type | Notes |
| --- | --- | --- | --- |
| DELTA-1 | **Provider web presence** — evolve the provider profile into the provider's public homepage: keep one canonical business identity; add per-service detail pages and richer brand surfaces on existing data first | Code | Follows V2 §6.4 sequencing (MINI-3/MINI-4 before any schema); no second trust/profile authority |
| DELTA-2 | **Campaign landing pages with provider-attributed demand capture** — provider-owned campaign URLs, structured campaign source capture extending the context allow-list, landing route family, `noindex` by default with an explicit indexability decision per stage | Code + contract | New request-context vocabulary must preserve idempotency and replay semantics; doorway-page hygiene rule (no thin indexable variants) is a contract clause |
| DELTA-3 | **Measured response performance** — compute first-response latency and responsiveness aggregates from existing `service_lead_events`; render "responds within ~Xh (measured)" only from computed truth | Code | No invented trust signals; this creates the honest second rung of the trust ladder |
| DELTA-4 | **Services SEO infrastructure** — services sitemap child (providers, categories, localized), JSON-LD structured data (LocalBusiness/Service, AggregateRating only from recomputed aggregates), canonical slug normalization | Code | Mirrors the agent/guide sitemap editorial-publication pattern already contract-tested |
| DELTA-5 | **Provider media library** — ownership, moderation, ordering, primary cover | Schema (DB authority) | V2 MINI-1; build when provider behaviour evidences it |
| DELTA-6 | **Provider content model** (case studies/projects) | Schema (DB authority) | V2 MINI-2; same sequencing rule |
| DELTA-7 | **Lead workspace upgrades** — inbox filters/search/totals, per-source and per-service conversion views, event-driven analytics | Code | Dashboard must begin consuming its own event stream |
| DELTA-8 | **Fresh notification/delivery domain** — new-request alerts, follow-up reminders, due lists | Contract + ops authority | Retired phase-0 implementation stays retired; define owner, channel, delivery contract first |
| DELTA-9 | **Export/handover** — structured lead export with consent basis, retention window, and export-boundary records | Contract (+ POPIA review) | Platform remains the attribution system of record after handover |
| DELTA-10 | **Coverage geography convergence** — typed canonical Place references for provider coverage and request geography | Place Authority consumer slice | Pre-existing recorded slice; prerequisite for `service × place` local discovery pages at scale |
| DELTA-11 | **Commercial model research** — paid tiers/placement/lead fees | Founder decision | V2 §3.1 remains: no commercialization until researched and approved |

## 5. Priority reading

**P0 — make the core commercial journey excellent (code-only, no schema):**
DELTA-3, DELTA-4, DELTA-7, plus the hygiene sweep in §3.3 (auth param, account
destination, slug canonicalization) and a V3 contract that records DELTA-1/2
terminology. These raise the value of what already converted: presence, discovery,
enquiry quality, responsiveness evidence.

**P1 — provider-attributed demand (the differentiator):**
DELTA-1 then DELTA-2, in that order, obeying V2 §6.4. Landing pages without an
excellent base presence are thin; base presence after landing pages risks building
the campaign funnel on a weak home page.

**P2 — operational depth:** DELTA-8 (notifications/reminder domain), then DELTA-9
(export/handover with POPIA consent semantics).

**P3 — evidence-gated schema expansion:** DELTA-5, DELTA-6 as real provider
Behaviour justifies them; DELTA-10 when the Place Authority slice is scheduled;
DELTA-11 after market research.

## 6. What must not change (recorded guardrails)

1. The reviewed publication transition, its fail-closed readiness gate, and its
   audit record (V1 §Reviewed publication authority).
2. The public directory eligibility conjunction and deterministic named sorts.
3. V1 §Enquiry privacy: the enquiry action is the only publisher of provider
   contact; provider inbox contact exposure stays exactly as contract-defined.
4. "No invented trust signals" — measured metrics render only from computed event
   truth; no fabricated counts, response times, availability beyond declared metadata.
5. No Explore integration, engagement mutation, or `explore` source acceptance
   outside a separate approved slice.
6. The V2 §3.1 pilot commercial posture: no plan, price, tier badge, sponsored
   placement, or "featured" claim in any consumer or provider surface.
7. One request authority: campaign/enquiry/mini-site variants all write
   `service_leads` with the same idempotent request identity — no second CRM.

## 7. Open decisions for Edward

1. Approve this as the working basis for a **Services V3 product contract**
   (growth-journey model + web presence terminology superseding the V2 §6
   "mini-site" vocabulary).
2. Confirm the P0 ordering (§5) — especially whether DELTA-4 (SEO infrastructure)
   precedes DELTA-1 (web presence), given discovery currently depends on crawl
   luck and a five-topic sitemap.
3. Choose whether DELTA-8 (notifications/reminder domain) or DELTA-9
   (export/handover) is the first "retain or hand over" deliverable — they serve
   different provider segments (platform-only operators vs CRM carriers).
4. Delegate the client hygiene sweep (§3.3) and unused-component cleanup as its
   own small slice, or fold into DELTA-7.

---

*Sources:* audit of `server/servicesEngineRouter.ts`, `server/services/servicesEngineService.ts`,
`drizzle/schema/servicesEngine.ts`, `client/src/pages/services/**`, `client/src/pages/pro/**`,
`client/src/features/services/**`, `client/src/components/services/**`,
`client/src/lib/publicNavigation.ts`, `client/src/lib/seo.ts`, `shared/sitemapIndex.ts`,
`server/routes/sitemap.ts`, `client/src/pages/advertise/AdvertiseServicesPage.tsx`;
contracts `services-v1-product-contract.md`, `services-v2-product-contract.md`;
canonical launch register `03-launch-register.md`. All line references verified against
`main` at `026586690` in this worktree.
