import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';

const { search } = vi.hoisted(() => ({ search: vi.fn(() => ({ data: [] })) }));
vi.mock('@/lib/trpc', () => ({ trpc: { commercialOffice: { search: { useQuery: search } } } }));
vi.mock('wouter', () => ({
  Link: ({ children, href }: any) => (
    <a href={href}>{children}</a>
  ),
}));

import CommercialOffice from './CommercialOffice';

function mockResults(count: number) {
  return Array.from({ length: count }, (_, index) => ({
    availability: { id: index + 1, label: 'Available now' },
    asset: { name: `Asset ${index + 1}`, suburb: 'Sandton', city: 'Johannesburg' },
    space: { identifier: `Space ${index + 1}`, rentableAreaM2: 100 },
    pricing: { quotedRent: null },
    costPassport: { monthlyMinimumMinor: 1, monthlyMaximumMinor: 2, unknownComponentCodes: [] },
    href: `/commercial/space-${index + 1}`,
  }));
}

describe('CommercialOffice handoff', () => {
  beforeEach(() => {
    window.history.replaceState({}, '', '/commercial');
    search.mockReset();
    search.mockReturnValue({ data: [] });
  });

  it('consumes the shared location URL parameter on load', () => {
    window.history.replaceState({}, '', '/commercial?location=Sandton');
    render(<CommercialOffice />);
    expect(screen.getByLabelText('Location')).toHaveValue('Sandton');
    expect(search).toHaveBeenCalledWith(
      expect.objectContaining({ location: 'Sandton' }),
      { enabled: true },
    );
  });

  it('fails closed for an unsupported specialist location scope', () => {
    search.mockClear();
    window.history.replaceState({}, '', '/commercial?searchError=unsupported-location-scope');
    render(<CommercialOffice />);
    expect(screen.getByRole('alert')).toHaveTextContent('Choose one location');
    expect(search).toHaveBeenCalledWith(expect.any(Object), { enabled: false });
    expect(screen.queryByText('No published Office spaces match these requirements.')).not.toBeInTheDocument();
  });

  it('restores every active filter from the URL so refresh preserves intent', () => {
    window.history.replaceState(
      {},
      '',
      '/commercial?location=Sandton&minAreaM2=80&maxAreaM2=200&maxMonthlyBudget=35000&availability=future&fitOutCondition=fitted&backupPower=1&backupWater=1&fibreConnectivity=1&minParkingBays=4',
    );
    render(<CommercialOffice />);
    expect(screen.getByLabelText('Location')).toHaveValue('Sandton');
    expect(screen.getByLabelText('Minimum square metres')).toHaveValue(80);
    expect(screen.getByLabelText('Maximum square metres')).toHaveValue(200);
    expect(screen.getByLabelText('Monthly occupancy budget')).toHaveValue(35000);
    expect(screen.getByLabelText('Availability')).toHaveValue('future');
    expect(screen.getByLabelText('Fit-out condition')).toHaveValue('fitted');
    expect(screen.getByLabelText('Minimum parking bays')).toHaveValue(4);
    expect(screen.getByLabelText('Backup power')).toBeChecked();
    expect(screen.getByLabelText('Backup water')).toBeChecked();
    expect(screen.getByLabelText('Fibre')).toBeChecked();
    expect(search).toHaveBeenCalledWith(
      expect.objectContaining({
        location: 'Sandton',
        minAreaM2: 80,
        maxAreaM2: 200,
        maxMonthlyBudgetMinor: 3_500_000,
        availability: 'future',
        fitOutCondition: 'fitted',
        backupPower: true,
        backupWater: true,
        fibreConnectivity: true,
        minParkingBays: 4,
      }),
      { enabled: true },
    );
  });

  it('pages large result sets instead of rendering an unbounded list', () => {
    search.mockReturnValue({ data: mockResults(30) });
    render(<CommercialOffice />);
    const links = screen.getAllByRole('link');
    // PAGE_SIZE cards rendered; the rest sit behind pagination.
    expect(links.filter(link => link.getAttribute('href')?.startsWith('/commercial/')).length).toBe(24);
    expect(screen.getByText(/Page 1 of 2 · 30 spaces/)).toBeInTheDocument();
    expect(search).toHaveBeenCalledTimes(1);
  });
});
