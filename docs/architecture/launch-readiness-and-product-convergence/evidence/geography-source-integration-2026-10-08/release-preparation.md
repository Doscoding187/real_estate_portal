# Post-integration release preparation

Source integration is complete. Intended release artifact: merged commit **04821fe7ae6401e781925adce099a93ead08490a**, tree **9839a1d085edd6fcdc4786125cba54e4c29fd4ef**. The following work is preparation for a separate production decision. No performance measurement, fresh live plan or protected apply is claimed here.

## National search measurement

Use a clean task-owned worktree from the merged source and its authority-derived disposable target. Follow the database authority entry/playbook for provisioning and migration; never use `listify_local`, host MySQL 3306, CI's fixed database or a production target. Load and verify `db:places:release-preview:prepare` / `db:places:release-preview:verify`, which exercise the governed release subset: 16,944 Places, 25,618 names, 16,935 relations, 79,189 evidence rows and 19,042 mappings. Keep the 720 OSM-only Places and all excluded dependants absent. The 17,664-Place full storage fixture has a different role and must not be substituted or mixed into this preview.

Measure the actual selection/discovery and `properties.searchPublicInventory` path against the canonical schema, with publication-authorized synthetic inventory established through existing domain fixtures. Record synthetic inventory volume and distribution; a geography-only dataset with empty inventory cannot establish customer search performance.

Cover North Riding exact locality, an unrelated locality exclusion, exact city, each of the nine approved province scopes, empty results, pagination and Buy/Rent. Verify returned identity, label and detail eligibility while measuring; city scope remains exact assignment and is never widened to unreviewed descendants. Keep development inventory's lack of canonical assignment explicit. Invalid or competing geography must still be rejected before inventory lookup.

Record cold and warm observations separately, then bounded concurrency (for example 1, 5 and 20 clients), repetitions, p50/p95/p99 latency, throughput, errors, database query counts, graph/name load time, inventory query time, response serialization, rows read/returned and memory. Include exact source SHA, package/manifest pins, SQL/provider version, host resources, inventory cardinality, warm-up/cache conditions and raw measurements. Full graph and preferred-name loading on the request path deserve explicit attribution. Local hardware measurements do not predict Azure production timings.

Set and review the latency/error/resource budgets before using measurements as an acceptance gate. No unapproved SLO or national-performance claim is introduced by this handoff. A production-capacity measurement needs its own bounded target/window approval. Any optimization changes the accepted source and requires focused validation, exact-source review and hosted CI for that new candidate.

## Fresh protected schema plan

Route: protected release; phase: inspect/plan; credentials: dedicated SELECT-only inspector. Registered intended Azure production fingerprint: **b23d640cdf242812e80a28d10bc4079a3ff0b48a05173a392b9af47853495ced**. Re-resolve it through canonical authority and obtain current operation-specific protected read-only approval; merge acceptance does not authorize a protected database connection. The database-authority skill requires stopping before a protected target without explicit operation/fingerprint approval.

Use the merged manifest and the named commands from [the release runbook](../../../../database-authority/canonical-place-reference-release-2026-10-08.md):

```sh
pnpm db:authority:status
pnpm db:authority:context
pnpm db:release:reference:inspect -- --adapter=places
pnpm db:release:plan -- --accepted-old-head=0096_user_founder_authority_unique.sql --expected-new-head=0111_properties_canonical_place_reference_fk.sql
```

The old head `0096` is historical expected state, not a fresh assertion. First inspect actual checksums and durable attempts. If the head, fingerprint, prefix, attempt state or physical state differs, stop for review rather than changing arguments until the plan passes. Capture sanitized target, actual/accepted/expected heads, ordered pending SQL/checksums, manifest digest, attempt state, provider and exact plan digest. Expected unchanged transition is 15 additive migrations, 0097–0111, preserving all 97 released prefix entries. Do not apply this plan under integration approval.

## Fresh reference-data plan

The named read-only command is:

```sh
pnpm db:release:reference:plan -- --adapter=places
```

Before schema application, this can describe desired/held assertions but must report `readyForDataRelease=false` and `planDigest=null`. Do not present it as an applicable data release plan. After a separately approved schema apply, re-plan schema, prove canonical congruency and all 39 expected enforced CHECKs, then generate the fresh applicable Place reference plan. Bind exact target/head, registry and source pins, desired/held digests, observed assertions, pending counts and plan digest. Unexpected rows, partial installation, assertion drift or incomplete attempts stop the release; no deletion, legacy remap or provider-backed identity is permitted.

Schema apply, reference apply and matching deployment each need their own approval. Retain authoring/reference-writer freeze, preservation evidence, ephemeral distinct migration credentials, operation-specific digest/acknowledgement, bounded execution budget and incident handoff. Refer to the existing runbook for application and verification; this document issues no apply command or permission. Restore neither automatic deployment nor payments through this preparation.
