# 64 — Location Model Decision: One Ladder, Searchable Areas, and a Licence Question That Is Already Settled

**Date:** 2026-10-20
**Worktree:** `.worktrees/property-listify-guide-pilot-seo-20261020` (branch
`feat/guide-pilot-seo-publication-20261020`, base `origin/main` = `cd62988fb`)
**Type:** Product and architecture decision, informed by competitive and licence research.

## Why this packet exists

Edward's directive: one geography, the Place Authority, retire the legacy. Two questions were
raised that this packet answers with evidence rather than opinion:

1. How do the platforms that already work scope their locations, and what ladder should
   Property Listify use?
2. Is the ODbL licensing question a founder decision or an engineering task?

The answer to (2) is that **the repository already settled it**, and the answer to (1) is that
our own audit and the market's practice agree on the ladder, with one exception where the
market leader is weak and we should be better.

## What the market does

**Property24 — the South African leader, verified live.**

- It uses a **closed, curated area index**. Every URL resolves to a numeric `areaId` in
  Property24's own area table. Free text is not part of the URL scheme. This confirms the
  observation that Property24 limits which areas can be searched.
- Its hierarchy has **five levels**: type → province → city/region → region-cluster → suburb.
  Critically, its "city" level **mixes cities and editorial regions**. Sandton is a _peer_ of
  Johannesburg, not a child of it.
- It has **no national for-sale page**: `/for-sale/south-africa` returns 404. It keeps
  `/property-values`, `/property-trends` and `/auctions` nationally instead.
- Its suburb pages are independently searchable, with their own counts, trends and sold prices.

**Private Property — the other SA leader.** Has a **national scope**
(`/for-sale/south-africa/1`, ~194,000 listings) and a five-level ladder including curated SA
regions such as East Rand, West Coast, Peninsula False Bay and Boland.

**International comparables** (Rightmove UK, realestate.com.au, Property Finder UK,
OnTheHouse AU) all expose a country → state/region → town → suburb ladder, and all except
Property24 have a real national buy scope. The SEO equity sits at city and suburb level, not
at country level.

**Google's own guidance** (doorway-pages and scaled-content-abuse policies): do not publish
thin or near-duplicate location pages; do not publish the full Cartesian product of
province × city × suburb; consolidate thin pages to the nearest real parent with a 301; and
never create pages that exist only to rank.

**Where Property24 is weak, and where we should beat it:**

| Property24                                                                                                                                   | Us                                                                              |
| -------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| Rosebank is taxonomically under Johannesburg, but its editorial "About Sandton" page lists Rosebank as a Sandton suburb — **dual parenting** | One canonical parent per place. Ever.                                           |
| Vereeniging is a **peer of Johannesburg**, skipping Emfuleni and Sedibeng entirely                                                           | Vereeniging sits under Emfuleni under Sedibeng — the true administrative ladder |
| Magaliesburg is demoted to a "suburb of Krugersdorp"                                                                                         | Magaliesburg is a town of Mogale City in the West Rand district                 |
| No national for-sale scope                                                                                                                   | A real national scope that funnels to provinces                                 |

## The ladder we adopt

Two structures, doing two different jobs. Conflating them is the root of the current
confusion.

**Search scope — what a person can filter and search by.** Three executable scopes, which is
what the runtime already supports:

```
province  →  city / town  →  suburb
```

A person searching "Rosebank" gets Rosebank. A person searching "Gauteng" gets the province.
Nobody is silently widened into a broader result than they asked for.

**Guide hierarchy — how we explain and link.** The administrative ladder, which is what the
Gauteng province guide already teaches:

```
South Africa
└── Province                                    (9)
    └── Metro municipality / District municipality   (City of Johannesburg, Tshwane, Ekurhuleni,
                                                       West Rand, Sedibeng)
        └── City / town
            └── Suburb
```

**The rule that removes the confusion:** the _municipality tier is editorial, not a search
scope_. It explains where a place sits and how to reach it. It never becomes a filter and never
widens a result. This is already the position in the repository: "Editorial region membership is
not a Search Area or a query boundary."

