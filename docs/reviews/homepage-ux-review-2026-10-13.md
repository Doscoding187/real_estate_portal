# Homepage UX/UI review — 13 October 2026

The homepage should make it easy to choose a property journey, select a location and browse available properties. This pass improves those entry points and their accessibility while preserving the existing search contracts.

## Findings and changes

| Finding                                                                  | Change                                                                                                                                                                       |
| ------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Generic platform messaging and unclear first action                      | Use “Find your next place in South Africa”, label the journey choices, and give the search panel a location-first heading or a heading specific to the selected journey.     |
| Mobile journey choices disappear beyond a horizontal strip               | Display every available choice in a two-column mobile grid; retain wrapping choices on larger screens.                                                                       |
| Disabled Search provides little explanation                              | Explain that the user must select a location suggestion, and associate the guidance with the input and Search button.                                                        |
| Unavailable tools compete with the main task                             | Place planned tools in a closed, keyboard-accessible “Upcoming property tools” disclosure.                                                                                   |
| Mobile Buy filters require several full-width rows                       | Use two columns with connected control labels; keep the price popup within the viewport on phones and tablets.                                                               |
| Rent and Shared Living budgets use purchase-price amounts                | Offer monthly amounts from R3,000 to R50,000. Preserve the existing maximum-price URL adapters.                                                                              |
| Browsing depends on hover or swipe discovery                             | Show named previous/next controls for property and category carousels, with unavailable category directions disabled. Add a direct full-search link above the property rail. |
| Listing titles are cut to one line and mixed cards have different widths | Allow two title lines for listings and development units; let homepage development cards fill their carousel cells.                                                          |
| Collapsed category links remain available to keyboard users              | Hide collapsed accordion content and expose expanded/selected states.                                                                                                        |
| Weak text contrast and missing focus indicators                          | Strengthen the affected badge, city/province and step-number text; add visible listing-link focus indicators and enlarge saved-property controls.                            |
| Consumer copy exposes geography implementation terms                     | Describe the Shared Living and Land entry points in consumer language.                                                                                                       |

## Contract boundaries

The homepage hero still starts neutrally. Typing display text does not enable Search; users must select an accepted location. Existing canonical-location selection, sibling OR selection, Search Area handling, journey URL adapters and Land launch/classification controls are unchanged. No database or server code changed. The global professional navigation and commercial activation rules are unchanged.

“View all” links intentionally open the full journey search, without inferring a geography from the homepage's display province selector.

## Validation

- 37 focused client tests pass, including a regression proving that a R10,000 monthly Rent selection reaches the rental URL with its canonical location.
- TypeScript check passes.
- Frontend production build passes; Vite retains its existing large-chunk warning.
- ESLint reports no errors; existing warnings concern an unused development-card argument and test mock `any` types.
- Prettier and `git diff --check` pass.
- Chromium checks at 320, 390, 768, 1024 and 1440 pixels confirm all six currently enabled journey choices are visible, the page has no horizontal overflow, and the Buy price popup stays inside the viewport.
- Axe reports zero violations in the neutral and Buy homepage states at each checked width. This is automated coverage of those states, not a complete accessibility certification.
- Live browser checks confirm the property carousel advances, category controls work, collapsed desktop links are inaccessible, and keyboard location selection submits a rental search with the selected monthly budget and a canonical location ID.

## Local review and integration

Branch: `feat/homepage-ux-review-20261013`, based on integration commit `d12dcfb73`.

Task worktree: `/home/edwardspc/Desktop/Dev/worktrees/property-listify-homepage-ux-review-20261013`.

The separate review frontend runs at `http://localhost:3010/`. A temporary loopback proxy on port 3000 allows only reads from the other thread's sample backend on port 5000. The other thread's frontend on port 3009 and its backend were not changed or restarted. Use that existing demo for account writes; the review preview supports browsing and search.

Browser verification results and before/after captures are in `/tmp/listify-home-ux/`; these are local evidence, not repository assets. The preview depends on the existing local demo backend remaining available.
