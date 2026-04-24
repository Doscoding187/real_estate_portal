export const NATIONAL_CAMPAIGN_SLUG = 'south-africa';

function normalizeSlugPart(value: string): string {
  return value.trim().replace(/^\/+|\/+$/g, '');
}

export function buildCampaignSlugHierarchy(
  locationSlug: string,
  additionalSlugs: string[] = [],
): string[] {
  const normalizedLocationSlug = normalizeSlugPart(locationSlug);
  const segments = normalizedLocationSlug
    .split('/')
    .map(normalizeSlugPart)
    .filter(Boolean);

  const hierarchy: string[] = [];

  for (let i = segments.length; i >= 1; i -= 1) {
    hierarchy.push(segments.slice(0, i).join('/'));
  }

  for (const slug of additionalSlugs) {
    const normalized = normalizeSlugPart(slug);
    if (normalized) {
      hierarchy.push(normalized);
    }
  }

  hierarchy.push(NATIONAL_CAMPAIGN_SLUG);

  return Array.from(new Set(hierarchy));
}
