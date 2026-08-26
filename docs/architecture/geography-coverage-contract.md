# Geography Coverage Contract

**Status:** Active authority for territory geography coverage work
**Owner:** OX Alpha (implementation) / Edward (founder approval boundary)
**Version:** 0.1 (2026-08-26)
**Supersedes:** ad-hoc per-location additions; complements the runtime
convergence v0.1 bounded slice without rewriting it.

This contract records the product and data decisions that govern the
territory-wide geography coverage pipeline. It is the Phase 0 artifact of the
Location and Geography Global Coverage Strategy handoff. Schema or bulk-data
implementation below must conform to it.

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
3. Natural-key collisions fail closed: the colliding identity queues with
   reason instead of inventing a suffix.
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
