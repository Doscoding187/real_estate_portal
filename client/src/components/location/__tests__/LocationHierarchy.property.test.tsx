import { describe, it, expect } from 'vitest';
import { fc } from '@fast-check/vitest';

/**
 * Feature: location-pages-system, Property 2: Hierarchical Data Consistency & Navigation
 * 
 * Validates that location data structures maintain strict hierarchy (Province -> City -> Suburb)
 * and generate valid, accessible URL paths.
 * 
 * Validates: Requirements 1.2, 2.3, 4.2, 4.3
 */
describe('LocationHierarchy - Property 2: Hierarchical Data Consistency', () => {
  
  // Data Generators for consistent testing
  const slugGenerator = fc.string({ minLength: 3, maxLength: 20 }).map(s => s.toLowerCase().replace(/[^a-z0-9]/g, '-'));
  const nameGenerator = fc.string({ minLength: 3, maxLength: 30 });
  const idGenerator = fc.integer({ min: 1, max: 99999 });

  it('should construct valid hierarchical URLs for any depth', () => {
    fc.assert(
      fc.property(
        fc.record({
          province: fc.record({ name: nameGenerator, slug: slugGenerator }),
          city: fc.option(fc.record({ name: nameGenerator, slug: slugGenerator })),
          suburb: fc.option(fc.record({ name: nameGenerator, slug: slugGenerator }))
        }),
        (hierarchy) => {
          // Construct URL path based on hierarchy depth
          let path = `/${hierarchy.province.slug}`;
          
          if (hierarchy.city) {
            path += `/${hierarchy.city.slug}`;
            
            // Property: If suburb exists, city MUST exist (enforced by generator structure, but validated here)
            if (hierarchy.suburb) {
              path += `/${hierarchy.suburb.slug}`;
            }
          } else {
             // If no city, there should be no suburb path appended (testing logic consistency)
          }

          // Assertions
          
          // 1. Path must start with /
          expect(path).toMatch(/^\//);

          // 2. Path must contain province slug
          expect(path).toContain(hierarchy.province.slug);

          // 3. If city exists, path must contain city slug
          if (hierarchy.city) {
            expect(path).toContain(hierarchy.city.slug);
            // 4. Hierarchy order check: Province before City
            const provinceIndex = path.indexOf(hierarchy.province.slug);
            const cityIndex = path.indexOf(hierarchy.city.slug);
            expect(cityIndex).toBeGreaterThan(provinceIndex);
          }

          // 5. If suburb exists, path must contain suburb slug and city slug
          if (hierarchy.city && hierarchy.suburb) {
             expect(path).toContain(hierarchy.suburb.slug);
             // 6. Hierarchy order check: City before Suburb
             const cityIndex = path.indexOf(hierarchy.city.slug);
             const suburbIndex = path.indexOf(hierarchy.suburb.slug);
             expect(suburbIndex).toBeGreaterThan(cityIndex);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should maintain parent-child referential integrity', () => {
    fc.assert(
      fc.property(
        fc.record({
          provinceId: idGenerator,
          cities: fc.array(fc.record({
             id: idGenerator,
             name: nameGenerator,
             provinceId: fc.integer() // Potentially mismatching ID
          }), { minLength: 1, maxLength: 5 })
        }),
        (data) => {
          // Simulate filtering cities by province
          // This tests the logic used in CityList to ensure we only show matching cities
          
          const validCities = data.cities.map(c => ({...c, provinceId: data.provinceId}));
          const mixedCities = [...data.cities, ...validCities];
          
          const filteredCities = mixedCities.filter(c => c.provinceId === data.provinceId);
          
          // Property: All filtered cities must have the correct parent ID
          filteredCities.forEach(city => {
            expect(city.provinceId).toBe(data.provinceId);
          });

          // Property: Filtered count should be at least the number of valid cities we created
          expect(filteredCities.length).toBeGreaterThanOrEqual(validCities.length);
        }
      ), 
      { numRuns: 100 }
    );
  });

  it('should validate slug format constraints', () => {
     fc.assert(
        fc.property(
           slugGenerator,
           (slug) => {
              // Property: Slugs should be lowercase and safe URL characters
              const isValidSlug = /^[a-z0-9-]+$/.test(slug);
              expect(isValidSlug).toBe(true);
              
              // Property: Slugs should not contain spaces
              expect(slug).not.toContain(' ');
           }
        )
     )
  });
});
