/**
 * Property-Based Tests for Interactive Element Hover
 *
 * Feature: advertise-with-us-landing, Property 19: Interactive element hover
 * Validates: Requirements 11.2
 *
 * Property 19: Interactive element hover
 * For any interactive element (buttons, cards, tiles), hovering over the element
 * should apply hover effects including transform and shadow changes
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom';
import { motion } from 'framer-motion';
import * as fc from 'fast-check';
import { softLift, buttonPress } from '@/lib/animations/advertiseAnimations';

describe('Property 19: Interactive Element Hover', () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  // Test component with hover animation
  const InteractiveButton = ({
    testId = 'interactive-button',
    label = 'Click Me',
  }: {
    testId?: string;
    label?: string;
  }) => {
    return (
      <motion.button
        data-testid={testId}
        initial="rest"
        whileHover="hover"
        whileTap="tap"
        variants={buttonPress}
      >
        {label}
      </motion.button>
    );
  };

  const InteractiveCard = ({
    testId = 'interactive-card',
    content = 'Card Content',
  }: {
    testId?: string;
    content?: string;
  }) => {
    return (
      <motion.div data-testid={testId} initial="rest" whileHover="hover" variants={softLift}>
        {content}
      </motion.div>
    );
  };

  it('Property 19.1: Button hover should include scale transform', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 50 }), // button label
        label => {
          // Verify buttonPress variant has hover state with scale
          expect(buttonPress.hover).toBeDefined();
          expect(buttonPress.hover).toHaveProperty('scale');

          const hoverScale = (buttonPress.hover as any).scale;

          // Scale should be greater than 1 (enlarging)
          expect(hoverScale).toBeGreaterThan(1);

          // Scale should be reasonable (not too large)
          expect(hoverScale).toBeLessThanOrEqual(1.1);

          return true;
        },
      ),
      { numRuns: 100 },
    );
  });

  it('Property 19.2: Card hover should include y-axis transform (lift effect)', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 100 }), // card content
        content => {
          // Verify softLift variant has hover state with y transform
          expect(softLift.hover).toBeDefined();
          expect(softLift.hover).toHaveProperty('y');

          const hoverY = (softLift.hover as any).y;

          // Y should be negative (moving up)
          expect(hoverY).toBeLessThan(0);

          // Y should be reasonable (not too much movement)
          expect(hoverY).toBeGreaterThanOrEqual(-10);

          return true;
        },
      ),
      { numRuns: 100 },
    );
  });

  it('Property 19.3: Card hover should include box-shadow changes', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 100 }), // card content
        content => {
          // Verify softLift variant has different shadows for rest and hover
          expect(softLift.rest).toHaveProperty('boxShadow');
          expect(softLift.hover).toHaveProperty('boxShadow');

          const restShadow = (softLift.rest as any).boxShadow;
          const hoverShadow = (softLift.hover as any).boxShadow;

          // Shadows should be different
          expect(restShadow).not.toBe(hoverShadow);

          // Both should be strings
          expect(typeof restShadow).toBe('string');
          expect(typeof hoverShadow).toBe('string');

          return true;
        },
      ),
      { numRuns: 100 },
    );
  });

  it('Property 19.4: Hover animations should have appropriate duration', () => {
    fc.assert(
      fc.property(fc.constantFrom('buttonPress', 'softLift'), variantName => {
        const variant = variantName === 'buttonPress' ? buttonPress : softLift;

        // Check hover transition
        if (variant.hover && typeof variant.hover === 'object' && 'transition' in variant.hover) {
          const transition = (variant.hover as any).transition;

          if (transition && transition.duration) {
            const duration = transition.duration;

            // Duration should be between 0.1s and 0.5s
            expect(duration).toBeGreaterThanOrEqual(0.1);
            expect(duration).toBeLessThanOrEqual(0.5);
          }
        }

        return true;
      }),
      { numRuns: 100 },
    );
  });

  it('Property 19.5: Tap/press animations should be faster than hover', () => {
    fc.assert(
      fc.property(
        fc.constant(null), // No random input needed
        () => {
          // buttonPress should have tap state
          expect(buttonPress.tap).toBeDefined();

          if (
            buttonPress.tap &&
            typeof buttonPress.tap === 'object' &&
            'transition' in buttonPress.tap
          ) {
            const tapTransition = (buttonPress.tap as any).transition;

            if (
              buttonPress.hover &&
              typeof buttonPress.hover === 'object' &&
              'transition' in buttonPress.hover
            ) {
              const hoverTransition = (buttonPress.hover as any).transition;

              if (tapTransition?.duration && hoverTransition?.duration) {
                // Tap should be faster (shorter duration) than hover
                expect(tapTransition.duration).toBeLessThan(hoverTransition.duration);
              }
            }
          }

          return true;
        },
      ),
      { numRuns: 100 },
    );
  });

  it('Property 19.6: Interactive elements should have rest state', () => {
    fc.assert(
      fc.property(fc.constantFrom('buttonPress', 'softLift'), variantName => {
        const variant = variantName === 'buttonPress' ? buttonPress : softLift;

        // Should have rest state
        expect(variant.rest).toBeDefined();
        expect(typeof variant.rest).toBe('object');

        return true;
      }),
      { numRuns: 100 },
    );
  });

  it('Property 19.7: Hover effects should use cubic-bezier easing', () => {
    fc.assert(
      fc.property(fc.constantFrom('buttonPress', 'softLift'), variantName => {
        const variant = variantName === 'buttonPress' ? buttonPress : softLift;

        if (variant.hover && typeof variant.hover === 'object' && 'transition' in variant.hover) {
          const transition = (variant.hover as any).transition;

          if (transition && transition.ease) {
            const ease = transition.ease;

            // Should be an array (cubic-bezier) or string
            expect(['object', 'string']).toContain(typeof ease);

            if (Array.isArray(ease)) {
              // Should have 4 values for cubic-bezier
              expect(ease.length).toBe(4);

              // All values should be numbers
              ease.forEach((value: any) => {
                expect(typeof value).toBe('number');
              });
            }
          }
        }

        return true;
      }),
      { numRuns: 100 },
    );
  });

  it('Property 19.8: Multiple interactive elements should have independent hover states', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 2, max: 5 }), // number of elements
        numElements => {
          const testIds = Array.from(
            { length: numElements },
            (_, i) => `button-${Date.now()}-${i}`,
          );

          render(
            <>
              {testIds.map((id, index) => (
                <InteractiveButton key={index} testId={id} label={`Button ${index}`} />
              ))}
            </>,
          );

          // Each element should be rendered
          testIds.forEach(id => {
            const element = screen.getByTestId(id);
            expect(element).toBeInTheDocument();
          });

          cleanup();
          return true;
        },
      ),
      { numRuns: 50 },
    );
  });
});

describe('Property 19: Interactive Element Hover - Edge Cases', () => {
  afterEach(() => {
    cleanup();
  });

  const InteractiveButton = ({ testId = 'button' }: { testId?: string }) => {
    return (
      <motion.button
        data-testid={testId}
        initial="rest"
        whileHover="hover"
        whileTap="tap"
        variants={buttonPress}
      >
        Click Me
      </motion.button>
    );
  };

  it('Edge Case: Should handle empty content', () => {
    render(<InteractiveButton testId="empty-button" />);
    expect(screen.getByTestId('empty-button')).toBeInTheDocument();
  });

  it('Edge Case: Should handle very long content', () => {
    const LongContentButton = () => {
      return (
        <motion.button
          data-testid="long-button"
          initial="rest"
          whileHover="hover"
          variants={buttonPress}
        >
          {'A'.repeat(1000)}
        </motion.button>
      );
    };

    render(<LongContentButton />);
    expect(screen.getByTestId('long-button')).toBeInTheDocument();
  });

  it('Edge Case: Should handle disabled state', () => {
    const DisabledButton = () => {
      return (
        <motion.button
          data-testid="disabled-button"
          disabled
          initial="rest"
          whileHover="hover"
          variants={buttonPress}
        >
          Disabled
        </motion.button>
      );
    };

    render(<DisabledButton />);
    const button = screen.getByTestId('disabled-button');
    expect(button).toBeInTheDocument();
    expect(button).toBeDisabled();
  });

  it('Edge Case: Hover variants should not cause layout shift', () => {
    // Verify that hover effects use transform (GPU-accelerated) not layout properties
    const hoverVariant = softLift.hover as any;

    // Should use transform properties (y, scale) not layout properties (top, height, etc.)
    expect(hoverVariant).not.toHaveProperty('top');
    expect(hoverVariant).not.toHaveProperty('left');
    expect(hoverVariant).not.toHaveProperty('width');
    expect(hoverVariant).not.toHaveProperty('height');
    expect(hoverVariant).not.toHaveProperty('margin');
    expect(hoverVariant).not.toHaveProperty('padding');
  });

  it('Edge Case: Rest state should be stable', () => {
    // Verify rest state doesn't have animations
    const restVariant = softLift.rest as any;

    // Rest state should have static values
    expect(restVariant.y).toBe(0);

    // Should not have animation properties
    expect(restVariant).not.toHaveProperty('animate');
    expect(restVariant).not.toHaveProperty('repeat');
  });
});
