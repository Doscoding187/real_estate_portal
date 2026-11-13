/**
 * Search-engine text for public place pages (/:province, /:province/:place, ...).
 * Used by the live page (client/src/pages/CanonicalPlacePage.tsx) AND by the build-time HTML
 * (server/_core/prerenderPages.ts), so crawlers and visitors always get identical text.
 */
export function placePageTitle(label: string): string {
  return `${label} property search | Property Listify`;
}

export function placePageDescription(label: string, provinceName: string): string {
  const where =
    !provinceName || label.trim().toLowerCase() === provinceName.trim().toLowerCase()
      ? `${label}, South Africa`
      : `${label}, ${provinceName}`;
  return `Find homes for sale and to rent in ${where}: houses, apartments and new developments, with the agents who list them, on Property Listify.`;
}
