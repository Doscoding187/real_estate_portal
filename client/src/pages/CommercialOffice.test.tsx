import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';

const { search } = vi.hoisted(() => ({ search: vi.fn(() => ({ data: [] })) }));
vi.mock('@/lib/trpc', () => ({ trpc: { commercial: { search: { useQuery: search } } } }));
vi.mock('wouter', () => ({
  Link: ({ children, href }: any) => <a href={href}>{children}</a>,
}));

import CommercialOffice from './CommercialOffice';

function mockResults(count: number) {
  return Array.from({ length: count }, (_, index) => ({
    availability: { id: index + 1, label: 'Available now' },
    asset: { name: `Asset ${index + 1}`, suburb: 'Sandton', city: 'Johannesburg' },
    space: {
      identifier: `Space ${index + 1}`,
      rentableAreaM2: 100,
      useType: 'industrial_logistics',
    },
    pricing: { quotedRent: null },
    costPassport: { monthlyMinimumMinor: 1, monthlyMaximumMinor: 2, unknownComponentCodes: [] },
    media:
      index === 0
        ? [
            {
              mediaType: 'image',
              url: 'https://cdn.example.com/commercial-space.jpg',
              isPrimary: 1,
            },
          ]
        : [],
    href: `/commercial/space-${index + 1}`,
  }));
}

describe('Commercial leasing discovery', () => {
  beforeEach(() => {
    window.history.replaceState({}, '', '/commercial');
    search.mockReset();
    search.mockReturnValue({ data: [] });
  });

  it('consumes the shared location URL parameter on load', () => {
    window.history.replaceState({}, '', '/commercial?location=Sandton');
    render(<CommercialOffice />);
    expect(screen.getByLabelText('Location')).toHaveValue('Sandton');
    expect(search).toHaveBeenCalledWith(expect.objectContaining({ location: 'Sandton' }), {
      enabled: true,
    });
  });

  it('fails closed for an unsupported specialist location scope', () => {
    search.mockClear();
    window.history.replaceState({}, '', '/commercial?searchError=unsupported-location-scope');
    render(<CommercialOffice />);
    expect(screen.getByRole('alert')).toHaveTextContent('Choose a city, suburb or province');
    expect(search).toHaveBeenCalledWith(expect.any(Object), { enabled: false });
    expect(
      screen.queryByText('No published Commercial spaces match these requirements.'),
    ).not.toBeInTheDocument();
  });

  it('fails closed when a handoff combines text and canonical location authorities', () => {
    window.history.replaceState({}, '', '/commercial?location=Sandton&locationIds=city%3A12');
    render(<CommercialOffice />);

    expect(screen.getByRole('alert')).toHaveTextContent(
      'received both a text location and canonical location IDs',
    );
    expect(search).toHaveBeenCalledWith(expect.any(Object), { enabled: false });
  });

  it('restores every active filter from the URL so refresh preserves intent', () => {
    window.history.replaceState(
      {},
      '',
      '/commercial?location=Sandton&useTypes=industrial_logistics,retail&availability=future&pricingMode=gross_quote&minAreaM2=80&maxAreaM2=200&maxMonthlyBudget=35000&minParkingBays=5&minEavesHeightM=8&minPowerCapacityKva=250&minLoadingDocks=2&yardHardstand=1&extractionCapability=1&backupPower=1&fibreConnectivity=1',
    );
    render(<CommercialOffice />);
    expect(screen.getByLabelText('Location')).toHaveValue('Sandton');
    expect(screen.getByLabelText('Minimum square metres')).toHaveValue(80);
    expect(screen.getByLabelText('Maximum square metres')).toHaveValue(200);
    expect(screen.getByLabelText('Monthly occupancy budget')).toHaveValue(35000);
    expect(screen.getByLabelText('Backup power')).toBeChecked();
    expect(screen.getByLabelText('Fibre')).toBeChecked();
    expect(screen.getByLabelText('Industrial & logistics')).toBeChecked();
    expect(screen.getByLabelText('Retail')).toBeChecked();
    expect(screen.getByLabelText('Availability')).toHaveValue('future');
    expect(screen.getByLabelText('Rental basis')).toHaveValue('gross_quote');
    expect(screen.getByLabelText('Minimum parking bays')).toHaveValue(5);
    expect(screen.getByLabelText('Minimum eaves height')).toHaveValue(8);
    expect(screen.getByLabelText('Minimum power capacity')).toHaveValue(250);
    expect(screen.getByLabelText('Minimum loading docks')).toHaveValue(2);
    expect(screen.getByLabelText('Yard or hardstand')).toBeChecked();
    expect(screen.getByLabelText('Extraction capability')).toBeChecked();
    expect(search).toHaveBeenCalledWith(
      expect.objectContaining({
        location: 'Sandton',
        minAreaM2: 80,
        maxAreaM2: 200,
        maxMonthlyBudgetMinor: 3_500_000,
        useTypes: ['industrial_logistics', 'retail'],
        availability: 'future',
        pricingMode: 'gross_quote',
        minParkingBays: 5,
        minEavesHeightM: 8,
        minPowerCapacityKva: 250,
        minLoadingDocks: 2,
        yardHardstand: true,
        extractionCapability: true,
        backupPower: true,
        fibreConnectivity: true,
      }),
      { enabled: true },
    );
  });

  it('preserves a canonical location scope without falling back to display text', () => {
    window.history.replaceState(
      {},
      '',
      '/commercial?locationIds=suburb%3A34&locationIds=suburb%3A35',
    );
    render(<CommercialOffice />);
    expect(
      screen.getByText('Canonical location scope selected from the homepage.'),
    ).toBeInTheDocument();
    expect(search).toHaveBeenCalledWith(
      expect.objectContaining({ location: undefined, locationIds: ['suburb:34', 'suburb:35'] }),
      { enabled: true },
    );
  });

  it('pages large result sets instead of rendering an unbounded list', () => {
    search.mockReturnValue({ data: mockResults(30) });
    render(<CommercialOffice />);
    const links = screen.getAllByRole('link');
    // PAGE_SIZE cards rendered; the rest sit behind pagination.
    expect(links.filter(link => link.getAttribute('href')?.startsWith('/commercial/')).length).toBe(
      24,
    );
    expect(screen.getByText(/Page 1 of 2 · 30 spaces/)).toBeInTheDocument();
    expect(search).toHaveBeenCalledTimes(1);
  });

  it('uses the governed Listing-media projection for a Commercial search card', () => {
    search.mockReturnValue({ data: mockResults(1) });
    render(<CommercialOffice />);

    expect(screen.getByRole('img', { name: 'Asset 1 — Space 1' })).toHaveAttribute(
      'src',
      'https://cdn.example.com/commercial-space.jpg',
    );
  });
});
