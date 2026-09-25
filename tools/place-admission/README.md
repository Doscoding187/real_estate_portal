# Place Admission (Slice 2)

Turns the reproducible, digest-pinned Gauteng v0.2 source authority into an
admitted canonical Place dataset.

This is **identity admission**, not a three-level projection repair. Its central
job is deciding how many canonical Places the source identities actually
represent, because a source identity is not a Place: two source records can
describe one real-world referent, and two records that share a name can be
genuinely distinct places.

## Commands

```sh
pnpm place:admission:build     # build or extend the admission package
pnpm place:admission:check     # prove the package regenerates byte-identically
pnpm place:admission:probe     # behavioural proof on an owned disposable target

pnpm db:places:prepare         # materialize the admitted Places
pnpm db:places:verify          # verify counts, identity stability, containment
```

## Determinism and Place IDs

The package regenerates byte-identically from the governed inputs. The single
non-deterministic act is the first-time assignment of a Place ID, which is
recorded in `gauteng_place_id_registry.v0.1.json` and reused forever after.

A Place ID is **assigned**, never derived from a source identity, name, slug,
coordinate, parent, classification or natural key. A group that gains a member
reuses the ID already recorded for any of its members, so a merge or a
reclassification can never silently move a Place.

## Adjudication basis

Two governed bases, neither of which is "the names matched":

- **unique administrative container** — a territory has one Gauteng, so the two
  v0.2 province records with that name are one referent;
- **same name, same admitted administrative context, within 15 km** — resolves
  sources that classified one referent differently (Soweto, Sandton).

Distinct referents that share a name are preserved (Diepkloof, Waverley,
Midrand). Every source candidate receives an explicit disposition.

## Parent evidence

The 103 governed v0.1 parent-evidence inputs are classified, not promoted. Most
denote service, delivery, planning or procurement areas rather than
administrative containment, and they reference v0.1 source identities for which no
governed crosswalk to an admitted Place exists. See
`data/gauteng-place-admission-v0.1/gauteng_parent_evidence_classification.v0.1.json`.

## Boundaries

Slice 2 does not switch any runtime consumer. `LOCATION_AUTHORITY_CATALOG_INDEX_PATH`,
public location search, listing authoring, Land, Commercial, Shared Living,
Developments, Explore, Agents, Agencies, Services, Canvassing, Demand, Saved
Searches and the three-level runtime tables are all unchanged. Search Areas are
not activated or migrated. Executable discovery is Slice 3.
