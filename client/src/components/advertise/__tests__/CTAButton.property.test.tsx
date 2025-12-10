/**
 * Property-Based Tests for CTA Button Navigation
 * 
 * Feature: advertise-with-us-landing, Property 13: Primary CTA navigation
 * Validates: Requirements 8.4
 * 
 * Property: For any primary CTA button on the page, clicking the button should 
 * navigate to either the partner registration page or the contact form
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CTAButton } from '../CTAButton';
import fc from 'fast-check';

describe('Property 13: Primary CTA navigation', () => {
  it('should navigate to valid partner registration or contact form URLs for any primary CTA', () => {
    fc.assert(
      fc.property(
        // Generate random CTA labels
        fc.string({ minLength: 5, maxLength: 30 }),
        // Generate valid target URLs (partner registration or contact form)
        fc.constantFrom(
          '/partner-registration',
          '/register',
          '/signup',
          '/contact',
          '/contact-us',
          '/get-started',
          '/request-demo'
        ),
        (label, href) => {
          // Track if navigation was attempted
          const mockOnClick = vi.fn();

          // Render the primary CTA button
          const { container } = render(
            <CTAButton
              label={label}
              href={href}
              variant="primary"
              onClick={mockOnClick}
            />
          );

          // Find the button element
          const button = container.querySelector('a');
          expect(button).toBeTruthy();

          // Verify href points to valid destination
          expect(button?.getAttribute('href')).toBe(href);
          expect([
            '/partner-registration',
            '/register',
            '/signup',
            '/contact',
            '/contact-us',
            '/get-started',
            '/request-demo'
          ]).toContain(href);

          // Simulate click
          if (button) {
            fireEvent.click(button);
          }

          // Verify onClick was called (navigation was attempted)
          expect(mockOnClick).toHaveBeenCalled();
        }
      ),
      { numRuns: 100 } // Run 100 iterations as specified in design doc
    );
  });

  it('should track analytics for any primary CTA click', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 5, maxLength: 30 }),
        fc.constantFrom(
          '/partner-registration',
          '/register',
          '/contact'
        ),
        (label, href) => {
          // Mock gtag for analytics tracking
          const mockGtag = vi.fn();
          (window as any).gtag = mockGtag;

          const { container } = render(
            <CTAButton
              label={label}
              href={href}
              variant="primary"
            />
          );

          const button = container.querySelector('a');
          if (button) {
            fireEvent.click(button);
          }

          // Verify analytics was called
          expect(mockGtag).toHaveBeenCalledWith(
            'event',
            'cta_click',
            expect.objectContaining({
              label,
              location: 'hero',
              href,
            })
          );

          // Cleanup
          delete (window as any).gtag;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should apply primary styling for any primary CTA', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 5, maxLength: 30 }),
        fc.string({ minLength: 5, maxLength: 50 }),
        (label, href) => {
          const { container } = render(
            <CTAButton
              label={label}
              href={href}
              variant="primary"
            />
          );

          const button = container.querySelector('a');
          expect(button).toBeTruthy();
          
          // Verify primary variant class is applied
          expect(button?.className).toContain('cta-button--primary');
          
          // Verify button has gradient background (check inline styles)
          const style = button?.getAttribute('style');
          expect(style).toContain('gradient');
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should be keyboard accessible for any primary CTA', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 5, maxLength: 30 }),
        fc.string({ minLength: 5, maxLength: 50 }),
        (label, href) => {
          const { container } = render(
            <CTAButton
              label={label}
              href={href}
              variant="primary"
            />
          );

          const button = container.querySelector('a');
          expect(button).toBeTruthy();
          
          // Verify aria-label is present
          expect(button?.getAttribute('aria-label')).toBe(label);
          
          // Verify it's a focusable element (anchor tag)
          expect(button?.tagName).toBe('A');
        }
      ),
      { numRuns: 100 }
    );
  });
});
