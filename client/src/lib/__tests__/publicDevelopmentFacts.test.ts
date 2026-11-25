import { describe, expect, it } from 'vitest';
import { buildPublishedFacts } from '../publicDevelopmentFacts';
import { publicParkingLabel, sortHouseTypes, uniqueHouseTypeLabels } from '../houseTypes';
import { buildDevelopmentGalleryImages } from '../media-logic';
import { normalizePropertyForUI } from '../normalizers';

describe('published facts', () => {
  it('omits every cost line that was not given (never R0)', () => {
    const facts = buildPublishedFacts({
      estateSpecs: { hasHOA: true, governanceType: 'hoa', levyRange: { min: null, max: null }, rightsAndTaxes: { min: 0, max: 0 } },
      highlights: [],
    });
    expect(facts.costs).toEqual([]);
  });

  it('gives rates, levy type and amount, or "No levy" when there is no levy body', () => {
    expect(
      buildPublishedFacts({ estateSpecs: { hasHOA: true, governanceType: 'hoa', levyRange: { min: 1500, max: 1500 }, rightsAndTaxes: { min: 2000, max: 2000 } } }).costs,
    ).toEqual([
      { label: 'Rates & taxes', value: 'R2,000 a month (estimate)' },
      { label: 'HOA levy', value: 'R1,500 a month (estimate)' },
    ]);
    // Only an explicit "No levy" choice is published as such.
    expect(buildPublishedFacts({ estateSpecs: { hasHOA: false, levyChoice: 'none' } }).costs).toEqual([
      { label: 'Levy', value: 'No levy' },
    ]);
    // Unanswered, or an older record whose hasHOA defaulted to false: nothing about the levy.
    expect(buildPublishedFacts({ estateSpecs: { hasHOA: false } }).costs).toEqual([]);
    expect(buildPublishedFacts({ estateSpecs: {} }).costs).toEqual([]);
    expect(buildPublishedFacts({ estateSpecs: {} }).amounts.noLevy).toBe(false);
  });

  it('reads the estate type, phase and handover dates, and de-duplicates highlights', () => {
    const facts = buildPublishedFacts({
      estateSpecs: JSON.stringify({ setting: 'estate', estateType: 'golf', phaseLabel: ' Phase 2 ', handoverInPhases: true, firstHandoverDate: '2027-03-01' }),
      highlights: ['Pool', 'pool', ' Gym ', ''],
      status: 'selling',
      completionDate: '2029-12-01',
    });
    expect(facts.estateLabel).toBe('Security estate · Golf estate');
    expect(facts.phaseLabel).toBe('Phase 2');
    expect(facts.timelineLine).toBe('First homes handed over from Mar 2027 · final completion Dec 2029');
    expect(facts.highlights).toEqual(['Pool', 'Gym']);
    expect(buildPublishedFacts({}).estateLabel).toBeNull();
  });
});

