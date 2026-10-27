export interface LocationNode {
  /** Canonical public-search identity; Google Place IDs must not be submitted as this value. */
  id: string;
  canonicalLocationId?: string;
  /** Admitted Place type used to describe the selected Place. */
  factualType?: string;
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
  selectionKind?: 'canonical_location';
  selectionTypeLabel?: string;
  selectionContextLabel?: string;
}
