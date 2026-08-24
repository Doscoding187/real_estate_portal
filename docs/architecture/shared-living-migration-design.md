# Shared Living — Migration & Domain Design

**Status:** Phase R design freeze — pending founder review and DB-authority protocol approval
**Programme:** Shared Living Foundations
**Related:** `docs/product/shared-living-spec.md`, `docs/compliance/shared-living-regulatory-boundary.md`
**Structural precedent:** `drizzle/schema/commercial.ts` (asset → space → availability → specifications), `commercial_lead_contexts`, moderation queue tables.

---

## 1. Design principles

1. **Place ≠ Space.** One place per address; many independently available spaces beneath it (one-place-many-spaces invariant).
2. **Canonical geography on the place**, approximate public projection by type (privacy model, spec §6).
3. **Authority is records, not self-description.** Attribution renders from verification/mandate rows.
4. **Leads stay canonical.** Enquiries reuse `capturePublicLead`; Shared Living contributes an adjunct context row + message thread only.
5. **Truth-preserving economics.** Included vs unknown vs to-confirm is representable for every recurring cost component (Cost Passport lesson).

## 2. Tables

Naming follows the commercial precedent (snake_case physical names). All tables: `id INT AUTOINCREMENT PK`, `created_at/updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP [ON UPDATE]`.

### 2.1 `sl_places`
| Column | Type | Notes |
|---|---|---|
| slug | varchar(160) unique | Public identity (`/shared-living/:slug`) |
| owner_user_id | int FK users | Creator; authority rows may extend |
| address_line_private | varchar(255) | Private canonical street address |
| province_id / city_id / suburb_id | int FK, nullable | Canonical geography (exact) |
| geo_precision | enum('suburb','city','province') | Public projection ceiling |
| latitude / longitude | decimal(10,8)/(11,8), nullable | Approximate public coordinates (centroid or exact per spec §6) |
| place_kind | enum('house','apartment','townhouse','student_residence','other') | Context of the shared dwelling |
| description | text | Place-level narrative |
| status | enum('draft','pending_review','published','paused','archived') | Publication lifecycle |

Indexes: `(suburb_id)`, `(city_id)`, `(province_id)`, `(status)`.

### 2.2 `sl_spaces`
| Column | Type | Notes |
|---|---|---|
| place_id | int FK sl_places (restrict) | |
| slug | varchar(180) unique | Detail route identity |
| label | varchar(120) | Lister's name ("Room 3", "Garden cottage") |
| accommodation_type | enum(spec §3 values) | |
| market_tag | enum('room_share','independent_micro','student') | Search facet |
| rentable_area_m2 | decimal(8,2), nullable | |
| furnished_state | enum('furnished','unfurnished','partial','unknown') | |
| bathroom_access | enum('own','shared','unknown') | |
| parking_bays | int nullable | |
| status | enum('available','occupied','paused','hidden') | Per-space availability truth |
| sort_order | int | |

Indexes: `(place_id, status)`, `(accommodation_type, status)`.

### 2.3 `sl_space_availability`
One active row per space (unique on space_id where not superseded); history preserved via updated_at + audit events later if needed.

| Column | Notes |
|---|---|
| space_id FK unique | |
| available_from date nullable | |
| minimum_stay_months int nullable | |
| rent_amount_minor int | Monthly, ZAR minor |
| bills_included | json — `{electricity:bool, water:bool, wifi:bool, cleaning:bool, other:text}` |
| deposit_minor int nullable | |
| rent_unknown boolean | Truth flag: "rent to confirm" state is representable |

### 2.4 `sl_space_specifications`
Mirrors `commercial_space_specifications`: `(space_id FK, specification_code, value_state enum('known','unknown'), text_value, boolean_value tinyint, numeric_value decimal)`. Unique `(space_id, specification_code)`.

MVP codes: `en_suite`, `own_entrance`, `kitchenette`, `backup_power`, `backup_water`, `fibre_connectivity`, `desk_study_area`, `laundry_access`, `secure_parking`, `access_control`.
Phase 2 codes: campus/distance/meals/residence-gender (student layer).

