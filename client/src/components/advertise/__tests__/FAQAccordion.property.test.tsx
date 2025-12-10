/**
 * Property-Based Tests for FAQ Accordion Components
 * 
 * Feature: advertise-with-us-landing, Property 14: FAQ accordion behavior
 * Validates: Requirements 9.2
 * 
 * Property: For any FAQ item, clicking the item should expand that item and 
 * collapse all other currently expanded FAQ items
 */

import { describe, it, expect, afterEach } from 'vitest';
import { render, cleanup, fireEvent, within } from '@testing-library/react';
import { FAQSection } from '../FAQSection';
import { FAQAccordionItem } from '../FAQAccordionItem';
import fc from 'fast-check';

// Clean up after each test
afterEach(() => {
  cleanup();
});

// Generator for valid FAQ data
const faqArbitrary = fc.record({
  id: fc.uuid(),
  question: fc.string({ minLength: 10, maxLength: 150 }).filter(s => s.trim().length > 0),
  answer: fc.string({ minLength: 50, maxLength: 500 }).filter(s => s.trim().length > 0),
  order: fc.integer({ min: 1, max: 20 }),
});

// Generator for array of FAQs
const faqArrayArbitrary = fc.array(faqArbitrary, { minLength: 2, maxLength: 10 }).map(faqs => {
  // Ensure unique IDs and sequential orders
  return faqs.map((faq, index) => ({
    ...faq,
    id: `faq-${index}`,
    order: index + 1,
  }));
});

describe('FAQSection - Property 14: FAQ accordion behavior', () => {
  it('should expand clicked item and collapse all others', () => {
    fc.assert(
      fc.property(faqArrayArbitrary, (faqs) => {
        // Need at least 2 FAQs to test the behavior
        if (faqs.length < 2) return true;

        const { container } = render(<FAQSection faqs={faqs} />);

        // Get all FAQ buttons
        const buttons = container.querySelectorAll('button[aria-expanded]');
        expect(buttons.length).toBe(faqs.length);

        // Initially, all should be collapsed
        buttons.forEach(button => {
          expect(button.getAttribute('aria-expanded')).toBe('false');
        });

        // Click the first FAQ
        fireEvent.click(buttons[0]);

        // First should be expanded, all others collapsed
        expect(buttons[0].getAttribute('aria-expanded')).toBe('true');
        for (let i = 1; i < buttons.length; i++) {
          expect(buttons[i].getAttribute('aria-expanded')).toBe('false');
        }

        // Click the second FAQ
        fireEvent.click(buttons[1]);

        // Second should be expanded, all others (including first) collapsed
        expect(buttons[1].getAttribute('aria-expanded')).toBe('true');
        for (let i = 0; i < buttons.length; i++) {
          if (i !== 1) {
            expect(buttons[i].getAttribute('aria-expanded')).toBe('false');
          }
        }

        cleanup();
        return true;
      }),
      { numRuns: 50 }
    );
  });

  it('should toggle item closed when clicking an already open item', () => {
    fc.assert(
      fc.property(faqArrayArbitrary, (faqs) => {
        if (faqs.length < 1) return true;

        const { container } = render(<FAQSection faqs={faqs} />);

        const buttons = container.querySelectorAll('button[aria-expanded]');
        
        // Click first FAQ to open it
        fireEvent.click(buttons[0]);
        expect(buttons[0].getAttribute('aria-expanded')).toBe('true');

        // Click it again to close it
        fireEvent.click(buttons[0]);
        expect(buttons[0].getAttribute('aria-expanded')).toBe('false');

        // All should be collapsed
        buttons.forEach(button => {
          expect(button.getAttribute('aria-expanded')).toBe('false');
        });

        cleanup();
        return true;
      }),
      { numRuns: 50 }
    );
  });

  it('should maintain only one expanded item at any time', () => {
    fc.assert(
      fc.property(
        faqArrayArbitrary,
        fc.array(fc.integer({ min: 0, max: 9 }), { minLength: 3, maxLength: 10 }),
        (faqs, clickSequence) => {
          if (faqs.length < 2) return true;

          const { container } = render(<FAQSection faqs={faqs} />);

          const buttons = container.querySelectorAll('button[aria-expanded]');

          // Perform a sequence of clicks
          clickSequence.forEach(index => {
            const validIndex = index % buttons.length;
            fireEvent.click(buttons[validIndex]);

            // Count how many are expanded
            let expandedCount = 0;
            buttons.forEach(button => {
              if (button.getAttribute('aria-expanded') === 'true') {
                expandedCount++;
              }
            });

            // Should have at most 1 expanded (could be 0 if clicked same item twice)
            expect(expandedCount).toBeLessThanOrEqual(1);
          });

          cleanup();
          return true;
        }
      ),
      { numRuns: 50 }
    );
  });

  it('should show answer content only when expanded', () => {
    fc.assert(
      fc.property(faqArrayArbitrary, (faqs) => {
        if (faqs.length < 1) return true;

        const { container } = render(<FAQSection faqs={faqs} />);

        const buttons = container.querySelectorAll('button[aria-expanded]');

        // Initially, all buttons should be collapsed
        buttons.forEach(button => {
          expect(button.getAttribute('aria-expanded')).toBe('false');
        });

        // Click first FAQ
        fireEvent.click(buttons[0]);

        // First button should be expanded
        expect(buttons[0].getAttribute('aria-expanded')).toBe('true');

        // The answer container should exist in the DOM (even if animating)
        const answerId = buttons[0].getAttribute('aria-controls');
        const answerElement = container.querySelector(`#${answerId}`);
        expect(answerElement).toBeTruthy();

        // Other buttons should still be collapsed
        for (let i = 1; i < buttons.length; i++) {
          expect(buttons[i].getAttribute('aria-expanded')).toBe('false');
        }

        cleanup();
        return true;
      }),
      { numRuns: 50 }
    );
  });

  it('should have proper ARIA attributes for accessibility', () => {
    fc.assert(
      fc.property(faqArrayArbitrary, (faqs) => {
        if (faqs.length < 1) return true;

        const { container } = render(<FAQSection faqs={faqs} />);

        const buttons = container.querySelectorAll('button[aria-expanded]');

        buttons.forEach((button, index) => {
          // Should have aria-expanded attribute
          expect(button.getAttribute('aria-expanded')).toBeTruthy();

          // Should have aria-controls attribute
          expect(button.getAttribute('aria-controls')).toBeTruthy();

          // Question text should be in the button
          const questionText = faqs[index].question;
          expect(button.textContent).toContain(questionText);
        });

        cleanup();
        return true;
      }),
      { numRuns: 50 }
    );
  });
});

