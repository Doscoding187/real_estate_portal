# Geography Coverage Contract

**Status:** Active authority for territory geography coverage work
**Owner:** OX Alpha (implementation) / Edward (founder approval boundary)
**Version:** 0.6 (2026-10-07)
**Supersedes:** ad-hoc per-location additions; complements the runtime
convergence v0.1 bounded slice without rewriting it; supersedes v0.3
Section 2 D1, D4 and D8 as noted inline; records the approved typed canonical
Place Authority doctrine and the reviewed Gauteng checkpoint.
Version 0.6 additionally records Edward's explicit launch province search
projection approval in Section 22; identity and admission evidence are unchanged.

This contract records the product and data decisions that govern the
territory-wide geography coverage pipeline. It is the Phase 0 artifact of the
Location and Geography Global Coverage Strategy handoff. Schema or bulk-data
implementation below must conform to it.

## 0. Canonical authority chain

There is one geography authority, with one responsibility at each layer:

```text
approved source evidence
  -> territory manifest and accepted parent/alias decisions
  -> deterministic factual identities and dispositions
  -> governed runtime projection and factual mapping
  -> territory source index
  -> one in-memory aggregate catalog
  -> Database Authority target-environment materialization
  -> typed runtime natural-key resolution
  -> canonical public location IDs
```

The contract and manifest govern policy and inputs. Checked-in generated
artifacts govern the current territory rows. A territory source index may
reference those immutable artifacts, but it must not copy or normalize their
rows into a second authority. Runtime and consumer code may resolve and consume
that authority; it may not recreate geography from names, provider IDs, numeric
database IDs, or hand-maintained arrays.

Provider observations, private addresses, coordinates, physical assets,
parcels, service radii, map bounds, and Search Areas are separate concepts.
They may provide evidence or context for factual geography, but none may be
silently converted into a canonical public geography identity. Numeric
`province`, `city`, and `suburb` IDs remain target-environment handles and never
become durable geography identity.

**v0.5 note.** The chain above is unchanged in responsibility, but its third
layer is now governed by D0: deterministic Place identity and dispositions,
with search scope **derived** (D1, D12) rather than imposed by storage. The
"canonical public location IDs" terminus is a target-environment handle over
stable Place identity, not the identity itself. Section 14 records the minimum
V1 concepts; none is implemented by this contract version.

## 1. Coverage contract

For every geography Property Listify has approved for a territory, a user can
find it by its accepted name or alias, understand its context and type, select
one canonical location identity, and receive the correct search scope. A place
that is ambiguous, unsupported, or not yet licensed is never silently guessed,
widened, or coerced into a familiar level; it is routed to a visible review and
coverage path.

## 2. Decisions (handoff Section 10)

These decisions are binding until explicitly revised.

**v0.5 provenance.** D0–D13 are recorded by senior architecture review. D1, D4
and D8 are carried forward from v0.3 with the supersessions stated inline. D2,
D3, D5, D6 and D7 are carried forward unchanged; v0.3 notes on D3 and D6 record
current enforcement gaps without weakening the rule. D9–D13 are new.

### D0 — Canonical identity is a typed Place, not a storage level (v0.5)

Property Listify adopts a **typed canonical Place Authority** as the long-term
geographic identity foundation.

A **Place** is an identifiable geographic referent. A Place identity:

- is **stable** and **opaque**;
- is **assigned once** and **never reused**;
- is **independent of** names, slugs, classifications, parent assignments and
  boundary changes;
- is never derived from a numeric database key, a provider place ID, or display
  text.

Names, classification, lifecycle status, verification state and
publication/search eligibility are **separate concepts** from identity. A change
to any of them does not mint a new Place, and a Place is not invalidated by them.

The existing `province → city → suburb` model is retained as a **derived
search-scope abstraction** (D1) and is no longer the identity or storage model.

This decision governs all future work in: Listings, Developments, Explore,
Location/Suburb Guides, Agents, Agencies, Services, Canvassing, Demand, Saved
Searches, location intelligence and market intelligence. It does **not** by
itself migrate any consumer; consumer convergence is deferred to
consumer-specific workstreams and is governed by Section 10 exit conditions.

### D1 — Publicly searchable levels (v0.5: derived, not structural)

**Preserved from v0.3.** Publicly searchable scopes remain exactly three:

| Factual type | Search scope |
| --- | --- |
| province | `province` |
| city, town | `metro_city` |
| suburb, locality, neighbourhood, village, township | `locality` |

**Superseded in v0.5:** the `Storage` column of the v0.3 table. The mapping to
physical tables `provinces` / `cities` / `suburbs` is **no longer a binding
constraint**. These three scopes are now **deterministic projections** computed
from Place identity plus accepted relationships.

Municipalities (district and local) remain parent **context**, never searchable
scopes. Place type is preserved on every Place and every projection; no type is
rewritten to fit storage. Unsupported or ambiguous resolution must fail
visibly; there is no silent widening (D5, D12).

### D2 — Provisional identities are selectable

Tier B (executable provisional) identities are searchable and selectable with
status `provisional`. They carry an internal review obligation through the
disposition artifact; they must never be used to invent or widen a boundary,
and they are excluded from SEO page generation until promoted to Tier A.
Public UI must not display alarm labels for provisional status, but internal
surfaces (admin coverage dashboard, research queue) expose it.

### D3 — Acceptable sources and licences

- Approved evidence classes: official government registers and municipal
  publications; GeoNames (CC BY 4.0, attribution required); Wikidata (CC0);
  geoBoundaries gbOpen (CC BY 4.0 distribution; preserve each layer's upstream
  licence and notices); OSM/Geofabrik (ODbL 1.0); NGA GNS (no restriction).
- Google Places and any future commercial provider are **evidence and
  enrichment only**. Provider place IDs can never become public identity, and a
  provider observation must never create or promote a public geography row.
- ODbL obligation: `osm_only_odbl_provisional` rows may be materialized in
  disposable development/preview targets under this contract. Any staging or
  production release of OSM-only rows requires the founder-owned production
  ODbL database-strategy gate to be cleared first. The adapter must keep row
  licensing classification observable so that gate is enforceable mechanically.

**v0.5 correction:** the v0.3 text of this decision is normative but was
unenforced. Three live runtime paths can currently write provider observations
into `provinces` / `cities` / `suburbs` without a governance gate
(`server/services/listingLocationResolver.ts`, `server/locationRouter.ts`
`saveGooglePlaceLocation`, `server/services/locationPagesServiceEnhanced.ts`).
Those paths are classified **RETIRED** in Section 10 with an exit condition. The
rule above is binding; the current code does not yet satisfy it.

### D4 — Estates, developments and non-statutory places (v0.5: superseded)

**Superseded in v0.5.** The v0.3 rule — estate/residential-development
candidates are child localities projected at `suburb` storage — is withdrawn. It
required a non-statutory referent to be expressed as a factual locality, which
conflates market identity with geographic fact and made the storage model
dictate product policy.

Replacement rules:

- A **non-statutory Place** (estate, precinct, development, or other referent
  that is not a statutory geographic unit) may become a Place **only when its
  referent is sufficiently evidenced**. Demand, provider suggestion or commercial
  submission alone is **never** sufficient.
- Search demand, provider suggestions and commercial submissions create
  **candidates and research priority** only. They never create public geographic
  authority.
- A **Development** may be discoverable as a Development before it qualifies as a
  geographic Place. Development discoverability is a domain concern and does not
  require, imply, or anticipate a Place.
- Classification is preserved on the Place and is never rewritten to fit a
  storage level.

The v0.3 consequence — `estate_discovery_entity_deferred` queueing, with the note
"promotion to a separate discovery entity is deferred" — remains historically
accurate and is retained in the queue artifacts as evidence.

### D5 — Public behavior for valid-but-not-covered places

An exact-name miss produces an honest no-result state plus a visible
"suggest a location" path that feeds the coverage research queue. The system
must not silently widen a failed locality search to its city or province.
Provider/address suggestions may still be shown, labelled as address-level
evidence for authoring, never as canonical public scopes.

