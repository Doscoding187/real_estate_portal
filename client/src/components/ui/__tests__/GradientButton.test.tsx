/**
 * GradientButton Component Tests
 * Tests for gradient styling, hover effects, disabled states, and loading states
 *
 * Property 1: Gradient styling consistency
 * Property 7: Button hover scale effect
 * Property 8: Disabled button opacity
 * Property 9: Loading state gradient spinner
 *
 * Validates: Requirements 5.1, 5.2, 5.4, 5.5
 */

import { render, screen } from '@testing-library/react';
import { describe, test, expect } from 'vitest';
import { GradientButton } from '../GradientButton';
import { Home } from 'lucide-react';

describe('GradientButton', () => {
  describe('Property 1: Gradient styling consistency', () => {
    test('primary variant has blue-to-indigo gradient', () => {
      render(<GradientButton variant="primary">Primary Button</GradientButton>);
      const button = screen.getByRole('button');

      expect(button.className).toContain('from-blue-500');
      expect(button.className).toContain('to-indigo-600');
      expect(button.className).toContain('bg-gradient-to-r');
    });

    test('success variant has green-to-emerald gradient', () => {
      render(<GradientButton variant="success">Success Button</GradientButton>);
      const button = screen.getByRole('button');

      expect(button.className).toContain('from-green-500');
      expect(button.className).toContain('to-emerald-600');
      expect(button.className).toContain('bg-gradient-to-r');
    });

    test('warning variant has orange-to-red gradient', () => {
      render(<GradientButton variant="warning">Warning Button</GradientButton>);
      const button = screen.getByRole('button');

      expect(button.className).toContain('from-orange-500');
      expect(button.className).toContain('to-red-600');
      expect(button.className).toContain('bg-gradient-to-r');
    });

    test('all gradient variants have consistent transition duration', () => {
      const { rerender } = render(<GradientButton variant="primary">Button</GradientButton>);
      let button = screen.getByRole('button');
      expect(button.className).toContain('duration-300');

      rerender(<GradientButton variant="success">Button</GradientButton>);
      button = screen.getByRole('button');
      expect(button.className).toContain('duration-300');

      rerender(<GradientButton variant="warning">Button</GradientButton>);
      button = screen.getByRole('button');
      expect(button.className).toContain('duration-300');
    });
  });

  describe('Property 7: Button hover scale effect', () => {
    test('gradient buttons have hover scale class', () => {
      render(<GradientButton variant="primary">Hover Me</GradientButton>);
      const button = screen.getByRole('button');

      expect(button.className).toContain('hover:scale-[1.02]');
    });

    test('all gradient variants have hover shadow increase', () => {
      const variants: Array<'primary' | 'success' | 'warning'> = ['primary', 'success', 'warning'];

      variants.forEach(variant => {
        const { unmount } = render(<GradientButton variant={variant}>Button</GradientButton>);
        const button = screen.getByRole('button');

        expect(button.className).toContain('hover:shadow-lg');
        unmount();
      });
    });

    test('active state has press-down scale effect', () => {
      render(<GradientButton variant="primary">Press Me</GradientButton>);
      const button = screen.getByRole('button');

      expect(button.className).toContain('active:scale-[0.98]');
      expect(button.className).toContain('active:shadow-sm');
    });
  });

  describe('Property 8: Disabled button opacity', () => {
    test('disabled button has 60% opacity', () => {
      render(<GradientButton disabled>Disabled Button</GradientButton>);
      const button = screen.getByRole('button') as HTMLButtonElement;

      expect(button.className).toContain('disabled:opacity-60');
      expect(button.disabled).toBe(true);
    });

    test('disabled button has muted gradient colors', () => {
      render(
        <GradientButton variant="primary" disabled>
          Disabled
        </GradientButton>,
      );
      const button = screen.getByRole('button');

      expect(button.className).toContain('disabled:from-blue-400');
      expect(button.className).toContain('disabled:to-indigo-500');
    });

    test('disabled button prevents pointer events', () => {
      render(<GradientButton disabled>No Click</GradientButton>);
      const button = screen.getByRole('button');

      expect(button.className).toContain('disabled:pointer-events-none');
    });
  });

  describe('Property 9: Loading state gradient spinner', () => {
    test('loading button shows spinner', () => {
      render(<GradientButton loading>Loading</GradientButton>);

      const spinner = screen.getByLabelText('Loading');
      expect(spinner).toBeTruthy();
      expect(spinner.className).toContain('animate-spin');
    });

    test('loading button is disabled', () => {
      render(<GradientButton loading>Loading</GradientButton>);
      const button = screen.getByRole('button') as HTMLButtonElement;

      expect(button.disabled).toBe(true);
    });

    test('loading button hides icon when loading', () => {
      render(
        <GradientButton loading icon={Home}>
          Loading
        </GradientButton>,
      );

      // Spinner should be present
      expect(screen.getByLabelText('Loading')).toBeTruthy();

      // Home icon should not be rendered (only spinner)
      const svgs = screen.getAllByRole('button')[0].querySelectorAll('svg');
      expect(svgs.length).toBe(1); // Only the spinner
    });

    test('non-loading button shows icon', () => {
      render(<GradientButton icon={Home}>With Icon</GradientButton>);

      const button = screen.getByRole('button');
      const svgs = button.querySelectorAll('svg');
      expect(svgs.length).toBe(1); // The Home icon
    });
  });

  describe('Button sizes', () => {
    test('default size has correct height', () => {
      render(<GradientButton size="default">Default</GradientButton>);
      const button = screen.getByRole('button');

      expect(button.className).toContain('h-10');
      expect(button.className).toContain('px-6');
    });

    test('small size has correct height', () => {
      render(<GradientButton size="sm">Small</GradientButton>);
      const button = screen.getByRole('button');

      expect(button.className).toContain('h-8');
      expect(button.className).toContain('px-4');
    });

    test('large size has correct height', () => {
      render(<GradientButton size="lg">Large</GradientButton>);
      const button = screen.getByRole('button');

      expect(button.className).toContain('h-12');
      expect(button.className).toContain('px-8');
    });
  });

  describe('Icon support', () => {
    test('renders left icon', () => {
      render(<GradientButton icon={Home}>With Icon</GradientButton>);

      const button = screen.getByRole('button');
      expect(button.querySelector('svg')).toBeTruthy();
    });

    test('renders right icon', () => {
      render(<GradientButton iconRight={Home}>With Right Icon</GradientButton>);

      const button = screen.getByRole('button');
      expect(button.querySelector('svg')).toBeTruthy();
    });

    test('renders both left and right icons', () => {
      render(
        <GradientButton icon={Home} iconRight={Home}>
          Both Icons
        </GradientButton>,
      );

      const button = screen.getByRole('button');
      const svgs = button.querySelectorAll('svg');
      expect(svgs.length).toBe(2);
    });
  });

  describe('Accessibility', () => {
    test('button has proper role', () => {
      render(<GradientButton>Accessible</GradientButton>);
      expect(screen.getByRole('button')).toBeTruthy();
    });

    test('disabled button is not focusable', () => {
      render(<GradientButton disabled>Disabled</GradientButton>);
      const button = screen.getByRole('button') as HTMLButtonElement;

      expect(button.disabled).toBe(true);
      expect(button.className).toContain('disabled:pointer-events-none');
    });

    test('loading spinner has aria-label', () => {
      render(<GradientButton loading>Loading</GradientButton>);
      expect(screen.getByLabelText('Loading')).toBeTruthy();
    });

    test('icons have aria-hidden', () => {
      render(<GradientButton icon={Home}>With Icon</GradientButton>);

      const button = screen.getByRole('button');
      const svg = button.querySelector('svg');
      expect(svg?.getAttribute('aria-hidden')).toBe('true');
    });
  });

  describe('Outline variant', () => {
    test('outline variant has border and no gradient background', () => {
      render(<GradientButton variant="outline">Outline</GradientButton>);
      const button = screen.getByRole('button');

      expect(button.className).toContain('border-2');
      expect(button.className).toContain('bg-white');
      expect(button.className).not.toContain('bg-gradient-to-r');
    });

    test('outline variant has hover border color change', () => {
      render(<GradientButton variant="outline">Outline</GradientButton>);
      const button = screen.getByRole('button');

      expect(button.className).toContain('hover:border-blue-500');
      expect(button.className).toContain('hover:text-blue-600');
    });
  });

  describe('Custom className', () => {
    test('accepts and applies custom className', () => {
      render(<GradientButton className="custom-class">Custom</GradientButton>);
      const button = screen.getByRole('button');

      expect(button.className).toContain('custom-class');
    });

    test('custom className does not override variant styles', () => {
      render(
        <GradientButton variant="primary" className="custom-class">
          Custom
        </GradientButton>,
      );
      const button = screen.getByRole('button');

      expect(button.className).toContain('custom-class');
      expect(button.className).toContain('from-blue-500');
      expect(button.className).toContain('to-indigo-600');
    });
  });
});
