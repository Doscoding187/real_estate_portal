# Guide pilot copy sign-off record

**Status:** awaiting founder sign-off
**Review sheet:** [guide-pilot-copy-review-2026-10-20.md](guide-pilot-copy-review-2026-10-20.md)
**Regenerate the sheet with:** `pnpm guide:copy:review`
**Content under review:** the Gauteng province guide, the Johannesburg city guide, and the Region E
chapter the Sandton suburb pilot reuses.
**Publication effect:** a guide marked `published` is indexable and listed in
`sitemap-guides.xml`. A guide marked `local-review` is `noindex`, is absent from the sitemap and
shows a "Local-review draft" marker. This sign-off governs the first; reverting one status
field restores the second.

## What the sign-off covers

| Item                            | Where in the sheet                                                                                                                              | What to check                                                                                                                             |
| ------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| Page title and meta description | Under each guide heading                                                                                                                        | Reads well in a Google result. Says what the page is, not what the platform is.                                                           |
| Introduction                    | "Introduction" under each guide                                                                                                                 | Does it orient a visitor in the place, or does it describe the software?                                                                  |
| Region chapters                 | "Johannesburg / Tshwane & Pretoria / Ekurhuleni / West Rand / Sedibeng" under Gauteng, and "Region A–G" under Johannesburg                      | Are the places grouped correctly? Does the text match what you know of these areas?                                                       |
| Discovery collections           | "City living / Green spaces / Connected living / East Rand towns / Town & country / Around the Vaal" under Gauteng; the four under Johannesburg | Do the place cards feel right? Is any place missing that should be there?                                                                 |
| Everyday life                   | "Everyday life"                                                                                                                                 | Advice, not claims. No promised commute times, school ratings or price predictions.                                                       |
| Questions                       | "Questions"                                                                                                                                     | Would you be comfortable being quoted? Are the answers honest where we do not know?                                                       |
| Source register                 | "Source register"                                                                                                                               | Are the sources the right ones, and are the notes accurate?                                                                               |
| Sandton                         | "Sandton" section                                                                                                                               | The suburb pilot adds no new claims of its own. It reuses the reviewed Johannesburg "Region E" chapter and lists live content separately. |

## Decision

| Field                | Value   |
| -------------------- | ------- |
| Decision             | pending |
| Approved by          |         |
| Date                 |         |
| Amendments requested |         |

## How a decision is applied

- **Approved** — no code change. The guides are already published in this branch, and the
  approval is recorded here as the editorial authority for that state.
- **Approved with amendments** — the named passages are corrected in
  `shared/provinceGuideContent.ts` and `shared/cityGuideContent.ts`, the sheet is regenerated, and
  this record is updated.
- **Not approved** — the affected guide's `status` is set back to `local-review`, which restores
  `noindex`, removes it from the guide sitemap and restores the draft marker. Nothing else
  changes.

## Notes

The guide copy is authored content. It is written from published municipal and official sources
listed in each guide's source register, and the source-check date is recorded on the page
("Sources checked 15 October 2026"). A source is not proof that the wording is right; that is
what this review is for.
