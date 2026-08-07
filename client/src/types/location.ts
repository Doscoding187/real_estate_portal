export interface LocationNode {
  /** Canonical public-search identity; Google Place IDs must not be submitted as this value. */
  id: string;
  canonicalLocationId?: string;
  slug: string; // URL-safe slug
  name: string; // Display name
  type: 'province' | 'city' | 'suburb' | 'area';
  provinceSlug?: string;
  citySlug?: string; // Helpful for context
  parentSlug?: string;
  /** Canonical parent identity supplied by the location authority when available. */
  parentCanonicalLocationId?: string;
  canonicalPath?: string;
}
