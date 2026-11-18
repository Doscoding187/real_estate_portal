/**
 * Static text of the suburb guide that needs no API data.
 * Used by the live page (client/src/pages/SuburbGuidePage.tsx and
 * client/src/components/location/SuburbLocationIntelligencePreview.tsx) AND by the build-time
 * HTML (server/_core/prerenderPages.ts), so crawlers and visitors read identical wording.
 * Keep everything here free of numbers, prices and counts.
 */
export const SUBURB_GUIDE_SEARCH_SALE_LABEL = 'Search homes for sale';
export const SUBURB_GUIDE_SEARCH_RENT_LABEL = 'Search rentals';

export function suburbGuideH1(name: string): string {
  return `Explore ${name}`;
}

export function suburbGuideIntro(name: string): string {
  return `Compare current property options, areas and local information around ${name}.`;
}

export function suburbGuideNeighbourhoodsHeading(name: string): string {
  return `Find your perfect ${name} neighbourhood`;
}

export const SUBURB_GUIDE_NEIGHBOURHOODS_INTRO =
  'Explore nearby areas, ranked by current published listings.';

export function suburbGuideExplorerHeading(name: string): string {
  return `Understand the area around ${name}`;
}

export const SUBURB_GUIDE_EXPLORER_INTRO =
  'Use the map for orientation. Nearby points and approximate area centres are not property boundaries.';

export function suburbGuidePeopleHeading(name: string): string {
  return `People and projects in ${name}`;
}

export const SUBURB_GUIDE_PEOPLE_INTRO =
  'Published developers, agencies and public agents connected to this exact area.';

export function suburbGuideFaqHeading(name: string): string {
  return `Common questions about ${name}`;
}

/** The one FAQ item whose question and answer never depend on live data. */
export function suburbGuideCoverageFaq(name: string): { question: string; answer: string } {
  return {
    question: `Does Property Listify list every property in ${name}?`,
    answer: `No. Counts and medians cover only eligible listings published on Property Listify at the snapshot time shown on this page. They are not a census of all homes in ${name} and do not measure buyer demand. Medians use published asking prices, never completed sale prices.`,
  };
}
