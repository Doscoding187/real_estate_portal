/**
 * Property-Based Tests for PropertyCard Component
 *
 * Tests for Tasks 9.1, 9.2, 9.3:
 * - Property 10: Required field display (Requirements 5.1)
 * - Property 11: Feature badge mapping (Requirements 5.2)
 * - Property 45: Security estate badge (Requirements 16.3)
 * - Property 46: Load-shedding solution badges (Requirements 16.4)
 *
 * These tests verify the existing PropertyCard implementation.
 */

import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import fc from 'fast-check';
import PropertyCard, { PropertyCardProps } from '../PropertyCard';

// Mock wouter
vi.mock('wouter', () => ({
  useLocation: () => ['/properties', vi.fn()],
}));

// Arbitrary generators for property-based testing
const priceArb = fc.integer({ min: 100000, max: 50000000 });
const bedroomsArb = fc.integer({ min: 1, max: 10 });
const bathroomsArb = fc.integer({ min: 1, max: 6 });
const areaArb = fc.integer({ min: 20, max: 5000 });
// Use alphanumeric strings to avoid whitespace-only values and avoid "R" followed by digits (which looks like price)
const locationArb = fc.stringMatching(/^[A-Za-z][a-z]{2,20}, [A-Z][a-z]{2,20}$/);
const titleArb = fc.stringMatching(/^[A-Z][a-z]+ [A-Z][a-z]+ Property$/); // e.g., "Beautiful Modern Property"

// Property type arbitrary
const propertyTypeArb = fc.constantFrom(
  'House',
  'Apartment',
  'Townhouse',
  'Commercial',
  'Plot',
  'Farm',
);

// Badge arbitrary
const badgeArb = fc.constantFrom(
  'New Listing',
  'Price Drop',
  'Under Offer',
  'Sold',
  'Let',
  'Fibre',
  'Solar',
  'Borehole',
  'Pet-Friendly',
  'Security Estate',
  'Generator',
  'Inverter',
);

// Highlight arbitrary
const highlightArb = fc.constantFrom(
  'Pool',
  'Garden',
  'Garage',
  'Balcony',
  'Sea View',
  'Mountain View',
  'Fibre Ready',
  'Solar Panels',
  'Borehole',
  'Pet Friendly',
  'Security Estate',
);

// Generate valid PropertyCardProps
const propertyCardPropsArb = fc.record({
  id: fc.string({ minLength: 1, maxLength: 10 }),
  title: titleArb,
  price: priceArb,
  location: locationArb,
  image: fc.constant('https://example.com/image.jpg'),
  description: fc.option(fc.string({ minLength: 10, maxLength: 200 }), { nil: undefined }),
  bedrooms: fc.option(bedroomsArb, { nil: undefined }),
  bathrooms: fc.option(bathroomsArb, { nil: undefined }),
  area: fc.option(areaArb, { nil: undefined }),
  propertyType: fc.option(propertyTypeArb, { nil: undefined }),
  badges: fc.option(fc.array(badgeArb, { minLength: 0, maxLength: 4 }), { nil: undefined }),
  highlights: fc.option(fc.array(highlightArb, { minLength: 0, maxLength: 6 }), { nil: undefined }),
  imageCount: fc.option(fc.integer({ min: 0, max: 50 }), { nil: undefined }),
  videoCount: fc.option(fc.integer({ min: 0, max: 10 }), { nil: undefined }),
});

