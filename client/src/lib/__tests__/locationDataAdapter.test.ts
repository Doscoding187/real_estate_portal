import { describe, expect, it } from 'vitest';
import {
  cityToNavLink,
  popularCitiesToNavLinks,
  FALLBACK_CITY_LINKS,
  type NavLocationLink,
} from '@/lib/locationDataAdapter';

describe('cityToNavLink', () => {
  const popularJohannesburg = {
    id: 1,
    name: 'Johannesburg',
    slug: 'johannesburg',
    provinceName: 'Gauteng',
    provinceSlug: 'gauteng',
    listingCount: 1240,
  };

  it('maps a normal popular city object to a canonical sale path', () => {
    const result = cityToNavLink(popularJohannesburg);
    expect(result).not.toBeNull();
    expect(result!.label).toBe('Johannesburg');
    expect(result!.href).toBe('/property-for-sale/gauteng/johannesburg');
    expect(result!.provinceSlug).toBe('gauteng');
    expect(result!.citySlug).toBe('johannesburg');
    expect(result!.type).toBe('city');
    expect(result!.listingCount).toBe(1240);
  });

  it('supports rent transaction type prefix', () => {
    const result = cityToNavLink(popularJohannesburg, { transactionType: 'rent' });
    expect(result).not.toBeNull();
    expect(result!.href).toBe('/property-to-rent/gauteng/johannesburg');
  });

  it('supports alternate field names: cityName, citySlug, propertyCount', () => {
    const alternate = {
      id: 2,
      cityName: 'Cape Town',
      citySlug: 'cape-town',
      provinceSlug: 'western-cape',
      propertyCount: 980,
    };
    const result = cityToNavLink(alternate);
    expect(result).not.toBeNull();
    expect(result!.label).toBe('Cape Town');
    expect(result!.href).toBe('/property-for-sale/western-cape/cape-town');
    expect(result!.listingCount).toBe(980);
  });

  it('supports activeListings as an alternative count field name', () => {
    const alternate = {
      name: 'Durban',
      slug: 'durban',
      provinceSlug: 'kwazulu-natal',
      activeListings: 500,
    };
    const result = cityToNavLink(alternate);
    expect(result).not.toBeNull();
    expect(result!.listingCount).toBe(500);
  });

  it('does not produce query-param city links', () => {
    const result = cityToNavLink(popularJohannesburg);
    expect(result).not.toBeNull();
    expect(result!.href).not.toContain('?');
    expect(result!.href).not.toContain('city=');
    expect(result!.href).not.toContain('&');
  });

  it('returns null when provinceSlug is missing for a city object', () => {
    const noProvince = {
      name: 'Unknown Place',
      slug: 'unknown-place',
      listingCount: 10,
    };
    const result = cityToNavLink(noProvince);
    expect(result).toBeNull();
  });

  it('returns null for nullish input', () => {
    expect(cityToNavLink(null)).toBeNull();
    expect(cityToNavLink(undefined)).toBeNull();
  });

  it('returns null for non-object input', () => {
    expect(cityToNavLink('string')).toBeNull();
    expect(cityToNavLink(42)).toBeNull();
  });

  it('returns null for object without usable name or slug', () => {
    expect(cityToNavLink({})).toBeNull();
    expect(cityToNavLink({ name: '', slug: '' })).toBeNull();
  });

  it('returns null when only provinceSlug exists but no city name/slug', () => {
    expect(cityToNavLink({ provinceSlug: 'gauteng', listingCount: 100 })).toBeNull();
  });

  it('handles malformed input without throwing', () => {
    const malformed = {
      name: { not: 'a string' },
      slug: ['not', 'a', 'string'],
    };
    expect(() => cityToNavLink(malformed)).not.toThrow();
    expect(cityToNavLink(malformed)).toBeNull();
  });

  it('ignores listingCount when it is not a finite non-negative number', () => {
    const withBadCount = {
      name: 'Test',
      slug: 'test',
      provinceSlug: 'gauteng',
      listingCount: 'not-a-number',
    };
    const result = cityToNavLink(withBadCount);
    expect(result).not.toBeNull();
    expect(result!.listingCount).toBeUndefined();
  });

  it('sets listingCount to undefined for negative values', () => {
    const withNegative = {
      name: 'Test',
      slug: 'test',
      provinceSlug: 'gauteng',
      listingCount: -5,
    };
    const result = cityToNavLink(withNegative);
    expect(result).not.toBeNull();
    expect(result!.listingCount).toBeUndefined();
  });
});