**Canonical URL shape** (own stable ids, not a competitor's):

```
/property-for-sale/gauteng
/property-for-sale/gauteng/johannesburg
/property-for-sale/gauteng/johannesburg/rosebank
```

and the matching neutral guide routes `/gauteng`, `/gauteng/johannesburg`,
`/gauteng/johannesburg/rosebank` that are already live.

## The national page: yes, and it is real

Edward's instinct — a country-level entry that funnels into provinces — is right and is
supported by the market (Private Property) and by Google's rules, **provided** it is a real,
browsable national scope and not a doorway page. It carries the province directory, the real
national listing count and the honest statement that most people start at province level. The
province and city guides carry the SEO weight.

## Rosebank: settled by research, not by judgement

- **Rosebank is a suburb of the City of Johannesburg**, not a municipality and not a city peer.
  It is in the City of Johannesburg's own municipal region structure and Ward 90.
  _Regional assignment is reported inconsistently across sources — some place it in the
  "Sandton and Alexandra" region, others in the Randburg-adjacent region. The search answer
  does not depend on that finer point, and we should not assert a region we cannot settle._
- **Magaliesburg** is a rural town of Mogale City in the West Rand district.
- **Vereeniging** is the main town of Emfuleni and the seat of the Sedibeng district.
- Property24 files Rosebank under Johannesburg — **we agree with that** — and files Vereeniging
  as a peer of Johannesburg — **we do not**.

**Decision:** Rosebank becomes a **suburb of Johannesburg**: independently searchable, listed
under Johannesburg on the city guide, and never a peer of Johannesburg in the hierarchy. The
data correction lands in the Place Authority input, where the parent edge is evidenced.

## The licence question is an engineering task, not a founder decision

This is the most important finding in this packet, and it corrects the framing in packet 63.

**ODbL permits commercial use.** §3.1 grants "commercial use, and do not exclude any field of
endeavour". There is no commercial-use prohibition and no "production use" clause.

**The real constraint is narrower than "ODbL is dangerous".** The ODbL governs the _database as
a compilation_, not individual facts. OSMF's own board-endorsed geocoding guideline says a
collection of names and coordinates is **not** a substantial extract, **provided** it is not a
systematic attempt to aggregate all or substantially all primary features of a type within a
city-sized-or-larger area — in other words, provided it is not used as a general-purpose
geodatabase.

**And the repository has already solved it.** The contract requires `permissive_supported`,
`mixed_odbl_supported` and `osm_only_odbl_provisional` to be distinguishable, and the
protected release policy `admitted-national-non-osm-only-v1`:

- releases `permissive_supported` and `mixed_odbl_supported` Place assertions unchanged;
- **holds every `osm_only_odbl_provisional` identity and its dependent rows** out of the
  protected release;
- refuses unknown licensing classifications;
- keeps row licensing classification observable so the gate is enforceable mechanically.

So the OSM-only rows are already out of the production Place set (720 held), and the
attribution-licensed foundation is already in place: **GeoNames (CC BY 4.0), geoBoundaries
gbOpen (CC BY 4.0), NGA GNS (no restrictions), Wikidata (CC0)** — all commercially reusable with
attribution and no share-alike.

**What actually went wrong, then.** The legacy runtime projection derived the _place status_
from the _licensing classification_, and then used that status to suppress places. That is why
Rosebank reads as provisional: it is `mixed_odbl_supported`, which the projection maps to
`provisional`, and the runtime then filters `status = 'verified'`. **The licensing gate was
applied to a place-identity question it was never meant to answer.** The Place Authority
already released those rows.

The second legacy defect: the projection could accept provider observations as geography.
`locationAutoPopulation`, `listingLocationResolver` and `saveGooglePlaceLocation` could write
Google-derived observations into `provinces` / `cities` / `suburbs` with no governance gate.
Those paths are already classified **RETIRED** in the coverage contract with an exit condition,
and the rule is explicit: **a provider observation can never create or promote a public
geography row.**

**Consequences:**

1. The ODbL determination does **not** need a founder decision to unblock the platform. The
   policy is written, enforced and already applied. What remains is engineering: re-source the
   blocked rows from the attribution-licensed foundation and close the OSM-only gate.
2. The `provisional` status must stop being derived from licensing in the runtime projection.
   Place status must come from the Place Authority's own release status.
3. The two legacy defects — licensing-derived suppression and provider-written geography —
   disappear with the projection itself. That is the strongest argument for retiring it rather
   than maintaining it.

**What genuinely remains a founder or lawyer question** — small, and explicitly not blocking:

- Whether to buy commercial boundary data (Mapbox / HERE / TomTom) instead of maintaining our
  own geometry. This is a budget decision, not a judgement call.
- One scoped South African lawyer opinion on how a SA court would characterise our specific
  schema, and whether the Municipal Demarcation Board's and Stats SA's non-resale clauses bind
  a paid product. Note their terms: the MDB allows use in value-added applications with
  attribution but forbids selling the data or appropriating it for commercial use; Stats SA
  forbids selling or reprocessed versions without permission. Both are permission conversations,
  not dead ends.

## The ordered plan to launch

| #   | Work                                                                                                                          | Why it is next                                                                                                                                                             |
| --- | ----------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Land the guide pilot and the geography boundary                                                                               | The launch is blocked on the guides being published and served. Done in this branch.                                                                                       |
| 2   | **Correct the place status rule**: take place status from the Place Authority release, not from licensing                     | Removes the reason Rosebank, Soweto, Krugersdorp, Vereeniging, Magaliesburg and 1,100 others are invisible. It is a rule change in the projection loader, not a data hunt. |
| 3   | **Re-parent the places that are in the wrong tier** (Rosebank first, then a census of the rest) against the municipal records | The market's own leader gets this wrong for Vereeniging. This is where we beat them.                                                                                       |
| 4   | Re-source the licensing-held rows from GeoNames / geoBoundaries / NGA GNS and close the OSM-only gate                         | Engineering, not a decision.                                                                                                                                               |
| 5   | Build the country funnel page and the province → municipality → city → suburb guide ladder                                    | Edward's SEO vision, and the one Property24 does not have.                                                                                                                 |
| 6   | Index gating on real demand: a suburb page earns indexation only with listings and unique data; thin pages 301 to the parent  | Google's rules, and the guardrail against the "mass catalogue of thin pages" the audit warned about. Already implemented for the pilot.                                    |
| 7   | Switch the remaining 19 legacy consumers to the Place Authority, then retire the projection tables                            | The mechanical end of the retirement. Each consumer is one allow-list entry.                                                                                               |

**Approval burden after this packet.** Items 2, 3, 4, 5, 6 and 7 are researchable, buildable
and testable, and should proceed without founder approval. The founder is needed only for
spend (item: commercial boundary data, a scoped lawyer opinion) and for accepting a business
risk that cannot be researched away. That is the correct division of labour for this programme.

## What is not decided here

The platform still has two geography _implementations_. This packet decides the model, the
ladder, the status rule and the licensing resolution, and it makes the retirement mechanical
rather than aspirational. The projection tables are still in service until the consumers in
packet 63 move. That is the remaining execution, and it is recorded there, not here.