### D6 — Coverage and freshness targets

A territory is "complete" when:

1. every accepted Place has an explicit disposition (promoted / provisional /
   candidate-queued / rejected-retired);
2. every promoted Place has a deterministic executable projection;
3. all materialized parent chains verify in the target environment;
4. generated probes (municipalities, towns, townships, suburbs,
   neighbourhoods, extensions, same-name cases) resolve end-to-end;
5. regeneration is byte-identical (`--check` passes);
6. no-result telemetry is flowing into the research queue.

Refresh cadence: full regeneration is deterministic from versioned inputs;
territory refreshes re-run the pipeline and diff dispositions. Ad hoc manual
rows are prohibited everywhere.

**v0.5 status note:** criterion 6 is **not met**. `locationCoverageTelemetry`
computes a `resolved` / `no_result` signal but persists nothing, and
`location_searches.locationId` is `NOT NULL`, so an unresolved search cannot be
recorded. This is tracked as a required condition in Section 14.

### D7 — SEO pages

SEO pages are generated for Tier A identities at province/city/locality levels
with listing supply or strategic market value. Tier B remains search-only
until promoted. Same-name localities require disambiguated paths (parent
segments) before any page generation.

### D8 — Names are assertions attached to Places (v0.5: supplemented)

Names are **assertions attached to Places**, not properties of identity. The
authority must distinguish, where supported:

- preferred public name;
- official name;
- common name;
- historical name;
- alternate spelling;
- language form.

These roles **may overlap**; one string may legitimately hold more than one
role. Roles are recorded per assertion with source and validity, not collapsed
into a single display string.

**Selection policy (binding, v0.5).** Public-preferred naming is a **governed
selection policy over evidenced names**. It is a deterministic function of
recorded name assertions and their roles, and it is **not** a substitute for
factual evidence and **not** a free-text editorial choice. Where a source
declares a name as primary, that declaration is recorded as a name assertion
and is eligible for selection; where sources disagree, the selection is resolved
by the recorded roles and evidence, never by ingestion or sort order.

**Superseded in v0.5:** the v0.3 implication that ingestion order could decide
the preferred name. That is what produced the reviewed regression in which the
Gauteng place known publicly as *Centurion* was projected with preferred name
*Lyttelton* and its required acceptance probe failed (Section 13). A rename does
**not** automatically create a new Place.

Alternate spellings, language forms, transliterations, abbreviations and
historical names remain **aliases**: generated from accepted name assertions plus
governed normalization patterns (e.g. `Extension N` ↔ `Ext N`). Aliases never
create Places or canonical records. Matching ranks: exact preferred > exact
alias > prefix preferred > prefix alias > substring. Identifier-like labels
(QIDs, codes, URLs) stay non-searchable provenance.

### D9 — Identity continuity

Place identity is preserved across change. The following are **Place-level
facts** and must never mint a new Place on their own:

- renaming;
- reclassification;
- spelling or language change;
- parent reassignment;
- boundary revision;
- source or licence change;
- promotion or demotion between eligibility tiers.

The following require an **explicit, recorded identity-continuity decision**
before they may alter the Place graph: **merges, splits, annexations and
boundary changes**. Each such decision must be traceable, must name the affected
Place identities, and must state the disposition of every member identity. No
continuity decision may be inferred from ingestion order, name similarity, or
spatial proximity.

### D10 — Typed, evidenced relationships

Containment and association are modelled as **typed, evidenced relationships**,
not as one ambiguous generic parent pointer.

Administrative containment, settlement membership, market association,
succession and other relationship kinds **must not share an ambiguous generic
meaning**. Each relationship carries its type, its evidence reference, and, where
applicable, its validity.

Relationship storage is **relational**. A graph database is not adopted.

### D11 — Factual and non-statutory admission

Admission of a Place to public geographic authority requires evidenced
referent identity.

- **Search demand, provider suggestions and commercial submissions create
  candidates and research priority. They never create public geographic
  authority.**
- Candidate status is visible in internal surfaces and does not confer public
  searchability or SEO eligibility.
- A non-statutory Place requires sufficient evidence of its referent before it
  may be published as geographic authority (D4).
- Provider and commercial signals raise **research priority**; they are never
  authority inputs.

### D12 — Publication and search eligibility, and derived scopes

Publication and search eligibility are recorded **per Place**, separately from
identity, classification and lifecycle. Eligibility is a deterministic function
of recorded lifecycle, verification, licence and tier state — never an ad hoc
per-surface decision.

Search scopes are deterministic projections from Place identity plus **accepted**
relationships (D1). Only relationship types **explicitly authorized** to affect
executable search scope may expand or narrow it. A relationship that exists in
the graph but is not authorized for search scope has **no** effect on query
boundaries.

The versioned province Listing membership projection approved in Section 22 is
an explicit, bounded consumer authorization. It derives province membership
from admitted, evidenced administrative containment; it does not grant general
edge traversal, city expansion or Search Area membership. Existing raw edge
flags remain unchanged. Outside that approved projection, the per-edge search
authorization rule continues to apply.

Ambiguity is a first-class resolution outcome. Resolution distinguishes
**resolved**, **ambiguous** (two or more candidate Places) and **no_result**.
Ambiguity is never collapsed to a single answer and is never widened.

**No silent widening** is binding without exception: no unresolved or ambiguous
query may be broadened to a parent, sibling set, or territory.

### D13 — Place Intelligence and Suburb Guides ownership boundary (v0.5)

The ownership boundary is permanent.

**Place Authority owns:** identity, names, classification, relationships,
evidence and provenance, geographic lifecycle.

**Other domains own:** listings, developments, sale/rental statistics, market
trends, schools, amenities, transport, agents, agencies, service providers,
Explore content, guides and editorial content, buyer/seller intelligence.

Those systems **reference** Place. They **do not redefine** geography.

Every historical intelligence calculation must retain the **scope/boundary
version** used for that calculation, so that a stable Place identity does not
conceal a changing geographic population. A Place identity is stable; the set of
listings, statistics or market facts associated with it is not.



## 3. Coverage tiers

| Tier | Meaning | Runtime behavior |
| --- | --- | --- |
| A — verified | Identity, parent chain, scope, licensing all supported | status `verified`; fully searchable/selectable; SEO eligible |
| B — provisional | Identity and parent safe enough to search; evidence provisional or OSM-only pending gate | status `provisional`; searchable/selectable; no SEO |
| C — candidate/alias pending | Fails identity, parent, ambiguity, or natural-key gates | No runtime row; recorded in disposition + review queue |
| D — rejected/retired | Duplicate, non-independent, retired, licence-blocked | Never public; retained as provenance |

Tier assignment is computed by the pipeline and recorded per identity with an
explicit reason string. Tiers map onto the existing schema enum
(`verified|provisional|retired`) without new columns; richer state lives in
the generated disposition artifacts, which are the audit trail.

## 4. Parent authority rules

1. Parent edges come from accepted evidence: the founder-reviewed bounded
   slice, Search Area membership reconciliations, or the governed
   municipality-context registry in the territory manifest.
2. Municipality context maps to a runtime market parent only where the
   manifest registers an explicit, cited mapping (e.g. City of Johannesburg →
   `gauteng/johannesburg`). Multi-town municipalities register no default;
   their localities queue as Tier C unless another accepted edge exists.
3. Natural-key collisions fail closed by default: the colliding identity
   queues with reason instead of inventing a suffix. A versioned,
   identity-specific researched-parent artifact may explicitly opt in to
   co-publishing duplicate factual identities under one stable natural key
   when the parent edge is the same. Each factual ID remains separate in the
   projection and disposition mapping; this is not an identity merge or
   rename.
4. One accepted place occupies one runtime row. A new record whose
   name-slug/level/province triple matches an already-accepted row under a
   different parent queues for reconciliation rather than creating a second
   public identity.
