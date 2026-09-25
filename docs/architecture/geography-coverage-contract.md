# Geography Coverage Contract

**Status:** Active authority for territory geography coverage work
**Owner:** OX Alpha (implementation) / Edward (founder approval boundary)
**Version:** 0.3 (2026-09-25)
**Supersedes:** ad-hoc per-location additions; complements the runtime
convergence v0.1 bounded slice without rewriting it.

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

## 1. Coverage contract

For every geography Property Listify has approved for a territory, a user can
find it by its accepted name or alias, understand its context and type, select
one canonical location identity, and receive the correct search scope. A place
that is ambiguous, unsupported, or not yet licensed is never silently guessed,
widened, or coerced into a familiar level; it is routed to a visible review and
coverage path.

## 2. Decisions (handoff Section 10)

These decisions are binding until explicitly revised.

### D1 — Publicly searchable levels in the first global release

Searchable runtime scopes are exactly the existing three executable levels:

| Factual type | Runtime scope | Storage |
| --- | --- | --- |
| province | `province` | provinces |
| city, town | `metro_city` | cities |
| suburb, locality, neighbourhood, village, township | `locality` | suburbs |

Municipalities (district and local) are parent **context**, never searchable
scopes, in release 1. They appear only inside factual context metadata.
Factual types remain preserved on every projection row; no type is rewritten
to fit storage.

### D2 — Provisional identities are selectable

Tier B (executable provisional) identities are searchable and selectable with
status `provisional`. They carry an internal review obligation through the
disposition artifact; they must never be used to invent or widen a boundary,
and they are excluded from SEO page generation until promoted to Tier A.
Public UI must not display alarm labels for provisional status, but internal
surfaces (admin coverage dashboard, research queue) expose it.

### D3 — Acceptable sources and licences

- Approved evidence classes: official government registers and municipal
  publications; GeoNames (CC0/attributed); Wikidata (CC0); geoBoundaries
  gbOpen (CC BY 4.0); OSM/Geofabrik (ODbL 1.0); NGA GNS (no restriction).
- Google Places and any future commercial provider are **evidence and
  enrichment only**. Provider place IDs can never become public identity.
- ODbL obligation: `osm_only_odbl_provisional` rows may be materialized in
  disposable development/preview targets under this contract. Any staging or
  production release of OSM-only rows requires the founder-owned production
  ODbL database-strategy gate to be cleared first. The adapter must keep row
  licensing classification observable so that gate is enforceable mechanically.

### D4 — Estates and developments

Estate/residential-development candidates are **child localities**: projected
at `suburb` storage with factual type preserved, once an accepted parent chain
exists. Promotion to a separate discovery entity is deferred until listing
supply justifies it (future decision, not part of release 1).

### D5 — Public behavior for valid-but-not-covered places

An exact-name miss produces an honest no-result state plus a visible
"suggest a location" path that feeds the coverage research queue. The system
must not silently widen a failed locality search to its city or province.
Provider/address suggestions may still be shown, labelled as address-level
evidence for authoring, never as canonical public scopes.

### D6 — Coverage and freshness targets

A territory is "complete" when:

1. every accepted factual identity has an explicit disposition (promoted /
   provisional / candidate-queued / rejected-retired);
2. every promoted identity has a deterministic executable projection;
3. all materialized parent chains verify in the target environment;
4. generated probes (municipalities, towns, townships, suburbs,
   neighbourhoods, extensions, same-name cases) resolve end-to-end;
5. regeneration is byte-identical (`--check` passes);
6. no-result telemetry is flowing into the research queue.

Refresh cadence: full regeneration is deterministic from versioned inputs;
territory refreshes re-run the pipeline and diff dispositions. Ad hoc manual
rows are prohibited everywhere.

### D7 — SEO pages

SEO pages are generated for Tier A identities at province/city/locality levels
with listing supply or strategic market value. Tier B remains search-only
until promoted. Same-name localities require disambiguated paths (parent
segments) before any page generation.

### D8 — Multilingual names and transliterations

One preferred display name per identity. Alternate spellings, language forms,
transliterations, abbreviations, and historical names are **aliases**:
generated from accepted name assertions plus governed normalization patterns
(e.g. `Extension N` ↔ `Ext N`). Aliases never create canonical records.
Matching ranks: exact preferred > exact alias > prefix preferred > prefix
alias > substring. Identifier-like labels (QIDs, codes, URLs) stay
non-searchable provenance.

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

