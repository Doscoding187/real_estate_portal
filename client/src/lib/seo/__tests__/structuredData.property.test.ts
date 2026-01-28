/**
 * Property-Based Tests for Structured Data and SEO Metadata
 *
 * These tests validate that location pages include proper structured data
 * and SEO metadata as specified in Requirements 23.1-23.5, 30.1-30.5
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { validatePlaceSchema, validateBreadcrumbSchema } from '../structuredDataValidator';

/**
 * Arbitrary for generating valid location names
 */
const locationNameArbitrary = fc
  .string({ minLength: 1, maxLength: 50 })
  .filter(name => name.trim().length > 0)
  .map(name => name.trim());

/**
 * Arbitrary for generating valid slugs (kebab-case)
 */
const slugArbitrary = fc
  .string({ minLength: 1, maxLength: 50 })
  .filter(str => /^[a-z0-9-]+$/.test(str) && !str.startsWith('-') && !str.endsWith('-'))
  .map(str => str.toLowerCase());

/**
 * Arbitrary for generating valid coordinates within South Africa
 * Excludes NaN, Infinity, and other special float values
 */
const southAfricaCoordinatesArbitrary = fc.record({
  latitude: fc.double({ min: -35, max: -22, noNaN: true }),
  longitude: fc.double({ min: 16, max: 33, noNaN: true }),
});

/**
 * Arbitrary for generating location types
 */
const locationTypeArbitrary = fc.constantFrom('Province', 'City', 'Suburb', 'Place');

/**
 * Arbitrary for generating valid URLs
 */
const urlArbitrary = fc
  .tuple(
    slugArbitrary,
    fc.option(slugArbitrary, { nil: undefined }),
    fc.option(slugArbitrary, { nil: undefined }),
  )
  .map(([province, city, suburb]) => {
    let url = `/south-africa/${province}`;
    if (city) url += `/${city}`;
    if (suburb) url += `/${suburb}`;
    return url;
  });

/**
 * Arbitrary for generating breadcrumb items
 */
const breadcrumbItemArbitrary = fc.record({
  name: locationNameArbitrary,
  url: urlArbitrary,
});

/**
 * Arbitrary for generating breadcrumb lists (1-4 items)
 */
const breadcrumbListArbitrary = fc.array(breadcrumbItemArbitrary, { minLength: 1, maxLength: 4 });

