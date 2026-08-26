# Location and Geography Global Coverage Strategy

## OX Alpha handoff report

**Status:** Strategy and implementation handoff
**Date:** 2026-08-26
**Implementation owner after handoff:** OX Alpha
**Current pilot territory:** Gauteng, South Africa

## 1. Executive decision

Property Listify must treat location discoverability as a product prerequisite,
not as a collection of manually added search terms. If a legitimate place does
not appear when a buyer, renter, land user, developer, or explorer searches for
it, the platform has failed before the listing results, lead flow, or discovery
experience can begin.

The existing geography work is valuable, but it is not “all of Gauteng.” It is
a governed proof of the identity, evidence, projection, and runtime-resolution
model. It deliberately stopped at a bounded runtime and Search Area boundary.
The next step is therefore not another one-off addition for Mamelodi, Soweto,
Newtown, or any other named place. The next step is a territory-wide geography
coverage pipeline that can ingest, validate, project, materialize, and search
all approved places in bulk.

The strategic sequence is:

```text
source universe
  -> factual candidate catalogue
  -> canonical identities and hierarchy
  -> aliases and name normalization
  -> executable consumer-search projection
  -> target-environment runtime reference data
  -> canonical discovery API and UI
  -> coverage telemetry and governed refresh
```

Gauteng should be completed as the reference implementation for this pipeline.
After that, the same workflow should operate territory by territory until the
global coverage objective is reached.

## 2. Product requirement

The product requirement should be stated as a coverage contract:

> For every geography that Property Listify has approved for a territory, a
> user can find it by its accepted name or alias, understand its context and
> type, select one canonical location identity, and receive the correct search
> scope. A place that is ambiguous, unsupported, or not yet licensed is not
> silently guessed or widened; it is routed to a visible review/coverage path.

This applies across:

- Buy and Rent;
- Explore and general discovery;
- Developments and land;
- public location pages;
- listing authoring and location confirmation; and
- future agent, agency, and service discovery.

The user experience should never depend on whether an engineer remembered to
add one more suburb to a hard-coded array.

### Required user outcomes

1. Exact places are searchable by their preferred name.
2. Common alternate names, abbreviations, spelling variants, transliterations,
   and provider labels resolve to the same approved identity when evidence
   supports that relationship.
3. Hierarchy is visible: for example, a locality can show its city, province,
   country, or other approved parent context.
4. Fine-grained places such as township sections, neighbourhoods, estates, and
   extensions can be searched without forcing every term into the `suburb`
   category.
5. Same-name places remain distinguishable by parent context, country, or
   coordinates.
6. Search selection always produces a canonical identity; provider IDs and
   display text are evidence or UI input, not public search authority.
7. A failed search produces a useful next action and a measurable coverage
   signal rather than silently searching a broader or unrelated geography.

## 3. What the existing work actually established

### 3.1 Candidate and factual research

The Gauteng research stream created a broad factual catalogue and separated
source observations from promoted identities. The current factual summary
records **1,480 factual canonical identities**, including cities, towns,
suburbs, localities, neighbourhoods, villages, townships, municipalities, and
estate/development candidates. It also preserves provisional and candidate-only
records instead of presenting every observed name as settled truth.

The factual catalogue includes the important probes discussed in this handoff,
including Soweto and Mamelodi. Their presence in the factual catalogue does not
yet guarantee that they are present in the runtime database search catalog.

### 3.2 Search Area research

The Search Area work researched 19 possible market concepts and defined six
bounded launch-critical candidates: Johannesburg North, Johannesburg South,
East Rand, Pretoria East, Midrand, and Centurion.

A Search Area is a Property Listify-owned market scope. It is not a replacement
for factual geography. It may contain multiple factual locations, may overlap
another Search Area, and must remain a separate identity from a same-named city,
town, or suburb.

The six-area work produced a bounded current membership set of 61 projection-
ready memberships. It intentionally did not activate those Search Areas or
claim that the 61 memberships represented every Gauteng place.

### 3.3 Runtime convergence

The runtime-convergence work established the durable bridge:

```text
factual ID
  -> factual type and accepted context
  -> executable runtime scope
  -> stable natural key
  -> target-environment database row
```

The numeric values such as `city:30` and `suburb:51` are environment-specific
runtime handles. They are not durable geography identities and must not be
copied between environments.

The generated Gauteng runtime projection currently contains 66 governed
reference rows, while the local preview database materializes 9 provinces, 30
cities, and 51 suburbs. That is a meaningful improvement over the initial
bounded fixture, but it is still a runtime slice—not the 1,480-record factual
catalogue.

### 3.4 Public search path

The public autosuggest currently combines:

