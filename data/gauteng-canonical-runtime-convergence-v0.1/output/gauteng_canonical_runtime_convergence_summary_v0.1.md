# Gauteng Canonical Runtime Convergence v0.1

## Decision

The bridge is factual-ID-first and semantic-projection-first. pl-gp-v01-* remains the durable factual identity. A stable runtime natural key describes the executable Search scope; province:<id>, city:<id> and suburb:<id> are environment-specific database handles resolved only after the projection is materialized in that environment. No Search Area was activated and no listing, URL, schema or database data was changed.

The bounded runtime projection implementation remains safe to review: **YES**. The founder-authorized current boundary is 61 memberships, all of which are projection-ready. Search Area activation remains **NO** because activation is a separate approval boundary.

The previous 62-record evidence set included one historical/source-only Ekurhuleni-context Midrand identity. It remains preserved in the factual mapping and source provenance, but it is retired from current Search Area membership and has no runtime natural key. The bounded slice retains 4 projection-ready current reconciliations and 1 historical/source-only record. The resulting current state is 61/61 projection-ready. One ready membership already matches the small canonical-geography-v2 reference fixture; the other 60 ready memberships require governed runtime reference-data expansion. This is reference-data work, not evidence that those factual identities are unmapped.

## Runtime identity conclusion

- shared/locationAuthority.ts owns parsing/encoding of province:<positive integer>, city:<positive integer> and suburb:<positive integer>.
- The numeric value originates from the auto-increment primary key of a target database row. It is an environment-specific runtime handle, not a durable Property Listify geography identity.
- server/_core/databaseAuthority/dataAdapters/canonicalGeography.ts currently prepares a deliberately small reference fixture by stable slug and hierarchy; it does not create cross-environment numeric mappings.
- The durable bridge is factual ID -> factual type/context -> runtime Search scope -> stable natural key -> environment row resolution.
- Existing URLs, listings, persisted numeric fields and public projections remain unchanged.

## Semantic projection counts

Unique factual identities represented by the 61 current memberships plus retained historical/source identities: **61**.

| Status | Unique factual identities | 61 current memberships |
| --- | ---: | ---: |
| projection_ready | 60 | 61 |
| ambiguous_projection | 0 | 0 |
| unsupported_search_scope | 0 | 0 |
| factual_geography_blocker | 1 | 0 |
| other_material_blocker | 0 | 0 |

## Runtime reference-data disposition

| Disposition | 61 current memberships |
| --- | ---: |
| existing_reference_data | 1 |
| reference_data_expansion_required | 60 |

Sandton (pl-gp-v01-418038409a1c0a00d9bc) is the only current fixture match, using natural key gauteng/johannesburg/sandton. The observed suburb:34 value is retained only as an environment-specific contract observation and is never emitted as durable mapping authority.

Randburg remains factual type city and projects to metro_city with natural key gauteng/randburg. The historical suburb sample is recorded as a legacy observation, not a semantic conflict.

## Same-name identity collisions

- Johannesburg North Search Area (pl-sa-gp-3b36a49ecb943c88402b07fd) remains distinct from factual Johannesburg North (pl-gp-v01-c1d935cbc90ea639eb87); no merge or factual-boundary inheritance is allowed.
- East Rand Search Area (pl-sa-gp-20f043e9ba8ece627365f5ad) remains distinct from factual East Rand (pl-gp-v01-85224ee50069c93dae3e); no merge or factual-boundary inheritance is allowed.
- Midrand Search Area (pl-sa-gp-01da060bb6c5807438a654e9) remains distinct from factual Midrand, Midrand (pl-gp-v01-0d7688adb9c7af392007, pl-gp-v01-455d2715587edce120f0); no merge or factual-boundary inheritance is allowed.
- Centurion Search Area (pl-sa-gp-35163d1b6013797932cd94c1) remains distinct from factual Centurion (pl-gp-v01-029159849439c2ea8783); no merge or factual-boundary inheritance is allowed.

## 61-member current Search Area compatibility

| Search Area | Members | Semantic ready | Existing row | Expansion required | Ambiguous | Unsupported | Factual blocker | Other |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Midrand | 8 | 8 | 0 | 8 | 0 | 0 | 0 | 0 |
| East Rand | 9 | 9 | 0 | 9 | 0 | 0 | 0 | 0 |
| Centurion | 9 | 9 | 0 | 9 | 0 | 0 | 0 | 0 |
| Pretoria East | 11 | 11 | 0 | 11 | 0 | 0 | 0 | 0 |
| Johannesburg North | 12 | 12 | 1 | 11 | 0 | 0 | 0 | 0 |
| Johannesburg South | 12 | 12 | 0 | 12 | 0 | 0 | 0 | 0 |

All 61 current members retain their factual types. No member is converted into a suburb merely to satisfy the current legacy validator.

## Bounded five-location context reconciliation

