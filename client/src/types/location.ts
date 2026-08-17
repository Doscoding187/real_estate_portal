export interface LocationNode {
  /** Canonical public-search identity; Google Place IDs must not be submitted as this value. */
  id: string;
  canonicalLocationId?: string;
  /** Durable factual identity retained when the runtime row is only a handle. */
  factualLocationId?: string;
  slug: string; // URL-safe slug
  name: string; // Display name
  type: 'province' | 'city' | 'suburb' | 'area';
  provinceSlug?: string;
  citySlug?: string; // Helpful for context
  parentSlug?: string;
  /** Canonical parent identity supplied by the location authority when available. */
  parentCanonicalLocationId?: string;
  canonicalPath?: string;
  /** Present only for a typed Search Area selection; never used as factual geography. */
  searchAreaId?: string;
  selectionKind?: 'canonical_location' | 'search_area';
  selectionTypeLabel?: string;
  selectionContextLabel?: string;
}