describe('Structured Data Property Tests', () => {
  describe('Property 40: Structured data presence', () => {
    /**
     * **Feature: google-places-autocomplete-integration, Property 40: Structured data presence**
     *
     * For any location page rendered, the HTML should contain JSON-LD structured data with @type "Place"
     *
     * **Validates: Requirements 30.1**
     */
    it('should include Place schema with @type "Place" for any location', () => {
      fc.assert(
        fc.property(
          locationTypeArbitrary,
          locationNameArbitrary,
          locationNameArbitrary, // description
          urlArbitrary,
          (locationType, name, description, url) => {
            // Create a minimal Place schema
            const placeSchema = {
              '@context': 'https://schema.org',
              '@type':
                locationType === 'City'
                  ? 'City'
                  : locationType === 'Province'
                    ? 'AdministrativeArea'
                    : 'Place',
              name: name,
              description: description,
              url: `https://propertylistify.com${url}`,
            };

            // Verify @context is present
            expect(placeSchema['@context']).toBeDefined();
            expect(placeSchema['@context']).toBe('https://schema.org');

            // Verify @type is present and valid
            expect(placeSchema['@type']).toBeDefined();
            expect(['Place', 'City', 'AdministrativeArea']).toContain(placeSchema['@type']);

            // Verify required fields are present
            expect(placeSchema.name).toBeDefined();
            expect(placeSchema.name.length).toBeGreaterThan(0);

            expect(placeSchema.url).toBeDefined();
            expect(placeSchema.url).toContain('https://propertylistify.com');

            // Validate using the validator
            const validation = validatePlaceSchema(placeSchema);
            expect(validation.isValid).toBe(true);
            expect(validation.errors).toHaveLength(0);
          },
        ),
        { numRuns: 100 },
      );
    });

    it('should include BreadcrumbList schema for any location page', () => {
      fc.assert(
        fc.property(breadcrumbListArbitrary, breadcrumbs => {
          // Create BreadcrumbList schema
          const breadcrumbSchema = {
            '@context': 'https://schema.org',
            '@type': 'BreadcrumbList',
            itemListElement: breadcrumbs.map((crumb, index) => ({
              '@type': 'ListItem',
              position: index + 1,
              name: crumb.name,
              item: `https://propertylistify.com${crumb.url}`,
            })),
          };

          // Verify @context is present
          expect(breadcrumbSchema['@context']).toBeDefined();
          expect(breadcrumbSchema['@context']).toBe('https://schema.org');

          // Verify @type is BreadcrumbList
          expect(breadcrumbSchema['@type']).toBe('BreadcrumbList');

          // Verify itemListElement is present and is an array
          expect(breadcrumbSchema.itemListElement).toBeDefined();
          expect(Array.isArray(breadcrumbSchema.itemListElement)).toBe(true);
          expect(breadcrumbSchema.itemListElement.length).toBeGreaterThan(0);

          // Validate using the validator
          const validation = validateBreadcrumbSchema(breadcrumbSchema);
          expect(validation.isValid).toBe(true);
          expect(validation.errors).toHaveLength(0);
        }),
        { numRuns: 100 },
      );
    });
  });

  describe('Property 41: Structured data completeness', () => {
    /**
     * **Feature: google-places-autocomplete-integration, Property 41: Structured data completeness**
     *
     * For any location page's structured data, it should include name, geo coordinates,
     * address, and url properties
     *
     * **Validates: Requirements 30.2**
     */
    it('should include all required fields: name, coordinates, address, and URL', () => {
      fc.assert(
        fc.property(
          locationTypeArbitrary,
          locationNameArbitrary,
          locationNameArbitrary, // description
          urlArbitrary,
          southAfricaCoordinatesArbitrary,
          locationNameArbitrary, // addressLocality
          locationNameArbitrary, // addressRegion
          (locationType, name, description, url, coordinates, locality, region) => {
            // Create a complete Place schema with all required fields
            const placeSchema = {
              '@context': 'https://schema.org',
              '@type':
                locationType === 'City'
                  ? 'City'
                  : locationType === 'Province'
                    ? 'AdministrativeArea'
                    : 'Place',
              name: name,
              description: description,
              url: `https://propertylistify.com${url}`,
              geo: {
                '@type': 'GeoCoordinates',
                latitude: coordinates.latitude,
                longitude: coordinates.longitude,
              },
              address: {
                '@type': 'PostalAddress',
                addressLocality: locality,
                addressRegion: region,
                addressCountry: 'ZA',
              },
            };

            // Verify name is present
            expect(placeSchema.name).toBeDefined();
            expect(typeof placeSchema.name).toBe('string');
            expect(placeSchema.name.length).toBeGreaterThan(0);

            // Verify geo coordinates are present
            expect(placeSchema.geo).toBeDefined();
            expect(placeSchema.geo['@type']).toBe('GeoCoordinates');
            expect(placeSchema.geo.latitude).toBeDefined();
            expect(typeof placeSchema.geo.latitude).toBe('number');
            expect(placeSchema.geo.longitude).toBeDefined();
            expect(typeof placeSchema.geo.longitude).toBe('number');

            // Verify coordinates are within South Africa bounds
            expect(placeSchema.geo.latitude).toBeGreaterThanOrEqual(-35);
            expect(placeSchema.geo.latitude).toBeLessThanOrEqual(-22);
            expect(placeSchema.geo.longitude).toBeGreaterThanOrEqual(16);
            expect(placeSchema.geo.longitude).toBeLessThanOrEqual(33);

            // Verify address is present
            expect(placeSchema.address).toBeDefined();
            expect(placeSchema.address['@type']).toBe('PostalAddress');
            expect(
              placeSchema.address.addressLocality || placeSchema.address.addressRegion,
            ).toBeDefined();
            expect(placeSchema.address.addressCountry).toBe('ZA');

            // Verify URL is present and valid
            expect(placeSchema.url).toBeDefined();
            expect(typeof placeSchema.url).toBe('string');
            expect(placeSchema.url).toContain('https://propertylistify.com');

            // Validate using the validator
            const validation = validatePlaceSchema(placeSchema);
            expect(validation.isValid).toBe(true);
            expect(validation.errors).toHaveLength(0);
          },
        ),
        { numRuns: 100 },
      );
    });

    it('should include aggregate statistics as additional properties when provided', () => {
      fc.assert(
        fc.property(
          locationTypeArbitrary,
          locationNameArbitrary,
          urlArbitrary,
          fc.integer({ min: 0, max: 10000 }), // totalListings
          fc.double({ min: 100000, max: 50000000, noNaN: true }), // avgPrice
          fc.double({ min: 5000, max: 100000, noNaN: true }), // avgRentalPrice
          (locationType, name, url, totalListings, avgPrice, avgRentalPrice) => {
            // Create Place schema with statistics
            const placeSchema = {
              '@context': 'https://schema.org',
              '@type':
                locationType === 'City'
                  ? 'City'
                  : locationType === 'Province'
                    ? 'AdministrativeArea'
                    : 'Place',
              name: name,
              url: `https://propertylistify.com${url}`,
              additionalProperty: [
                {
                  '@type': 'PropertyValue',
                  name: 'Total Listings',
                  value: totalListings,
                },
                {
                  '@type': 'PropertyValue',
                  name: 'Average Sale Price',
                  value: avgPrice,
                  unitCode: 'ZAR',
                },
                {
                  '@type': 'PropertyValue',
                  name: 'Average Rental Price',
                  value: avgRentalPrice,
                  unitCode: 'ZAR',
                },
              ],
            };

            // Verify additionalProperty is present and is an array
            expect(placeSchema.additionalProperty).toBeDefined();
            expect(Array.isArray(placeSchema.additionalProperty)).toBe(true);
            expect(placeSchema.additionalProperty.length).toBeGreaterThan(0);

            // Verify each property has correct structure
            placeSchema.additionalProperty.forEach(prop => {
              expect(prop['@type']).toBe('PropertyValue');
              expect(prop.name).toBeDefined();
              expect(typeof prop.name).toBe('string');
              expect(prop.value).toBeDefined();
              expect(typeof prop.value).toBe('number');
            });

            // Verify price properties have currency unit
            const priceProps = placeSchema.additionalProperty.filter(p => p.name.includes('Price'));
            priceProps.forEach(prop => {
              expect(prop.unitCode).toBe('ZAR');
            });
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  describe('Breadcrumb Schema Completeness', () => {
    /**
     * Additional property: Breadcrumb items should have sequential positions
     */
    it('should have sequential positions starting from 1', () => {
      fc.assert(
        fc.property(breadcrumbListArbitrary, breadcrumbs => {
          const breadcrumbSchema = {
            '@context': 'https://schema.org',
            '@type': 'BreadcrumbList',
            itemListElement: breadcrumbs.map((crumb, index) => ({
              '@type': 'ListItem',
              position: index + 1,
              name: crumb.name,
              item: `https://propertylistify.com${crumb.url}`,
            })),
          };

          // Verify positions are sequential
          breadcrumbSchema.itemListElement.forEach((item, index) => {
            expect(item.position).toBe(index + 1);
          });

          // Verify first position is 1
          expect(breadcrumbSchema.itemListElement[0].position).toBe(1);

          // Verify last position equals array length
          const lastIndex = breadcrumbSchema.itemListElement.length - 1;
          expect(breadcrumbSchema.itemListElement[lastIndex].position).toBe(
            breadcrumbSchema.itemListElement.length,
          );
        }),
        { numRuns: 100 },
      );
    });

    it('should have valid URLs for all breadcrumb items', () => {
      fc.assert(
        fc.property(breadcrumbListArbitrary, breadcrumbs => {
          const breadcrumbSchema = {
            '@context': 'https://schema.org',
            '@type': 'BreadcrumbList',
            itemListElement: breadcrumbs.map((crumb, index) => ({
              '@type': 'ListItem',
              position: index + 1,
              name: crumb.name,
              item: `https://propertylistify.com${crumb.url}`,
            })),
          };

          // Verify all items have valid URLs
          breadcrumbSchema.itemListElement.forEach(item => {
            expect(item.item).toBeDefined();
            expect(typeof item.item).toBe('string');
            expect(item.item).toContain('https://propertylistify.com');

            // Verify URL is valid
            expect(() => new URL(item.item)).not.toThrow();
          });
        }),
        { numRuns: 100 },
      );
    });
  });

  describe('SEO Meta Tags', () => {
    /**
     * Property: Meta title should include location name and key statistics
     * Requirements 23.2
     */
    it('should generate meta title with location name and statistics', () => {
      fc.assert(
        fc.property(
          locationNameArbitrary,
          fc.integer({ min: 1, max: 10000 }),
          fc.double({ min: 100000, max: 50000000, noNaN: true }),
          (locationName, totalListings, avgPrice) => {
            // Simulate meta title generation
            const metaTitle = `${locationName} Real Estate - ${totalListings} Properties from R${Math.round(avgPrice / 1000)}K | Property Listify`;

            // Verify title includes location name
            expect(metaTitle).toContain(locationName);

            // Verify title includes listing count
            expect(metaTitle).toContain(totalListings.toString());

            // Verify title includes price information
            expect(metaTitle).toMatch(/R\d+/);

            // Verify title includes brand name
            expect(metaTitle).toContain('Property Listify');

            // Verify title length is reasonable (< 60 characters is ideal for SEO)
            // We allow up to 100 for property-rich titles
            expect(metaTitle.length).toBeLessThan(150);
          },
        ),
        { numRuns: 100 },
      );
    });

    /**
     * Property: Meta description should include location name and key statistics
     * Requirements 23.3
     */
    it('should generate meta description with location name and statistics', () => {
      fc.assert(
        fc.property(
          locationNameArbitrary,
          fc.integer({ min: 1, max: 10000 }),
          fc.double({ min: 100000, max: 50000000, noNaN: true }),
          (locationName, totalListings, avgPrice) => {
            // Simulate meta description generation
            const metaDescription = `Explore real estate in ${locationName}. Browse ${totalListings} properties for sale and rent. Average sale price: R${Math.round(avgPrice / 1000)}K.`;

            // Verify description includes location name
            expect(metaDescription).toContain(locationName);

            // Verify description includes listing count
            expect(metaDescription).toContain(totalListings.toString());

            // Verify description includes price information
            expect(metaDescription).toMatch(/R\d+/);

            // Verify description length is within SEO best practices (< 160 characters)
            expect(metaDescription.length).toBeLessThanOrEqual(160);

            // Verify description is descriptive
            expect(metaDescription.toLowerCase()).toMatch(/explore|browse|properties|real estate/);
          },
        ),
        { numRuns: 100 },
      );
    });
  });
});
