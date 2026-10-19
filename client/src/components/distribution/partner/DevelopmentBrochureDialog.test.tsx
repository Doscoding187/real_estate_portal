import { fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { BrochureItem } from '@/lib/distributionBrochure';
import { DevelopmentBrochureDialog } from './DevelopmentBrochureDialog';

const item: BrochureItem = {
  developmentName: 'Preview Ridge Estate',
  city: 'Cape Town',
  province: 'Western Cape',
  description: 'A demonstration development.',
  affordability: {
    policyVersion: 'checkfit_v1',
    available: true,
    annualInterestRate: 10.5,
    rateSource: 'sarb_prime_rate',
    rateSourceLabel: 'SARB prime rate (platform settings)',
    rateUpdatedAt: '2026-10-19T08:00:00.000Z',
    termMonths: 240,
    repaymentAllowanceRatio: 0.3,
    disclaimers: ['Indicative only.'],
  },
  unitTypes: [
    {
      id: 'unit-2',
      name: 'Two bedroom',
      bedrooms: 2,
      bathrooms: 2,
      size: 78,
      modes: { sale: { priceFrom: 1_150_000, priceTo: 1_150_000 } },
    },
  ],
};

afterEach(() => {
  vi.restoreAllMocks();
});

describe('DevelopmentBrochureDialog', () => {
  it('shows unit pricing with canonical affordability estimates', () => {
    render(<DevelopmentBrochureDialog open onOpenChange={() => {}} item={item} />);

    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByText('Preview Ridge Estate brochure')).toBeInTheDocument();
    expect(within(dialog).getByText('Two bedroom')).toBeInTheDocument();
    expect(within(dialog).getAllByText(/R\s?1\s?150\s?000/).length).toBeGreaterThan(0);
    expect(within(dialog).getByText(/R\s?11\s?481/)).toBeInTheDocument();
    expect(within(dialog).getByText(/R\s?38\s?271/)).toBeInTheDocument();
    expect(within(dialog).getByText(/240-month bond at 10\.50%/)).toBeInTheDocument();
  });

  it('shows an unavailable state when the prime rate is missing', () => {
    render(
      <DevelopmentBrochureDialog
        open
        onOpenChange={() => {}}
        item={{
          ...item,
          affordability: { ...item.affordability!, available: false, annualInterestRate: null },
        }}
      />,
    );

    const dialog = screen.getByRole('dialog');
    expect(
      within(dialog).getByText(/Affordability estimates are temporarily unavailable/),
    ).toBeInTheDocument();
    expect(within(dialog).getAllByText('Unavailable').length).toBeGreaterThan(0);
  });

  it('opens a print-ready brochure in a new window', () => {
    const fakeWindow = {
      document: { open: vi.fn(), write: vi.fn(), close: vi.fn() },
      focus: vi.fn(),
      print: vi.fn(),
    };
    const openSpy = vi.spyOn(window, 'open').mockReturnValue(fakeWindow as unknown as Window);

    render(<DevelopmentBrochureDialog open onOpenChange={() => {}} item={item} />);
    fireEvent.click(screen.getByRole('button', { name: /print or save pdf/i }));

    expect(openSpy).toHaveBeenCalled();
    expect(fakeWindow.document.write).toHaveBeenCalledWith(
      expect.stringContaining('240-month bond at 10.50%'),
    );
  });
});
