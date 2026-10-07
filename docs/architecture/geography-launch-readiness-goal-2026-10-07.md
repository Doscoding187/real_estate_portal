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