5. Existing v0.1 bounded-slice natural keys are frozen authority: the v0.2
   projection must reproduce them exactly.
6. **v0.5:** parent assignment is one relationship kind among several (D10).
   A parent pointer never carries administrative, settlement, market or
   succession meaning simultaneously, and a relationship that is not explicitly
   authorized for search scope has no effect on query boundaries (D12). The
   three-level natural key remains a valid *presentation* path, not a statement
   that a place has exactly one kind of parent.

## 5. Pipeline and artifacts

```text
factual canonical layer (1480) + names (2526)
  -> tools/geography-coverage/generate.mjs   [deterministic]
     -> gauteng_runtime_reference_projection_v0.2.json  (runtime rows)
     -> gauteng_factual_runtime_mapping_v0.2.jsonl      (full disposition bridge)
     -> gauteng_coverage_disposition_v0.1.json          (counts + reasons)
     -> gauteng_review_queue_v0.1.jsonl                 (research queue input)
  -> Database Authority adapter (idempotent prepare/verify)
  -> discovery API (canonical catalog + aliases + Search Areas)
```

The generator reads the full factual canonical JSONLs from the approved
canonical-root (external reproducible data worktree; summaries are checked in).
It must refuse inputs whose checksums do not match the recorded checkpoints.

## 6. Guardrails (binding)

- No hand-maintained location arrays or one-off rows as permanent work.
- Numeric DB IDs, provider IDs, and display text are never durable identity.
- No township/estate/extension is forced into `suburb` merely because storage
  uses that table; factual type travels with every row.
- No silent widening, silent merging, or Search Area ↔ factual conversion.
- Authoring encounters create reviewable signals, never direct public rows.
- All database writes go through Database Authority reference adapters on
  authorized targets; `LAND_PUBLIC_CLASSIFICATIONS` remains the Land
  allow-list; one geography authority per Land request.
- **v0.5:** a Place identity is never minted, reused, or invalidated by a
  rename, reclassification, spelling change, parent reassignment, boundary
  revision, or tier change. Merges, splits and annexations require an explicit
  recorded continuity decision (D9).
- **v0.5:** search demand, provider suggestions and commercial submissions
  create candidates and research priority only. They never create public
  geographic authority, and a high search count is never an evidence class
  (D11).
- **v0.5:** a rename does not create a Place, and a preferred-name change is a
  governed selection over recorded name assertions, never an identity change
  and never a side effect of ingestion or sort order (D8).
- **v0.5:** ambiguity is reported as ambiguity. It is never resolved by
  silently preferring one candidate, and never widened to a parent or territory
  (D12).

## 7. Acceptance probes (Gauteng pilot)

Required end-to-end resolution set:

```text
Johannesburg, Pretoria, Soweto, Mamelodi,
Mamelodi Extension 1*, Mamelodi Extension 4*,
Newtown, Sandton, Bryanston, Randburg, Midrand, Centurion,
Roodepoort, Vereeniging,
plus representative same-name / alias / ambiguous cases.
```

`*` Extension probes validate the alias/pattern machinery and the Tier C
routing when the underlying identity has not been accepted; they do not
promote anything by themselves. Kyalami must stay non-public while its
commercial-reuse gate is open.

Probe outcomes are asserted against the projection artifacts (always) and the
materialized environment (via `db:reference:verify` and the readiness flow).

## 8. Rollout

1. Gauteng pilot proves the machine end-to-end.
2. Rest of South Africa reuses manifest + registry pattern.
3. Territory waves thereafter; each refresh preserves global identity and
   provenance rules.

Revision of any Section 2 decision requires a contract version bump and an
explicit note in the handoff ledger.

## 9. Location Authority Slice 1 boundary

Slice 1 establishes the authority foundation without starting another province
or converging product consumers.

It must:

1. retain the checked-in Gauteng projection, mapping, disposition, and review
   queue as frozen current authority;
2. load every registered territory through one digest-verified source index and
   one aggregate in-memory catalog;
3. keep factual identity syntax territory-neutral while preserving every
   existing `pl-gp-v01-*` identity;
4. permit a natural key with multiple factual identities only when the exact
   co-published set is present in the governed runtime projection;
5. require callers to identify the selected factual member when resolving a
   co-published natural key; and
6. fail atomically on a missing source, digest mismatch, duplicate source root,
   duplicate natural key, duplicate factual identity, namespace mismatch, broken
   parent closure, or inconsistent co-publication set.

A future source joins the catalog only by registering its immutable projection
and mapping digests. It must not be copied into a manually maintained runtime
array. Adding a source must not alter any existing source's row bytes.

Slice 1 explicitly does not activate a new Search Area, redesign
`provinces`/`cities`/`suburbs`, migrate the legacy `locations` table, change a
protected database, or rewrite Developments, Agents, Agencies, Services,
Canvassing, Demand, Saved Searches, Explore, or location-page consumers. Those
remain governed follow-on work with the dispositions below.

## 10. Legacy authority disposition matrix

**v0.5 rule.** A disposition is not a compatibility approval. Any runtime
fallback outside this matrix is audit debt, not authority.

**v0.5 rule.** No runtime component is retired merely because the Place model
has been chosen. A component that is still required before cutover remains
required, and stays in service until its exit condition is met.

**v0.5 rule.** Every `TRANSITIONAL` row carries an explicit **exit condition**.
A transitional row with no exit condition is an audit defect and must not be
introduced. Exit conditions name the slice and the observable condition that
closes them.

