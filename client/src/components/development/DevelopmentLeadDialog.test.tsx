import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { DevelopmentLeadDialog } from './DevelopmentLeadDialog';

const mutateMock = vi.fn();

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

vi.mock('@/lib/analytics/advertiseTracking', () => ({
  trackFunnelStep: vi.fn(),
}));

vi.mock('@/lib/trpc', () => ({
  trpc: {
    developer: {
      createLead: {
        useMutation: () => ({
          mutate: mutateMock,
          isPending: false,
        }),
      },
    },
  },
}));

describe('DevelopmentLeadDialog', () => {
  beforeEach(() => {
    mutateMock.mockReset();
    window.history.pushState({}, '', '/');
  });

  it('submits unit context with info requests', () => {
    render(
      <DevelopmentLeadDialog
        open
        onOpenChange={() => {}}
        mode="info"
        ctaLocation="unit_floor_plan_dialog_unit-1_info"
        development={{
          id: 77,
          name: 'Cosmopolitan Projects',
          cataloguePublisherId: 13,
          transactionType: 'for_sale',
          publisherAuthorityKind: 'developer_first_party',
        }}
        unitContext={{
          unitId: 'unit-1',
          unitName: 'Type A',
          unitPriceFrom: 1299000,
          unitBedrooms: 3,
          unitBathrooms: 2,
        }}
      />,
    );

    fireEvent.change(screen.getByPlaceholderText(/full name/i), {
      target: { value: 'Jane Doe' },
    });
    fireEvent.change(screen.getByPlaceholderText(/email address/i), {
      target: { value: 'jane@example.com' },
    });
    fireEvent.change(screen.getByPlaceholderText(/phone number/i), {
      target: { value: '0820000000' },
    });

    window.history.pushState(
      {},
      '',
      '/development/cosmopolitan?utm_source=google&utm_medium=cpc&utm_campaign=launch',
    );

    fireEvent.click(
      screen.getByRole('checkbox', {
        name: /i agree to be contacted about this enquiry/i,
      }),
    );
    fireEvent.click(screen.getByRole('button', { name: /request information/i }));

    expect(screen.getAllByText('Unit: Type A').length).toBeGreaterThan(0);
    expect(mutateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        developmentId: 77,
        cataloguePublisherId: 13,
        transactionType: 'for_sale',
        unitId: 'unit-1',
        unitName: 'Type A',
        unitPriceFrom: 1299000,
        unitBedrooms: 3,
        unitBathrooms: 2,
        leadSource: 'development_detail_info',
        sourceSurface: 'unit_floor_plan_dialog_unit-1_info',
        utmSource: 'google',
        utmMedium: 'cpc',
        utmCampaign: 'launch',
        captureRequestId: expect.any(String),
        consent: expect.objectContaining({
          accepted: true,
          source: 'development_lead_dialog_info',
        }),
      }),
    );
  });

  it('submits rental viewing requests with monthly-rent context', () => {
    render(
      <DevelopmentLeadDialog
        open
        onOpenChange={() => {}}
        mode="viewing"
        listingType="rent"
        ctaLocation="development_rent_detail_viewing"
        development={{
          id: 88,
          name: 'Maple Grove Rentals',
          cataloguePublisherId: 21,
          transactionType: 'for_rent',
          publisherAuthorityKind: 'developer_first_party',
        }}
        unitContext={{
          unitId: 'rent-unit-2',
          unitName: 'Two Bedroom Garden Apartment',
          unitPriceFrom: 12000,
          unitBedrooms: 2,
          unitBathrooms: 1,
        }}
      />,
    );

    expect(screen.getByText('Monthly rent from')).toBeInTheDocument();
    expect(screen.getByText(/R12k\s*\/ month/i)).toBeInTheDocument();
    expect(screen.queryByText('Price From')).not.toBeInTheDocument();
    expect(screen.queryByText(/sales team/i)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /request a viewing/i })).toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText(/full name/i), {
      target: { value: 'Ava Renter' },
    });
    fireEvent.change(screen.getByPlaceholderText(/email address/i), {
      target: { value: 'ava@example.com' },
    });
    fireEvent.change(screen.getByPlaceholderText(/phone number/i), {
      target: { value: '0821111111' },
    });
    fireEvent.click(
      screen.getByRole('checkbox', {
        name: /i agree to be contacted about this enquiry/i,
      }),
    );
    fireEvent.click(screen.getByRole('button', { name: /request a viewing/i }));

    expect(mutateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        developmentId: 88,
        cataloguePublisherId: 21,
        transactionType: 'for_rent',
        unitId: 'rent-unit-2',
        unitPriceFrom: 12000,
        leadType: 'viewing_request',
        leadSource: 'development_detail_viewing',
        sourceSurface: 'development_rent_detail_viewing',
      }),
    );
  });

  it('uses truthful platform-reference wording for a sold-out enquiry', () => {
    render(
      <DevelopmentLeadDialog
        open
        onOpenChange={() => {}}
        mode="contact"
        development={{
          id: 99,
          name: 'Reference Heights',
          cataloguePublisherId: 31,
          transactionType: 'for_sale',
          publisherAuthorityKind: 'platform_reference',
          isSoldOut: true,
        }}
      />,
    );

    expect(screen.getAllByText('Register Interest').length).toBeGreaterThan(0);
    expect(screen.getByText(/not a direct message to an external developer/i)).toBeInTheDocument();
    expect(screen.queryByText(/sales team can respond/i)).not.toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText(/full name/i), {
      target: { value: 'Sam Prospect' },
    });
    fireEvent.change(screen.getByPlaceholderText(/email address/i), {
      target: { value: 'sam@example.com' },
    });
    fireEvent.change(screen.getByPlaceholderText(/phone number/i), {
      target: { value: '0822222222' },
    });
    fireEvent.click(
      screen.getByRole('checkbox', {
        name: /i agree to be contacted about this enquiry/i,
      }),
    );
    fireEvent.click(screen.getByRole('button', { name: /register interest/i }));

    expect(mutateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        developmentId: 99,
        cataloguePublisherId: 31,
        transactionType: 'for_sale',
        leadType: 'inquiry',
        captureRequestId: expect.any(String),
        consent: expect.objectContaining({ accepted: true }),
      }),
    );
  });
});
