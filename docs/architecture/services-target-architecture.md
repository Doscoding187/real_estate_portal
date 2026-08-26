# Services Target Architecture

**Status:** Architect deliverable (Services future-state mandate, Sections 20–22)
**Companion:** `docs/architecture/services-current-state-audit.md`
**Authority:** Subordinate to `AGENTS.md`, `docs/architecture/database-authority-policy.md`,
and the Database Authority v3 spine. Schema changes execute only through approved
migrations on a dedicated database-authority workstream.

---

## 1. Domain boundaries

**Services owns (canonical):**

- Provider business presence for service fulfilment (`service_providers`)
- Governed service taxonomy (`service_taxonomy_nodes`)
- Provider capability offerings (`service_offerings`)
- Provider service coverage (`provider_service_areas`)
- Verification evidence (`provider_verifications`)
- Provider reviews (`provider_reviews`) and portfolio (`provider_portfolio_items`)
- The need: `service_requests`
- The routing unit: `service_introductions`
- Marketplace memory: `service_request_events`

**Shared platform infrastructure (not Services-owned):**

| Concern | Canonical owner |
| --- | --- |
| Human identity, auth, roles | `users` (core) |
| Geography | `provinces` / `cities` / `suburbs` (locations.ts) — referenced by FK, never duplicated |
| Property inventory context | `properties`, `listings`, `developments` — referenced by FK as origin context only |
| Explore content | Explore domain (`explore_content`, …) — Services may hold nullable references, never content pipelines or moderation workflows |
| Commercial engine | billing domain (`plans`, `planEntitlements`, `subscriptions`, invoices/payments) — the *only* subscription/monetisation authority; Services stores point-in-time commercial snapshots on introductions, never live subscription state |
| Media upload/storage | media infrastructure |

**Explicit non-goals for MVP:** AI ranking, bidding, payments/escrow, provider CRM,
commissions, booking engines, public numeric rankings, automated regulatory checks.

---

## 2. Canonical entities and relationships

```text
users 1 ── 1 service_providers (business identity, participation status)
                          │
        ┌─────────────────┼───────────────────────┬──────────────────────┐
        │                 │                       │                      │
 service_offerings   provider_service_areas  provider_verifications  provider_reviews
   (n:1 → taxonomy)      (n:1 → geography)     (evidence rows)      (optionally ← introductions)
                                                        │
service_taxonomy_nodes (self-referencing tree:          │
  family → category → service/capability)               │
        │                                               │
        └──────────> service_requests <─────────────────┘
                     (the canonical NEED: requester, capability node,
                      geography refs, property/listing/development origin refs,
                      journey stage, source attribution, status)
                          │
                   service_introductions (unique per request×provider;
                      lifecycle states; source; commercialSnapshot)
                          │
                   service_request_events (request-scoped / introduction-scoped,
                      actor-typed workflow + telemetry events)
```

### Entity definitions (conceptual; Drizzle models implement these)

1. **`service_providers`** — id, ownerUserId→users (unique for MVP), name, unique slug,
   logoUrl, about, websiteUrl, contactEmail, contactPhone,
   participationStatus enum(`draft|pending_review|live|paused|suspended`),
   primaryTaxonomyNodeId nullable, timestamps.
   *Owns:* business identity + go-live state. *Does not own:* reputation scores, content counters.
   Individual professional identities (agent-style profiles under an organisation) are a
   documented extension point, not built now.

2. **`service_taxonomy_nodes`** — id, parentId self-FK nullable, slug unique, level
   (`family|category|service|capability`), name, description, iconKey nullable, isActive,
   sortOrder, timestamps. Stable slugs are the public identifier. Seeded canonically;
   providers reference nodes, they never define them. Navigation families from v1
   (home improvement, finance & legal, …) survive as family-level nodes where useful.

3. **`service_offerings`** — id, providerId FK, taxonomyNodeId FK (must be service/capability
   level), displayNameOverride nullable, description, priceMin/priceMax nullable (ZAR),
   isActive, timestamps. Unique(providerId, taxonomyNodeId).