describe('house type order and labels', () => {
  const baltimore = [
    { id: '1', name: '155', unitSize: 155, bedrooms: 4, bathrooms: 3.5, priceFrom: 2445000 },
    { id: '2', name: '130b', unitSize: 130, bedrooms: 4, bathrooms: 3.5, priceFrom: 2195000 },
    { id: '3', name: '71', unitSize: 71, bedrooms: 3, bathrooms: 2, priceFrom: 1745000 },
    { id: '4', name: '130a', unitSize: 130, bedrooms: 4, bathrooms: 2.5, priceFrom: 2195000 },
    { id: '5', name: '91', unitSize: 91, bedrooms: 4, bathrooms: 2, priceFrom: 1930000 },
    { id: '6', name: '81', unitSize: 81, bedrooms: 3, bathrooms: 2, priceFrom: 1830000 },
    { id: '7', name: '111', unitSize: 111, bedrooms: 3, bathrooms: 2.5, priceFrom: 2070000 },
  ];

  it('orders by price from, then size', () => {
    expect(sortHouseTypes(baltimore).map(u => u.id)).toEqual(['3', '6', '5', '7', '4', '2', '1']);
    // Same price: the smaller home first, whatever the input order.
    const samePrice = [
      { id: 'big', unitSize: 120, priceFrom: 2000000 },
      { id: 'small', unitSize: 100, priceFrom: 2000000 },
    ];
    expect(sortHouseTypes(samePrice).map(u => u.id)).toEqual(['small', 'big']);
    expect(sortHouseTypes([...samePrice].reverse()).map(u => u.id)).toEqual(['small', 'big']);
    expect(sortHouseTypes(null)).toEqual([]);
  });

  it('gives every house type a different short label', () => {
    const labels = uniqueHouseTypeLabels(baltimore);
    const values = [...labels.values()];
    expect(new Set(values).size).toBe(7);
    expect(labels.get('3')).toBe('71 m²');
    expect(labels.get('4')).toBe('130 m² · 2.5 bath');
    expect(labels.get('2')).toBe('130 m² · 3.5 bath');
  });

  it('falls back to the name, then a number, when nothing else tells types apart', () => {
    const twins = [
      { id: 'a', name: 'The Ebony', unitSize: 90, bedrooms: 3, bathrooms: 2 },
      { id: 'b', name: 'The Ivory', unitSize: 90, bedrooms: 3, bathrooms: 2 },
    ];
    expect([...uniqueHouseTypeLabels(twins).values()]).toEqual(['The Ebony', 'The Ivory']);
    const same = [
      { id: 'a', name: 'X', unitSize: 90, bedrooms: 3, bathrooms: 2 },
      { id: 'b', name: 'X', unitSize: 90, bedrooms: 3, bathrooms: 2 },
    ];
    const values = [...uniqueHouseTypeLabels(same).values()];
    expect(new Set(values).size).toBe(2);
  });

  it('writes parking as "Carport · 2 bays"', () => {
    expect(publicParkingLabel('carport', 2)).toBe('Carport · 2 bays');
    expect(publicParkingLabel('garage', 1)).toBe('Garage · 1 bay');
    expect(publicParkingLabel('none', 0)).toBeNull();
    expect(publicParkingLabel('street', 2)).toBeNull();
  });
});

describe('gallery and card highlights', () => {
  it('includes every development photo once, cover first, whatever its slot category', () => {
    const images = [
      { url: 'c', category: 'featured' },
      { url: 'e', category: 'outdoors' },
      { url: 'a1', category: 'amenities' },
      { url: 'a2', category: 'amenities' },
      { url: 'a3', category: 'amenities' },
      { url: 'a4', category: 'amenities' },
      { url: 's', category: 'general' },
      { url: 'n', category: 'photo' },
      { url: 'a1', category: 'amenities' },
    ] as any[];
    const gallery = buildDevelopmentGalleryImages({ featuredImage: images[0], images, videos: [] } as any);
    expect(gallery).toHaveLength(8);
    expect(gallery[0].url).toBe('c');
    expect(new Set(gallery.map(g => g.url)).size).toBe(8);
  });

  it('does not invent highlights from amenities or features when none are stored', () => {
    const base = { id: 1, title: 'X', price: 1000000, city: 'Johannesburg', images: [] };
    const card: any = normalizePropertyForUI({
      ...base,
      amenities: ['Swimming pool', 'Gym'],
      features: ['Fibre'],
      propertyDetails: { amenitiesFeatures: ['Also invented'] },
    });
    expect(card?.highlights).toBeUndefined();
  });

  it('shows stored highlights, from the highlights field or a property\'s own highlight list', () => {
    const base = { id: 2, title: 'Y', price: 1000000, city: 'Johannesburg', images: [] };
    const stored: any = normalizePropertyForUI({ ...base, highlights: ['Near schools', ' Pet friendly '] });
    expect(stored?.highlights).toEqual(['Near schools', 'Pet friendly']);
    const property: any = normalizePropertyForUI({ ...base, id: 3, propertyDetails: { propertyHighlights: ['Solar backup', 'Borehole water'] } });
    expect(property?.highlights).toEqual(['Solar backup', 'Borehole water']);
  });

  it('makes machine keys readable, leaves normal text alone, and handles non-string items', () => {
    const base = { id: 4, title: 'Z', price: 1000000, city: 'Johannesburg', images: [] };
    const card: any = normalizePropertyForUI({
      ...base,
      highlights: ['24_hour_security', 'pet-friendly', 'Near schools', { label: 'Fibre ready' }, 42, null, ''],
    });
    expect(card?.highlights).toEqual(['24 Hour Security', 'Pet Friendly', 'Near schools', 'Fibre ready']);
  });
});