### 2.5 `sl_place_household`
One row per place: `occupants_count int null`, `occupants_type enum('professionals','students','family','mixed','unknown')`, `smoking enum`, `pets enum('none','present','considered')`, `visitors enum('allowed','restricted','no_visitors')`, `cleaning enum('rota','cleaner','none')`, `gender_composition varchar(60) null` (free disclosure, never a filter in MVP).

### 2.6 `sl_verifications`
The trust ledger. One row per verification event.

| Column | Notes |
|---|---|
| subject_type enum('user','listing') | |
| subject_id int | user id or place id |
| rung enum('phone','email','relationship','property','student_accreditation') | Spec §5 ladder |
| status enum('verified','failed','revoked','pending_evidence') | |
| evidence_ref varchar(255) null | Provider reference / mandate id / document pointer |
| reviewed_by int null FK users | Super-admin/moderator for evidence rungs |
| notes text null | |

Index `(subject_type, subject_id, rung, status)`. Badges render from latest `verified` row per rung. **NSFAS/student accreditation can only ever originate here with evidence_ref — no authoring checkbox exists.**

### 2.7 `sl_lead_contexts`
Adjunct to canonical leads (pattern: `commercial_lead_contexts`): `lead_id FK unique restrict`, `place_id`, `space_id nullable`, plus snapshot columns (space label/type at enquiry time). Written inside the capture transaction when the lead carries Shared Living context.

### 2.8 `sl_messages`
On-platform thread keyed to a lead.

| Column | Notes |
|---|---|
| lead_id FK leads (index) | Thread identity = lead |
| sender_user_id FK users | Consumer or lister-side actor |
| body text | Length-bounded at API layer |
| created_at | Ordering |

Contact-detail shielding is enforced at the read/projection layer (rung + mutual-engagement rules from spec §7), not by mutating stored bodies.

## 3. Authority & attribution

- `sl_places.owner_user_id` anchors the creator.
- Practitioner/agency authoring writes standard platform authority references (client/mandate fields captured during flow; storage reuses existing practitioner/agency relationships — **no new parallel authority tables**).
- Public attribution projection resolves in order: verified operator/practitioner authority record → else "Listed by owner" (+ phone-verified badge). Mismatch between authority kind and attribution is impossible by construction because both derive from the same records (PPRA rule).

## 4. Publication & moderation

- Submit → place `status='pending_review'` + row in a new `sl_moderation_queue` (mirrors listing/development/content queue precedents): reviewer actions approve/reject with reason; approval flips place to `published`.
- Phone verification gate is checked pre-submit (rung 1 on creator); missing → blocked with actionable message.
- Search eligibility (public read) = place published AND space status available/paused-filtered per query AND place not archived. Mirrors the single-authority pattern used across journeys.

## 5. Search service shape

`slSearch(input)` follows the developments/commercial lessons:
- SQL: eligibility + canonical FK geography predicates (exact resolution; unknown scope → empty with diagnostic locationState) + area range push-down.
- JS refinement: furnishing/bills/bathroom/date facets over projected DTOs (bounded set), pagination 24/page with totals computed post-filter.
- Privacy projection applied at DTO build (approximate coords per §spec 6).

## 6. Migration sequencing (DB-authority protocol)

Each migration = one DDL concern, appended to `server/migrations/manifest.json` after numeric head `0050`:

1. `0051_sl_places.sql`
2. `0052_sl_spaces.sql`
3. `0053_sl_space_availability_specifications.sql`
4. `0054_sl_place_household.sql`
5. `0055_sl_verifications.sql`
6. `0056_sl_lead_contexts_messages.sql`
7. `0057_sl_moderation_queue.sql`

All migrations are additive table creation (no destructive change). Execution path: disposable worktree database → `db:migrate:plan` → `db:migrate:apply` with explicit accepted/expected heads → `db:schema:congruency` → consumer-contract validation, exactly per `docs/database-authority/00-database-authority-agent-entry.md`. Manifest membership is a serialized authority decision requiring founder approval of this document first.

## 7. Open implementation decisions (resolved during Phase 0)

- Exact specification-code list finalisation (§2.4) with founder review.
- Message length limits and thread retention policy.
- Operator organisation linkage detail (reuses developerOrganisations-style pattern vs new actor type) — schema-ready either way; UI deferred to Phase 2.