4. **`provider_service_areas`** — id, providerId FK, countryCode default 'ZA',
   provinceId/cityId/suburbId nullable FKs into canonical geography (at least one set required
   unless coverageType is national/remote), coverageType enum(`locality|radius|province|
   national|remote`), radiusKm nullable int, isPrimary, createdAt.

5. **`service_requests`** — id, publicReference (opaque short code), requesterUserId nullable
   FK, requesterContactSnapshot json nullable (guest MVP path), taxonomyNodeId FK (needed
   capability), title nullable, description text, timelineBand enum nullable
   (`asap|weeks|month|quarter|flexible`), budgetBand enum nullable, location provinceId/cityId/
   suburbId nullable FKs + locationText snapshot, propertyId/listingId/developmentId nullable
   FKs, journeyStage enum, sourceSurface enum (extended), originType varchar + originId int
   nullable (polymorphic surface anchor), reasonCode nullable, status enum
   (`open|routing|introduced|connected|closed_matched|closed_no_match|cancelled`),
   contextJson governed metadata, createdAt/updatedAt/closedAt.

6. **`service_introductions`** — id, requestId FK, providerId FK, unique(requestId, providerId),
   status enum(`suggested|introduced|viewed|accepted|declined|contacted|quote_requested|
   quote_submitted|shortlisted|hired|completed|lost|no_response|expired`), source enum
   (`auto_shortlist|admin_manual|consumer_selected|provider_direct`), commercialSnapshot json
   (e.g. tier at introduction time — descriptive, never ranking input), respondedAt/connectedAt/
   closedAt, note, timestamps.

7. **`service_request_events`** — id, requestId FK, introductionId FK nullable,
   eventType enum covering request lifecycle, introduction lifecycle, and consumer telemetry
   (recommendations_shown, provider_card_clicked, results_empty_shown…), actorUserId nullable,
   actorType enum(`consumer|provider|admin|system`), payload json, createdAt.
   Append-only.

8. **`provider_verifications`** — id, providerId FK, dimension enum(`identity|
   business_registration|professional_registration|regulatory_status|licence_certification|
   insurance|contact|platform_history`), status enum(`unverified|submitted|verified|failed|
   expired`), evidenceRefs json, verifiedByUserId nullable FK (admin), verifiedAt, expiresAt
   nullable, notes. Multiple rows per provider; required dimensions per taxonomy family are a
   governed configuration, not hard-coded in matching code.

9. **`provider_reviews`** — id, providerId FK, introductionId FK nullable (when present +
   introduction completed ⇒ review displays as "Verified review"), reviewerUserId nullable,
   rating 1–5, title, content, moderationStatus, isPublished, publishedAt, timestamps.

10. **`provider_portfolio_items`** — id, providerId FK, mediaUrl, caption, contentType,
    linkedExploreContentId nullable FK (shared reference, not ownership), sortOrder,
    isPublished, timestamps.

---

## 3. Ownership matrix

| Concept | Source of truth | Consumers must |
| --- | --- | --- |
| Business identity, logo, contact, website | `service_providers` | join, never duplicate |
| What a provider can do | `service_offerings` × `service_taxonomy_nodes` | derive labels from taxonomy |
| Where a provider works | `provider_service_areas` (+ geography tables) | resolve names via joins |
| What services exist | `service_taxonomy_nodes` | read via catalog API/shared seed-derived constants |
| A customer need | `service_requests` | never reconstruct from introductions |
| Who received a need + their response | `service_introductions` | never infer from events alone |
| Trustworthiness | `provider_verifications` (+ outcome-linked reviews) | render evidence-backed labels only |
| Subscription/commercial state | billing domain | snapshot descriptively at introduction |
| South African geography | provinces/cities/suburbs | reference by FK |
| Content/videos | Explore domain | link by id, no pipelines here |

---

## 4. Request lifecycle

```text
Need creation            Request                  Matching / eligibility         Introduction                 Provider response        Outcome
────────────────        ───────────              ──────────────────────         ────────────                 ────────────────         ───────
Guided intake     →     service_requests   →     eligible shortlist       →    service_introductions   →    viewed/accepted     →    quote/hire/complete
(context pre-filled      (status=open)           (deterministic rules)          suggested|introduced         declined/no-resp         closed_matched /
 from listing/dev/                                                              admin can promote/           notification             closed_no_match /
 location/explore)                                                              suppress                                              cancelled
```

