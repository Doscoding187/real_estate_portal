import { cleanup, fireEvent, render, screen } from '@testing-library/react';
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
  it('covers the approved Launch Access policy questions', () => {
    render(<FAQSection />);

    for (const question of [
      'What is Launch Access?',
      'How much does Launch Access cost?',
      'Is this price monthly?',
      'When do the 90 days begin?',
      'How do I pay?',
      'What happens after 90 days, and does Launch Access automatically renew?',
      'What does Agent, Agency or Developer Launch Access include?',
      'How many listings can I publish?',
      'Are leads, enquiries or sales guaranteed?',
      'Can I contact Property Listify for a custom conversation?',
    ]) {
      expect(screen.getByText(question)).toBeInTheDocument();
    }
  });

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
