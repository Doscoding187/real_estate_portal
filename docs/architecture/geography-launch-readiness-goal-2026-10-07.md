# Geography launch-readiness goal — 2026-10-07

Status: active; launch readiness is not established.

Edward selected **all nine provinces with approved locations**. The outcome is
one reviewable location workflow: a customer selects an approved canonical
Place, authors and publishes a property against that identity, and another
customer finds it through the approved location search scopes. Ambiguous and
unsupported inputs must have visible outcomes, never guessed identity or wider
search results. National storage evidence alone cannot close this goal.

## Workstream and integration boundary

- Worktree: `.worktrees/property-listify-place-authority-slice0`.
- Branch: `feat/place-authority-slice0-decision`.
- Storage repair: `cc6a03da4f303e2c1affcb75f31390f7955d5dc8`.
- Remote integration source inspected: `b0bebc343a710f7e5713efc1d36cd5d3bca68455`.
- That source was merged locally as `8546386dc2e190b6b60dc13492468122da646774`.
  Accepted readiness, Redis and security-header changes are included, with no
  text conflict. This is not a remote merge or a deployment acceptance.
- The parallel founder identity authority worktree is read-only to this task.
  Its pending `0095_founder_identity_authority.sql` conflicts in sequence with
  this branch's `0095_place_authority_place.sql`. Both change the schema index,
  active manifest and migration-tree classification.

Do not adopt an uncommitted founder schema or reserve a manifest gap. The bounded
founder blocker should complete its independent review first; refresh the
accepted integration source and serialize the geography sequence against its
actual manifest. Sequence changes must preserve SQL bytes, rebuild lineage and
invalidate stale proof pins. Any pre-adoption amendment must demonstrate all
five conditions in the Database Change Protocol; it is not automatic permission
to rewrite an adopted migration. Continue consumer preparation independently.

### Listing consumer preparation

Founder identity is now committed in PR #590 at
`b0cb48f676bfe470ce29c49c9679fd65d1766c7b`, but was still open and unmerged
when this preparation was reviewed. The accepted remote integration source
remains `b0bebc343a710f7e5713efc1d36cd5d3bca68455`. The authoring-boundary preparation assigned no additional SQL sequence.

The prepared `shared/canonicalListingLocation.ts` boundary declares version 2
and one nullable `canonicalPlaceId`, with private address, a complete coordinate
pair and source, confirmation, public address policy and a separately typed
provider observation. It rejects numeric handles, geographic display text,
Search Areas and sibling scopes. An unresolved draft is allowed; a confirmed
assignment requires its selected identity and location evidence. Existing
Listing product consumers have **not** been switched to this boundary yet.

`resolveCanonicalListingPlace` takes the caller's authorized database or
transaction. All identity and ancestry reads use that supplied reader, and
transport failures propagate. Explicitly invalid selections are refused even
for drafts. Direct localities require no city ancestor. Publication preparation
requires confirmation and property-appropriate evidence; a province-only urban
assignment is refused. Tier B selection remains permitted under D2, independent
of Place SEO publication eligibility. Active preferred labels are presentation
only; absent or conflicting labels are refused rather than reconstructed from
provider text.

The next schema review must add a nullable, width-40 `canonical_place_id` to
`listings` and its derived `properties` projection, appended in matching model
and physical order. Each table needs a separately sequenced restrictive foreign
key to `place.place_id` and a named lookup index. Existing `placeId` remains
provider evidence. Draft nullability is intentional; confirmed publication must
validate the canonical assignment in its domain transaction. No text, numeric
handle or JSON backfill is authorized to manufacture this reference. Land's
parcel-owned assignment requires its own contract review and is not inferred
from the listing projection.

The consumer cutover must persist this reference, carry it through revisions,
revalidate it at publication with the required concurrency protection, and copy
it into the public projection. It must replace the Listing API and wizard
authority together, clear competing handles, derive display labels from the
selected identity and preserve address privacy. No schema compatibility branch
or request precedence is proposed. A prepared resolver does not prove customer
publication or listing search membership.