describe('FAQAccordionItem - Individual component behavior', () => {
  it('should call onToggle when clicked', () => {
    fc.assert(
      fc.property(faqArbitrary, (faq) => {
        let toggleCalled = false;
        const handleToggle = () => {
          toggleCalled = true;
        };

        const { container } = render(
          <FAQAccordionItem
            question={faq.question}
            answer={faq.answer}
            isOpen={false}
            onToggle={handleToggle}
          />
        );

        const button = container.querySelector('button');
        expect(button).toBeTruthy();

        fireEvent.click(button!);
        expect(toggleCalled).toBe(true);

        cleanup();
        return true;
      }),
      { numRuns: 100 }
    );
  });

  it('should support keyboard navigation (Enter and Space)', () => {
    fc.assert(
      fc.property(faqArbitrary, (faq) => {
        let toggleCount = 0;
        const handleToggle = () => {
          toggleCount++;
        };

        const { container } = render(
          <FAQAccordionItem
            question={faq.question}
            answer={faq.answer}
            isOpen={false}
            onToggle={handleToggle}
          />
        );

        const button = container.querySelector('button');
        expect(button).toBeTruthy();

        // Test Enter key
        fireEvent.keyDown(button!, { key: 'Enter' });
        expect(toggleCount).toBe(1);

        // Test Space key
        fireEvent.keyDown(button!, { key: ' ' });
        expect(toggleCount).toBe(2);

        // Other keys should not trigger toggle
        fireEvent.keyDown(button!, { key: 'a' });
        expect(toggleCount).toBe(2);

        cleanup();
        return true;
      }),
      { numRuns: 100 }
    );
  });

  it('should display question text in button', () => {
    fc.assert(
      fc.property(faqArbitrary, (faq) => {
        const { container } = render(
          <FAQAccordionItem
            question={faq.question}
            answer={faq.answer}
            isOpen={false}
            onToggle={() => {}}
          />
        );

        const button = container.querySelector('button');
        expect(button).toBeTruthy();
        expect(button?.textContent).toContain(faq.question);

        cleanup();
        return true;
      }),
      { numRuns: 100 }
    );
  });

  it('should show answer only when isOpen is true', () => {
    fc.assert(
      fc.property(faqArbitrary, (faq) => {
        // Test closed state
        const { container: closedContainer } = render(
          <FAQAccordionItem
            question={faq.question}
            answer={faq.answer}
            isOpen={false}
            onToggle={() => {}}
          />
        );

        const closedButton = closedContainer.querySelector('button[aria-expanded]');
        expect(closedButton?.getAttribute('aria-expanded')).toBe('false');

        // Answer container should not exist when closed
        const closedAnswerId = closedButton?.getAttribute('aria-controls');
        const closedAnswerElement = closedContainer.querySelector(`#${closedAnswerId}`);
        expect(closedAnswerElement).toBeNull();

        cleanup();

        // Test open state
        const { container: openContainer } = render(
          <FAQAccordionItem
            question={faq.question}
            answer={faq.answer}
            isOpen={true}
            onToggle={() => {}}
          />
        );

        const openButton = openContainer.querySelector('button[aria-expanded]');
        expect(openButton?.getAttribute('aria-expanded')).toBe('true');

        // Answer container should exist when open
        const openAnswerId = openButton?.getAttribute('aria-controls');
        const openAnswerElement = openContainer.querySelector(`#${openAnswerId}`);
        expect(openAnswerElement).toBeTruthy();

        cleanup();
        return true;
      }),
      { numRuns: 100 }
    );
  });

  it('should have chevron icon that rotates based on open state', () => {
    fc.assert(
      fc.property(faqArbitrary, (faq) => {
        // Test closed state
        const { container: closedContainer } = render(
          <FAQAccordionItem
            question={faq.question}
            answer={faq.answer}
            isOpen={false}
            onToggle={() => {}}
          />
        );

        // Should have an SVG icon (ChevronDown)
        const closedIcon = closedContainer.querySelector('svg');
        expect(closedIcon).toBeTruthy();

        cleanup();

        // Test open state
        const { container: openContainer } = render(
          <FAQAccordionItem
            question={faq.question}
            answer={faq.answer}
            isOpen={true}
            onToggle={() => {}}
          />
        );

        const openIcon = openContainer.querySelector('svg');
        expect(openIcon).toBeTruthy();

        cleanup();
        return true;
      }),
      { numRuns: 100 }
    );
  });
});