| Asset or path | Disposition | Authority role and required action | Exit condition |
| --- | --- | --- | --- |
| `docs/architecture/geography-coverage-contract.md` and the active territory manifest | **CANONICAL** | Govern policy, accepted inputs, sources, parent decisions, and licensing. Preserve and version them. | — |
| `data/geography-coverage-v0.1/output/gauteng_runtime_reference_projection_v0.2.json` | **CANONICAL** | Frozen current Gauteng runtime row authority. Load by digest; do not rewrite while Slice 1 is reviewable. | Superseded only by an activated successor catalog with recorded digests. |
| `data/geography-coverage-v0.1/output/gauteng_factual_runtime_mapping_v0.2.jsonl` | **CANONICAL** | Frozen current factual-to-runtime disposition bridge. Every factual identity remains distinct, including co-published members. | Superseded only by an activated successor mapping with recorded digests. |
| `data/geography-coverage-v0.1/output/gauteng_coverage_disposition_v0.1.json` and `gauteng_review_queue_v0.1.jsonl` | **CANONICAL** | Preserve counts, reasons, candidate evidence, and research obligations; never materialize blocked rows publicly. | — |
| `data/geography-coverage-v0.1/territory-catalog.v0.1.json` | **CANONICAL** | Digest-pinned registry of immutable territory artifacts. It contains no copied geography rows and cannot override a source artifact. | Default until an activation slice repoints `LOCATION_AUTHORITY_CATALOG_INDEX_PATH`. |
| `data/place-admission-territories.v0.1/territory-registry.v0.1.json` | **CANONICAL** | The single authority for a territory's *admission* inputs and outputs (Section 21): source-authority directory, digest-pinned source manifest, source artifact filenames, admission version, package directory and package artifact filenames. Names locations; holds no geography rows and adjudicates nothing. | — |
| `shared/factualRuntimeGeographyBridge.ts`, `shared/runtimeGeography.ts`, and the governed runtime reference loader | **CANONICAL** | Validate IDs, projection shape, natural-key hierarchy, and exact governed co-publication. Reject malformed or ambiguous source data. | — |
| `server/_core/databaseAuthority/dataAdapters/canonicalGeography.ts` | **CANONICAL** | Materialize and verify governed natural keys on authorized targets. Numeric IDs are environment-local handles. The adapter's target **row shape** is transitional (see next row); its upsert-by-natural-key and fail-closed conflict behaviour are canonical. | — |
| `place`, `place_name`, `place_relationship`, `place_evidence`, `place_external_mapping`, `search_area`, `search_area_member` (migrations 0091–0097) | **CANONICAL** | The minimum V1 Place Authority foundation approved in Section 14, established by Slice 1. Identity is the opaque `place_id` primary key; no numeric surrogate exists. Identity dimensions are separate columns, and every contract invariant is a database CHECK constraint. Empty by design: no Place is populated and no consumer references these tables yet. | — |
| The `provinces`, `cities`, and `suburbs` **tables** as identity storage | **TRANSITIONAL** | Required until Place cutover. Continue to serve as the materialized projection of governed natural keys. | Closes when every domain in Section 10's consumer row references Place, and these tables are retired through the approved retirement mechanism. |
| Static `PROVINCES`, `CITIES`, and `SUBURBS` arrays in the Database Authority geography adapter | **TRANSITIONAL** | Retain as the reviewed foundation minimum. Do not add more hand entries. | Closes when a versioned generated foundation source replaces the hand arrays. |
| `server/services/searchAreaDefinitions.ts`, `searchAreaAuthority.ts` and the Search Area execution contracts | **CANONICAL, SEPARATE** | Search Areas remain a separate governed market identity. They have separate IDs, explicit membership, and explicit authorized journeys. They never become factual Places and never establish factual containment. | Migrates onto the approved persisted `search_area` / `search_area_member` model when that implementation slice arrives. No new Search Area service or registry may be created in the interim. |
| `data/gauteng-search-area-candidates-v0.1/` and `data/gauteng-search-area-research-v0.1/` | **ARCHIVED EVIDENCE** | Preserve definitions, membership research, and provenance. Never copy a Search Area into a factual row or infer factual identity from membership. | — |
| Google/provider IDs, labels, and `location_provider_mappings` | **ARCHIVED EVIDENCE** | Retain for enrichment, encounter review, and provenance. A provider observation must not create or promote a public geography row. | — |
| `server/services/locationAutoPopulation.ts` and retired auto-population completion notes | **RETIRED** | Dead code with no runtime import. Preserve historical artifacts only where they document research or incidents. | Already closed. |
| **Live provider-driven geography writes**: `listingLocationResolver.ts` suburb insert, `locationRouter.ts` `saveGooglePlaceLocation`, `locationPagesServiceEnhanced.ts` `findOrCreateLocation` / `syncLegacyTables` | **RETIRED** | These paths write provider observations into `provinces`/`cities`/`suburbs` with no governance gate, which violates D3. `saveGooglePlaceLocation` is additionally an unauthenticated `publicProcedure` mutation and references columns absent from the current schema. | Closes when each path is removed or reduced to recording an observation, and D3 is enforced executably rather than by prose. Tracked in Section 14. |
| Legacy `locations` rows, `locations.id`, `listings.locationId`, `developments.locationId`, and geography text columns | **TRANSITIONAL** | Preserve current consumers and historical evidence, but resolve new cross-environment identity through governed natural keys and typed target handles. Do not copy numeric IDs between environments. | Closes when the parallel `locations` hierarchy is retired and consumers reference Place identity. |
| Direct classic-table discovery, `resolveLocation` widening, free-text geography execution, and location-page text matching | **TRANSITIONAL** | Classify and remove in bounded consumer-convergence slices. They do not become canonical by being read from the canonical tables. | Closes when no public search path matches geography by display text; the hybrid ID-or-text matcher in property search is the last instance. |
| Agents, Agencies, Services, Canvassing, Demand, Saved Searches, Explore, Developments, and location-page geography fields | **TRANSITIONAL** | Retain current behavior, then converge each family to typed canonical Place references without rewriting unrelated product logic. Cardinality intent is recorded in Section 12. | Closes per domain, each with its own convergence slice and its own verification. |
| `data/gauteng-candidate-catalogue-v0.1/`, `data/gauteng-canonical-promotion-v0.1/`, `v0.2/`, and `data/gauteng-factual-canonical-v0.1/` summaries | **ARCHIVED EVIDENCE** | Retain provenance and research history. Do not bulk-migrate them around the governed projection and disposition checks. | — |
| Superseded numeric runtime handles, provider place IDs, display text, and hard-coded client maps (e.g. `locationUtils.ts` `CITY_PROVINCE_MAP`, `EnhancedNavbar.tsx` hard-coded suburb list) | **DO NOT MIGRATE** | They may be read only inside an explicitly bounded transitional consumer. They never become canonical factual or cross-environment identity. | — |



## 11. Gauteng exact-source recovery status

**Status:** exact source recovery failed; full regeneration is blocked.

The required SHA-256 checkpoints are:

- geography:
  `1fe0e2e3101bd7e459f484b7125dc1ce1f0327104002b184ef0e90d4236b7b7f`;
- names:
  `a87891bc2e4167130d7e5eb649516a34aedaa071278ce8fe25df19f511669b51`.

The last authoritative checkpoint identified during investigation is commit
`bd39aa38e4f7158164f3572b62db827fbf01c1a7` on
`feat/gauteng-factual-canonical-v0-1`, in worktree
`/home/edwardspc/Desktop/Dev/listify-gauteng-factual-canonical-v0-1`.
Reachable refs, history, archive refs, worktrees, the working filesystem,
ignored files, and the recorded external root were searched. Neither exact
source file exists.

The governed record is
`data/geography-coverage-v0.1/source-recovery.v0.1.json`. Replacement source
data must not be synthesized, reverse-engineered from summaries, or copied
from provider output and labelled canonical. Until an exact byte match is
restored:

- `geography:coverage:check` must fail closed with the missing-source error;
- checked-in output digests, hierarchy, dispositions, grouped identities, and
  generated probes remain the executable evidence;
- aggregate-catalog and focused contract tests must run without the external
  source; and
- no later territory may reuse guessed Gauteng data as a template.

## 12. Slice 1 completion evidence

Completion requires all of the following without a production or protected
database operation:

1. source-recovery status is recorded and the missing exact inputs fail closed;
2. the aggregate source index and every registered artifact digest verify;
3. all checked-in Gauteng probes pass;
4. all runtime natural keys are unique and closed to an in-scope parent;
5. all 14 governed co-published keys resolve only with an exact member ID;
6. ungoverned natural-key collisions remain blocked;
7. a synthetic non-Gauteng source proves territory-neutral loading without
   adding fictional rows to the real catalog;
8. Gauteng projection and mapping bytes remain unchanged from the integration
   base; and
9. typecheck, lint, focused tests, and CI contract checks pass.

## 13. Reviewed Gauteng checkpoint (v0.5)

This section is the authoritative factual baseline for all implementation work.
Counts here were re-derived from the committed artifacts at the reviewed commit;
no figure is carried forward from an earlier report without recomputation.

**Reviewed commit:** `4356c0f7f` — `feat(location): establish canonical geography foundation`, on branch `feat/gauteng-source-authority-closure`, from worktree
`.../.worktrees/property-listify-place-authority-slice0`. `4356c0f7` is **not yet
merged into `main`** (`main` is at `ad0c4247`).

### 13.1 Authoritative artifacts and digests (v0.1 default catalog, source `za-gp`)

| Artifact | SHA-256 |
| --- | --- |
| `data/geography-coverage-v0.1/territory-catalog.v0.1.json` | `ad32a26dbaa40d03f63545d5f9af0918cbea2e1d65c8166817b15c52e5d6f8c4` |
| `data/geography-coverage-v0.1/gauteng-territory-manifest.v0.1.json` | `d4abd0b0303a7fdcd57e4a20f64bfbeece2c91dc7e0f953875cfbe90dfcb9b0f` |
| `data/geography-coverage-v0.1/output/gauteng_runtime_reference_projection_v0.2.json` | `faad65e4216c2fb62886e5561984a8b82fe3b750942a4bb38c2eba12a8141399` |
| `data/geography-coverage-v0.1/output/gauteng_factual_runtime_mapping_v0.2.jsonl` | `ed709559ba69b28b6dcc20fc7381478f2e822ff8436bcaaf7dcaaddd410c63fa` |
| `data/geography-coverage-v0.1/output/gauteng_coverage_disposition_v0.1.json` | `d80601e2b368190c31650a68c3f38d1ba351e9e05803ebd01ff21ae7a860d232` |
| `data/geography-coverage-v0.1/output/gauteng_review_queue_v0.1.jsonl` | `d8e3521a20a9d906cc12ae13236e5aafdfd78291612068048a09cb5bbbab424a` |
| `data/geography-coverage-v0.1/source-recovery.v0.1.json` | `7da0238c549590898db794b9d8cbf74b0a95cf22c36b6509caa60913645c699a` |