- the canonical database catalog from `provinces`, `cities`, and `suburbs`;
- governed factual/runtime discovery where an executable projection exists;
- Search Area suggestions; and
- Google Places suggestions as provider evidence/UI assistance.

The canonical database result is the part that can provide a public typed
location ID. The recent narrow continuation added Soweto and Newtown to that
runtime reference projection and bumped the location-search cache version so an
old empty result could not continue masking the new rows.

That continuation proves the path works. It does not solve territory-wide
coverage.

## 4. The central gap

The repository currently has several different notions of “location,” and they
must not be confused:

| Layer | Purpose | Current state |
| --- | --- | --- |
| Factual geography | What exists in the real world and what the evidence supports | Broad Gauteng catalogue; 1,480 identities with statuses and provenance |
| Consumer search scope | What a user may search as an exact location or market area | Governed projection exists, but only a bounded runtime slice is materialized |
| Runtime reference catalog | Rows the public API can resolve into canonical IDs | Classic province/city/suburb tables; current preview is 9/30/51 |
| Search Area | Property Listify market grouping | Six bounded definitions; not activated by the convergence work |
| Provider evidence | Google Places and other external observations | Useful for enrichment and authoring, not canonical public identity |
| Aliases | Alternate names and spelling forms | No complete first-class alias layer yet |
| Authoring auto-population | Resolving a listing’s selected location | Active listing workflow; encounter-driven and not a complete geography catalog |

This explains the original symptom. A place can be factually known, researched,
or present in a Search Area evidence file and still be absent from
`location.searchLocations` because no executable runtime reference row exists.

### Important examples

- **Soweto:** present in the factual catalogue and now materialized as a
  city-style runtime location in the local preview.
- **Newtown:** now materialized as a Johannesburg suburb runtime reference;
  it remains explicitly runtime-only until a factual identity is separately
  accepted.
- **Mamelodi:** present in the factual catalogue, but it must be carried
  through the full projection and materialization workflow rather than added as
  another isolated exception. Its exact parent and search scope must follow the
  accepted evidence; the product should not simply force every township into a
  suburb row.
- **Mamelodi extensions:** each term must be classified. A genuinely distinct
  locality can be a child identity; a naming variant can be an alias; an
  unverified label remains a candidate/review record. The pipeline must make
  that decision systematically.

## 5. Strategic model for “the whole world”

“Build the whole world” should mean a repeatable global coverage capability,
not a promise that a single static table will contain every informal name on
day one.

The product should operate with explicit coverage tiers:

| Tier | Meaning | Public behavior |
| --- | --- | --- |
| A — executable canonical | Identity, parent chain, scope, provenance, and runtime row are verified | Fully searchable and selectable |
| B — executable provisional | Identity and parent are safe enough to search, but evidence or freshness is still provisional | Searchable with an internal freshness/review obligation; never used to invent a broader boundary |
| C — candidate or alias pending | Observed name has not passed identity, hierarchy, licensing, or ambiguity gates | Not canonical; retained for review and no-result recovery |
| D — rejected/retired | Duplicate, non-independent, unsupported, or retired identity | Not public; preserved as provenance where required |

The exact public behavior for Tier B is an OX Alpha product decision. The key
rule is that evidence status must be explicit and must never be hidden by
coercing a record into a familiar city or suburb.

## 6. The proposed end-to-end workflow

### Phase 0 — Establish the coverage contract

Create a territory coverage manifest before importing more rows. At minimum it
must record:

- country and territory scope;
- expected administrative and consumer levels;
- approved public classifications;
- source and licensing policy;
- refresh cadence;
- provisional/publication policy;
- canonical URL policy;
- alias and transliteration policy;
- coverage owner and review queue; and
- measurable acceptance criteria.

For Land, the existing contract remains binding: one geography authority per
request, no mixed canonical/Search Area/display-text scopes, and only the
central `LAND_PUBLIC_CLASSIFICATIONS` allow-list.

### Phase 1 — Build a complete candidate universe

For Gauteng, the input should be the full accepted territory universe, not a
short list of familiar suburbs. The ingest should collect all available
administrative and consumer-relevant place observations, including:

- province and municipality context;
- cities, towns, townships, and villages;
- suburbs and neighbourhoods;
- localities and sections/extensions;
- estates and developments where the product needs them;
- alternate spellings and language/transliteration forms; and
- source/provider identifiers as evidence only.

The output is a versioned candidate artifact with source provenance and
licensing metadata. No candidate should write directly to the public runtime
tables.

### Phase 2 — Canonicalize identities and hierarchy

Canonicalization must be identity-first, not name-first.

For each candidate:

1. Determine whether it is an independent place, an alias, a section of a
   parent place, an estate/development, a market term, or a source-only label.
2. Preserve the factual type even when the runtime search scope uses a
   different executable level.