Rules:

- One consumer expression of need ⇒ exactly one `service_requests` row, forever.
- Zero or more introductions per request; request remains canonical if zero match
  (`closed_no_match` records the demand signal).
- Consumer "connect/contact" transitions an existing introduction; it never creates demand rows.
- Admin/manual routing is first-class: admins create/suppress introductions while volume is low.
- Every transition appends a typed event with actor type. Attribution columns are immutable
  after creation.

## 5. Context model

Structured first-class columns on `service_requests`: requester, capability node, geography
FKs, property/listing/development FKs, journeyStage, sourceSurface, originType/originId,
reasonCode, timeline/budget bands. `contextJson` carries genuinely extensible annotations
(e.g. explore content reference beyond the anchored origin, campaign ids, accessibility notes)
under documented key conventions. Nothing that has a column belongs in contextJson; nothing in
contextJson is allowed to be required for matching.

Cross-engine flow examples:

- Listing page → inspection action ⇒ request(propertyId, listingId, originType='listing',
  journeyStage='buyer_due_diligence', reasonCode='listing_inspection_cta')
- Explore video (architect) → request(originType='explore_content', contextJson.exploreContentId)
- Location page → directory browse (no request yet) ⇒ provider discovery filtered by cityId
- Completed acquisition journey → move/insurance/security injection ⇒ journeyStage='buyer_move_ready'

## 6. Trust model

- Evidence-based: each verification row states dimension, status, who verified, when, expiry.
- Public rendering maps verified dimensions to honest badges ("Company registered",
  "Professional registration verified") — never a single unexplained score.
- Family-specific requirement config governs which dimensions gate **auto-introduction**
  (e.g. finance/legal require verified professional_registration before automatic routing;
  otherwise requests route to admin queue). Gating config lives in governed data/config, not UI.
- Reviews: "Verified review" ⇔ introduction-linked and completed outcome. No invented counts,
  testimonials, or aggregate ratings anywhere; empty states say so plainly.
- `trustScore`, `moderationTier`, and self-service tier escalation are removed. If a numeric
  provider quality score ever returns, it must be derived, explainable, and evidence-backed.

## 7. Taxonomy model

- Adjacency tree with stable slugs; levels: family → category → service → capability.
- Canonical seed authored once (governed file + migration-applied reference data), exposed to:
  - backend (validation against node ids/slugs),
  - frontend via `services.catalog` query (cached) — no parallel FE enum authority.
- Initial seed migrates the six v1 families into family/category nodes and adds the mandate's
  exemplar paths (Finance → Home Finance → Bond Origination; Legal → Conveyancing; Inspection →
  Compliance → Electrical COC; Home Improvement → Electrical; Home Improvement → Solar/Backup
  Power; Professional Services → Architecture → Residential Alterations).
- Governance: only admin/governed changes mutate nodes; provider-created strings cannot become
  taxonomy. Offering displayNameOverride allows marketing wording without taxonomy drift.

## 8. Geography model

- Requests and provider areas reference canonical `provinces/cities/suburbs` by FK.
- Coverage semantics: locality (suburb), radius (city/suburb anchor + radiusKm), province-wide,
  national, remote. Request-side matching uses the finest available anchors.
- Intake reuses the platform's existing location autocomplete resolution; free-text input is
  resolved to canonical ids at submission; display text stored as audit snapshot only.
- No polygons MVP. Future polygon/coverage models extend `coverageType` without re-shaping
  request geography.

## 9. Event / attribution model

- `sourceSurface` extended: `services_direct|listing|property|development|location_page|
  explore|agent_workspace|developer_workspace|property_management`.
- `originType/originId` anchor the exact surface object (listing id, development id,
  explore_content id, location page slug-id…). `journeyStage` is a small governed enum
  (seller/buyer/owner/renter/developer phases) separate from surface.
- All marketplace learning questions (what is asked, where, who was considered, who responds,
  outcomes) are answerable from requests + introductions + events without log parsing.