Authoritative v0.1 counts: 1,480 factual identities; 1,414 runtime rows; 64
carried; 1,364 newly promoted identities; **116 queued**; 60 represented by
carried rows; 2 alias drops; **14 governed co-published keys**.

### 13.2 Parent-evidence inputs

The v0.1 manifest `inputs.researched_parent_edges` references **103** files, and
**all 103 are present**. Of these, 102 match the
`*parent-evidence.v0.1.resolved.json` naming pattern and one does not:
`meyerton-midvaal-jurisdictional-place-evidence.v0.1.resolved.json`. That single
exception is the whole of the "103 vs 102" discrepancy. The research
directory holds the same 102 parent-evidence files plus that one jurisdictional
file, alongside two audit reports.

Across all 103 referenced files there are **29 distinct parent natural keys**.
Two source copies of the evidence exist — `.../research/` and
`.../output/*.resolved.json` — and the manifest references the `output/` form.
The `output/` form is authoritative for generation; the `research/` form is
preserved as source research.

### 13.3 Count reconciliation

The conflicting figures in earlier reports are **not** in conflict. Each is a
correct count of a different, precisely identified state.

| Figure | Meaning | State |
| --- | --- | --- |
| 103 parent-evidence files | Manifest `inputs.researched_parent_edges` entries | v0.1 committed |
| 102 parent-evidence files | Files matching the `parent-evidence` name pattern | v0.1 committed |
| 11 `awaiting_accepted_parent_edge` | v0.1 review queue | v0.1 committed |
| 8 `duplicate_natural_key_within_parent` | v0.1 review queue | v0.1 committed |
| 3 `natural_key_owned_by_accepted_row` | v0.1 review queue | v0.1 committed |
| 116 | Total v0.1 review-queue rows | v0.1 committed |
| 452 / 24 | **Admission-analysis subset**, not queue counts | v0.2 candidate, uncommitted |
| 467 / 36 | Actual v0.2 review-queue rows | v0.2 candidate, uncommitted |
| 535 | Total v0.2 review-queue rows | v0.2 candidate, uncommitted |

The 452 and 24 figures came from an admission diff that classified **the 489
v0.1 rows removed by the v0.2 projection** and then reported only the subset
traceable to a v0.1 *promoted* runtime row. The full v0.2 queue is larger because
it also contains identities that had no v0.1 promoted predecessor:

- `awaiting_accepted_parent_edge`: 467 total = 422 traceable to a v0.1 promoted
  row + 30 matched by same name + 45 v0.2-only.
- `duplicate_natural_key_within_parent`: 36 total = 20 traceable to a v0.1
  promoted row + 16 v0.2-only (Soweto ×2, Fordsburg ×2, Ekangala ×2, Slovoville
  ×2, Northdene ×2, Kromdraai ×2, Elandsfontein ×2, Menlo Park ×1).
- 535 = 467 parent + 36 duplicate + 30 context-only municipality + 2
  province-scope-owned.

**Authoritative going forward:** the v0.1 committed figures in 13.1 and 13.2,
because v0.1 is the active default catalog. The v0.2 figures are recorded as
candidate state only, and v0.2 is **uncommitted** — it is not a checkpoint and
must not be treated as authority until it is committed with recorded digests.

### 13.4 Reproducibility status

**Regenerates deterministically today:**

- the v0.2 candidate projection, mapping, disposition and review queue, from the
  checked-in compact source plus the v0.2 territory manifest —
  `generate.mjs --check` passes and is byte-identical;
- the v0.2 compact source artifacts from the 19 digest-pinned raw artifacts, if
  and only if the raw snapshot is re-acquired into disposable storage;
- all v0.1 outputs from the v0.1 **generated** artifacts (they are load-by-digest
  and internally consistent).

**Cannot be regenerated:**

- the v0.1 **factual canonical source** (geography and names JSONL). The
  configured root
  `/home/edwardspc/Desktop/Dev/listify-gauteng-factual-canonical-v0-1/...` is
  absent, both files are missing, and `source-status.mjs --strict` exits 1 with
  `exact_source_unrecoverable`. `generate.mjs --check` for v0.1 exits 1.

This is recorded, permanent, and is **not** to be worked around. Missing inputs
must not be synthesized, approximated, or regenerated from the projection. The
v0.2 compact source is the only reproducible factual baseline.

## 14. Minimum V1 Place model

**Approved at Slice 0; the physical foundation was established by Slice 1**
(section 18). The concepts below define the required surface. The tables exist
and are empty; no Place is populated and no consumer references them yet, so the
model is authoritative in **structure only**. The field-level detail recorded
here is normative for the concepts; the authoritative physical shape is
`drizzle/schema/placeAuthority.ts` plus migrations 0091–0097.

- `place` — identity, classification, lifecycle, licence state, and the
  authorization flags that govern searchability, publication and SEO eligibility
  as separate recorded concepts.
- `place_name` — name assertions with role, searchability, status, source
  reference and validity, supporting the D8 selection policy.
- `place_relationship` — typed, evidenced relationships (D10), relational
  storage only, with an explicit authorization flag for search-scope effect
  (D12). This is the **sole** authority for containment and for identity
  succession. There is no parent column and no succession column on `place`.
- `place_evidence` — every evidence assertion, including unresolved provider and
  demand signals, with review status. Signals land here and **never** create
  authority directly (D11).
- `place_external_mapping` — provider observations as evidence and enrichment
  only; never identity (D3).
- `search_area` — Property Listify-owned market identity, separate IDs, explicit
  journeys. Never a factual Place.
- `search_area_member` — explicit membership evidence, never factual
  containment.

Additionally retained as first-class requirements:

- versioned territory and admission manifests;
- deterministic Place → search-scope projection (D1, D12);
- traceable identity revision, merge and split decisions (D9);
- executable authority validation.

**No new Search Area service or registry may be created.** The existing Search
Area authority converges onto this model when its implementation slice arrives.

## 15. Domain cardinality intent (recorded, not implemented)

One Place Authority does **not** imply one foreign key per domain. The intended
cardinality is recorded here so that consumer workstreams can proceed
independently. Implementation is deferred to consumer-specific workstreams.

| Domain | Intended cardinality |
| --- | --- |
| Listing | One primary resolved geographic assignment for a property or site. |
| Development | One or more geographic site or phase assignments, plus optional presentation or estate associations. |
| Agent | Optional base location, plus many coverage or expertise Places or scopes. |
| Agency | Branches and locations, plus many coverage associations. |
| Service Provider | Multiple operating locations and service-specific coverage. |
| Canvassing | Targeting sets, plus independently located properties and prospects. |
| Demand | May target multiple Places, or one governed Search Area. |
| Saved Search | Versioned geographic query intent, not merely one Place reference. |
| Explore content | Zero-to-many geographic or subject associations. |

## 16. Province 2 (Western Cape) admission gate

Western Cape canonical admission must not begin until **all** of the following
hold:

1. The Place Authority decision (D0) is recorded in this contract, versioned,
   and reviewed.
2. The minimum V1 concepts in Section 14 are frozen, and the `place`,
   `place_name`, `place_relationship`, `place_evidence`,
   `place_external_mapping`, `search_area` and `search_area_member` model is
   declared in the canonical schema with digests recorded in
   `drizzle/schema/canonical-model-inventory.json`.
3. The Gauteng admission repair has landed: all 14 Section 7 acceptance probes
   resolve, `must_stay_non_public` is honoured, the runtime row delta against
   the v0.1 baseline is non-negative or every removal is individually approved,
   and the reconciliation gaps in Section 13.3 are closed.
