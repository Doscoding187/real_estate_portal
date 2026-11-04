# 64 — Location Model Decision: One Ladder, Searchable Areas, and the Founder-Lifted ODbL Hold

**Date:** 2026-10-20 (decision); reconfirmed by Edward on 2026-11-04
**Worktree:** `.worktrees/property-listify-guide-pilot-seo-20261020` (branch
`feat/guide-pilot-seo-publication-20261020`, base `origin/main` = `cd62988fb`)
**Type:** Product and architecture decision, informed by competitive and licence research.

## Founder decision record — D3 OSM/ODbL hold lifted

**Decision date:** 2026-10-20

**Reconfirmed by Edward:** 2026-11-04

**Decision-maker:** Edward, founder

**Decision:** Edward deliberately lifted the D3 OSM/ODbL hold that required a
separate founder gate before staging or production release of OSM-only Place
rows, so the Place data work could proceed. Edward accepts the associated risk.
This records a business decision; it does not determine or state legal
conclusions about ODbL obligations.

**Reasoning stated by the owner:** proceed with the Place data direction. As
Packet 64 records Edward's direction, a second gazetteer listing is a confidence
signal, not a prerequisite for using a traceable Place.

**Conditions:**

- Keep a source and source URL on every Place row.
- Keep the 720 OSM-only rows identifiable so they can be removed or replaced.
- Show OpenStreetMap attribution on public pages that use OSM-derived data.
- Obtain a legal review of ODbL obligations before any public paid launch.

**Review by:** `[Owner to fill in]`

This record supersedes prior statements in this packet and D3 that require the
founder ODbL gate to be cleared before staging or production. The conditions
above remain in force.

## Why this packet exists

Edward's directive: one geography, the Place Authority, retire the legacy. Two questions were
raised that this packet answers with evidence rather than opinion:

1. How do the platforms that already work scope their locations, and what ladder should
   Property Listify use?
2. What is the current D3 release-hold status for OSM-only Place rows?

The answer to (2) is the founder decision recorded above: the staging/production
hold was lifted, with traceability, attribution and pre-paid-launch legal-review
conditions. The answer to (1) is that our own audit and the market's practice
agree on the ladder, with one exception where the market leader is weak and we
should be better.

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

## Historical licensing analysis — current release status is in the decision record above

The research below is retained as 2026-10-20 context. It is not the founder's
decision record or a legal opinion; the 2026-11-04 reconfirmation above governs
the D3 release-hold status and requires legal review before any public paid
launch.

The repository research in this section is historical context, not a legal
opinion or a determination of ODbL obligations. The current decision is the
founder record above; legal review remains required before any public paid
launch.

**Questions left for legal review:** how ODbL obligations apply to these Place
rows and their collection, and what attribution, sharing, or other conditions
apply to the intended product and distribution. This packet does not answer
those questions.

**Historical release implementation at the time of the earlier analysis.** The
protected release policy `admitted-national-non-osm-only-v1` kept
`osm_only_odbl_provisional` identities and dependent rows out of its protected
subset, while retaining their classification for traceability. That snapshot
reported 720 OSM-only rows withheld. The founder decision above lifts the
separate staging/production hold; it does not itself change that release
implementation or the protected database release process.

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

1. This earlier assessment treated the D3 hold as an engineering issue. The
   founder decision above now lifts that hold for staging and production, while
   retaining row traceability, removability, public attribution and legal review
   before any public paid launch.
2. The `provisional` status must stop being derived from licensing in the runtime projection.
   Place status must come from the Place Authority's own release status.
3. The two legacy defects — licensing-derived suppression and provider-written geography —
   disappear with the projection itself. That is the strongest argument for retiring it rather
   than maintaining it.

**What remains for a founder or lawyer:**

- Whether to buy commercial boundary data (Mapbox / HERE / TomTom) instead of maintaining our
  own geometry. This is a budget decision, not a judgement call.
- Obtain a legal review of ODbL obligations before any public paid launch. The
  review outcome remains open; the founder decision above does not determine it.

## The ordered plan to launch

