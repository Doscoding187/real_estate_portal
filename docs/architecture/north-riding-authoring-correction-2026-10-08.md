# North Riding private house authoring correction

Status: candidate for senior review. No hosted CI, protected data mutation, push,
merge or deployment is authorized by this packet.

The reported address is `5 Congo Street, North Riding, Roodepoort, 2169`.
Street number, street name, postal town text and postal code are supplied evidence;
they neither establish Place identity nor authorize containment. The correction
uses the existing North Riding Place, never another location or a provider-created
suburb. No source package, allocation, name, classification or relationship changes.

## Diagnosis and authority review

[Source and runtime audit](launch-readiness-and-product-convergence/evidence/north-riding-authoring-2026-10-08/source-runtime-audit.json)
records exact committed rows, name assertions, containment and projection digests.

| Layer                        | Finding                                                                                                                                                                                                                                               | Correction                                                                                                                         |
| ---------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| Source coverage              | GeoNames 7870450 and OSM node/262713882 support an existing admitted identity.                                                                                                                                                                        | No additional source record or locality invented.                                                                                  |
| Classification and parentage | Admitted `pl-place-01-6a145c6d642ba208a2c12de7` is active, searchable `suburb` / `locality`. Containment goes through the City of Johannesburg administrative municipality to Gauteng. The municipality is context, not a reviewed city search scope. | Preserve classification, identity and factual containment. Do not infer a Roodepoort city parent from postal text.                 |
| Runtime projection           | The older runtime projection exposes North Riding as `metro_city` stored in `cities`, sourced from the older `town` classification. Generic house authoring required legacy city/suburb handles and provider resolution.                              | Select the admitted Place directly; house manual evidence requires locality plus street, with no mandatory invented city ancestor. |
| Production materialisation   | The archived 2026-09-30 release plan includes `gauteng/north-riding` under the older representation. That plan is not proof of current live rows or successful materialisation.                                                                       | Current protected readback remains a release prerequisite. No protected connection or correction is claimed.                       |

The dirty `feat/gauteng-source-authority-closure` worktree remains untouched. Its
reported provider branch in `listingLocationResolver.ts` inserts `suburbs` with
`status=provisional`, `origin=provider` when locality label, city, pin and provider
components are present. This is not an admitted identity and cannot repair the gap.
The Place workstream removed that insert path and the unauthenticated provider
write procedure. Remaining unresolved provider observations are recorded as
noncanonical evidence and refused pending admission. Do not merge the old branch
back over these guards.

North Riding remains Tier B/provisional and has `publication_eligible=0` for Place
SEO. D2 permits its evidenced canonical selection; this does not grant SEO or
production source activation. Its mixed GeoNames/OSM source still requires the
approved attribution and ODbL database strategy at protected release.

## Complete consumer candidate

The Listing wizard chooses an explicit canonical Place. Google/map enrichment
adds private address or coordinate evidence and resets confirmation without
choosing a locality or changing its identity. Editing selector text clears the
selection. Unavailable saved assignments require explicit replacement; they do
not become unresolved fallback drafts silently.

The strict version-2 Listing API accepts one nullable canonical Place ID and
private evidence. It rejects numeric handles, city/suburb display text, other
geography authorities and unknown provider types. A draft can intentionally have
no selection, but an explicitly invalid selected Place or database failure is
refused. Create and update resolve selected Place, containment and preferred labels
inside their transaction with locking reads. Stored numeric handles are cleared;
province/suburb labels are derived and the city display is empty where no reviewed
city ancestor exists. Provider IDs remain private Google evidence.

Save/reload returns the actual canonical choice, private address, confirmation and
precision. Submission/publication retain the house evidence rule and validate the
live Place under locks. Revisions carry the reference into the approved source and
public property snapshot. Dedicated Commercial inventory retains its own Asset
location authority. Approximate generic publication exposes no coordinates because
the admitted packages provide no approved public geometry; exact precision remains
an explicit policy choice. This packet proves private authoring, not national public
search readiness or a complete launch certificate.

## Required protected reference-data release plan

1. Senior review pins the candidate commit, accepted founder prefix, 112-entry
   schema lineage through `0111_properties_canonical_place_reference_fk.sql`,
   generated model inventory, Gauteng package/source/registry digests and consumer
   verification evidence. No schema push or implicit application startup migration.
2. Obtain an exact target fingerprint and read-only accepted migration history,
   physical-schema comparison, data-role versions, North Riding Place/name/edge
   readback, old city/suburb rows and Listing consumer deployment version. This
   distinguishes current materialisation failure from the demonstrated old runtime
   mismatch. Do not treat the historical 0094 release approval as authority for 0111.