Preparation verification is recorded in
[canonical-listing-preparation.json](launch-readiness-and-product-convergence/evidence/geography-consumer-readiness-2026-10-07/canonical-listing-preparation.json):
41 assignment/boundary tests, including nine source-backed national cases;
614 tests across 55 files in the authority gate; deterministic inventory,
121 utility surfaces and lifecycle checks passed. Production type checking
passed; broad type checking retains 263 baseline errors with none in changed
files. Focused lint reports zero errors and 11 warnings. No database was
initialized or mutated for this preparation.

Concurrent broad verification exposed an existing test isolation defect:
registry-corruption tests backed up and restored the shared working file.
The task-owned registry was restored to its committed bytes, and all damaged
fixtures now live in individual temporary directories. Each allocation-loss
test restores and successfully replays its own registry; the shared committed
registry is checked unchanged. The final focused admission suite passes 33
tests. This repair protects parallel verification without weakening identity
refusals.

## Verified starting facts

The [admitted catalog audit](launch-readiness-and-product-convergence/evidence/geography-consumer-readiness-2026-10-07/admitted-catalog-audit.json)
pins the source commit, registry and inspected package bytes. It is source
evidence, not a deployment or physical consumer proof.

| Fact | Observed result | Consequence |
| --- | --- | --- |
| National admitted identities | 17,664, across nine provinces | Preserve them; do not derive replacements from names or database IDs. |
| Locality Places | 16,596 | A locality selection must persist its own identity. |
| Localities with a city-scope ancestor | zero | The old mandatory city hierarchy cannot represent the national dataset. |
| Localities without province context | zero | Provincial context is available without inventing a city. |
| Search-authorized relationship edges | zero | Containment and market association cannot silently expand a city query. |
| OSM-only licensing classification | 720, all Gauteng | Disposable proof is allowed; protected materialization retains the founder ODbL gate. |
| Public authoring | `listingLocationResolver.ts` uses province/city/suburb handles | No canonical Place reference is persisted by this path. |
| Public autocomplete | `LocationAutocomplete.tsx` calls `location.searchLocations` | It consumes `searchDiscoveryService` and the existing runtime catalog. |
| Place interface | `placeAuthorityRouter.ts` is an executable foundation interface | It explicitly does not replace current product consumers. |

The existing runtime is not declared broken. It is a bounded catalog workflow
whose behavior does not prove the new national consumer workflow.

## Delivery sequence and acceptance

1. **Reader integrity and national context.** Refuse multiple parents, cycles,
   dangling or retired parents and an exhausted traversal. Preserve province
   and municipality labels in national disambiguation, without treating a
   municipality as a city. Verify exact projection for every searchable Place
   in all nine digest-verified admission packages. Admission and typed queries
   must share one versioned searchable-name normalizer, including punctuation,
   accents and multilingual letters, without changing identity reconciliation.
2. **One authoring identity.** Introduce an explicit canonical Place reference
   under the domain cardinality contract. Existing `placeId` is provider
   evidence and must not be overloaded. Permit legitimate localities without a
   city. Separate private address, coordinates and provider observations from
   canonical geography. Drafts may remain unresolved; publication must refuse
   unresolved, retired, ambiguous or unsupported identity. No text or numeric
   handle fallback may decide geography.
3. **Persistence and projection.** Prepare the desired model and sequenced
   additive migrations for authored listings, their public property projection
   and the parcel-owned Land journey as required. Foreign keys target the
   stable Place identity; public projection copies the authored subject rather
   than resolving it again from labels. Audit TiDB CHECK/FK capability before
   selecting physical constraints. Retire stale behavior within this slice.
   Final migration numbering follows serialized integration acceptance.
4. **Search membership.** Define and evidence a governed executable-scope
   membership projection. Exact Place identity is already executable; city and
   province listing populations need explicit semantics and testable
   membership, not inference from administrative context. Preserve Search Area
   ownership and authorized journeys. Land continues to enforce its single
   geography authority contract and central public classification allow-list;
   any canonical Place handoff requires a deliberate contract update.