| #   | Work                                                                                                                          | Why it is next                                                                                                                                                             |
| --- | ----------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Land the guide pilot and the geography boundary                                                                               | The launch is blocked on the guides being published and served. Done in this branch.                                                                                       |
| 2   | **Correct the place status rule**: take place status from the Place Authority release, not from licensing                     | Removes the reason Rosebank, Soweto, Krugersdorp, Vereeniging, Magaliesburg and 1,100 others are invisible. It is a rule change in the projection loader, not a data hunt. |
| 3   | **Re-parent the places that are in the wrong tier** (Rosebank first, then a census of the rest) against the municipal records | The market's own leader gets this wrong for Vereeniging. This is where we beat them.                                                                                       |
| 4   | Preserve source and source URL on every row; keep the 720 OSM-only rows identifiable; show attribution on pages that use them; obtain legal review before a public paid launch | Conditions of the founder's D3 decision above; the staging/production hold is lifted. |
| 5   | Build the country funnel page and the province → municipality → city → suburb guide ladder                                    | Edward's SEO vision, and the one Property24 does not have.                                                                                                                 |
| 6   | Index gating on real demand: a suburb page earns indexation only with listings and unique data; thin pages 301 to the parent  | Google's rules, and the guardrail against the "mass catalogue of thin pages" the audit warned about. Already implemented for the pilot.                                    |
| 7   | Switch the remaining 19 legacy consumers to the Place Authority, then retire the projection tables                            | The mechanical end of the retirement. Each consumer is one allow-list entry.                                                                                               |

**Approval burden after this packet.** Items 2, 3, 4, 5, 6 and 7 are buildable and testable.
Under the founder's D3 decision, no licence approval gate is a prerequisite for staging and
production, but source/URL traceability, removability, public attribution, and legal review of
ODbL obligations before a public paid launch are conditions of the release. The founder retains
the final product GO decision recorded in the release runbook.

## What is not decided here

The platform still has two geography _implementations_. This packet decides the model and the
ladder, records the founder's D3 release-hold decision and its conditions, and makes the
retirement mechanical rather than aspirational. It does not determine legal obligations. The
projection tables are still in service until the consumers in packet 63 move. That is the
remaining execution, and it is recorded there, not here.

## The second-source gate is removed for search — founder direction 2026-10-20

Edward's direction: a place that OpenStreetMap records, with a traceable source, a supported
type, supported spatial confidence and no unresolved boundary conflict, should be usable. A
second gazetteer listing it is a confidence signal, not a ticket every place must hold first.

The release policy changed accordingly, from `admitted-national-non-osm-only-v1` to
`admitted-national-traceable-sources-v2`. The protected release now includes the OpenStreetMap
derived places, and it reports the set of them separately, so the decision is auditable and a
later correction can find every affected record.

**What did not change.**

- Per-row attribution and provenance. Every released place keeps its licence notice and its
  source record, so an OpenStreetMap-derived place remains attributable.
- **Publication as a public guide page stays stricter than search.** The place's own
  `publication_eligible` still requires a released and verified identity, so these places
  become selectable and searchable without becoming indexable pages.
- No source-quality, spatial-confidence or boundary-conflict check was relaxed. The change is
  about one rule only: the absence of a second gazetteer listing.

**Coverage effect, measured on the disposable target.**

**Count correction — 2026-10-29.** The current package has 17,663 Places, not
17,664: the founder has decided to retire the duplicate Fordsburg locality
`pl-place-01-99dcb8ba9d808741e35b258e`, leaving the supported suburb. This is a
package count for the next release; Azure's existing 16,944 rows are unchanged
until a separately approved release. The Fordsburg decision record and
pre-release retirement step are in
[`fordsburg-duplicate-identity-review-2026-10-28.md`](../fordsburg-duplicate-identity-review-2026-10-28.md).

|                                    | Before          | After      |
| ---------------------------------- | --------------- | ---------- |
| Places released                    | 16,944          | **17,663** |
| Places searchable                  | 16,224          | **16,943** |
| Places publishable as a guide page | 68 per province | unchanged  |
| Gauteng places searchable          | 714             | **1,433**  |

**Historical licence note — superseded for launch.** The OpenStreetMap tail was previously
treated as a legal review item. The founder's 2026-10-29 direction supersedes that release hold:
publicly available data is used as-is, source and URL stay in existing fields, and licensing
review does not block the launch. This is not a legal opinion.

**Founder launch direction — 2026-10-29.** This historical legal-review request and its proposed
gate are superseded for launch. Use publicly available data as-is, preserve its source and URL in
the existing fields, and do not block loading or release on licensing review. This records the
founder's product decision; it makes no legal determination.

The alternative that avoids the question entirely is to not hold a browsable OpenStreetMap
gazetteer and to resolve a location at the moment an agent lists a property instead. That
design also delivers the coverage, and it is the pattern the OpenStreetMap Foundation's own
geocoding guidance blesses. It is the next design option, not the one taken here.
