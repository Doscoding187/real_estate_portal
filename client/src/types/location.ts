export interface LocationNode {
  /** Exact admitted Place identity used by every public geography consumer. */
  canonicalPlaceId: string;
  /** Admitted Place type used to describe the selected Place. */
  factualType?: string;
  slug: string; // URL-safe slug
  name: string; // Display name
  type: 'province' | 'city' | 'suburb';
  provinceSlug?: string;
  citySlug?: string; // Helpful for context
  parentSlug?: string;
  /** Canonical parent identity supplied by the location authority when available. */
  parentCanonicalPlaceId?: string;
  canonicalPath?: string;
  selectionTypeLabel?: string;
  selectionContextLabel?: string;
}