3. If the target lacks this model, prepare the named protected schema release plan
   against its actual accepted head. Review collision-free migration lineage and
   capability admission before any apply. No direct alteration or ledger rewrite.
4. Prepare a separately approved Place reference-data release, using the canonical
   Gauteng adapter payload and exact registry/digest pins. The current
   `release-reference --adapter=geography` path materialises legacy numeric catalog
   rows and cannot implement this correction. Local `places:prepare` is not a
   protected release command. An exact-target protected Place release capability
   must be implemented/admitted before protected materialisation; this packet does
   not invent an apply command or extend an old approval.
5. Plan inserts for the complete governed Gauteng package (not one hand-written
   North Riding row), including source evidence, searchable names, parent-first
   Places, factual relationships and mappings. Any pre-existing drift, missing
   referent, duplicate preferred label or allocation discrepancy is a refusal.
   Recalculate and review the exact current-state/desired-state digest; freeze
   competing geography writers, verify inside the transaction before COMMIT and
   require zero-write replay. Do not change raw relationship search authorization.
6. Obtain source activation/licensing approval and target-specific release approval
   through the existing authority channel. Release schema/reference data and the
   matching consumer together under the reviewed plan. Do not convert or delete
   legacy North Riding city rows merely to make the new selector work; audit other
   consumers and any existing assignments separately, with no label-based backfill.
7. Read back the exact Place, names, chain and reference-data digests after release;
   repeat discovery → explicit locality selection → private house draft save →
   reload with a designated acceptance account. Confirm zero public property rows
   for the draft and zero provider-created suburbs. Hold deployment or rollback
   according to the reviewed release evidence, not a green build alone.

Hosted CI and production changes remain held for senior review. No protected
release readiness is asserted while target readback, Place release capability or
source activation decisions remain outstanding.


## Candidate integration boundary

The task-owned branch is `feat/place-authority-slice0-decision`; its parent is
`cd8e50ce6` with accepted founder integration already serialized ahead of geography.
Current main was read back as `7756376c9ec604b352595b4e4ba8ced73f18562b`;
the full 97-entry migration prefix remains identical and ends at 0096. Later
accepted auth/developer changes do not touch Place source, Listing consumers or
migration authority. This bounded correction does not edit those parallel
workstreams or trigger hosted CI. Senior review must pin current integration main
again before merge and run its applicable integration checks.

## Verification

[Physical draft proof](launch-readiness-and-product-convergence/evidence/north-riding-authoring-2026-10-08/physical-draft-proof.json)
records the real discovery and authenticated Listing router create/reload plus
edit/reload on exact owned target `0c822b50ba97506e19b3dcbe822b90a05e8bd3ae13346366b8796de7de4a856d`.
All 112 migrations applied through 0111, physical schema is congruent, all 39
CHECK constraints are enforced, and all nine admitted packages verify complete
with zero identity drift. The proof target is disposed; parallel worktrees and
the shared native service are preserved.

Focused UI tests cover explicit locality selection, unchanged house street
requirements and provider enrichment that preserves identity and resets
confirmation. Resolver tests cover caller transaction locks, invalid/mixed
identity, unknown/inactive Places, malformed containment, database failure and
confirmed-house draft refusal. Listing lifecycle tests cover private update
rollback, revision promotion and projection provenance. Production type checking,
build and database static authority gates are included in the evidence manifest.
No hosted browser or public search certification is claimed.


Final checks: database authority 636 tests in 56 files, focused UI 56 in five,
Listing lifecycle 96 in three and provider guard three all pass. Production type
checking and build pass; lint reports zero errors with existing warnings.
[Verification manifest](launch-readiness-and-product-convergence/evidence/north-riding-authoring-2026-10-08/validation.json)
and evidence checksums bind the results. No source/schema/migration edits are part
of this bounded correction; its existing Place-model prerequisites remain in the
same review branch.

## Integration continuation

The [complete integration candidate](geography-integration-review-2026-10-08.md)
now preserves released main through 7756376c9 and supplies the missing protected
Place reference-data release capability discussed above. Fresh approved
read-only inspection proves production is at 0096 with no Place tables and
North Riding stored as legacy city ID 211; this replaces the earlier historical
0094 plan as current target evidence. The release plan is all nine admitted
provinces with the D3-held OSM-only set excluded, preserving North Riding's
existing mixed-source locality and municipality/province context. The original
bounded proof remains historical evidence; the integration packet records a new
native release-preview and private draft journey. No production correction or
hosted launch certificate is claimed by either packet.