4. The D3 violation is closed: the live provider-driven geography write paths
   in Section 10 are removed or reduced to recording an observation.
5. D6 criterion 6 is met: unresolved-search evidence is persisted and reaches a
   governed research queue.
6. Every `TRANSITIONAL` row in Section 10 has a recorded, reviewable exit
   condition, and the Gauteng checkpoint is pinned to a committed SHA with
   recorded digests.

**Rationale.** The v0.1 baseline proves the three-level model only for one
province. Loading eight further provinces before the identity model is settled
repeats the per-province parent-evidence and natural-key-collision failure
observed in the v0.2 candidate, and multiplies the cost of a later cutover.

### 16.1 Province 2 prerequisite reconciliation (v0.5)

Reconciled after the Phase 3 gate and the Western Cape evidence acquisition
(`docs/architecture/geography-source-acquisition-decision.md`). Recorded as
satisfied or remaining-open with evidence, so the gate is not assumed.

| # | Prerequisite | State | Evidence |
| --- | --- | --- | --- |
| 1 | D0 recorded, versioned, reviewed | **satisfied** | D0 is Section 2 of this v0.5 contract. |
| 2 | V1 concepts frozen; model declared with digests | **satisfied** | Migrations `0091`–`0097`; all seven tables present in `drizzle/schema/canonical-model-inventory.json`; 39 Place Authority CHECK constraints enforced. |
| 3 | Gauteng admission repair landed | **satisfied for admission** | `gauteng-place-admission-v0.1` admits 1,466 Places from 1,488 source identities and is physically proven from zero on a fresh disposable target. Section 7 probes resolve **1705/1705**. `Kyalami` stays `quarantined_candidate` with a null `place_id`, so `must_stay_non_public` holds. The v0.1→v0.2 runtime row delta is **0** (1,414 → 1,414), so it is non-negative. |
| 3 (residual) | Section 13.3 reconciliation | **open, by design** | The figures are reconciled as *different measured states*, not conflicts. The `v0.2 candidate, uncommitted` rows describe the Slice 1 geography-coverage review queue. Regeneration remains fail-closed under Section 11 because the exact v0.1 factual source is unrecoverable: `geography:coverage:check` exits non-zero with "Canonical layer files not found… Restore the approved canonical-root worktree." That is the recorded Section 11 state, not a regression, and the checked-in digests plus generated probes remain the executable evidence. |
| 4 | D3 violation closed | **satisfied** | `server/services/locationPagesServiceEnhanced.ts` is absent; `saveGooglePlaceLocation` has zero occurrences in `server/locationRouter.ts`; no legacy geography inserts remain in `listingLocationResolver.ts`. Asserted executably by the Slice 3 discovery contract. |
| 5 | D6.6 unresolved-search evidence reaches a governed queue | **satisfied for persistence** | `placeDiscoveryService.recordCoverageSignal` persists `unresolved_query` and `ambiguous_query` evidence with `researchPriority` 0 or 1. The governed *triage* cadence and queue ownership remain a Phase 6 item; persistence and prioritization are proven. |
| 6 | TRANSITIONAL rows have exit conditions; Gauteng checkpoint pinned | **satisfied** | Every `TRANSITIONAL` row in Section 10 carries an explicit exit condition naming its slice and observable closure. The Gauteng checkpoint is pinned with recorded digests in Section 13. |

Two qualifications that this reconciliation does **not** remove:

- The Section 11 fail-closed regeneration state means a Western Cape source
  build cannot copy the Gauteng pipeline's *regeneration* path as a template.
  It must reproduce the v0.2 shape from the acquired bundle.
- The Western Cape boundaries represent **2020**. Prerequisite satisfaction is
  about admission mechanics, not currency. No Western Cape scope may be
  published on a 2020 boundary vintage.

## 17. Slice 0 completion record (v0.5)

Slice 0 is decision and checkpoint only. It created no tables, no migrations,
no database changes, and no consumer convergence. It did not begin Western
Cape, did not activate Search Areas, did not alter provider behaviour, and did
not modify the Gauteng factual identities or the v0.1 and v0.2 artifacts.

The authoritative geography checkpoint for all implementation work is
Section 13. Any later figure that differs from it must be re-derived from the
committed artifacts and reconciled in the manner recorded in Section 13.3.

## 18. Slice 1 delivery record — canonical Place foundation (v0.5)

Slice 1 establishes the database/schema foundation only. It is proven through
Database Authority and changes no runtime consumer.

**Delivered.** Migrations 0091–0097, one `CREATE TABLE` per migration in
dependency order, registered in the canonical migration manifest and classified
in `migration-tree-authority.json`:

| Migration | Table |
| --- | --- |
| 0091 | `place` |
| 0092 | `place_name` |
| 0093 | `place_relationship` |
| 0094 | `place_evidence` |
| 0095 | `place_external_mapping` |
| 0096 | `search_area` |
| 0097 | `search_area_member` |

**Identity strategy.** `place_id` (`pl-place-01-<24 hex>`) is the primary key and
the durable cross-environment identity. **No numeric surrogate was introduced**:
no consumer references one, every child foreign key targets `place_id`, and an
unused environment-local integer would be a second identity-shaped column on the
most authoritative table in the system. `place` and `search_area` therefore carry
exactly one identifier each.

**Identity dimensions are separate columns**, never one status field:
`place_classification`, `verification_status`, `lifecycle_status`,
`publication_eligible`, `search_eligible`, and the derived `search_scope`.

**Fourteen CHECK constraints** encode only invariants the contract states
explicitly, so impossible combinations are rejected by the database:

- a `candidate` Place carries no publication or search eligibility (D11);
- a `non_statutory` Place must be `verified` before it is publishable (D4);
- publication implies search eligibility (D12);
- a `retired` Place carries no eligibility (D9);
- a search scope requires an active, searchable Place (D1, D12);
- eligibility flags are booleans, not free integers;
- a superseded or withdrawn name is not searchable (D8);
- a relationship cannot reference itself (D10);
- a provider or commercial evidence assertion must name its provider (D11);
- an evidence row with no Place must carry the query subject (D11).

**Three authority defects were found and corrected during the Slice 1
authority-closure review.** All three were invisible to the static gate, and the
third was invisible to physical congruency as well.

1. `place.search_scope` was a plain nullable column with no constraint tying it
   to `place_type`. Any writer could assert a scope contradicting the
   classification, and a reclassification could leave a stale scope behind. It is
   now a deterministic function of `place_type` enforced by
   `chk_place_search_scope_derived_from_type`: a scope may be absent, but it may
   never contradict the classification, and a type D1 gives no searchable scope
   may not carry one.
2. `place.supersedes_place_id` duplicated identity succession that
   `place_relationship` already expressed as a typed, evidenced edge. Two
   independently writable authorities for one fact could disagree undetected,
   which D9 forbids, and one nullable column cannot satisfy D9's requirement to
   state the disposition of every member identity. **The column was removed;
   succession lives only in `place_relationship`.**
3. The relationship vocabulary carried two types that duplicated authority held
   elsewhere. `search_area_member` restated the `search_area_member` table, which
   is the single authority for Search Area membership. `preceded_by` is the
   inverse of `succeeds` and was stored as a second writable authority for the
   same fact. **Both were removed; the inverse is derived by reversal and the
   V1 vocabulary is five types.**

A fourth defect was found by a physical write probe after congruency had already
passed: **`place_id` was declared `varchar(32)` while the governed identity
format `pl-place-01-<24 hex>` is 36 characters.** No compliant Place identity
could ever have been stored. Desired and physical agreed with each other, so
congruency could not detect it. Every `place_id` column is now `varchar(40)`,
FK-consistent, and `chk_place_id_format` pins the exact governed shape so a
malformed or foreign-namespace identity is unrepresentable.

