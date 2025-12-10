/**
 * Property-Based Tests for PricingCard Component
 * 
 * Feature: advertise-with-us-landing, Property 12: Pricing card navigation
 * Validates: Requirements 7.3
 * 
 * Property: For any pricing category card, clicking the card should navigate 
 * to the full pricing page
 */

import { describe, it, expect, afterEach } from 'vitest';
import { render, cleanup, within } from '@testing-library/react';
import { Users, Building2, Landmark, Wrench, DollarSign, CreditCard } from 'lucide-react';
import { PricingCard } from '../PricingCard';
import fc from 'fast-check';

// Clean up after each test
afterEach(() => {
  cleanup();
});

// Generator for valid pricing card data
const pricingCardArbitrary = fc.record({
  icon: fc.constantFrom(Users, Building2, Landmark, Wrench, DollarSign, CreditCard),
  category: fc.string({ minLength: 5, maxLength: 50 }).filter(s => s.trim().length > 0),
  description: fc.string({ minLength: 20, maxLength: 200 }).filter(s => s.trim().length > 0),
  href: fc.webUrl(),
});

describe('PricingCard - Property 12: Pricing card navigation', () => {
  it('should navigate to the full pricing page when clicked', () => {
    fc.assert(
      fc.property(pricingCardArbitrary, (pricingData) => {
        const { container } = render(
          <PricingCard
            icon={pricingData.icon}
            category={pricingData.category}
            description={pricingData.description}
            href={pricingData.href}
          />
        );

        // Find the link element
        const linkElement = container.querySelector('a');
        expect(linkElement).toBeTruthy();

        // Verify the href attribute matches the provided href
        const actualHref = linkElement?.getAttribute('href');
        expect(actualHref).toBe(pricingData.href);

        // Verify it's a valid link element
        expect(linkElement?.tagName.toLowerCase()).toBe('a');

        // Verify the link is clickable (has cursor pointer)
        const style = linkElement?.getAttribute('style');
        expect(style).toContain('cursor: pointer');
        
        cleanup();
      }),
      { numRuns: 100 }
    );
  });

  it('should have proper accessibility attributes for navigation', () => {
    fc.assert(
      fc.property(pricingCardArbitrary, (pricingData) => {
        const { container } = render(
          <PricingCard
            icon={pricingData.icon}
            category={pricingData.category}
            description={pricingData.description}
            href={pricingData.href}
          />
        );

        const linkElement = container.querySelector('a');
        expect(linkElement).toBeTruthy();

        // Verify aria-label contains the category name
        const ariaLabel = linkElement?.getAttribute('aria-label');
        expect(ariaLabel).toBeTruthy();
        expect(ariaLabel?.toLowerCase()).toContain(pricingData.category.trim().toLowerCase());
        expect(ariaLabel?.toLowerCase()).toContain('pricing');
        
        cleanup();
      }),
      { numRuns: 100 }
    );
  });

  it('should maintain navigation URL regardless of content length', () => {
    fc.assert(
      fc.property(
        fc.record({
          icon: fc.constantFrom(Users, Building2, Landmark, Wrench),
          category: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
          description: fc.string({ minLength: 1, maxLength: 500 }).filter(s => s.trim().length > 0),
          href: fc.webUrl(),
        }),
        (pricingData) => {
          const { container } = render(
            <PricingCard
              icon={pricingData.icon}
              category={pricingData.category}
              description={pricingData.description}
              href={pricingData.href}
            />
          );

          const linkElement = container.querySelector('a');
          expect(linkElement).toBeTruthy();

          // Navigation URL should be preserved regardless of content length
          const actualHref = linkElement?.getAttribute('href');
          expect(actualHref).toBe(pricingData.href);
          
          cleanup();
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should render as a single clickable link element', () => {
    fc.assert(
      fc.property(pricingCardArbitrary, (pricingData) => {
        const { container } = render(
          <PricingCard
            icon={pricingData.icon}
            category={pricingData.category}
            description={pricingData.description}
            href={pricingData.href}
          />
        );

        // Should have exactly one link element
        const links = container.querySelectorAll('a');
        expect(links.length).toBe(1);

        // The entire card should be the link
        const linkElement = links[0];
        expect(linkElement.getAttribute('href')).toBe(pricingData.href);
        
        cleanup();
      }),
      { numRuns: 100 }
    );
  });

  it('should have the pricing-card class for styling', () => {
    fc.assert(
      fc.property(pricingCardArbitrary, (pricingData) => {
        const { container } = render(
          <PricingCard
            icon={pricingData.icon}
            category={pricingData.category}
            description={pricingData.description}
            href={pricingData.href}
          />
        );

        const linkElement = container.querySelector('a');
        expect(linkElement).toBeTruthy();

        // Verify the element has the pricing-card class
        const className = linkElement?.getAttribute('class');
        expect(className).toContain('pricing-card');
        
        cleanup();
      }),
      { numRuns: 100 }
    );
  });
});

/**
 * Additional tests for pricing card structure and styling
 */
describe('PricingCard - Structure and Styling', () => {
  it('should contain all required elements: icon, category, description, and CTA', () => {
    fc.assert(
      fc.property(pricingCardArbitrary, (pricingData) => {
        const { container } = render(
          <PricingCard
            icon={pricingData.icon}
            category={pricingData.category}
            description={pricingData.description}
            href={pricingData.href}
          />
        );

        const card = within(container);

        // 1. Check for icon presence
        const iconElement = container.querySelector('svg');
        expect(iconElement).toBeTruthy();

        // 2. Check for category title
        const categoryElement = card.getByRole('heading', { level: 3 });
        expect(categoryElement).toBeTruthy();
        expect(categoryElement.textContent).toBe(pricingData.category);

        // 3. Check for description
        const descriptionElement = container.querySelector('p');
        expect(descriptionElement).toBeTruthy();
        expect(descriptionElement?.textContent?.trim()).toBe(pricingData.description.trim());

        // 4. Check for "View Pricing" CTA
        const ctaElement = card.getByText('View Pricing');
        expect(ctaElement).toBeTruthy();
        
        cleanup();
      }),
      { numRuns: 100 }
    );
  });

  it('should have minimalist card styling with border', () => {
    fc.assert(
      fc.property(pricingCardArbitrary, (pricingData) => {
        const { container } = render(
          <PricingCard
            icon={pricingData.icon}
            category={pricingData.category}
            description={pricingData.description}
            href={pricingData.href}
          />
        );

        const linkElement = container.querySelector('a');
        expect(linkElement).toBeTruthy();

        const style = linkElement?.getAttribute('style');
        expect(style).toBeTruthy();

        // Verify minimalist styling attributes
        expect(style).toContain('border');
        expect(style).toContain('border-radius');
        expect(style).toContain('background');
        
        cleanup();
      }),
      { numRuns: 100 }
    );
  });

  it('should have hover-capable styling for border glow effect', () => {
    fc.assert(
      fc.property(pricingCardArbitrary, (pricingData) => {
        const { container } = render(
          <PricingCard
            icon={pricingData.icon}
            category={pricingData.category}
            description={pricingData.description}
            href={pricingData.href}
          />
        );

        const linkElement = container.querySelector('a');
        expect(linkElement).toBeTruthy();

        // Verify the element has transition property for smooth animations
        const style = linkElement?.getAttribute('style');
        expect(style).toBeTruthy();
        expect(style).toContain('transition');

        // Verify it's a motion component (has tabindex)
        const tabIndex = linkElement?.getAttribute('tabindex');
        expect(tabIndex).toBe('0');
        
        cleanup();
      }),
      { numRuns: 100 }
    );
  });
});
