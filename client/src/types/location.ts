export interface LocationNode {
  /** Canonical public-search identity; Google Place IDs must not be submitted as this value. */
  id: string;
  canonicalLocationId?: string;
  /** Durable factual identity retained when the runtime row is only a handle. */
  factualLocationId?: string;
  /**
   * The runtime query handle for a place the published projection still carries.
   *
   * The public search execution resolves a city scope through the published projection, so a
   * published place keeps that handle for the scope it is selected into. It is absent for every
   * place the projection does not carry.
   */
  runtimeLocationId?: string;
  /** Factual type guides UI clarification; it does not change the runtime identity. */
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
  searchAreaId?: string;
  selectionKind?: 'canonical_location' | 'search_area';
  selectionTypeLabel?: string;
  selectionContextLabel?: string;
}
