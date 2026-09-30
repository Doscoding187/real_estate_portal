# Place Admission (Slice 2, Phase 3 territory-neutral)

Turns a reproducible, digest-pinned source authority into an admitted canonical
Place dataset.

This is **identity admission**, not a three-level projection repair. Its central
job is deciding how many canonical Places the source identities actually
represent, because a source identity is not a Place: two source records can
describe one real-world referent, and two records that share a name can be
genuinely distinct places.

## Territory neutrality

The builder and the materializer name **no province**. Every territory-specific
value — source-authority directory, digest-pinned source manifest, source
artifact filenames, admission version, package directory, package artifact
filenames and reviewed expected counts — comes from the one committed registry:

`data/place-admission-territories.v0.1/territory-registry.v0.1.json`
(validated by `shared/placeAdmissionTerritories.ts`).

Admitting a province is therefore a registry entry plus its governed source
evidence. It is never a second engine, and never a copy of another territory's
rows as a template.

## Commands

```sh
pnpm place:admission:build     # build or extend the admission package
pnpm place:admission:check     # prove the package regenerates byte-identically
pnpm place:admission:probe     # behavioural proof on an owned disposable target
pnpm place:admission:territory-neutrality   # prove a second territory needs no new engine

pnpm db:places:prepare         # materialize the admitted Places
pnpm db:places:verify          # verify counts, identity stability, containment
```

Direct invocation, for a specific territory or an alternate registry:

```sh
npx tsx tools/place-admission/build-place-admission.mjs --territory za-gp
npx tsx tools/place-admission/build-place-admission.mjs --check
npx tsx tools/place-admission/build-place-admission.mjs --registry <path>
```

`--check` refuses any artifact that would change, so it is a real determinism
gate rather than a report. The builder also refuses to finish when the produced
counts disagree with the registry's `expected_counts`, or when any path its
manifest advertises does not exist.

## Determinism and Place IDs

The package regenerates byte-identically from the governed inputs. The single
non-deterministic act is the first-time assignment of a Place ID, which is
recorded in the package's Place-ID registry and reused forever after. Per-run
mint counters are reported on stdout, never written into a committed artifact,
so a first build and every later build agree byte for byte.

A Place ID is **assigned**, never derived from a source identity, name, slug,
coordinate, parent, classification or natural key. A group that gains a member
reuses the ID already recorded for any of its members, so a merge or a
reclassification can never silently move a Place.

## Adjudication basis

Two governed bases, neither of which is "the names matched":

- **unique administrative container** — a territory has exactly one province and
  one municipality per name, so two source records carrying the same container
  name are one referent by construction;
- **same name, same admitted administrative context, within 15 km** — resolves
  sources that classified one referent differently.

Distinct referents that share a name are preserved. Every source candidate
receives an explicit disposition.

## The probe's named cases are evidence

`probe-place-admission.mjs` resolves its named pressure cases by real query.
Those cases assert what happened to specific real referents when *that*
territory's source authority was adjudicated, so they are data, not architecture.
Admitting another province extends the case list; it does not change the
machinery around it.

## Boundaries

Slice 2 does not switch any runtime consumer. `LOCATION_AUTHORITY_CATALOG_INDEX_PATH`,
public location search, listing authoring, Land, Commercial, Shared Living,
Developments, Explore, Agents, Agencies, Services, Canvassing, Demand, Saved
Searches and the three-level runtime tables are all unchanged. Search Areas are
not activated or migrated. Executable discovery is Slice 3.