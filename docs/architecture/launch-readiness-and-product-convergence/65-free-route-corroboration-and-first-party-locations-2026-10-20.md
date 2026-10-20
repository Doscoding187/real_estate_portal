# 65 — The Free Route: Corroboration Instead of Licensing, and First-Party Location Evidence

**Date:** 2026-10-20
**Worktree:** `.worktrees/property-listify-guide-pilot-seo-20261020` (branch
`feat/guide-pilot-seo-publication-20261020`, base `origin/main` = `cd62988fb`)
**Type:** Decision and plan. No schema, migration, seed or protected database operation.

## The question

Edward: can the location database be built for free, and can locations we do not have be
collected from the people who list property?

**Answer to both: yes. The money is not the constraint, and the missing locations already have
a source inside our own product.**

## What is actually free, and what the trap is

| Source                                  | Terms                                                                                              | Free? | Usable for a proprietary database?                                                                                                                                         |
| --------------------------------------- | -------------------------------------------------------------------------------------------------- | ----- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **GeoNames**                            | CC BY 4.0                                                                                          | Yes   | **Yes**, with attribution. Settlement names, coordinates, administrative codes.                                                                                            |
| **geoBoundaries gbOpen**                | CC BY 4.0, upstream CC BY 3.0 IGO                                                                  | Yes   | **Yes**, preserving both notices. Administrative geometry.                                                                                                                 |
| **NGA GNS**                             | "No licensing requirements or restrictions"                                                        | Yes   | **Yes**, with citation.                                                                                                                                                    |
| **Wikidata**                            | CC0                                                                                                | Yes   | **Yes**, no conditions at all.                                                                                                                                             |
| **OpenStreetMap**                       | ODbL 1.0                                                                                           | Yes   | **Only insubstantial / non-systematic use.** A systematic, browsable national gazetteer built from OSM is a derivative database and would have to be published under ODbL. |
| **Wikipedia**                           | CC BY-SA 4.0                                                                                       | Yes   | **No — this is the trap.** Wikipedia's _text_ is share-alike. Use Wikidata (CC0), never Wikipedia prose, for anything that enters a database.                              |
| Municipal Demarcation Board             | Public domain, but "shall not sell the data to third parties or appropriate it for commercial use" | Yes   | Use in a value-added application with attribution; **not** resellable as data. Permission conversation, not a dead end.                                                    |
| Stats SA                                | "Neither the basic data nor any reprocessed version may be sold without prior permission"          | Yes   | Permission conversation.                                                                                                                                                   |
| SAGNS / SAGNC (official SA place names) | No open licence found                                                                              | —     | Treat as permission-required. Authoritative, worth asking for.                                                                                                             |

**The free route is exactly what the repository already uses**: GeoNames, geoBoundaries, NGA GNS
and Wikidata as the licensed foundation, with OSM held behind a gate. No new spend is required
to build the location database. The database the free route produces is smaller than a
comprehensively-licensed one, and that is the correct trade.

## The real constraint is corroboration, not money

Reading the admitted Gauteng package directly answers the Rosebank question for the last time.

**Rosebank, in the canonical Place Authority:**

```
administrative_context: "City of Johannesburg"
place_type:            town
search_scope:          metro_city
verification_status:   provisional
publication_eligible:  0
search_eligible:       1
licensing_classification: mixed_odbl_supported
adjudication:          { basis: "single_source_identity", member_count: 1 }
```

Two things follow.

**First, the Place Authority already knows Rosebank belongs to the City of Johannesburg.**
`administrative_context` says so. It is the _execution scope_ that still treats it as a
city-level scope, and the hierarchy we are building in packet 64 is what corrects that.

**Second, it is not provisional because of licensing.** It is provisional because
`adjudication.basis` is `single_source_identity` — **we have it from one source only**. The
same is true of Krugersdorp, Vereeniging, Magaliesburg, Meyerton, Roodepoort and Heidelberg.
Sandton and Soweto are `merged_same_referent` — two sources agreeing.