describe('PropertyCard - Property-Based Tests', () => {
  afterEach(() => {
    cleanup();
  });

  /**
   * Property Test 10: Required field display
   *
   * For any valid property, the card SHALL display price, location,
   * bedrooms, bathrooms, and area prominently.
   *
   * **Feature: property-results-optimization, Property 10: Required field display**
   * **Validates: Requirements 5.1**
   */
  describe('Property 10: Required field display', () => {
    it('should always display price in Rands format', () => {
      fc.assert(
        fc.property(propertyCardPropsArb, props => {
          cleanup();
          render(<PropertyCard {...props} />);

          // Price should be displayed - look for the specific price container
          const priceElements = screen.queryAllByText(content => {
            // Match the exact format "R X,XXX,XXX" or "R XXX XXX"
            return /^R\s[\d\s,]+$/.test(content);
          });

          expect(priceElements.length).toBeGreaterThan(0);
          return true;
        }),
        { numRuns: 50, verbose: false },
      );
    });

    it('should always display location', () => {
      fc.assert(
        fc.property(propertyCardPropsArb, props => {
          cleanup();
          render(<PropertyCard {...props} />);

          // Location should be displayed - use a function matcher to handle whitespace normalization
          const locationElement = screen.getByText((content, element) => {
            // Normalize both strings for comparison
            const normalizedContent = content.replace(/\s+/g, ' ').trim();
            const normalizedLocation = props.location.replace(/\s+/g, ' ').trim();
            return normalizedContent === normalizedLocation;
          });
          expect(locationElement).toBeDefined();
          return true;
        }),
        { numRuns: 50, verbose: false },
      );
    });

    it('should display bedrooms when provided', () => {
      fc.assert(
        fc.property(
          propertyCardPropsArb.filter(p => p.bedrooms !== undefined),
          props => {
            cleanup();
            render(<PropertyCard {...props} />);

            // Bedrooms should be displayed with "Bed" text
            const bedroomText = screen.getByText(content => {
              return content.includes('Bed') && content.includes(String(props.bedrooms));
            });

            expect(bedroomText).toBeDefined();
            return true;
          },
        ),
        { numRuns: 30, verbose: false },
      );
    });

    it('should display bathrooms when provided', () => {
      fc.assert(
        fc.property(
          propertyCardPropsArb.filter(p => p.bathrooms !== undefined),
          props => {
            cleanup();
            render(<PropertyCard {...props} />);

            // Bathrooms should be displayed with "Bath" text
            const bathroomText = screen.getByText(content => {
              return content.includes('Bath') && content.includes(String(props.bathrooms));
            });

            expect(bathroomText).toBeDefined();
            return true;
          },
        ),
        { numRuns: 30, verbose: false },
      );
    });

    it('should display area/size when provided', () => {
      fc.assert(
        fc.property(
          propertyCardPropsArb.filter(p => p.area !== undefined),
          props => {
            cleanup();
            render(<PropertyCard {...props} />);

            // Area should be displayed with "m²" text
            const areaText = screen.getByText(content => {
              return content.includes('m²') && content.includes('Size');
            });

            expect(areaText).toBeDefined();
            return true;
          },
        ),
        { numRuns: 30, verbose: false },
      );
    });

    it('should always display title', () => {
      fc.assert(
        fc.property(propertyCardPropsArb, props => {
          cleanup();
          render(<PropertyCard {...props} />);

          // Title should be displayed (may be truncated)
          const titleElement = screen.getByRole('heading', { level: 3 });
          expect(titleElement).toBeDefined();
          expect(titleElement.textContent).toBeTruthy();
          return true;
        }),
        { numRuns: 50, verbose: false },
      );
    });
  });

  /**
   * Property Test 11: Feature badge mapping
   *
   * For any property with special features, the card SHALL display
   * highlight badges like "Fibre", "Solar", "Borehole", "Pet-Friendly".
   *
   * **Feature: property-results-optimization, Property 11: Feature badge mapping**
   * **Validates: Requirements 5.2**
   */
  describe('Property 11: Feature badge mapping', () => {
    it('should display all provided badges', () => {
      fc.assert(
        fc.property(
          propertyCardPropsArb.filter(p => p.badges && p.badges.length > 0),
          props => {
            cleanup();
            render(<PropertyCard {...props} />);

            // Each badge should be displayed - use queryAllByText since badges may appear multiple times
            for (const badge of props.badges || []) {
              const badgeElements = screen.queryAllByText(badge);
              expect(badgeElements.length).toBeGreaterThan(0);
            }
            return true;
          },
        ),
        { numRuns: 30, verbose: false },
      );
    });

    it('should display property type badge when provided', () => {
      fc.assert(
        fc.property(
          propertyCardPropsArb.filter(p => p.propertyType !== undefined),
          props => {
            cleanup();
            render(<PropertyCard {...props} />);

            // Property type should be displayed as a badge - use queryAllByText
            const propertyTypeBadges = screen.queryAllByText(props.propertyType!);
            expect(propertyTypeBadges.length).toBeGreaterThan(0);
            return true;
          },
        ),
        { numRuns: 30, verbose: false },
      );
    });

    it('should display image count when greater than zero', () => {
      fc.assert(
        fc.property(
          // Filter to ensure imageCount is unique (not equal to videoCount)
          propertyCardPropsArb.filter(
            p => p.imageCount !== undefined && p.imageCount > 0 && p.imageCount !== p.videoCount,
          ),
          props => {
            cleanup();
            render(<PropertyCard {...props} />);

            // Image count should be displayed - use queryAllByText since count may appear multiple times
            const imageCountElements = screen.queryAllByText(String(props.imageCount));
            expect(imageCountElements.length).toBeGreaterThan(0);
            return true;
          },
        ),
        { numRuns: 30, verbose: false },
      );
    });

    it('should display video count when greater than zero', () => {
      fc.assert(
        fc.property(
          // Filter to ensure videoCount is unique (not equal to imageCount)
          propertyCardPropsArb.filter(
            p => p.videoCount !== undefined && p.videoCount > 0 && p.videoCount !== p.imageCount,
          ),
          props => {
            cleanup();
            render(<PropertyCard {...props} />);

            // Video count should be displayed - use queryAllByText since count may appear multiple times
            const videoCountElements = screen.queryAllByText(String(props.videoCount));
            expect(videoCountElements.length).toBeGreaterThan(0);
            return true;
          },
        ),
        { numRuns: 30, verbose: false },
      );
    });
  });

  /**
   * Property Test 45 & 46: SA-specific badges
   *
   * Tests for security estate and load-shedding solution badges.
   * These are passed via the badges prop in the current implementation.
   *
   * **Feature: property-results-optimization, Property 45: Security estate badge**
   * **Feature: property-results-optimization, Property 46: Load-shedding solution badges**
   * **Validates: Requirements 16.3, 16.4**
   */
  describe('Property 45 & 46: SA-specific badges', () => {
    it('should display Security Estate badge when included in badges', () => {
      const propsWithSecurityEstate = {
        id: '1',
        title: 'Test Property in Security Estate',
        price: 2500000,
        location: 'Sandton, Gauteng',
        image: 'https://example.com/image.jpg',
        badges: ['Security Estate'],
      };

      render(<PropertyCard {...propsWithSecurityEstate} />);

      const securityBadge = screen.queryByText('Security Estate');
      expect(securityBadge).not.toBeNull();
    });

    it('should display Solar badge when included in badges', () => {
      const propsWithSolar = {
        id: '2',
        title: 'Test Property with Solar',
        price: 3000000,
        location: 'Cape Town, Western Cape',
        image: 'https://example.com/image.jpg',
        badges: ['Solar'],
      };

      render(<PropertyCard {...propsWithSolar} />);

      const solarBadge = screen.queryByText('Solar');
      expect(solarBadge).not.toBeNull();
    });

    it('should display Generator badge when included in badges', () => {
      cleanup();
      const propsWithGenerator = {
        id: '3',
        title: 'Test Property with Generator',
        price: 4000000,
        location: 'Durban, KwaZulu-Natal',
        image: 'https://example.com/image.jpg',
        badges: ['Generator'],
      };

      render(<PropertyCard {...propsWithGenerator} />);

      const generatorBadge = screen.queryByText('Generator');
      expect(generatorBadge).not.toBeNull();
    });

    it('should display Inverter badge when included in badges', () => {
      cleanup();
      const propsWithInverter = {
        id: '4',
        title: 'Test Property with Inverter',
        price: 2000000,
        location: 'Pretoria, Gauteng',
        image: 'https://example.com/image.jpg',
        badges: ['Inverter'],
      };

      render(<PropertyCard {...propsWithInverter} />);

      const inverterBadge = screen.queryByText('Inverter');
      expect(inverterBadge).not.toBeNull();
    });

    it('should display multiple load-shedding solution badges', () => {
      cleanup();
      const propsWithMultipleSolutions = {
        id: '5',
        title: 'Test Property with Multiple Solutions',
        price: 5000000,
        location: 'Johannesburg, Gauteng',
        image: 'https://example.com/image.jpg',
        badges: ['Solar', 'Generator', 'Inverter'],
      };

      render(<PropertyCard {...propsWithMultipleSolutions} />);

      expect(screen.queryByText('Solar')).not.toBeNull();
      expect(screen.queryByText('Generator')).not.toBeNull();
      expect(screen.queryByText('Inverter')).not.toBeNull();
    });

    it('should display Pet-Friendly badge when included', () => {
      cleanup();
      const propsWithPetFriendly = {
        id: '6',
        title: 'Pet-Friendly Property',
        price: 1800000,
        location: 'Stellenbosch, Western Cape',
        image: 'https://example.com/image.jpg',
        badges: ['Pet-Friendly'],
      };

      render(<PropertyCard {...propsWithPetFriendly} />);

      const petFriendlyBadge = screen.queryByText('Pet-Friendly');
      expect(petFriendlyBadge).not.toBeNull();
    });

    it('should display Fibre badge when included', () => {
      cleanup();
      const propsWithFibre = {
        id: '7',
        title: 'Fibre-Ready Property',
        price: 2200000,
        location: 'Centurion, Gauteng',
        image: 'https://example.com/image.jpg',
        badges: ['Fibre'],
      };

      render(<PropertyCard {...propsWithFibre} />);

      const fibreBadge = screen.queryByText('Fibre');
      expect(fibreBadge).not.toBeNull();
    });

    it('should display status badges (New Listing, Price Drop, Under Offer, Sold, Let)', () => {
      const statusBadges = ['New Listing', 'Price Drop', 'Under Offer', 'Sold', 'Let'];

      for (const status of statusBadges) {
        cleanup();
        const props = {
          id: '8',
          title: `Property with ${status}`,
          price: 2500000,
          location: 'Test Location',
          image: 'https://example.com/image.jpg',
          badges: [status],
        };

        render(<PropertyCard {...props} />);

        const statusBadge = screen.queryByText(status);
        expect(statusBadge).not.toBeNull();
      }
    });
  });

  /**
   * Property Test: Card renders without crashing for any valid props
   *
   * The component should handle any combination of valid props without errors.
   */
  describe('Robustness', () => {
    it('should render without crashing for any valid props combination', () => {
      fc.assert(
        fc.property(propertyCardPropsArb, props => {
          cleanup();
          // Should not throw
          expect(() => render(<PropertyCard {...props} />)).not.toThrow();
          return true;
        }),
        { numRuns: 100, verbose: false },
      );
    });

    it('should handle missing optional props gracefully', () => {
      const minimalProps = {
        id: '1',
        title: 'Minimal Property',
        price: 1000000,
        location: 'Test Location',
        image: 'https://example.com/image.jpg',
      };

      expect(() => render(<PropertyCard {...minimalProps} />)).not.toThrow();

      // Core fields should still be displayed
      expect(screen.getByText('Minimal Property')).toBeDefined();
      expect(screen.getByText('Test Location')).toBeDefined();
    });
  });
});