3. Resolve parent edges from accepted evidence, not from string matching or
   nearest-name assumptions.
4. Keep same-name identities separate until evidence proves they are the same.
5. Attach coordinates/boundaries only with the applicable source and licensing
   rules.
6. Assign a stable Property Listify factual ID that does not depend on a target
   database auto-increment value.
7. Record aliases as aliases; do not create duplicate canonical records for
   every spelling or provider label.

This is where “Mamelodi Extension 1” versus “Mamelodi Ext 1,” for example, is
resolved by policy and evidence instead of by manually adding whichever string
the last user typed.

### Phase 3 — Generate the consumer-search projection

Every promoted identity that should be searchable must receive a generated
projection containing:

- factual ID;
- preferred display name;
- factual type;
- runtime search scope kind;
- stable runtime natural key;
- parent natural key;
- canonical path/URL inputs;
- searchable aliases;
- source/evidence references;
- publication/status state; and
- an explicit reason when it is blocked.

The projection must support both ordinary exact locations and future market
areas without merging their identity namespaces.

The projection is the bridge between research and application data. It is not a
second hand-maintained geography authority.

### Phase 4 — Materialize target-environment reference data

The Database Authority adapter should consume the generated projection and
perform an idempotent, governed reference-data prepare operation:

1. resolve or insert by stable natural key and parent hierarchy;
2. never copy numeric IDs between environments;
3. preserve approved status, origin, names, and hierarchy;
4. verify expected counts and every required natural key;
5. fail closed on duplicate or unresolved parents; and
6. emit a digest and target fingerprint for the prepared environment.

This is the point at which a complete Gauteng catalog becomes searchable by the
public API. It is also the point that must be repeated for every target
environment through the repository’s Database Authority workflow.

### Phase 5 — Unify discovery and selection

The public discovery API should return one stable suggestion shape for every
consumer surface. It should include:

- canonical location ID;
- factual type and public display type;
- preferred name and matched alias;
- country/territory/parent context;
- canonical path;
- runtime scope kind;
- listing/development availability signals where applicable; and
- a match reason such as exact, prefix, alias, or context match.

The UI may still use Google Places for provider enrichment, but a provider
selection must be resolved into a canonical Property Listify identity before it
can drive public search or authoring. A raw provider place ID must never become
the search identity.

### Phase 6 — Close the feedback loop

Instrument every location search with a privacy-safe coverage event:

- normalized query;
- territory/context if known;
- result count;
- selected canonical identity, if any;
- source/match reason;
- ambiguity or no-result reason; and
- review status.

Aggregate no-result and low-confidence queries into a governed research queue.
That queue is the input to the next data refresh—not a permission for runtime
code to guess a location or for an engineer to insert one row ad hoc.

### Phase 7 — Roll out in territory waves

Recommended order:

1. Complete Gauteng as the pilot and prove the pipeline.
2. Complete the rest of South Africa using the same contract and data model.
3. Add countries/territories in prioritized waves based on product demand,
   listing supply, licensing, and operational capacity.
4. Refresh each territory independently while preserving global identity and
   provenance rules.

## 7. Gauteng pilot definition of done

Gauteng should not be declared complete when Soweto, Mamelodi, or a handful of
popular suburbs work. It is complete when:

- the 1,480-record factual catalogue has an explicit promote/provisional/
  candidate/rejected decision;
- every publicly searchable identity has an executable runtime projection;
- all approved parent edges are materialized and verified;
- aliases and extension naming patterns are covered by generated data;
- all approved rows are present in the preview database reference catalog;
- random and generated probes cover municipalities, towns, townships,
  suburbs, neighbourhoods, estates, and extensions;
- same-name factual locations and Search Areas are disambiguated;
- no-result queries are observable and routed to the research queue;
- Buy, Rent, Explore, Developments, and Land selection contracts pass; and
- the generated projection and database reference prepare are deterministic.

The acceptance probe set should include at least:

```text
Johannesburg, Pretoria, Soweto, Mamelodi,
Mamelodi Extension 1, Mamelodi Extension 4,
Newtown, Sandton, Bryanston, Randburg,
Midrand, Centurion, Roodepoort, Vereeniging,
and representative same-name/alias/ambiguous cases.
```

The extension names above are test probes, not an instruction to promote them
without evidence.

## 8. OX Alpha implementation work packages

OX Alpha should treat the following as one coordinated program, with each
package producing a reviewable artifact and executable checks.

### A. Geography contract and taxonomy

- Finalize global location levels and public classifications.
- Keep factual type separate from executable search scope.
- Define the public policy for provisional and unresolved identities.
- Confirm Search Area versus exact-location semantics for each journey.

### B. Evidence and canonical data pipeline

