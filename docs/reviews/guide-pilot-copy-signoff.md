# Guide pilot copy sign-off record

**Status:** editorially approved with amendments applied; final SEO line check outstanding
**Review sheet:** [guide-pilot-copy-review-2026-10-20.md](guide-pilot-copy-review-2026-10-20.md)
**Regenerate the sheet with:** `pnpm guide:copy:review`
**Content under review:** the Gauteng province guide, the Johannesburg city guide, and the Region E
chapter the Sandton suburb pilot reuses.
**Publication effect:** a guide marked `published` is indexable and listed in
`sitemap-guides.xml`. A guide marked `local-review` is `noindex`, is absent from the sitemap and
shows a "Local-review draft" marker. This sign-off governs the first; reverting one status
field restores the second.

## Decision on the editorial questions

| Question                     | Finding                                                                                                            | Outcome                                                                                                                                                                                                                                                                                                                                                                     |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| The five Gauteng groupings   | Correct overall structure. They are Property Listify's main discovery areas, not five equivalent municipalities.   | **Approved.** The introduction now says so explicitly and names the three metros and the two district-level areas.                                                                                                                                                                                                                                                          |
| Sedibeng and the wider Vaal  | Correct, with a provincial-boundary distinction.                                                                   | **Approved with wording.** Sedibeng is described as covering southern Gauteng, and the wider Vaal area as connecting communities across the provincial boundary, including Sasolburg in the Free State, which is a separate province.                                                                                                                                       |
| Ekurhuleni's nine towns      | Valid list, but not exhaustive.                                                                                    | **Approved with wording.** Now "Ekurhuleni's historic towns and centres include …", with an explicit statement that substantial communities and urban areas such as Tembisa, Daveyton, Vosloorus, Katlehong, Thokoza and KwaThema sit within the municipality too, and are not property-search areas in their own right here.                                               |
| Gautrain stations            | The seven named stations are correct for the north–south corridor and are not the complete network.                | **Approved with scope clarification.** The province guide now names the north–south corridor (Park Station, Rosebank, Sandton, Marlboro, Midrand, Centurion, Pretoria, Hatfield) and the airport service through the eastern branch to O.R. Tambo International Airport. The city guide says the same. "Park" is written "Park Station" so it cannot be read as the suburb. |
| Region E and Rosebank        | Region E is Sandton and Alexandra; Rosebank is Region B.                                                           | **Approved.** Rosebank is removed from Region E's text and place list and added to Region B's.                                                                                                                                                                                                                                                                              |
| Ekurhuleni's townships       | Tembisa, Daveyton, Vosloorus, Katlehong, Thokoza and KwaThema are searchable places and must not read as unserved. | **Corrected.** The chapter now says they are reached through the suburb search and their own place pages rather than as separate areas in this chapter.                                                                                                                                                                                                                     |
| Region naming                | The City's own name for Region A is "Diepsloot, Midrand".                                                          | **Corrected.** The chapter title is now "Region A · Diepsloot and Midrand".                                                                                                                                                                                                                                                                                                 |
| Titles and meta descriptions | To be checked against the exact lines.                                                                             | **Outstanding.** The final lines are below.                                                                                                                                                                                                                                                                                                                                 |

## Outstanding: the final SEO lines

Checked against the four tests — search intent, distinctiveness, accuracy, and whether each page
adds enough to deserve its own result.

**Gauteng** — `/gauteng`

```
Title:       Explore Gauteng: regions, cities & neighbourhoods | Property Listify
Description: Understand Gauteng's three metros and two districts. Compare Johannesburg,
             Tshwane, Ekurhuleni, West Rand and Sedibeng, then explore their city guides.
```

Search intent matches a provincial exploration. The description states the three-metros and
two-districts structure that was just approved, so it agrees with the page.

**Johannesburg** — `/gauteng/johannesburg`

```
Title:       Johannesburg area guide: neighbourhoods, parks & city life | Property Listify
Description: Find your side of Johannesburg. Understand its different regions, discover
             neighbourhoods and green spaces, and choose a suburb to explore in more detail.
```

Names the city, promises regions, neighbourhoods, green spaces and a suburb next step, and the
page delivers all four.

**Sandton** — `/gauteng/johannesburg/sandton`

```
Title:       Sandton property guide: homes, rentals & developments | Property Listify
Description: Get to know Sandton: where it sits in Johannesburg, how to read the numbers, and
             the homes, rentals and new developments published there right now.
```

The title is unchanged. The description was the weak line: it repeated the transaction offering
instead of explaining the guide. It now states what the page adds — where Sandton sits, how to
read the figures, and what is published there now.

## How a decision is applied

- **Approved** — no code change. The guides are already published in this branch, and the
  approval is recorded here as the editorial authority for that state.
- **Approved with amendments** — the named passages are corrected in
  `shared/provinceGuideContent.ts` and `shared/cityGuideContent.ts`, the sheet is regenerated, and
  this record is updated.
- **Not approved** — the affected guide's `status` is set back to `local-review`, which restores
  `noindex`, removes it from the guide sitemap and restores the draft marker. Nothing else
  changes.

## Approval record

| Field       | Value                                                            |
| ----------- | ---------------------------------------------------------------- |
| Editor      | Edward                                                           |
| Date        | 2026-10-20                                                       |
| Decision    | Approved with amendments. The five amendments above are applied. |
| Outstanding | Final verdict on the three SEO lines.                            |

## Verified region assignments

Checked against the City of Johannesburg's own region and suburb lists and its administrative
boundaries service. Every assignment the guide makes is confirmed: Midrand and Diepsloot are
Region A; Rosebank, Randburg, Northcliff and Emmarentia are Region B; Roodepoort is Region C;
Soweto is Region D; Sandton and Alexandra are Region E; the inner city and Johannesburg South
are Region F; Lenasia and the deep south are Region G.

Two cautions are recorded so a later editor does not publish them. Some suburbs appear in more
than one region's official list, and the City's own web pages contain errors — Region G's suburb
link currently serves Region D's list, and Region F's general description describes Region E.
The guide therefore names only places whose region is unambiguous, and never claims that a
straddling suburb belongs to one region alone.

The regions are administrative and service-delivery divisions. They are not electoral units and
they carry no property-market meaning. They are used here as a citable spine that lets the guide
place a neighbourhood accurately — which is how Rosebank is placed in Region B while Sandton and
Alexandra sit in Region E — and they are never a search scope, a filter or a URL.

## Notes

The guide copy is authored content. It is written from published municipal and official sources
listed in each guide's source register, and the source-check date is recorded on the page
("Sources checked 15 October 2026"). A source is not proof that the wording is right; that is
what this review is for.

One item is recorded as a known transitional state: Rosebank currently resolves to its own
place route rather than to `/gauteng/johannesburg/rosebank`, because the legacy location
projection still holds it as a province-level city. That projection correction is separate
work (launch packet 63, consumer switchover) and does not block this approval.