| Asset or path | Disposition | Authority role and required action |
| --- | --- | --- |
| `docs/architecture/geography-coverage-contract.md` and the active territory manifest | **CANONICAL** | Govern policy, accepted inputs, sources, parent decisions, and licensing. Preserve and version them. |
| `data/geography-coverage-v0.1/output/gauteng_runtime_reference_projection_v0.2.json` | **CANONICAL** | Frozen current Gauteng runtime row authority. Load by digest; do not rewrite while Slice 1 is reviewable. |
| `data/geography-coverage-v0.1/output/gauteng_factual_runtime_mapping_v0.2.jsonl` | **CANONICAL** | Frozen current factual-to-runtime disposition bridge. Every factual identity remains distinct, including co-published members. |
| `data/geography-coverage-v0.1/output/gauteng_coverage_disposition_v0.1.json` and `gauteng_review_queue_v0.1.jsonl` | **CANONICAL** | Preserve counts, reasons, candidate evidence, and research obligations; never materialize blocked rows publicly. |
| `data/geography-coverage-v0.1/territory-catalog.v0.1.json` | **CANONICAL** | Digest-pinned registry of immutable territory artifacts. It contains no copied geography rows and cannot override a source artifact. |
| `shared/factualRuntimeGeographyBridge.ts`, `shared/runtimeGeography.ts`, and the governed runtime reference loader | **CANONICAL** | Validate IDs, projection shape, natural-key hierarchy, and exact governed co-publication. Reject malformed or ambiguous source data. |
| `server/_core/databaseAuthority/dataAdapters/canonicalGeography.ts` and the `provinces`, `cities`, and `suburbs` tables | **CANONICAL** | Materialize and verify governed natural keys on authorized targets. Numeric IDs are environment-local handles. |
| Static `PROVINCES`, `CITIES`, and `SUBURBS` arrays in the Database Authority geography adapter | **TRANSITIONAL** | Retain only as the reviewed foundation minimum in Slice 1. Replace them with a versioned generated foundation source in a later database-reference slice; do not add more hand entries. |
| `server/services/searchAreaDefinitions.ts` and the Search Area execution contracts | **CANONICAL, SEPARATE** | Search Areas remain a separate governed market identity. Candidate evidence and activation decisions are not factual geography and are outside this Slice 1 change. |
| `data/gauteng-search-area-candidates-v0.1/` and `data/gauteng-search-area-research-v0.1/` | **ARCHIVED EVIDENCE** | Preserve definitions, membership research, and provenance. Never copy a Search Area into a factual row or infer factual identity from membership. |
| Google/provider IDs, labels, and `location_provider_mappings` | **ARCHIVED EVIDENCE** | Retain for enrichment, encounter review, and provenance. A provider observation must not create or promote a public geography row. |
| `server/services/locationAutoPopulation.ts`, provider-driven geography writes, and retired auto-population completion notes | **RETIRED** | No runtime authority or compatibility fallback remains. Preserve historical artifacts only where they document research or incidents. |
| Legacy `locations` rows, `locations.id`, `listings.locationId`, `developments.locationId`, and geography text columns | **TRANSITIONAL** | Preserve current consumers and historical evidence, but resolve new cross-environment identity through governed natural keys and typed target handles. Do not copy numeric IDs between environments. |
| Direct classic-table discovery, `resolveLocation` widening, free-text geography execution, and location-page text matching | **TRANSITIONAL** | Classify and remove in bounded consumer-convergence slices. They do not become canonical by being read from the canonical tables. |
| Agents, Agencies, Services, Canvassing, Demand, Saved Searches, Explore, Developments, and location-page geography fields | **TRANSITIONAL** | Retain current behavior for Slice 1, then converge each family to typed canonical location IDs without rewriting unrelated product logic. |
| `data/gauteng-candidate-catalogue-v0.1/`, `data/gauteng-canonical-promotion-v0.1/`, `v0.2/`, and `data/gauteng-factual-canonical-v0.1/` summaries | **ARCHIVED EVIDENCE** | Retain provenance and research history. Do not bulk-migrate them around the governed projection and disposition checks. |
| Superseded numeric runtime handles, provider place IDs, display text, and hard-coded client maps | **DO NOT MIGRATE** | They may be read only inside an explicitly bounded transitional consumer. They never become canonical factual or cross-environment identity. |

A disposition is not a compatibility approval. Any runtime fallback outside
this matrix is audit debt, not authority.

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