**So the rule is: one source = provisional, two independent sources agreeing = verified.** That
is a sensible rule for a factual database, and it is the rule the whole pipeline is built on.

**It also means the cure is free.** A second independent, attribution-licensed source — GeoNames
against geoBoundaries against NGA GNS against Wikidata — corroborates a place for the cost of
a download and a script. **1,377 Gauteng places are currently provisional. Most of them are
one corroboration away from verified.** No licence purchase is required to unlock them.

**And the OSM-only 720 are a separate, smaller problem**: they are held because their evidence
is OSM-only, not because they are doubtful. Where an equivalent place exists in GeoNames,
geoBoundaries, NGA GNS or Wikidata, it can be admitted from there and the OSM-only row becomes
unnecessary.

## The locations we do not have: collect them from our own product

Edward's proposal is the right mechanism and the free one: **when an agent lists a property in
a location we do not have, that is evidence.** The agent knows where the property is; they are
not a third-party dataset, they are a first-party observation of a real transaction. That is
the best kind of geography evidence and it costs nothing.

**What already exists, and what is missing.**

Already built and unused: `buildUnresolvedDraftLocation` in
`server/services/listingLocationResolver.ts`, which produces a location with
`locationConfirmationState: 'needs_confirmation'`, null geographic handles, and the typed
province, city and suburb text preserved. `resolveCanonicalListingLocation` already returns
that shape for a location it cannot resolve, and `validatePublishableListingLocation` holds the
listing at confirmation rather than publishing it over an unknown place.

**The gap:** the observation stops there. It lives on the listing draft and never reaches the
admission pipeline, so nobody ever sees the list of places our agents are trying to use, and
nothing is queued for review. The free collector is 80% built and disconnected at the last
link.

**The plan:**

1. **Capture** the unresolved province/city/suburb text, the observation source and the
   submitting agent on the listing record, so the observation is first-party and attributable.
2. **Queue** it for geography review through the existing admission tooling
   (`tools/place-admission/` and the place disposition ledger), with the same separation the
   contract already requires: a provider observation never creates or promotes a geography
   row, and a first-party agent observation is evidence for a **governed admission decision**,
   not an automatic insert.
3. **Tell the agent.** "We don't have {location} yet — we've recorded your request and it is
   queued for our geography team." A listing is never lost because we lacked a suburb.
4. **Corroborate.** An agent observation plus any one licensed source is two independent
   sources, which is the same rule that promotes every other place. The place becomes
   verified through the existing admission path, and every listing that referenced it is
   resolved.
5. **Measure it.** The queue's size and the places it unlocks are the live signal of where our
   coverage is thin — which is exactly the collector the platform needs, and it is free.

## What is left for a professional, and it is small

Not a licence decision. Two things, both deferrable:

- **One scoped South African lawyer opinion**, when the platform has revenue: how a SA court
  would characterise our specific schema under the ODbL, and whether the MDB and Stats SA
  non-resale clauses bind a paid product. Edward's sister is a lawyer; the question to put to
  her is narrow and can be answered in writing.
- **Whether to buy commercial boundary data.** A budget question, not a judgement question, and
  not needed to launch.

Neither blocks anything in this packet.

## What I am doing with this

- The place-status rule is corrected so status comes from the Place Authority's own release
  and corroboration state, not from a licensing classification applied to a place-identity
  question. That is the change that makes Rosebank, Soweto, Krugersdorp, Vereeniging,
  Magaliesburg and ~1,100 others visible.
- The remaining licensing-held rows are re-sourced from the free attribution-licensed
  foundation, and the OSM-only gate closes.
- The agent-contributed location observation is connected to the admission pipeline.
- The country funnel page and the province → municipality → city → suburb guide ladder follow
  the model in packet 64.

None of these need a founder decision. The founder is needed for spend and for a lawyer's
letter, and nothing else.