describe('popularCitiesToNavLinks', () => {
  const cities = [
    {
      id: 1,
      name: 'Johannesburg',
      slug: 'johannesburg',
      provinceSlug: 'gauteng',
      listingCount: 1240,
    },
    {
      id: 2,
      name: 'Cape Town',
      slug: 'cape-town',
      provinceSlug: 'western-cape',
      listingCount: 980,
    },
    {
      id: 3,
      name: 'Durban',
      slug: 'durban',
      provinceSlug: 'kwazulu-natal',
      listingCount: 760,
    },
  ];

  it('maps an array of popular cities to NavLocationLink[]', () => {
    const result = popularCitiesToNavLinks(cities);
    expect(result).toHaveLength(3);
    expect(result[0].href).toBe('/property-for-sale/gauteng/johannesburg');
    expect(result[1].href).toBe('/property-for-sale/western-cape/cape-town');
    expect(result[2].href).toBe('/property-for-sale/kwazulu-natal/durban');
  });

  it('handles non-array input safely by returning an empty array', () => {
    expect(popularCitiesToNavLinks(null)).toEqual([]);
    expect(popularCitiesToNavLinks(undefined)).toEqual([]);
    expect(popularCitiesToNavLinks('not-array')).toEqual([]);
    expect(popularCitiesToNavLinks({})).toEqual([]);
    expect(popularCitiesToNavLinks(42)).toEqual([]);
  });

  it('dedupes entries with the same href', () => {
    const duplicates = [...cities, cities[0], cities[1]];
    const result = popularCitiesToNavLinks(duplicates);
    expect(result).toHaveLength(3);
  });

  it('applies a limit, defaulting to 9', () => {
    const manyCities = Array.from({ length: 20 }, (_, i) => ({
      name: `City ${i}`,
      slug: `city-${i}`,
      provinceSlug: 'gauteng',
      listingCount: 100,
    }));
    const defaultLimit = popularCitiesToNavLinks(manyCities);
    expect(defaultLimit).toHaveLength(9);

    const customLimit = popularCitiesToNavLinks(manyCities, { limit: 3 });
    expect(customLimit).toHaveLength(3);
  });

  it('removes null entries from cityToNavLink', () => {
    const withInvalid = [
      ...cities,
      null,
      undefined,
      { name: '', slug: '' },
      'string-instead-of-object',
    ];
    const result = popularCitiesToNavLinks(withInvalid);
    expect(result).toHaveLength(3);
  });

  it('preserves listingCount when present in input', () => {
    const result = popularCitiesToNavLinks(cities);
    expect(result[0].listingCount).toBe(1240);
    expect(result[1].listingCount).toBe(980);
    expect(result[2].listingCount).toBe(760);
  });
});

describe('FALLBACK_CITY_LINKS', () => {
  it('is an array with 9 entries', () => {
    expect(Array.isArray(FALLBACK_CITY_LINKS)).toBe(true);
    expect(FALLBACK_CITY_LINKS).toHaveLength(9);
  });

  it('contains Johannesburg, Cape Town, Durban, Pretoria, Sandton', () => {
    const labels = FALLBACK_CITY_LINKS.map(l => l.label);
    expect(labels).toContain('Johannesburg');
    expect(labels).toContain('Cape Town');
    expect(labels).toContain('Durban');
    expect(labels).toContain('Pretoria');
    expect(labels).toContain('Sandton');
  });

  it('every link has a canonical path without query params', () => {
    for (const link of FALLBACK_CITY_LINKS) {
      expect(link.href).not.toContain('?');
      expect(link.href).not.toContain('=');
      expect(link.href).not.toContain('&');
    }
  });

  it('every link is either city or suburb type', () => {
    for (const link of FALLBACK_CITY_LINKS) {
      expect(['city', 'suburb']).toContain(link.type);
    }
  });

  it('every link starts with /property-for-sale or /property-to-rent', () => {
    for (const link of FALLBACK_CITY_LINKS) {
      expect(
        link.href.startsWith('/property-for-sale') || link.href.startsWith('/property-to-rent'),
      ).toBe(true);
    }
  });

  it('every link has label, href, provinceSlug, and type defined', () => {
    for (const link of FALLBACK_CITY_LINKS) {
      expect(link.label).toBeTruthy();
      expect(link.href).toBeTruthy();
      expect(link.provinceSlug).toBeTruthy();
      expect(link.type).toBeTruthy();
    }
  });

  it('no two fallback links share the same href', () => {
    const hrefs = FALLBACK_CITY_LINKS.map(l => l.href);
    expect(new Set(hrefs).size).toBe(hrefs.length);
  });

  it('fallback links are static safety fallbacks with no ranking logic', () => {
    for (const link of FALLBACK_CITY_LINKS) {
      expect(link.listingCount).toBeUndefined();
      expect(link.href).toBeTruthy();
      expect(link.label).toBeTruthy();
    }
  });

  it('the rent Cape Town entry uses the rent prefix', () => {
    const rentCapeTown = FALLBACK_CITY_LINKS.find(
      l => l.label === 'Cape Town' && l.href.startsWith('/property-to-rent'),
    );
    expect(rentCapeTown).toBeDefined();
    expect(rentCapeTown!.href).toBe('/property-to-rent/western-cape/cape-town');
  });

  it('suburb fallback entries use full canonical province/city/suburb paths', () => {
    const sandton = FALLBACK_CITY_LINKS.find(l => l.label === 'Sandton');
    expect(sandton).toBeDefined();
    expect(sandton!.type).toBe('suburb');
    expect(sandton!.href).toBe('/property-for-sale/gauteng/johannesburg/sandton');
    expect(sandton!.provinceSlug).toBe('gauteng');
    expect(sandton!.citySlug).toBe('johannesburg');
    expect(sandton!.suburbSlug).toBe('sandton');
  });
});