- Build the territory source manifest and licensing gate.
- Produce complete candidate/factual artifacts.
- Generate stable IDs, parent edges, aliases, status, and provenance.
- Preserve candidate and rejected records outside public authority.

### C. Runtime projection and materialization

- Generalize the current Gauteng runtime projection generator.
- Extend the Database Authority adapter for idempotent bulk reference
  preparation and verification.
- Add completeness and duplicate-parent checks.
- Produce target-specific runtime handles only during environment preparation.

### D. Discovery API and client handoff

- Replace the narrow province/city/suburb suggestion contract with the unified
  typed suggestion shape.
- Search canonical names and approved aliases.
- Group or label results by type and hierarchy context.
- Make canonical selection mandatory before public search handoff.
- Retire hard-coded nav and location arrays progressively.

### E. Authoring and provider integration

- Keep Google/provider data as location evidence and enrichment.
- Resolve provider results through the canonical geography authority.
- Let listing authoring create a reviewable encounter/candidate signal, not an
  ungoverned public geography identity.
- Ensure authoring and consumer search use compatible parent and type rules.

### F. Coverage operations and observability

- Create territory coverage dashboards and no-result reports.
- Track freshness, alias hit rate, ambiguity rate, and canonical selection rate.
- Establish a scheduled refresh and review cadence.
- Add generated contract tests instead of manually maintaining example-only
  tests.

## 9. Non-negotiable guardrails

Do not:

- add locations one by one as permanent product work;
- treat Google Places IDs, listing display text, or numeric database IDs as
  durable geography identity;
- place every township, estate, or extension into `suburb` merely because the
  legacy schema has only that column;
- merge same-name places without accepted parent/evidence authority;
- widen a search from a missing locality to its city or province silently;
- turn a Search Area into a factual city/suburb or vice versa;
- let an authoring encounter silently promote an unreviewed public location;
- maintain a second seed/schema/projection authority; or
- bypass Database Authority with manual SQL or runtime schema guessing.

## 10. Decisions OX Alpha must make before implementation

1. Which geography levels are publicly searchable in the first global release?
2. Are executable provisional identities selectable, or suggestion-only until
   promoted?
3. Which global data sources and licenses are acceptable for reusable product
   data?
4. Should estates and developments be exact locations, child localities, or
   separate discovery entities?
5. What is the public behavior for a valid but not-yet-covered place?
6. What coverage and freshness targets define “complete” for a territory?
7. Which locations receive SEO pages, and which remain search-only?
8. How are multilingual names, transliterations, and alternate scripts
   represented and ranked?

These decisions should be recorded in the geography contract before schema or
bulk-data implementation begins.

## 11. Repository authority and handoff references

The following files are the starting context for OX Alpha:

- [Gauteng factual canonical summary](../../data/gauteng-factual-canonical-v0.1/output/gauteng_factual_canonical_summary_v0.1.md)
- [Gauteng Search Area research summary](../../data/gauteng-search-area-research-v0.1/output/gauteng_search_area_research_summary_v0.1.md)
- [Gauteng Search Area definition](../../data/gauteng-search-area-candidates-v0.1/output/gauteng_search_area_definition_summary_v0.1.md)
- [Gauteng runtime convergence summary](../../data/gauteng-canonical-runtime-convergence-v0.1/output/gauteng_canonical_runtime_convergence_summary_v0.1.md)
- [Runtime reference projection](../../data/gauteng-canonical-runtime-convergence-v0.1/output/gauteng_runtime_reference_projection_v0.1.json)
- [Search Discovery Engine draft](../search-discovery-engine.md)
- [Land consumer journey contract](./land-consumer-journey-contract.md)
- [Shared location contract](../../shared/location-contract.ts)
- [Runtime geography contract](../../shared/runtimeGeography.ts)
- [Canonical geography adapter](../../server/_core/databaseAuthority/dataAdapters/canonicalGeography.ts)
- [Runtime convergence generator](../../tools/gauteng-runtime-convergence/generate.mjs)

Two older documents must not be treated as current authority:

- `LOCATION_AUTO_POPULATION_COMPLETE.md` is explicitly retired.
- The older search architecture notes are useful historical context, but the
  active contracts, current router/services, generated projections, and
  Database Authority policy take precedence.

## 12. Handoff conclusion

The immediate strategic move is to build the geography coverage machine, not to
continue the exception list. Soweto and Newtown were useful diagnostic probes:
they exposed that the platform had a sound bounded authority model but an
incomplete runtime catalog.

OX Alpha should use Gauteng to prove full-territory ingestion and materialization
with Mamelodi, township/locality depth, extensions, aliases, and ambiguous-name
handling as acceptance cases. Once that pipeline passes, adding the rest of the
world becomes a governed data and operations program instead of an endless
sequence of city-by-city code changes.
