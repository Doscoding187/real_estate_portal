import { fireEvent, render, screen } from '@testing-library/react';
import type { AnchorHTMLAttributes, ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { commercialDetail, createLead, useRoute } = vi.hoisted(() => ({
  commercialDetail: vi.fn(),
  createLead: vi.fn(),
  useRoute: vi.fn(),
}));

vi.mock('@/lib/trpc', () => ({
  trpc: {
    commercial: { detail: { useQuery: (...args: unknown[]) => commercialDetail(...args) } },
    leads: { create: { useMutation: () => ({ mutate: createLead, isPending: false }) } },
  },
}));

vi.mock('wouter', () => ({
  Link: ({
    children,
    href,
    ...props
  }: AnchorHTMLAttributes<HTMLAnchorElement> & {
    children: ReactNode;
    href: string;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
  useRoute: () => useRoute(),
}));

import CommercialOfficeDetail from './CommercialOfficeDetail';

const detail = {
  listingId: 801,
  title: 'High-power warehouse in Midrand',
  description:
    'A logistics-ready warehouse with secure access, high eaves and practical loading capacity for an operating business.',
  asset: {
    id: 701,
    kind: 'industrial_park',
    name: 'Logistics Park',
    suburb: 'Midrand',
    city: 'Johannesburg',
  },
  space: {
    id: 601,
    useType: 'industrial_logistics',
    kind: 'warehouse',
    identifier: 'Warehouse 4',
    rentableAreaM2: '2500',
    usableAreaM2: '2350',
  },
  availability: {
    id: 901,
    state: 'available_confirmed',
    label: 'Available — confirmed',
    confirmedAt: '2026-08-20 10:00:00',
    source: 'Asset manager',
    occupationDate: null,
  },
  pricing: {
    mode: 'componentised',
    vatTreatment: 'excluded',
    quotedRent: { amountMinor: 8_500, chargeBasis: 'per_m2_month' },
  },
  costPassport: {
    monthlyMinimumMinor: 2_450_000,
    monthlyMaximumMinor: 2_450_000,
    unknownComponentCodes: ['utilities'],
  },
  economics: [
    {
      componentCode: 'base_rent',
      valueState: 'supplied',
      amountMinor: 8_500,
      chargeBasis: 'per_m2_month',
    },
    {
      componentCode: 'utilities',
      valueState: 'unknown',
      amountMinor: null,
      chargeBasis: null,
    },
  ],
  leaseTerms: {
    minimumLeaseMonths: 36,
    quotedLeaseMonths: 60,
    annualEscalationPercent: '8',
    depositMinor: 170_000,
    tenantInstallationAllowanceMinor: 100_000,
    beneficialOccupationDays: 30,
  },
  media: [
    {
      id: 1001,
      url: 'https://cdn.example.com/warehouse.jpg',
      thumbnailUrl: null,
      previewUrl: null,
      mediaType: 'image',
      originalFileName: 'warehouse.jpg',
    },
  ],
  specifications: [
    {
      specificationCode: 'parking_bays',
      valueState: 'known',
      numericValue: '12',
      textValue: null,
      booleanValue: null,
    },
    {
      specificationCode: 'eaves_height_m',
      valueState: 'known',
      numericValue: '11',
      textValue: null,
      booleanValue: null,
    },
    {
      specificationCode: 'power_capacity_kva',
      valueState: 'known',
      numericValue: '500',
      textValue: null,
      booleanValue: null,
    },
    {
      specificationCode: 'loading_docks',
      valueState: 'known',
      numericValue: '4',
      textValue: null,
      booleanValue: null,
    },
  ],
};

describe('CommercialOfficeDetail', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useRoute.mockReturnValue([true, { slug: 'high-power-warehouse' }]);
    commercialDetail.mockReturnValue({ data: detail, isLoading: false, error: null });
    createLead.mockImplementation((_input, callbacks) =>
      callbacks.onSuccess({
        deliveryStatus: 'delivered',
        leadCustody: 'verified_customer_recipient',
        recipientType: 'agent',
        recipientId: 55,
      }),
    );
  });

  it('renders commercial-native space, cost, lease and operational facts', () => {
    render(<CommercialOfficeDetail />);

    expect(commercialDetail).toHaveBeenCalledWith(
      { slug: 'high-power-warehouse' },
      { enabled: true },
    );
    expect(screen.getByRole('heading', { name: 'Commercial Cost Passport' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Space media' })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: /high-power warehouse.*media 1/i })).toHaveAttribute(
      'src',
      'https://cdn.example.com/warehouse.jpg',
    );
    expect(screen.getByText(/A logistics-ready warehouse/)).toBeInTheDocument();
    expect(screen.getByText(/Logistics Park.*Warehouse 4/)).toBeInTheDocument();
    expect(screen.getAllByText(/2\s?500 m²/)).not.toHaveLength(0);
    expect(screen.getByText('Minimum term')).toBeInTheDocument();
    expect(screen.getByText('36 months')).toBeInTheDocument();
    expect(screen.getByText('Eaves height m')).toBeInTheDocument();
    expect(screen.getByText('Confirm with the verified advertiser')).toBeInTheDocument();
    expect(screen.getByText(/Not included as R0: utilities/i)).toBeInTheDocument();
  });

  it('sends an enquiry against the canonical listing and availability only after consent', () => {
    render(<CommercialOfficeDetail />);

    const requestButton = screen.getByRole('button', { name: 'Request information' });
    expect(requestButton).toBeDisabled();

    fireEvent.change(screen.getByPlaceholderText('Your name'), { target: { value: 'A Tenant' } });
    fireEvent.change(screen.getByPlaceholderText('Email'), {
      target: { value: 'tenant@example.com' },
    });
    fireEvent.change(
      screen.getByPlaceholderText(
        'Tell the advertiser about your space, term and operational requirements',
      ),
      { target: { value: 'We need 500 kVA and docks.' } },
    );
    fireEvent.click(screen.getByRole('checkbox'));
    expect(requestButton).toBeEnabled();
    fireEvent.click(requestButton);

    expect(createLead).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'A Tenant',
        email: 'tenant@example.com',
        message: 'We need 500 kVA and docks.',
        listingId: 801,
        commercialAvailabilityId: 901,
        source: 'commercial',
        sourceSurface: 'commercial_detail',
        consent: expect.objectContaining({ accepted: true, source: 'commercial_enquiry' }),
      }),
      expect.any(Object),
    );
    expect(screen.getByRole('status')).toHaveTextContent(
      'Your enquiry was sent to the responsible verified advertiser.',
    );
  });
});
