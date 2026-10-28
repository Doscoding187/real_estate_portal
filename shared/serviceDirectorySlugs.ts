/**
 * One slug authority shared by the client Services directory and the server sitemap so a URL
 * written by either side resolves to the same canonical route.
 */
export function slugifyLocationSegment(value: string) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[_\s]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/^-+|-+$/g, '');
}

export function toServiceCategorySlug(category: string) {
  return String(category).replace(/_/g, '-');
}

export function toProviderSlug(companyName: string, providerId: number) {
  const stem = companyName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
  return `${stem || 'provider'}--${providerId}`;
}
