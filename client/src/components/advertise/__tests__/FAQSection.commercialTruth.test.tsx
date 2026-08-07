import { cleanup, fireEvent, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { FAQSection } from '../FAQSection';

vi.mock('@/lib/analytics/advertiseTracking', () => ({
  trackFAQExpand: vi.fn(),
}));

vi.mock('../../hooks/useScrollAnimation', () => ({
  useScrollAnimation: () => ({
    ref: { current: null },
    isVisible: true,
  }),
}));

afterEach(() => {
  cleanup();
});

describe('Advertise FAQ commercial truth', () => {
  it('does not publish historical prices, discounts, or unsupported paid benefits', () => {
    const { container } = render(<FAQSection />);
    const buttons = Array.from(container.querySelectorAll('button[aria-expanded]'));

    for (const button of buttons) {
      fireEvent.click(button);
      const text = container.textContent || '';

      expect(text).not.toContain('R499');
      expect(text).not.toContain('R2,999');
      expect(text).not.toContain('priority placement');
      expect(text).not.toContain('up to 20% off');
      expect(text).not.toContain('unlimited listings');
    }
  });
});
