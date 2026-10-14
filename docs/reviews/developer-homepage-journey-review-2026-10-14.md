# Developer homepage and public journey review

Date: 14 October 2026  
Branch: `feat/homepage-ux-review-20261013`  
Reviewed application commit: `6d78213e0`  
Preview: http://localhost:3010  
Screenshots and evidence: `/home/edwardspc/Desktop/Dev/review-artifacts/developer-journey-review-20261014`

## Verdict

The developer section is functional but not yet optimized. Its organic provincial eligibility is useful; the card repeats information and offers several labels for the same destination. The downstream profile also has a clipped project action and misleading featured attribution. Keep the current visual system, logos/icons and public journey rules; address the action hierarchy and factual presentation before adding a larger redesign.

This review covers the homepage developer carousel, developer directory, public developer profile and the link into development detail. It does not evaluate the private developer workspace.

## What works

- Homepage developers qualify through approved, published, publicly eligible developments in the selected province. Payment/access, organisation approval, active membership and publisher authority rules remain in the shared eligibility service.
- Homepage ranking is organic: qualifying project count descending, most recent project publication descending, then brand name. Brand tier does not buy placement in this query.
- The homepage distinguishes loading, failed requests with retry, and successful empty data.
- Public brand routes work for guests; the tested links did not force login.
- The horizontal carousel fits 390px and 320px viewports, with a visible next-card preview. The tested homepage section had no WCAG A/AA violations in axe; that does not establish that every interaction is optimal.

## Priority findings

| Priority | Finding and evidence                                                                                                                                                                                                                                          | Recommended result                                                                                                                                                                                                 |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1        | Active developments, Launching soon, View local projects and View Developer all open the same `/developer/<slug>` URL without scope or status parameters. The zero Launching soon row remains clickable and opens selling projects.                           | Keep counts/statuses informational unless a real filtered destination exists. Use a clear profile action; make a project action genuinely open the project section/results.                                        |
| 1        | A horizontal `DevelopmentCard` is placed in a three-column profile grid. At 1440px, the tested card is about 341px wide and its Contact Agent button extends about 101px beyond the card's clipped right boundary.                                            | Give the profile a grid-appropriate project card or a wider row layout. All labels, prices and actions must fit; do not enlarge the whole homepage card to compensate.                                             |
| 1        | The profile maps `profile.stats.isVerified` into `developer.isFeatured`, displaying FEATURED DEVELOPER for a verified record. This is separate from the development's own featured field.                                                                     | Preserve verification and featured placement as separate facts. Remove the derived featured claim; show only supported trust/placement labels.                                                                     |
| 1        | Browser-injected directory request failure displays No Developers Found. Failure of the profile's project request displays No Developments Listed.                                                                                                            | Distinct loading, error/retry, and successful empty states on the directory and public profile. A failed profile lookup must also be distinct from a confirmed missing profile.                                    |
| 2        | The selected province is lost when opening a profile or Explore All Developers. The directory supports name and brand-tier filters, but no location filter. The homepage's province comes from the sale inventory selector, not its own visible area control. | Show the developer section's current geographic scope and a nearby way to change it. Carry explicit location into local-project browsing; let visitors deliberately choose broader brand discovery.                |
| 2        | The qualifying project count appears in the top stat, Active developments row and View local projects row. Selling/launch status adds more boxes with similar visual weight.                                                                                  | One published-project count, quieter selling/launch information, and an obvious next action. Keep the existing icons and branding.                                                                                 |
| 2        | At mobile widths the profile action is 28px high; secondary rows are approximately 33px. The most specific local-project row is hidden on mobile.                                                                                                             | Comfortable mobile touch targets and the same useful primary action on desktop and mobile. These measurements are usability findings, not an asserted WCAG failure.                                                |
| 2        | The active-project count is `COUNT(*)` over eligible published projects; the eligibility guard does not exclude sold-out status. The empty homepage headline says no developers are building in the province.                                                 | Prefer Published projects in [province] and No developers with published projects here yet. Describe platform coverage without claiming that no developer exists or that every published project is still selling. |
| 3        | The profile renders a literal 0 appended to the project title when rating is zero. Contact Agent navigates to detail rather than directly opening an enquiry.                                                                                                 | Suppress an absent rating explicitly. Label the actual action View development; use a contact label only where it opens the appropriate contact journey.                                                           |
| 3        | Directory headline/copy says Recognised Developers and trusted developers without filtering the displayed list for that trust claim. Its buyer-enquiry metric is weak evidence for a purchaser choosing a project.                                            | Neutral developer discovery copy and useful project/location facts. Keep individually supported verification separate from blanket catalogue claims.                                                               |
| 3        | Directory fetches up to 50 records and the profile's public project call defaults to 20; these views have no pagination. Disabled carousel arrows remain visible when two cards already fit on desktop.                                                       | Add honest continuation for larger catalogues and avoid navigation controls that have nowhere to go.                                                                                                               |

## Recommended first implementation

1. Simplify the homepage card using the existing data: logo/name, office context where present, one provincial published-project count, quiet selling/launching information and one dependable profile link. Remove repeated pseudo-filter buttons. Maintain balanced heights and the existing icon/colour system.
2. Repair the public profile's project-card layout, zero-rating rendering, unsupported featured label and misleading action text. Keep the published project → unit/property journey intact.
3. Repair directory/profile request states without changing visibility, moderation, approval, access or publication rules.
4. Introduce a properly supported location-preserving project destination before offering local/status-specific actions. The current public publisher-project endpoint accepts only publisher ID and defaults to 20 results. Filtering that partial response in the browser cannot establish a complete local count. The lower service has province/city filtering; any new endpoint contract must follow the database-consumer authority and existing public eligibility guard.

Do not reuse the directory's generic `developmentCount` as a public published count: its service aggregation includes all project records. Do not invent project previews, prices, availability, nearby relevance or verification metadata. Project imagery needs an eligible real image payload; the current homepage publisher summary returns logo/office/local counts, not a project cover image.

## Validation and limitations

- Read-only browser review at 1440, 390 and 320px; guest profile and development-detail links worked without page exceptions.
- All four homepage labels were exercised and their identical destinations recorded.
- Directory and profile-project failure states were reproduced using browser-only request interception; no server or data mutation.
- Nine existing tests passed across TopDevelopers request states, public developer-route boundaries and DeveloperOverview.
- Owned local demo database authority status: ready, exact ownership, manifest head ready, schema congruent. No schema, query, service, seed or fixture change.
- Screenshots contain the existing fictional local demo. Missing logos and the tested project's broken/missing image asset limit judgement of real brand imagery; they do not account for the measured CTA clipping or derived featured label.
- This is a review. Application code is unchanged. The current tests do not cover the misleading action destinations, clipped layout or directory/profile failure presentation.
- No push, merge, deployment or production change.