| Factual identity | Factual type | Accepted context | Runtime scope | Stable natural key | Disposition |
| --- | --- | --- | --- | --- | --- |
| Brackenhurst (pl-gp-v01-af17bb51ea1399e1ec40) | suburb | Alberton | locality | gauteng/alberton/brackenhurst | projection_ready |
| Raceview (pl-gp-v01-bd59322d0b3ed7431605) | suburb | Alberton | locality | gauteng/alberton/raceview | projection_ready |
| Randhart (pl-gp-v01-800cda0bcb00e0edb9f9) | suburb | Alberton | locality | gauteng/alberton/randhart | projection_ready |
| Midrand (pl-gp-v01-455d2715587edce120f0) | locality | Ekurhuleni, Gauteng | locality | — | factual_geography_blocker |
| Midstream Estate (pl-gp-v01-2fad4c8097c15027f8ec) | suburb | Centurion | locality | gauteng/centurion/midstream-estate | projection_ready |

Alberton is used as the explicit factual parent for Brackenhurst, Raceview and Randhart. Midstream Estate retains Ekurhuleni as its factual administrative context; Centurion is an explicitly labeled runtime market context, not a municipality-to-city rewrite. The Ekurhuleni-coordinate Midrand record remains preserved as historical/source-level provenance, is not merged into the accepted City of Johannesburg Midrand identity, is not executable, and has been retired from the current membership boundary by founder decision.

## East Rand test

The nine East Rand members are all accepted factual town identities and all receive metro_city projections: Benoni -> gauteng/benoni, Boksburg -> gauteng/boksburg, Brakpan -> gauteng/brakpan, Germiston -> gauteng/germiston, Kempton Park -> gauteng/kempton-park, Springs -> gauteng/springs, Alberton -> gauteng/alberton, Bedfordview -> gauteng/bedfordview, Edenvale -> gauteng/edenvale. This is the intended multi-level contract direction; they are not suburb projections.

## Remaining material blockers

No active membership has a semantic projection blocker.

## Type-model recommendation

Keep factual type and executable runtime scope as separate fields. The factual catalogue may retain province, municipality, city, town, township, suburb, neighbourhood, locality, village and estate/development-candidate types. In this accepted slice, province -> province, city/town -> metro_city, and suburb/locality/neighbourhood -> locality only where an executable parent hierarchy is accepted. These are executable scope projections, not factual type rewrites.

## Search Area authority convergence boundary

The existing server-owned SearchAreaAuthority should remain the only production registry. Its later definition shape should replace suburb-only memberCanonicalLocationIds with explicit members containing factualLocationId, scopeKind and runtimeNaturalKey. City/town and locality members may coexist and expand into an explicit OR boundary. Parent city should become optional context/parent metadata, not membership authority. The query boundary must resolve each member independently in the target environment, preserve overlap, and fail closed on an unresolved natural key. Activation is still out of scope here.

## Runtime reference-data strategy

The bounded next implementation should generate a governed reference projection from the accepted factual catalogue, keyed by stable slugs and explicit hierarchy/context. The Database Authority adapter should consume that projection and resolve target-environment numeric IDs after insertion. canonical-geography-v2 can remain the small acceptance fixture until the governed projection is accepted; it must not become a second permanent geography authority. No seed or production reference-data operation is performed here.

## Property Location Authority dependency

Property Location Authority should later consume the bridge after resolving an individual property's factual geography. It must continue to answer where a property is; this bridge answers what factual identity a runtime location refers to. No Property Location Authority files were changed.

## Geography gaps

1 provisional runtime factual geography gap is recorded: current approved runtime reference Hatfield is not present in the accepted factual summary/probe or Search Area artifacts available here. The full factual canonical JSONL was not included in the accepted candidate patch, so this remains an unverified reconciliation queue item, not a confirmed factual absence or automatic promotion.

## Kyalami/Khayalami

The accepted rule is unchanged: one eventual factual identity, consumer name Kyalami, official/corrected name Khayalami, related family places separate, licensing gate unresolved, and no runtime mapping or Search Area workaround.

## Verification

- The accepted governed runtime geography checkpoint 46ef4aa6ec219f8ed2ec688ef9bad0201a09cf7e is incorporated by cherry-pick; the generated semantic bridge remains deterministic.
- The semantic bridge rejects invalid PL IDs, duplicate factual IDs, duplicate natural-key ownership, name-only projections and unsupported projection states; numeric IDs are optional environment observations only.
- The artifact generator is deterministic and can be rerun with node tools/gauteng-runtime-convergence/generate.mjs --check.
- Database Authority verification is performed separately through the repository-owned disposable worktree sequence; no production/shared target is used.

## Next boundary

Proceed only to the bounded implementation boundary: generated semantic projection -> Database Authority reference projection -> target-environment row resolution -> generalized existing SearchAreaAuthority. Do not activate the six Search Areas in that implementation.
