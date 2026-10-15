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
const identity = (url: string) => url.split(/[?#]/)[0];

/** Consume the public DTO only; PDFs, floorplans and videos aren't photos. */
export function selectPresenceImages(portfolio: PublicPortfolioPhotos[]) {
  const usable = (url: string) => !!url && !placeholders.has(identity(url));
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
