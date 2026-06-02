import { resolveMediaUrl } from './mediaUtils';

type UnitMediaItem =
  | string
  | { url?: string; href?: string; src?: string; key?: string; isPrimary?: boolean };

export function getDevelopmentUnitRouteKey(unit: any): string {
  const directId = unit?.id ?? unit?.unitTypeId ?? unit?.unitId;
  if (directId !== null && directId !== undefined && `${directId}`.trim() !== '') {
    return `${directId}`.trim();
  }

  return (
    String(unit?.name || unit?.type || unit?.structuralType || 'unit')
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'unit'
  );
}

function normalizeRouteValue(value: unknown): string {
  if (value === null || value === undefined) return '';
  const raw = String(value).trim();
  if (!raw) return '';

  try {
    return decodeURIComponent(raw).trim();
  } catch {
    return raw;
  }
}

function getStableUnitIds(unit: any): string[] {
  return [unit?.id, unit?.unitTypeId, unit?.unitId]
    .map(normalizeRouteValue)
    .filter((value, index, values) => value && values.indexOf(value) === index);
}

export function findDevelopmentUnitByRouteKey(unitTypes: any[] = [], routeKey: unknown) {
  const normalizedRouteKey = normalizeRouteValue(routeKey);
  if (!normalizedRouteKey || !Array.isArray(unitTypes)) return null;

  const stableIdMatch = unitTypes.find(unit =>
    getStableUnitIds(unit).some(id => id === normalizedRouteKey),
  );
  if (stableIdMatch) return stableIdMatch;

  return (
    unitTypes.find(unit => normalizeRouteValue(getDevelopmentUnitRouteKey(unit)) === normalizedRouteKey) ||
    null
  );
}

export function resolveDevelopmentUnitDocumentUrl(item: unknown): string | null {
  if (typeof item === 'string') {
    const trimmed = item.trim();
    return trimmed ? resolveMediaUrl(trimmed) : null;
  }

  if (!item || typeof item !== 'object') return null;

  const doc = item as UnitMediaItem;
  const candidate =
    typeof doc === 'object' ? (doc.url ?? doc.href ?? doc.src ?? doc.key ?? null) : null;

  return typeof candidate === 'string' && candidate.trim() ? resolveMediaUrl(candidate) : null;
}

function toMediaArray(value: unknown): UnitMediaItem[] {
  if (!value) return [];
  if (Array.isArray(value)) return value.filter(Boolean) as UnitMediaItem[];
  if (typeof value !== 'string') return [];

  const trimmed = value.trim();
  if (!trimmed) return [];

  try {
    const parsed = JSON.parse(trimmed);
    return Array.isArray(parsed) ? (parsed.filter(Boolean) as UnitMediaItem[]) : [trimmed];
  } catch {
    return [trimmed];
  }
}

function resolvedString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? resolveMediaUrl(value) : null;
}

export function getDevelopmentUnitMedia(
  unit: any,
  options: { fallbackImageUrl?: string | null } = {},
) {
  const baseMedia = unit?.baseMedia && typeof unit.baseMedia === 'object' ? unit.baseMedia : {};
  const gallery = toMediaArray((baseMedia as any).gallery ?? unit?.gallery);
  const floorPlans = toMediaArray((baseMedia as any).floorPlans ?? unit?.floorPlans);
  const renders = toMediaArray((baseMedia as any).renders ?? unit?.renders);

  const galleryUrls = gallery
    .map(resolveDevelopmentUnitDocumentUrl)
    .filter((url): url is string => Boolean(url && url.trim()));
  const renderUrls = renders
    .map(resolveDevelopmentUnitDocumentUrl)
    .filter((url): url is string => Boolean(url && url.trim()));
  const primaryGalleryUrl =
    resolveDevelopmentUnitDocumentUrl(
      gallery.find(item => typeof item === 'object' && item !== null && item.isPrimary),
    ) ||
    galleryUrls[0] ||
    null;
  const normalizedImageUrl = resolvedString(unit?.normalizedImage);
  const directImageUrl =
    resolvedString(unit?.primaryImageUrl) ||
    resolvedString(unit?.image) ||
    resolvedString(unit?.coverImage) ||
    null;
  const floorPlanUrl =
    floorPlans.map(resolveDevelopmentUnitDocumentUrl).find((url): url is string => Boolean(url)) ||
    null;
  const fallbackImageUrl = resolvedString(options.fallbackImageUrl);
  const primaryImageUrl =
    primaryGalleryUrl ||
    normalizedImageUrl ||
    directImageUrl ||
    fallbackImageUrl ||
    '/assets/placeholder-home.jpg';

  return {
    routeKey: getDevelopmentUnitRouteKey(unit),
    gallery,
    floorPlans,
    renders,
    floorPlanUrl,
    primaryImageUrl,
    galleryUrls: Array.from(
      new Set(
        [
          primaryImageUrl,
          normalizedImageUrl,
          primaryGalleryUrl,
          ...galleryUrls,
          ...renderUrls,
        ].filter(Boolean) as string[],
      ),
    ),
  };
}
