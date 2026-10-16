# Homepage area-first search: local review

Date: 14 October 2026<br>
Branch: `feat/homepage-ux-review-20261013`<br>
Worktree: `/home/edwardspc/Desktop/Dev/worktrees/property-listify-homepage-ux-review-20261013`<br>
Before: `590271b09`<br>
Preview: http://localhost:3010<br>
Artifacts: `/home/edwardspc/Desktop/Dev/review-artifacts/home-area-first-20261014/index.html`

Follow-up: `home-metro-scope-audit-2026-10-14.md` supersedes this first version’s direct-town exemption and records national coverage gaps. This document preserves the initial implementation evidence.

## Product decision

The founder rejected an immediate, mixed city feed as the default transactional experience. Homepage Buy/Rent searches now clarify broad geography before navigating. Visitors can select an eligible market area or specific factual place, deliberately browse the full selected city/province, or open the existing area exploration page. Location-only searches keep their existing exploration path.

This is a homepage slice, not a global geography policy change. It does not assume Johannesburg means northern suburbs, that every city is a metro, or that a selected city represents an entire municipal boundary. The approved runtime authority defines each scope.

## Behaviour

| Entry                                                       | Local result                                                                                                                                           |
| ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Buy/Rent hero with one broad city/province                  | Opens “Which part of …?”; navigation waits for an explicit scope choice.                                                                               |
| Category with no selected area                              | Opens a location picker; no implicit Cape Town selection.                                                                                              |
| Category after clicking a city tab                          | Resolves the city hint through the existing governed lookup, then asks for an area. Display text alone cannot authorize a city-wide query.             |
| Governed market areas available for the initial city lookup | Displays those first, with a search field for specific places. Does not add alphabetical suburbs to the initial region choices.                        |
| Specific suburb or factual town/locality                    | Opens results directly using its real runtime identity. Factual towns may have city handles; these are preserved rather than rewritten as suburb IDs.  |
| Browse all                                                  | Uses the selected canonical scope; an edited and confirmed broad scope shows “All areas” and does not prompt again while the homepage remains mounted. |
| Change area                                                 | Updates the hero and category section together. Selected geography and supported filters survive desktop/mobile layout changes.                        |
| Search Area selection                                       | Submits its governed ID as the geographic authority, without adding factual location IDs or display city text.                                         |
| Failed lookup                                               | Shows an error and retry action, distinct from an empty lookup.                                                                                        |
| Changed query while lookup is pending                       | Hides stale choices until the new lookup completes.                                                                                                    |
| Unavailable place                                           | Keeps the query and reports no selectable match; does not substitute another area.                                                                     |

The original homepage title, journey pills, image cards, navigation and approved guest-save prompt remain. Rental budget choices now use monthly amounts from R5k to R50k rather than sale-price amounts. Accessible filter labels and the price-menu focus/pointer handling were corrected so choosing a portalled price option does not close its parent panel.

## Changed files

- `client/src/pages/Home.tsx`: shared homepage provider above desktop/mobile views.
- `client/src/contexts/HomeSearchContext.tsx`: current homepage selection, filters and explicit broad-scope confirmation.
- `client/src/components/EnhancedHero.tsx`: transactional clarification, shared state, factual-type retention, accessible filter labels, monthly rental choices and price-menu interaction fix.
- `client/src/components/DiscoverProperties.tsx`: neutral initial area, shared category intent, area row and typed category handoff.
- `client/src/components/HomeAreaPicker.tsx`: governed lookup, region-first display, explicit broad/exploration choices, keyboard interaction, focus restoration and distinct loading/error/empty states.
- `client/src/lib/homeAreaSelection.ts`: identity validation and factual-type-aware clarification.
- `client/src/lib/publicDiscoveryRoutes.ts`: homepage handoff through existing journey URL builders.
- `client/src/types/location.ts`: optional factual type for presentation decisions; runtime identity unchanged.
- `client/src/components/__tests__/HomeAreaJourney.test.tsx` and `client/src/lib/__tests__/homeAreaSelection.test.ts`: journey, identity and interaction regressions.
- `docs/reviews/location-search-product-recommendation-2026-10-14.md`: research recommendation aligned with the subsequent founder decision.
- This review record.

## Validation

- 107 tests passed across nine relevant client suites, including existing hero, homepage, search-intent, discovery and URL handoff coverage.
- `pnpm check` passed.
- ESLint passed for all ten changed client files.
- `pnpm build` passed. Existing large-chunk warnings remain.
- Real browser checks passed at 1440, 390 and 320 pixel widths: category and hero clarification, market-area handoff, specific-place selection, explicit city-wide Rent, category retention, R2m Buy/R10k Rent preservation, dismissal/focus restoration, viewport bounds and no page exceptions.
- Picker accessibility checks found no WCAG A/AA violations in the tested light-theme states. A manually applied dark-token smoke check also passed; this does not claim a new public theme switch.
- An edited Johannesburg North selection survived desktop-to-mobile resizing and remained selected in both the hero and category section.
- The existing results page displayed “Houses for sale in Johannesburg North” and its governed scope explanation after the handoff. Its six listings were existing fictional local demo records; no inventory, membership, ranking or service change was made.
- Database authority status was checked for the existing owned local demo: ready manifest head, congruent schema, exact ownership and no incomplete attempt. No migration, seed, schema or backend query change was made.

## Limits and next slice

- Suggestions use the existing discovery service, capped at eight candidates. This is not an exhaustive market-area directory or a new taxonomy. No new large-metro flag is introduced; unknown city-level scope still asks for clarification, while known specific factual types open directly.
- The local data exposes Johannesburg North/South market areas and Rosebank as a factual town with a city runtime handle. It has no selectable Camps Bay record. Other city/market coverage must come from the governed catalogue workstream; this UI does not fabricate it.
- Homepage state lasts while the page remains mounted. Submitted intent is in the results URL; persistent recent searches and restoration after leaving/reloading the homepage are not added.
- Existing neutral guide destinations do not receive transactional budgets. Filter-preserving exploration return remains a separate journey improvement.
- Existing compatible multi-location hero behaviour remains. A new multi-area picker, grouped metro results, nearby expansion, map drawing, personalized ranking, analytics events and price/median claims are not added.
- Results-page refinement and all other entry points retain their existing behaviour. This change prevents an automatic broad feed from these homepage Buy/Rent paths; it does not claim a site-wide replacement of search UX.
- No push, merge or deployment. The existing dashboard demo and seeded data are preserved.
