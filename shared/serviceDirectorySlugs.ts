/** Shared slug authority for canonical Services categories and provider profiles. */
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
