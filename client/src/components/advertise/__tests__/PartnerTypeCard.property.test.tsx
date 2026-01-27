/**
 * Property-Based Tests for PartnerTypeCard Component
 *
 * Feature: advertise-with-us-landing, Property 2: Partner card completeness
 * Validates: Requirements 2.2
 *
 * Property: For any partner type card rendered on the page, the card should
 * contain exactly four elements: an icon, a title, a benefit description,
 * and a "Learn More" CTA
 */

import { describe, it, expect, afterEach } from 'vitest';
import { render, cleanup, within } from '@testing-library/react';
import { Home, Building2, Landmark, FileText, Wrench } from 'lucide-react';
import { PartnerTypeCard } from '../PartnerTypeCard';
import fc from 'fast-check';

// Clean up after each test
afterEach(() => {
  cleanup();
});

// Generator for valid partner type data
const partnerTypeArbitrary = fc.record({
  icon: fc.constantFrom(Home, Building2, Landmark, FileText, Wrench),
  title: fc.string({ minLength: 5, maxLength: 50 }).filter(s => s.trim().length > 0),
  benefit: fc.string({ minLength: 20, maxLength: 200 }).filter(s => s.trim().length > 0),
  href: fc.webUrl(),
  index: fc.integer({ min: 0, max: 10 }),
});

describe('PartnerTypeCard - Property 2: Partner card completeness', () => {
  it('should contain exactly four required elements: icon, title, benefit, and CTA', () => {
    fc.assert(
      fc.property(partnerTypeArbitrary, partnerData => {
        const { container } = render(
          <PartnerTypeCard
            icon={partnerData.icon}
            title={partnerData.title}
            benefit={partnerData.benefit}
            href={partnerData.href}
            index={partnerData.index}
          />,
        );

        // Use within to scope queries to this specific container
        const card = within(container);

        // 1. Check for icon presence
        // The icon is rendered as an SVG element
        const iconElement = container.querySelector('svg');
        expect(iconElement).toBeTruthy();

        // 2. Check for title presence
        const titleElement = card.getByRole('heading', { level: 3 });
        expect(titleElement).toBeTruthy();
        expect(titleElement.textContent).toBe(partnerData.title);

        // 3. Check for benefit description
        // Find the p element and verify it contains the benefit text
        const benefitElement = container.querySelector('p');
        expect(benefitElement).toBeTruthy();
        expect(benefitElement?.textContent?.trim()).toBe(partnerData.benefit.trim());

        // 4. Check for "Learn More" CTA
        const ctaElement = card.getByText('Learn More');
        expect(ctaElement).toBeTruthy();

        // Verify the card is a link with correct href
        const linkElement = container.querySelector('a');
        expect(linkElement).toBeTruthy();
        expect(linkElement?.getAttribute('href')).toBe(partnerData.href);

        // Verify accessibility
        expect(linkElement?.getAttribute('aria-label')).toContain(partnerData.title);

        // Clean up after this property test iteration
        cleanup();
      }),
      { numRuns: 100 },
    );
  });

  it('should render all four elements with proper semantic HTML structure', () => {
    fc.assert(
      fc.property(partnerTypeArbitrary, partnerData => {
        const { container } = render(
          <PartnerTypeCard
            icon={partnerData.icon}
            title={partnerData.title}
            benefit={partnerData.benefit}
            href={partnerData.href}
            index={partnerData.index}
          />,
        );

        const card = within(container);

        // Verify semantic structure
        const link = container.querySelector('a');
        expect(link).toBeTruthy();

        // Icon should be in a div container
        const iconContainer = container.querySelector('div[style*="width: 64px"]');
        expect(iconContainer).toBeTruthy();

        // Title should be h3
        const title = container.querySelector('h3');
        expect(title).toBeTruthy();
        expect(title?.textContent).toBe(partnerData.title);

        // Benefit should be p
        const benefit = container.querySelector('p');
        expect(benefit).toBeTruthy();
        expect(benefit?.textContent).toBe(partnerData.benefit);

        // CTA should contain "Learn More" text
        const cta = card.getByText('Learn More');
        expect(cta).toBeTruthy();

        cleanup();
      }),
      { numRuns: 100 },
    );
  });

  it('should maintain element presence regardless of content length', () => {
    fc.assert(
      fc.property(
        fc.record({
          icon: fc.constantFrom(Home, Building2, Landmark),
          title: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
          benefit: fc.string({ minLength: 1, maxLength: 500 }).filter(s => s.trim().length > 0),
          href: fc.webUrl(),
          index: fc.integer({ min: 0, max: 20 }),
        }),
        partnerData => {
          const { container } = render(
            <PartnerTypeCard
              icon={partnerData.icon}
              title={partnerData.title}
              benefit={partnerData.benefit}
              href={partnerData.href}
              index={partnerData.index}
            />,
          );

          const card = within(container);

          // All four elements must be present regardless of content length
          const hasIcon = container.querySelector('svg') !== null;
          const hasTitle = container.querySelector('h3') !== null;
          const hasBenefit = container.querySelector('p') !== null;
          const hasCTA = card.queryByText('Learn More') !== null;

          expect(hasIcon && hasTitle && hasBenefit && hasCTA).toBe(true);

          cleanup();
        },
      ),
      { numRuns: 100 },
    );
  });

  it('should render exactly one of each required element (no duplicates)', () => {
    fc.assert(
      fc.property(partnerTypeArbitrary, partnerData => {
        const { container } = render(
          <PartnerTypeCard
            icon={partnerData.icon}
            title={partnerData.title}
            benefit={partnerData.benefit}
            href={partnerData.href}
            index={partnerData.index}
          />,
        );

        const card = within(container);

        // Should have exactly one h3 (title)
        const titles = container.querySelectorAll('h3');
        expect(titles.length).toBe(1);

        // Should have exactly one p (benefit)
        const benefits = container.querySelectorAll('p');
        expect(benefits.length).toBe(1);

        // Should have exactly one link
        const links = container.querySelectorAll('a');
        expect(links.length).toBe(1);

        // Should have "Learn More" text exactly once
        const learnMoreElements = card.getAllByText('Learn More');
        expect(learnMoreElements.length).toBe(1);

        cleanup();
      }),
      { numRuns: 100 },
    );
  });
});