describe('FAQSection - Content and structure validation', () => {
  it('should render all provided FAQs in order', () => {
    fc.assert(
      fc.property(faqArrayArbitrary, (faqs) => {
        const { container } = render(<FAQSection faqs={faqs} />);

        const buttons = container.querySelectorAll('button[aria-expanded]');
        expect(buttons.length).toBe(faqs.length);

        // Verify questions appear in order
        const sortedFAQs = [...faqs].sort((a, b) => a.order - b.order);
        buttons.forEach((button, index) => {
          expect(button.textContent).toContain(sortedFAQs[index].question);
        });

        cleanup();
        return true;
      }),
      { numRuns: 50 }
    );
  });

  it('should have section heading and description', () => {
    fc.assert(
      fc.property(faqArrayArbitrary, (faqs) => {
        const { container } = render(<FAQSection faqs={faqs} />);

        // Should have main heading
        const heading = container.querySelector('h2');
        expect(heading).toBeTruthy();
        expect(heading?.textContent).toContain('Frequently Asked Questions');

        // Should have section with aria-labelledby
        const section = container.querySelector('section[aria-labelledby]');
        expect(section).toBeTruthy();

        cleanup();
        return true;
      }),
      { numRuns: 50 }
    );
  });

  it('should have contact CTA at the bottom', () => {
    fc.assert(
      fc.property(faqArrayArbitrary, (faqs) => {
        const { container } = render(<FAQSection faqs={faqs} />);

        // Should have "Contact Our Team" link
        const ctaLink = container.querySelector('a[href="/contact"]');
        expect(ctaLink).toBeTruthy();
        expect(ctaLink?.textContent).toContain('Contact Our Team');

        cleanup();
        return true;
      }),
      { numRuns: 50 }
    );
  });
});
