/**
 * One authority for the public sitemap index children. The API serves the live index and the
 * static fallback document must list the same children, otherwise a crawler receives a
 * different discovery surface depending on which host answers the request.
 */
export const SITEMAP_INDEX_CHILDREN = [
  '/sitemap-listings.xml',
  '/sitemap-developments.xml',
  '/sitemap-agents.xml',
  '/sitemap-static.xml',
  '/sitemap-places.xml',
] as const;

export type SitemapIndexChild = (typeof SITEMAP_INDEX_CHILDREN)[number];