5. **Customer handoff.** Connect canonical discovery and authoring selection to
   the persisted subject, publication and search. Carry factual type and
   disambiguating context. Reject mixed authorities at API boundaries. Provide
   honest ambiguity/no-result handling and governed coverage signals. Do not
   activate SEO pages as a side effect.
6. **Owned physical and browser proof.** On the exact disposable worktree
   target, apply the reconciled lineage through Database Authority, prepare the
   declared roles, verify schema/reference readiness, then prove author →
   publish → discover → search → property detail for representative approved
   locations in each province. Include aliases, same-name selections,
   municipality context, a locality without a city, unsupported locations,
   mixed authority, retired identities and publication refusal. A city query
   must include only its explicitly approved members. Run production-scope
   type checks, lint, build, static authority checks and applicable consumer
   tests. Report broad baseline failures separately.
7. **Review and release packet.** Record exact source, changed consumers,
   migration and data-role versions, target fingerprint, evidence, unresolved
   decisions and final Git status. Refresh overlap with active blockers before
   publication. A feature-branch push can trigger previews; it is not a
   protected database release or source acceptance.

## Decisions that cannot be manufactured by implementation

- Production handling of the 720 OSM-only Gauteng identities is founder-owned.
  Do not delete them or change their licensing classification to avoid the gate.
- No province is currently certified to have current boundaries; Gauteng also
  retains its recorded source/provenance gap. Record actual evidence and the
  approved launch claims rather than asserting currency or reproducibility.
- Broad search membership needs approved evidence and semantics. Neither a
  municipality name nor a market association is permission to expand.
- A durable target, protected migration/reference-data application, consumer
  activation and deployment each retain their named approval boundaries.

Source preparation and disposable validation are within this goal. No remote
database mutation, PR merge, protected release or deployment is implied.

## Progress

- Goal created and national scope confirmed by Edward.
- Current accepted `main` integrated into the task-owned branch.
- Reader integrity and national context repair implemented locally.
- The real reader proof then found `Noord-Kaap` did not resolve: admission stored
  `noord-kaap`, while the query normalizer produced `noord kaap`.
- Name-index version 1 now uses one shared normalizer for admission and query,
  keeps Unicode letters/numbers, and remains separate from the stricter
  evidence-label comparison used for identity adjudication and collision audit.
  All 26,425 assertions retain their exact labels, roles, source IDs, eligibility
  and evidence. Only 3,987 normalized index values and package name-index
  metadata change; every Place registry and non-name row artifact is unchanged.
  All nine regeneration checks pass.
- Twelve refusal/context regressions, five normalization examples, nine
  full-package projection/index tests and six transaction/refusal tests pass
  under the isolated static configuration. These do not establish a physical
  or browser customer publication journey.
- A real loaded target with the old name indexes is refused before replay and
  fails verification. All five table digests stay unchanged. That exact owned
  target was then disposed for a fresh canonical load, rather than repaired
  through manual SQL or a compatibility fallback.
- Final static authority gate: 573 tests across 54 files, inventory,
  schema sanity and lifecycle checks passed. The updated cross-province
  comparison and its nineteen territory-neutrality contracts also passed.
  Production-scope `pnpm check`, build and focused lint passed. Full typecheck
  retains 263 baseline errors, with none in the changed files.
- Fresh physical schema: 104 migrations through 0103, congruent, all 39 CHECKs
  enforced. National load: 17,664 Places, 26,425 names, 17,655 relationships,
  79,925 evidence and 19,792 mappings. The real reader passed 31 probes: all
  three exact scope categories in each province, `Westbury Ext. 3`, the
  Cyrillic name `Салдана`, cross-province `Dunvegan` ambiguity and an unsupported
  location. Reference verification passed before and after. `Noord-Kaap` now
  resolves as an exact preferred name.
  See [the physical reader evidence](launch-readiness-and-product-convergence/evidence/geography-consumer-readiness-2026-10-07/national-reader-physical-proof.json).
  This proves discovery and exact execution, not authoring/publication or a
  broad city listing population. No protected target was accessed.
