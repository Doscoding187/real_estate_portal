import { PROPERTY_IMAGE_FALLBACK, resolveMediaUrl } from './mediaUtils';

/** Generic artwork, usable in any area without claiming a particular location. */
export const AREA_IMAGE_FALLBACK =
  '/placeholders/urban-illustration-with-large-buildings-with-cars-and-trees-city-activities-vector.jpg';

interface PublicPortfolioPhotos {
  primary?: string | null;
  images: Array<{ url: string; isPrimary?: number; displayOrder?: number }>;
}

const placeholders = new Set([
  PROPERTY_IMAGE_FALLBACK,
  AREA_IMAGE_FALLBACK,
  '/placeholder.jpg',
  '/assets/placeholder-home.jpg',
]);
const identity = (url: string) => {
  let parsed: URL;
  try {
    parsed = new URL(url, 'https://presence.invalid');
  } catch {
    return url;
  }
  parsed.hash = '';
  // Ignore signing changes, but preserve media-proxy keys that identify the
  // actual photo. Different ?key= or ?path= values are different images.
  for (const key of [...parsed.searchParams.keys()]) {
    if (/^(x-amz-|x-goog-|signature$|expires$|policy$|key-pair-id$|token$)/i.test(key)) {
      parsed.searchParams.delete(key);
    }
  }
  parsed.searchParams.sort();
  return parsed.href;
};

/** Consume the public DTO only; PDFs, floorplans and videos aren't photos. */
export function selectPresenceImages(portfolio: PublicPortfolioPhotos[]) {
  const usable = (url: string) => !!url && !placeholders.has(url.split(/[?#]/)[0]);
  const primaries = portfolio
    .map(
      item =>
        resolveMediaUrl(item.images.find(photo => photo.isPrimary === 1)?.url) ||
        item.primary ||
        '',
    )
    .filter(usable);
  const gallery = portfolio.flatMap(item =>
    [...item.images]
      .sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0))
      .map(photo => resolveMediaUrl(photo.url) || '')
      .filter(usable),
  );
  const hero = primaries[0] || gallery[0] || PROPERTY_IMAGE_FALLBACK;
  const contact = [...primaries, ...gallery].find(url => identity(url) !== identity(hero));
  return { hero, contact: contact || AREA_IMAGE_FALLBACK, hasListingPhoto: usable(hero) };
}
