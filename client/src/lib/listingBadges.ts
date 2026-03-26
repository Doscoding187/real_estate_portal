const DEVELOPMENT_STAGE_BADGES = new Set([
  'Off-plan',
  'Under Construction',
  'Ready to Move In',
  'Recently Completed',
]);

function normalizeBadge(badge: string): string {
  return String(badge || '').trim();
}

export function getDisplayListingBadges(
  badges: string[] | undefined,
  options: { maxBadges?: number } = {},
): string[] {
  const maxBadges = options.maxBadges ?? 2;
  if (!Array.isArray(badges) || badges.length === 0 || maxBadges <= 0) return [];

  const cleaned = Array.from(
    new Set(
      badges
        .map(normalizeBadge)
        .filter(Boolean)
        .filter(badge => !badge.toLowerCase().startsWith('part of ')),
    ),
  );

  const stageBadges = cleaned.filter(badge => DEVELOPMENT_STAGE_BADGES.has(badge));
  const otherBadges = cleaned.filter(badge => !DEVELOPMENT_STAGE_BADGES.has(badge));

  return [...stageBadges, ...otherBadges].slice(0, maxBadges);
}

export function getPrimaryListingBadge(badges: string[] | undefined): string | undefined {
  return getDisplayListingBadges(badges, { maxBadges: 1 })[0];
}