- The owned proof target is disposed after evidence capture. The native service
  was already available when this task provisioned its target; leave it available
  for the parallel work rather than shutting down another workstream's service.
- Migration sequence reconciliation, customer integration and physical/browser
  proof remain outstanding. Goal stays active.


## Listing persistence candidate review

Classification: additive schema authority within the dedicated geography feature
worktree. No protected access or data transition. The authority-derived local
fingerprint remains `0c822b50ba97506e19b3dcbe822b90a05e8bd3ae13346366b8796de7de4a856d`.
Current accepted `origin/main` is still `b0bebc343a710f7e5713efc1d36cd5d3bca68455`,
whose manifest ends at `0094_content_topics_primary_key.sql`. The geography
candidate contains its own contiguous 0095–0103 expansion; no pending founder
migration is adopted. A serialized review in this task-owned branch extends only
that candidate, provisionally 0104–0109: listing column, index, restrictive key,
then public-property column, index, restrictive key. There is no shared sequence
reservation. Final integration MUST refresh main and reconcile the known founder
0095 collision before a merge/release candidate can be accepted.

The current candidate parent is
`0103_saved_searches_canonical_place_reference_fk.sql`, checksum
`27098ecba5c8bee31f314ccb47ea694bdcfaeff81870f6506264877b2bb30583`.
Each new entry is one additive DDL statement (`single-ddl`), with exact parent
and SHA-256 recorded by the active manifest. The expected candidate head is
`0109_properties_canonical_place_reference_fk.sql`. Target scope is owned
**disposable local proof only**. No historical SQL is amended, no existing row
is backfilled and no foreign key references a provider handle. Model/inventory,
manifest lineage, structural admission and consumer-reference contracts must
pass before physical plan/apply. Separate column/index/key operations satisfy
the TiDB expansion subset; domain publication guards remain necessary, and local
acceptance does not certify TiDB CHECK/FK capability or protected release.

Precondition: old rows may have no Place assignment and provider `placeId` stays
separate. Postcondition: each new reference is nullable, width 40, appended in
matching physical/model order, indexed and constrained to `place.place_id` with
RESTRICT on delete/update. Unknown references must fail; null draft rows remain
possible. Consumer evidence must then prove authored identity survives create,
edit, revision and publication, and that no old handle or label supplies it.
The schema expansion alone does not activate this consumer or certify launch.

## Approved launch search scope policy

Edward explicitly approved this policy on 2026-10-07 in the goal conversation:
province search may include listings assigned to approved canonical Places with
evidenced containment in that province. City/town search may include only
explicitly reviewed members. This is approval of the consumer search projection,
not permission to change factual types, synthesize city ancestry, widen a Search
Area or activate a protected reference-data release.

The province projection must validate the assignment and complete authoritative
containment chain, include only the selected province's admitted members, and
refuse malformed/multiple-parent/cyclic/retired chains. Municipality context
does not become a city. City membership has no inferred default; the current
national packages contain no approved descendant city membership. Explicit
exact assignment to the selected city remains exact identity. Search Areas keep
their existing journey authorization and distinct authority. The projection
must be executable, versioned and tested before customer search activation.


Candidate prerequisite result: Database Authority applied all 110 entries once
through provisional 0109. Final physical schema matches the desired digest
`a1c08ce864a31d5c0adee16faf1f3d255d7bf528985e039ff50c5ab180649f98`,
with all 39 CHECKs enforced. National preparation and before/after verification
complete all nine provinces. The real prepared resolver passes nine manual
locality assignments in caller transactions plus unknown/mixed/unconfirmed
refusals. This writes no Listing/property subject and is not publication proof.
The target is disposed; the shared native service is left available.

The candidate authority gate passes 617 tests in 56 files; the prepared selector
passes 16 customer interaction checks. Production type checking, build,
inventory, utility authority and lifecycle pass. The broad type checker still
reports 263 baseline errors with none in changed files. Focused selector/reference
lint is clean. Premature schema/plan observations made while the apply was live
were superseded by final successful verification; the same apply completed and
was not restarted.