These were corrected by amending migrations 0091–0097 in place rather than adding
corrective follow-up migrations. That is sound here and only here because the
migrations are unmerged and unadopted, the tables are empty, and the sole target
that applied them was a disposable worktree database that was disposed. A
corrective `DROP COLUMN` or `MODIFY COLUMN` would have required a recorded
approval reference that does not exist, and fabricating one is not acceptable.
**Any future amendment after adoption requires a new corrective migration and
the approved-exception route.**

**Behavioural proof against the live database.** 30 assertions on an owned
disposable target, each confirmed by the database rejecting or accepting the
write: scope cannot contradict classification; a reclassification that would
leave a stale scope is rejected, while reclassification with a correctly
reprojected scope is accepted; a type D1 gives no scope to can never carry one;
no succession column exists; `preceded_by` and `search_area_member` are
unrepresentable as Place relationships; a relationship requires evidence and
cannot reference itself; identical name text on two Places is accepted, as is one
Place holding the same text under two justified roles; a duplicate assertion and a
withdrawn-but-searchable name are rejected; unresolved evidence needs a subject; a
provider observation must name its provider; a malformed or Search-Area identity
is rejected and a compliant 36-character identity is stored. The target was left
empty, as found.

**Proof recorded.** On an owned disposable worktree target: 98 migrations applied
from `0000` to `0097`; physical congruency **congruent** with matching desired and
actual digests, **0** differences, **0** omitted differences, and **39 of 39** CHECK
constraints physically enforced. The static gate passes 326 tests, including 32
executable Place Authority contract tests registered in
`vitest.database-authority-static.config.ts`.

**Explicitly not done in Slice 1.** No Place is populated; no source-to-Place
generator exists yet; no `place`-shaped Database Authority reference adapter was
added, because there is no governed source to reference and an empty adapter
would be speculative. No consumer, resolver, or the three-level runtime tables
were changed; no Search Area was activated; no provider behaviour was altered;
no geography was retired; Western Cape and the Gauteng admission repair were not
started.


## 19. Slice 2 delivery record — Gauteng Place admission (v0.5)

Slice 2 admits the reproducible Gauteng v0.2 evidence into the Place Authority.
It is an identity-admission step, not a three-level projection repair, and it
changes no runtime consumer: `LOCATION_AUTHORITY_CATALOG_INDEX_PATH` is
untouched, public search is untouched, and `provinces`, `cities`, `suburbs`,
`locations` and the v0.1 projection all remain in service.

**Source baseline.** The digest-pinned v0.2 compact source
(`source_snapshot_id 14666e91…`, authority `gauteng-source-authority-v0.2`) is
the forward factual baseline, verified by digest before any row is written. The
v0.1 artifacts are retained as comparison and regression evidence only; their
unrecoverable factual JSONLs were not used as forward authority.

**Source identity is not Place identity.** 1,488 accepted source identities were
adjudicated into **1,466 Places**: 22 equivalences were merged and 1,444 Places
rest on a single source identity. Every one of the 4,350 source candidates
carries an explicit disposition — 1,466 admitted as a Place primary, 22 admitted
as merged equivalents, 2,754 quarantined candidates, 108 rejected as
non-independent — so source multiplicity never dictated Place multiplicity.

**Adjudication basis** is evidence, never name equality:

- a unique administrative container (a territory has one Gauteng), which resolved
  the two v0.2 "Gauteng" province records to one Place; and
- same normalized name, the same admitted administrative context, and
  representative points within a governed 15 km distance, which resolved
  classification disagreements such as Soweto (town vs city) and Sandton
  (suburb vs city) to one Place each.

Distinct real-world referents that share a name were preserved: Diepkloof, Waverley
and Midrand remain two Places each, on separated administrative context and
distance.

**Relationships** use only the V1 vocabulary. 1,465 `administratively_contains`
edges form a single-parent forest with exactly one root, each evidenced by the
source's geoBoundaries administrative context. No settlement, market, succession
or co-location relationship is emitted, because the approved source provides no
evidence for one. `search_scope_authorized` is `0` on every edge: Slice 2
authorizes no relationship-driven search widening.

**The 103 governed v0.1 parent-evidence inputs** were inspected and all 478
edges were classified. None was promoted to administrative containment. The
dominant class is a refuse collection area list (183 edges), which denotes a
service area; a further spread of tender, load-rotation, water, valuation-roll,
IDP and spatial-framework classes denote service, delivery or planning areas.
Classifications with plausible administrative semantics are recorded as
candidates but remain unadmitted, because they reference v0.1 source identities
and no governed crosswalk from `pl-gp-v01-*` to an admitted Place exists.

**Name policy** produced 2,476 name assertions with exactly one
`preferred_public` name per Place, chosen by a governed selection over recorded
name assertions rather than input order. 18 extension surface forms
(`Ext N` ↔ `Extension N` ↔ `Ext. N`) were generated as **names** for Places the
source had already admitted; no Place was ever generated from a name pattern.

**Kyalami was not admitted.** It has no accepted identity in the source and its
candidate remains quarantined, so the licence and evidence gate is respected.
Commercial importance is not an evidence class.

**Materializer.** `dataAdapters/canonicalPlaces.ts` is the smallest Database
Authority mechanism the governed admission source now justifies. It is
digest-aware, fail-closed, idempotent, transactional, and refuses to remap an
existing Place identity. Two guards are specific to this authority: OSM-only
Places may be materialized only on a disposable target until the founder ODbL
gate clears (D3), and a stored Place whose identity-bearing values differ from
the package aborts the load rather than being silently updated.

**Physical proof** on a newly owned disposable target, disposed afterwards: 98
migrations applied `0000`→`0097`; physical congruency congruent with matching
desired and actual digests and 0 differences; 39 of 39 CHECK constraints
enforced; first load wrote 1,466 Places, 2,476 names, 1,465 relationships, 4,463
evidence rows and 2,971 external mappings; the second load wrote 0 evidence rows
and changed nothing; a 39-assertion behavioural probe passed, covering every
named pressure test, the name model, containment forest and cycles, orphans,
duplicate provider mappings, the database's refusal of an illegal scope, a
malformed identity, an unevidenced relationship, a self-reference and a duplicate
containment edge, plus byte-identical idempotency and unchanged Place IDs across a
rerun.

**Known open cases carried forward, not closed by this slice.** Eden Park and
Azaadville have no admitted Place and remain quarantined coverage cases. Reiger
Park is admitted under its evidenced spelling `Reigerpark`, while the two-word
`Reiger Park` candidate stays quarantined. `Broadacres` is covered by a Place
named `Broadacres AH`. Sky City is absent from the approved source entirely and is
recorded as a living-geography evidence-acquisition case. Soweto has no admitted
settlement relationship to its constituent places, because the approved source
carries no evidence for one.

## 20. Scope contract repair — search scopes are categories, not levels (v0.5)

Slice 2 originally derived `search_scope` from `place_type` alone. Physical proof
during Slice 3 showed that was too weak in one direction and, when first
corrected, far too strong in the other. Both errors are resolved here.

### 20.1 The corrected rule

`province / metro_city / locality` are **product search-scope categories**. They
are not mandatory levels in the canonical Place containment hierarchy.

`D1_SCOPE_BY_TYPE` still decides which scope a *type* may carry.
`scope_establishment` decides whether that scope is *established*, and the only
mandatory ancestry requirement is an **evidenced administrative chain to the
province**:

| scope | required evidence |
| --- | --- |
| `province` | none; a province-scoped Place is its own provincial bound |
| `metro_city` | an evidenced chain to a province |
| `locality` | an evidenced chain to a province |

A scope that cannot reach a province is refused, because a search with no
provincial bound is unbounded. Nothing else about the ancestry is mandatory.

### 20.2 The canonical case

```
Gauteng                    Place, province
+-- City of Johannesburg   Place, municipality, context-only
    +-- Bryanston          Place, suburb, locality scope
```

Bryanston executes as a `locality` with an evidenced Gauteng context and **no
metro_city ancestor**. This is correct. The absence of a city Place between the
municipality and the suburb is not an admission defect.

