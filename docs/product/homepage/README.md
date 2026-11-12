# Homepage section logic

One file per homepage section. Each file records **why the section exists, what it must do, the rules behind it, and its history**, so that if a section is removed or rewritten, the reasoning is not lost with the code.

Rule for contributors (people and agents): before removing, hiding or rewriting a homepage section, read its file here, and update the file in the same pull request. A section removed without updating its file is a review failure.

Visual reference for the homepage as designed: the owner's screenshot of the integrated preview (pre-#693), described section by section in each file. Decisions below are the owner's unless marked *proposal*.

| Order | Section | Component | Logic file |
|---|---|---|---|
| 1 | Hero and journey tabs | `client/src/components/EnhancedHero.tsx` | [hero.md](hero.md) |
| 2 | Trending properties | `client/src/sections/home/HomeTrendingSection.tsx` | [trending-properties.md](trending-properties.md) |
| 3 | Browse by city, category and journey | `client/src/components/DiscoverProperties.tsx` | [browse-by-category.md](browse-by-category.md) |
| 4 | Developers | `client/src/components/TopDevelopers.tsx` | *to write* |
| 5 | Explore South Africa by area (city cards) | `client/src/components/ExploreCities.tsx` | *to write* |
| 6 | Property market insights | `client/src/sections/home/HomeMarketInsightsSection.tsx` | *to write* |
| 7 | Connected property journey | `client/src/sections/home/HomeJourneySection.tsx` | *to write* |
| 8 | For property professionals | `client/src/sections/home/ProfessionalEntrySection.tsx` | *to write* |
| 9 | Closing call to action | `client/src/sections/home/CTASection.tsx` | *to write* |

Shared rules for every section:
- **Never hide a section because it has no data.** Show the reusable empty state (`client/src/components/ui/SectionEmptyState.tsx`): one honest line plus one action. No fake listings, numbers or testimonials.
- **Plain language.** No internal terms (canonical, admitted, Place catalogue, commercial activation) in visible text.
- **Works on phone, tablet and desktop.** No page-level sideways scroll at 360, 390, 768, 1024 or 1440 px; touch targets at least 44 px.
- **Search engines can follow it.** Anything that leads to a page is a real link (`<a href>`), not only a button.
