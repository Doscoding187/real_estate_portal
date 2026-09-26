/**
 * Location page presentation helpers.
 *
 * These two functions are pure string builders with no database access, so they
 * are separated from the geography-mutating service they used to live in.
 *
 * Place Authority D3 note: a slug is a presentation artifact, not an identity.
 * Nothing here reads, writes, or infers a Place, and a slug must never be used
 * to look up or create geography.
 */

export interface LocationSeoInput {
  name: string;
  type: 'province' | 'city' | 'suburb' | 'neighborhood';
  heroImage?: string;
}

export interface LocationSeoContent {
  title: string;
  description: string;
  heroImage?: string;
}

/**
 * Generate an SEO-friendly slug from a location name.
 *
 * Kebab-case: lowercase, spaces and underscores become hyphens, other special
 * characters are dropped, repeated hyphens collapse, and leading/trailing
 * hyphens are removed.
 */
export function generateSlug(name: string): string {
  return (
    name
      .toLowerCase()
      .trim()
      .replace(/[\s_]+/g, '-')
      .replace(/[^a-z0-9-]/g, '')
      .replace(/-+/g, '-')
      .replace(/^-+|-+$/g, '')
  );
}

/**
 * Generate static SEO title and description content for a location page.
 */
export function generateSEOContent(
  location: LocationSeoInput,
  hierarchy?: { province?: string; city?: string },
): LocationSeoContent {
  const { name, type } = location;

  let title: string;
  let description: string;

  switch (type) {
    case 'province':
      title = `Properties for Sale & Rent in ${name} | Property Listify`;
      description = `Discover properties for sale and rent in ${name}. Browse houses, apartments, and new developments across ${name}'s cities and suburbs. Find your dream property today.`;
      break;

    case 'city': {
      const provinceName = hierarchy?.province || name;
      title = `${name} Properties for Sale & Rent | ${provinceName}`;
      description = `Explore properties in ${name}, ${provinceName}. Find houses, apartments, and new developments in ${name}'s best suburbs. View listings, prices, and market insights.`;
      break;
    }

    case 'suburb':
    case 'neighborhood': {
      const cityName = hierarchy?.city || 'the area';
      const provinceContext = hierarchy?.province ? `, ${hierarchy.province}` : '';
      title = `${name} Properties for Sale & Rent | ${cityName}${provinceContext}`;
      description = `Find properties in ${name}, ${cityName}. Browse houses, apartments, and new developments in ${name}. View current listings, average prices, and neighborhood insights.`;
      break;
    }

    default:
      title = `${name} Properties | Property Listify`;
      description = `Discover properties in ${name}. Browse listings, view prices, and explore the area.`;
  }

  return {
    title,
    description,
    heroImage: location.heroImage,
  };
}