The UI may render `Bryanston, Johannesburg, Gauteng`. That presentation does not
mean the database must assert that Bryanston is administratively contained by a
Place classified as a city. Forcing one would corrupt good geography to satisfy a
vocabulary, which is exactly what Place Authority exists to prevent.

### 20.3 What is forbidden, and is now asserted

- No artificial settlement parent may be inserted to give a locality a
  `metro_city` ancestor. Asserted: no containment edge has a `city` or `town`
  parent.
- No municipality may be re-typed as a `city` or `town` to occupy the metro tier.
  Asserted: every `local_municipality` and `district_municipality` Place carries
  a null scope and is neither searchable nor publishable.
- `metro_city` is not redefined to mean municipality, and the scope vocabulary is
  not renamed. `metro_city` remains the scope of `city` and `town` Places only.
- No new municipality Place type is introduced to complete a search ladder. A
  factual classification change requires its own evidence-based justification.

The three source records carrying `proposed_type_hints` naming
`metropolitan_municipality` (City of Johannesburg, City of Tshwane, Ekurhuleni)
remain `local_municipality` Places. They are recorded as a future
Place-classification question, deliberately not resolved here.

### 20.4 Two distinct capabilities

`search_eligible` means the Place can participate in canonical discovery.
`search_scope` states which product-search granularity it can represent. Neither
requires every conceptual scope above it to exist in its administrative ancestry.

**Exact Place execution** resolves one selected Place to its own context.
**Broad scope expansion** would include further Places. They are separate
capabilities, and only the first is proven.

Expansion is refused unless membership in an executable scope is explicitly
governed. Containment must not become market or city expansion because names are
similar, `market_association` remains non-expanding, and no generic relationship
traversal is permitted. Nothing in this admission authorises expansion: every
`search_scope_authorized` flag is 0.

### 20.5 Repaired figures

Regenerated under the corrected rule, not reverted. The same 1,466 identities and
1,465 containment edges are unchanged; only executability was recomputed.

- 1,436 searchable: 1,096 `locality`, 339 `metro_city`, 1 `province`.
- 69 publishable. The earlier figure of 28 was wrong because it had wrongly
  withdrawn every locality scope.
- 30 Places admitted with no executable scope: the district and local
  municipalities, which are factual context Places and never search levels.
- 89 verified, 1,377 provisional, 720 OSM-only: all unchanged.
- Materializer content digest
  `d7859a2e7face1dec4e648bac65a0866b82ef1297178232dbaef2541177adf70`.

### 20.6 Broad-scope expansion still unsupported

The following remain governed gaps, recorded rather than guessed:

- `Johannesburg` as a broad search target does **not** expand to every Place whose
  municipality is City of Johannesburg. Those are different relationships, and
  only exact execution is proven.
- `Soweto` does **not** expand to its constituent or market localities. The
  admitted source carries no evidenced settlement membership.
- No `metro_city` or locality Place has a governed member set for expansion.

Establishing them requires explicit semantics, such as evidenced settlement
membership or a governed executable-scope membership projection, or a Search
Area. None is invented here.

## 21. Place admission territory registry (v0.5)

Slice 2's admission pipeline named one province in application code. The builder
hardcoded its source directory, output directory, admission version and artifact
filenames; the materializer hardcoded the same values again. Admitting a second
province would therefore have required a second engine.

Section 21 removes that. One committed registry is the single authority for
where a territory's governed admission inputs live and what its admitted package
is called.

### 21.1 What a territory entry may vary

Exactly these, and nothing else:

- `territory_id` and `display_name`;
- `admission_version`;
- `source_authority`: directory, digest-pinned source manifest, and the
  filenames of the geography, names, source-link and candidate-disposition
  artifacts;
- `coverage_baseline`: the frozen v0.1 comparison directory and its recorded
  counts;
- `admission_package`: directory, manifest filename, Place-ID registry filename
  and the package artifact filenames;
- `expected_counts`: the reviewed counts a build must reproduce.

A registry entry holds no geography rows, adjudicates no Place, and licenses no
source. Those remain the source authority's and the builder's governed jobs.

### 21.2 Fail-closed rules

Loading refuses an unregistered territory, a duplicate territory id or admission
version, a filename reused across territories, a source manifest pinned twice,
an artifact path that is not a bare filename, a path escaping the repository
root, a missing expected count, and a default territory that is not itself
registered. The builder additionally refuses to finish when the produced counts
disagree with `expected_counts`, or when any path its manifest advertises does
not exist.

### 21.3 Why this is separate from Section 10's projection catalog

`data/geography-coverage-v0.1/territory-catalog.v0.1.json` pins the frozen
Slice 1 runtime natural-key projections. The admission registry names the
admission pipeline's inputs and outputs. They hold disjoint fields, name disjoint
artifacts and have different lifecycles, so neither can override the other.

They are also not merged, because Section 12.7 requires the neutrality proof to
run a synthetic non-Gauteng territory **without adding fictional rows to the
real catalog**. A single shared file could not satisfy that. The proof therefore
writes its synthetic territory into a throwaway directory and removes it
afterwards; nothing fictional is committed and the real registry never gains an
entry.

### 21.4 Neutrality is proven, not asserted

`tools/place-admission/prove-territory-neutrality.mjs` admits a synthetic
province, two municipalities and three suburbs through the real builder and the
real materializer, and asserts that the package is digest-pinned, that
regeneration is byte-identical and mints no Place IDs, that the unchanged
materializer loads it, that an unregistered territory is refused, and that the
real registry and the real projection catalog are byte-unchanged.

A territory is admitted by adding a registry entry plus its governed source
evidence. It is never admitted by adding application architecture, and never by
copying another territory's rows as a template (Section 11).


## 22. Approved launch Listing scope membership (v0.6)

**Approval:** Edward, 2026-10-07, geography launch-readiness goal conversation.
Selected answer: “Approve that launch scope policy.” The reviewed question
permits province search to include listings assigned to approved Places with
evidenced containment in that province, while city/town search includes only
explicitly reviewed members. The consumer delivery and integration review is
recorded in `geography-launch-readiness-goal-2026-10-07.md`.

This approval establishes one versioned Listing membership projection, not a
new Place, a second geography authority or unrestricted graph expansion:

- An explicitly selected province includes exact assignments to that province
  and assignments to admitted, active, executable Places whose complete
  accepted administrative containment chain resolves to that province.
- A locality query remains exact identity. A city/town query includes exact
  assignments and only separately evidenced and explicitly reviewed members.
  No city descendant set is currently admitted by the national packages.
- Municipality context remains context. It cannot supply a city boundary,
  settlement membership or market association. Search Areas retain their
  distinct authority, cardinality and journey authorization.
- A source package must be registered, digest-verified and admitted. Runtime
  assignment and membership must match that accepted source projection.
  Unknown identities, conflicting parents, missing/retired referents, cycles,
  invalid scope tiers or an exhausted traversal cannot contribute membership.
  A malformed requested scope must fail visibly rather than become unfiltered.
- No typed/provider/display text or geographic coordinates derive membership.
  Mixed geography authorities continue to be rejected. A request that fails
  canonical execution cannot fall back to a parent or legacy catalog.
- This projection is bounded to province Listing search. It does not set raw
  `search_scope_authorized` flags or authorize another consumer to traverse
  arbitrary relationships. Per-edge default refusal remains binding elsewhere.
- Tier B selection stays allowed under D2. Protected source activation,
  licensing/ODbL decisions, physical/provider capability and SEO eligibility
  remain separate gates. Approval of this policy is not a database release.

The implementation must publish its projection version, accepted source pins,
member set and refusal evidence. It must prove the Listing assignment-to-public
projection-to-search handoff on the owned target and in the customer interface;
policy approval and national Place counts alone do not establish launch readiness.

Historical v0.5 sections and package proof pins above remain historical evidence.
No identity allocation, artifact or earlier operational approval is amended by
this policy revision.