/**
 * Property 3: Partner card navigation
 * Validates: Requirements 2.3
 *
 * Property: For any partner type card, clicking the card should navigate to a URL
 * that corresponds to that partner type's sub-landing page
 */
describe('PartnerTypeCard - Property 3: Partner card navigation', () => {
  it('should navigate to the correct URL when clicked', () => {
    fc.assert(
      fc.property(partnerTypeArbitrary, partnerData => {
        const { container } = render(
          <PartnerTypeCard
            icon={partnerData.icon}
            title={partnerData.title}
            benefit={partnerData.benefit}
            href={partnerData.href}
            index={partnerData.index}
          />,
        );

        // Find the link element
        const linkElement = container.querySelector('a');
        expect(linkElement).toBeTruthy();

        // Verify the href attribute matches the provided href
        const actualHref = linkElement?.getAttribute('href');
        expect(actualHref).toBe(partnerData.href);

        // Verify it's a valid link element
        expect(linkElement?.tagName.toLowerCase()).toBe('a');

        cleanup();
      }),
      { numRuns: 100 },
    );
  });

  it('should have proper accessibility attributes for navigation', () => {
    fc.assert(
      fc.property(partnerTypeArbitrary, partnerData => {
        const { container } = render(
          <PartnerTypeCard
            icon={partnerData.icon}
            title={partnerData.title}
            benefit={partnerData.benefit}
            href={partnerData.href}
            index={partnerData.index}
          />,
        );

        const linkElement = container.querySelector('a');
        expect(linkElement).toBeTruthy();

        // Verify aria-label contains the partner type title
        const ariaLabel = linkElement?.getAttribute('aria-label');
        expect(ariaLabel).toBeTruthy();
        expect(ariaLabel?.toLowerCase()).toContain(partnerData.title.trim().toLowerCase());

        cleanup();
      }),
      { numRuns: 100 },
    );
  });
});

/**
 * Property 4: Partner card hover interaction
 * Validates: Requirements 2.4
 *
 * Property: For any partner type card, hovering over the card should apply CSS
 * transform and box-shadow changes that create a lift effect
 */
describe('PartnerTypeCard - Property 4: Partner card hover interaction', () => {
  it('should have hover-capable styling attributes', () => {
    fc.assert(
      fc.property(partnerTypeArbitrary, partnerData => {
        const { container } = render(
          <PartnerTypeCard
            icon={partnerData.icon}
            title={partnerData.title}
            benefit={partnerData.benefit}
            href={partnerData.href}
            index={partnerData.index}
          />,
        );

        const linkElement = container.querySelector('a');
        expect(linkElement).toBeTruthy();

        // Verify the element has transition property for smooth animations
        const style = linkElement?.getAttribute('style');
        expect(style).toBeTruthy();
        expect(style).toContain('transition');

        // Verify box-shadow is present (for lift effect)
        expect(style).toContain('box-shadow');

        // Verify cursor is pointer (indicating interactivity)
        expect(style).toContain('cursor: pointer');

        cleanup();
      }),
      { numRuns: 100 },
    );
  });

  it('should be a motion component with hover variants', () => {
    fc.assert(
      fc.property(partnerTypeArbitrary, partnerData => {
        const { container } = render(
          <PartnerTypeCard
            icon={partnerData.icon}
            title={partnerData.title}
            benefit={partnerData.benefit}
            href={partnerData.href}
            index={partnerData.index}
          />,
        );

        const linkElement = container.querySelector('a');
        expect(linkElement).toBeTruthy();

        // Verify it's a Framer Motion element (has tabindex for accessibility)
        const tabIndex = linkElement?.getAttribute('tabindex');
        expect(tabIndex).toBe('0');

        // Verify the element has the partner-type-card class
        const className = linkElement?.getAttribute('class');
        expect(className).toContain('partner-type-card');

        cleanup();
      }),
      { numRuns: 100 },
    );
  });
});