## 10. API boundaries (tRPC)

Namespaced router replacing `servicesEngineRouter`:

- `services.catalog.*` (public): tree/nodes/bySlug lookup.
- `services.providers.*` (public): directorySearch (taxonomy+geography SQL), getPublicProfile,
  getReviews. (Provider-facing:) myProfile, replaceOfferings, replaceServiceAreas,
  submitForReview, myIntroductions, respondToIntroduction, myDashboard.
- `services.requests.*` (consumer): create (one request; optional requestedProviderCount),
  get(byReference), mine, cancel, connectIntroduction.
- `services.admin.*` (super admin): verification queue/decide, routing queue (create/suppress
  introductions), participation status changes, taxonomy governance.
- Frontend and other engines integrate **only** through these procedures. Injection surfaces
  call `services.requests.create` with origin context; they never compose internal enums except
  catalog-derived values.

Zod schemas derive enums from shared seed-derived constants (single module import), eliminating
the triple-duplicated authority.

## 11. Migration / retirement strategy (mandate §21)

Sequence (each step its own approved migration; additive before destructive):

1. **Create** new canonical tables (providers, taxonomy, offerings, areas, verifications,
   requests, introductions, events, reviews, portfolio) — expansion migration(s).
2. **Seed** taxonomy reference data (transactional DML migration) + verification-dimension
   requirements config.
3. **Backfill** (pre-launch volumes are trivial; verify emptiness first):
   map `partners`+profiles → `service_providers`; offerings from `service_provider_services`;
   areas resolved to canonical geo where possible (unresolvable rows flagged for admin);
   open leads grouped → requests + introductions; reviews carried with isVerified=false unless
   outcome-linkable. If tables are empty on the launch path, skip backfill and drop directly.
4. **Cut over runtime**: new `servicesRouter` + `servicesService` (new domain files), rewrite
   contract tests to enforce new authority, switch frontend feature-by-feature behind stable
   routes (URLs preserved: `/services…`, `/service/profile`, `/service/dashboard`).
5. **Retire**: drop v1 tables (`service_leads`, `service_lead_events`,
   `service_provider_profiles`, `service_provider_services`, `service_provider_locations`,
   `service_provider_subscriptions`, `service_provider_reviews`, `service_explore_videos`,
   `partners`, `partner_tiers`, `partner_subscriptions`*, `marketplace.services` orphan),
   delete `leadGenerationService.ts`, remove dead db.ts helpers, remove topic pages, strip
   subscription step. (*`partner_subscriptions` retirement coordinates with the founding-partner
   workstream; until then it is explicitly out of Services scope and untouched.)
6. **Enforce**: rewritten `contract.database-services-authority.test.ts` +
   `contract.services-runtime-authority.test.ts` asserting: providers centrality (all supply FKs
   → service_providers.id), taxonomy slugs stable + seeded, geography FK usage (no varchar geo
   columns), one-request-many-introductions shape (unique constraint), no tier signal in any
   organic scoring code path, event append-only shape.

No parallel v1/v2 runtimes during cutover inside the same release train; the repository moves
to one system per the database-authority policy.

## 12. Implementation sequence mapped to mandate §22

- Phase 3 (Convergence prep): dedicated branch/worktree; migrations 1–2; contract test rewrite.
- Phase 4 (Backend): `server/services/services/*` domain modules + `servicesRouter`;
  deterministic matcher module with explicit, tested eligibility + organic ordering (no tier).
- Phase 5 (UX): Services home (honest trust/evidence framing), guided request flow (context-aware,
  writes one request), results = stored introductions, provider profile (evidence badges),
  onboarding wizard minus plan step (submit-for-review ending), admin routing/verification views.
- Phase 6 (Integration): injection components resolve catalog nodes; persist origin context;
  location-page provider browsing; Explore links via portfolio references only.
- Phase 7 (Validation): full consumer loop, provider loop, admin ops, attribution assertions,
  geography congruency, a11y/mobile passes, `pnpm check`, lint, tests, `db:verify`.

Quality bar: no visible Coming Soon surfaces; every metric rendered exists in data; every
internal concept stays invisible to users.
