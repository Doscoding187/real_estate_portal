export interface LocationNode {
  id: string; // Google Place ID or internal ID
  slug: string; // URL-safe slug
  name: string; // Display name
  type: 'province' | 'city' | 'suburb' | 'area';
  provinceSlug?: string;
  citySlug?: string; // Helpful for context
  parentSlug?: string;
}