[Candidate evidence](launch-readiness-and-product-convergence/evidence/geography-consumer-readiness-2026-10-07/canonical-listing-persistence-candidate.json),
[physical resolver proof](launch-readiness-and-product-convergence/evidence/geography-consumer-readiness-2026-10-07/canonical-listing-physical-proof.json)
and [physical schema](launch-readiness-and-product-convergence/evidence/geography-consumer-readiness-2026-10-07/canonical-listing-schema-congruency.json)
record these prerequisites. Product wiring, concurrent publication validation,
governed Listing membership, Land convergence, browser handoff, serialized
integration and release review remain required. The goal is active and launch
readiness remains unproven.


### Founder integration accepted and candidate serialized

PR #590 merged as `c1a1b813a44bf033426e026b2253f896cfc6c3b5`. Its accepted
manifest ends at `0096_user_founder_authority_unique.sql`, with the founder
column and unique key independently sequenced. The geography candidate was
serialized after that exact prefix: its fifteen SQL files move by two slots,
0097–0111, with every SQL byte/checksum preserved. No founder worktree or
remote branch is changed. Current candidate head is
`0111_properties_canonical_place_reference_fk.sql` (112 total entries).

The exact owned 0109 proof target had already been disposed. The pre-adoption
review records unmerged geography, no protected adoption, disposed local target,
correctness repair of the accepted sequence collision, and unchanged SQL/Place
identity. Manifest parents/checksums, active classification and source references
are rebuilt; accepted founder SQL and prefix entries remain exact. Generated
model inventory includes both founder authority and Listing Place references.
National package bytes and source allocations remain unchanged.

Local merge conflicts were reconciled in manifest/inventory/classification and
active assertions. Historical revoked rehearsal authorization stays pinned to
its original 0094/count-95 fixture; the merged assertion must not extend that
old approval to a newer model. The historical transport suite passes ten checks,
and accepted founder identity/account/state/route tests pass 92 checks. Focused
lineage/foundation tests pass 58 checks. The prior 0109 schema/resolver proof is
retained as historical evidence and cannot certify the combined 0111 model.
Fresh owned physical consumer proof is still required before launch assessment.

[Serialization evidence](launch-readiness-and-product-convergence/evidence/geography-consumer-readiness-2026-10-07/founder-integration-serialization.json)
records the complete filename/checksum translation and accepted prefix.

Combined candidate verification: authority 617/617 in 56 files; 121 utility surfaces, 112 migration files, deterministic inventory, lifecycle and production type checking pass. No combined-lineage physical or customer publication/search certification is claimed.


### North Riding authoring priority, 2026-10-08

Edward prioritised the reported `5 Congo Street, North Riding, Roodepoort, 2169`
private house journey. The admitted North Riding identity already exists as a
selectable suburb/locality; the older city runtime projection is the demonstrated
mismatch. Postal text does not authorize a Roodepoort parent. No source rows,
Place allocations, classifications or containment edges changed.

The wizard/API/create/edit/reload path now carries canonical identity directly,
with private evidence kept separate and confirmed house street validation retained.
The owned 0111 target proved real discovery, private Listing router create,
authenticated reload and edit/reload. No public property or provider suburb row
was created. All nine reference packages verify complete. The unsafe older
provider provisional-suburb insert remains rejected and the sibling dirty source
worktree is untouched. See the [senior review packet](north-riding-authoring-correction-2026-10-08.md).

Current-main readback `7756376c9ec604b352595b4e4ba8ced73f18562b` adds auth and
developer changes after the accepted founder integration; its migration manifest
still has the exact 97-entry prefix through 0096. No migration collision with the
geography candidate is introduced. Those later changes are not silently imported
into this bounded authoring correction. Integration must pin current main again
at senior review.

The larger goal remains unfinished: governed public Listing search membership,
Land convergence and national consumer launch proof remain required. This bounded
private authoring proof does not certify those journeys or protected materialisation.
