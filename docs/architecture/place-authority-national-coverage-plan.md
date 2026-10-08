# National coverage plan — putting nine proven provinces in one target

**Status: proposal for review. Nothing here is implemented.**

All nine provinces are admitted, reproducible and physically proven. None of that
gives the country a Place Authority. The materializer admits **exactly one
province per target**, by deliberate design, so no proven target contains more than
one province. Phase 6 therefore cannot be closed by admitting more provinces; it is
blocked on one reviewed decision.

This document is the decision surface for that decision. It follows the shape of
`place-authority-migration-reconciliation-plan.md`: the problem, what the evidence
already proves, what a combined load must guarantee, what is deliberately excluded,
the proof required to call it done, and the questions only Edward can answer.

Reproduce every number below with:

```
pnpm place:admission:collision-surface
pnpm place:admission:cross-province
pnpm place:boundary-currency:check
```

## 1. The problem

A national consumer asks "properties in Pietermaritzburg". The answer must come
from one `place` table. Today that table can hold Gauteng **or** KwaZulu-Natal,
never both. Loading the second province into a populated target is refused:

> an admitted Place may not be added to a loaded authority without a reviewed decision

That refusal is correct and must stay until it is lifted deliberately.

## 2. What the nine proven packages already establish

Measured, not assumed:

| Property | Value | Consequence |
| --- | --- | --- |
| Provinces admitted | 9 | every province is a peer, not a special case |
| Places | 17,664 | |
| Source identities | 18,309 | 645 absorbed into merge groups |
| Province roots | 9 | exactly one per province, so a national tree is well founded |
| Place ID collisions | **0** | IDs are already globally unique; no renumbering needed |
| Cross-province (parent, name) collisions | **0** | parents are province-scoped, so the key is already national |
| Preferred names | 15,424 distinct | |
| Ambiguous bare names | **828** | the real consumer hazard, and it is large |
| Names preferred in all nine provinces | 1 | `rieftontein` |
| Names with no parent | 9 | the nine province roots, as expected |

Two of these are the reason this decision is easier than it looks. **Place IDs
already do not collide**, and **the natural key is already unique across
provinces**. Neither needs to be invented or repaired.

## 3. The collision surface, measured

### 3.1 Bare names are not unique and never will be

828 preferred names are shared by more than one province. `rieftontein` is a
preferred name in **all nine**. `klipfontein` and `waterval` are in eight each.

These are genuinely distinct referents. The per-province identity design keeps them
apart, and that is the correct outcome. The consequence is a hard constraint on any
national consumer: **a bare name is never a unique Place and must never be
widened**. A consumer that resolves `rieta` to one of nine Places has not searched,
it has guessed.

### 3.2 A national `place` table cannot enforce UNIQUE(parent, name)

This is the finding most likely to surprise, and it is not a defect.

**614 admitted pairs share a parent and a normalized name.** They are deliberately
unmerged Places:

- **32 pairs** are under the 15 km governed merge bound, and **every one of them
  differs in place type**. Oudtshoorn is both a local municipality and a town
  2.2 km from its own seat. Stellenbosch is a town and a local municipality 7.3 km
  apart. Mandeni, Nkandla, Nongoma and Umvoti are the same pattern.
- **582 pairs** are at or beyond the bound and correctly remain separate Places,
  including 310 more than 50 km apart.

A town and the municipality that contains it sharing a name is normal South African
geography, not a duplicate. The merge rule requires same name **and** same type
**and** same administrative context; it is type-aware, and this is it working.

So `UNIQUE(parent, normalized_name)` would fail on 614 rows that are correct as
admitted. Any national schema must key on something that tolerates a name repeated
under one parent at two types, or accept that the constraint is approximate.

## 4. What a combined load must guarantee

These are requirements, not a design. How they are met is the decision.

1. **Per-territory identity verification inside the load.** Each province must be
   verified against its own digest-pinned package as it is written, not trusted
   because its neighbours loaded successfully.
2. **Global Place ID uniqueness across the load.** Currently proven statically over
   packages. It must be enforced by the load, because two provinces admitted at
   different times by different people must not collide later.
3. **Cross-province natural-key uniqueness.** Currently zero, structurally, because
   every parent is province-scoped. The load must keep it zero rather than assume it.
4. **A wrong natural key must fail closed.** Per §3.2, a uniqueness check on
   (parent, name) will fire on correct data. It must not be used as a gate, and
   certainly not auto-merged away.
5. **Atomicity across provinces.** Nine provinces in one transaction, or a refusal
   that leaves the target exactly as it was. **A half-loaded target is the one
   unacceptable outcome**: seven provinces present and one missing reads as
   complete to every caller that does not recount.
6. **Reprovenance on every Place.** Each row must remain traceable to its
   province, its source identity and its evidence. Dropping the territory from the
   key would make a national table unauditable.
7. **No consumer activation.** A combined load changes what is *available*, never
   what a consumer may *read*. Activation stays a separate, later decision.

## 5. Proof required before national coverage is called done

- All nine packages load into **one** target from zero, in one transaction.
- Place count is exactly 17,664; per-province counts match the registry exactly.
- Place ID uniqueness and (parent, name) cross-province uniqueness both re-verified
  **on the loaded rows**, not on the packages.
- A deliberate mid-load failure leaves the target **province-count zero**, proving
  §4.5 rather than asserting it.
- Re-running the combined load is a byte-identical no-op.
- The per-province probe still passes **per province** against the shared target,
  and a national probe confirms no relationship-driven search widening.
- Consumers remain inactive throughout. A national table that nothing reads has
  proven the storage question only, and must be described that way.

## 6. Deliberately not in this plan

- **Consumer handoff.** Phase 7. Forbidden until national coverage exists, and then
  separately gated.
- **Publication or SEO scopes.** Still blocked on the boundary currency review.
  Eight provinces represent 2020; **Gauteng records no boundary vintage at all** —
  see `pnpm place:boundary-currency:check`.
- **Substituting current boundaries.** Would change admitted packages and Place IDs.
- **Resolving the 828 homonyms by merging them.** They are distinct places.
  Resolution is a consumer concern, at request time, inside a province.
- **Renumbering Place IDs.** None collide. There is nothing to renumber.
- **Deciding complete linkage for merges.** The two over-diameter settlement groups
  (Western Cape 23.5 km, Eastern Cape 16.82 km) stay as they are until reviewed.

## 7. Review questions

Only these need Edward's answer.

1. **Should a combined load be all-or-nothing?** §4.5 assumes one transaction for
   all nine. An alternative is one transaction per province with an explicit
   national completeness marker. The first is simpler; the second allows partial
   operation, which is a different product decision.
2. **What keys the national `place` table?** Given §3.2, is `place_id` alone
   sufficient, or should a separate natural-key table record the deliberate
   name-under-parent duplicates so they are queryable rather than merely tolerated?
3. **Is a national target disposable or durable?** Every proof so far is on
   `disposable-worktree` targets. A national target that is not disposable changes
   the blast radius of every load, replay and probe in this document.
4. **Does Gauteng's unrecorded boundary vintage block national coverage**, or only
   publication? §6 assumes only publication, because no consumer reads any row
   yet. If a national target is built and then activated, the answer changes.
5. **Does the 645 absorbed identities need a national-level record?** Within a
   province they are in the disposition ledger. Nationally, is there one place that
   says which Places absorbed which identities across the whole country?
