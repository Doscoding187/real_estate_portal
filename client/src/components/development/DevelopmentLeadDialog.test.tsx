import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import {
  DevelopmentLeadDialog,
  getDevelopmentLeadDialogCopy,
  getDevelopmentLeadDialogGeneratedMessage,
  normalizeDevelopmentLeadDialogTransactionType,
} from './DevelopmentLeadDialog';
import { DEVELOPMENT_UNIT_ID_MAX_LENGTH } from '../../../../shared/developmentUnitIdentity';

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
  });

  it('normalizes lead dialog transaction aliases', () => {
    expect(normalizeDevelopmentLeadDialogTransactionType('for_rent')).toBe('rent');
    expect(normalizeDevelopmentLeadDialogTransactionType('to-rent')).toBe('rent');
    expect(normalizeDevelopmentLeadDialogTransactionType('on auction')).toBe('auction');
    expect(normalizeDevelopmentLeadDialogTransactionType('for_sale')).toBe('sale');
  });

  it('builds transaction-native dialog copy', () => {
    expect(getDevelopmentLeadDialogCopy('contact', 'sale')).toMatchObject({
      title: 'Contact Sales Team',
      submitLabel: 'Send Enquiry',
      attributionLabel: 'Sales attribution',
    });

    expect(getDevelopmentLeadDialogCopy('brochure', 'for_rent')).toMatchObject({
      title: 'Request Rental Pack',
      submitLabel: 'Request Rental Pack',
      captureLabel: 'Rental Lead',
      attributionLabel: 'Leasing attribution',
    });

    expect(getDevelopmentLeadDialogCopy('qualification', 'auction')).toMatchObject({
      title: 'Check Bidder Readiness',
      submitLabel: 'Check Bidder Readiness',
      captureLabel: 'Auction Lead',
      attributionLabel: 'Auction attribution',
    });
  });

  it('builds transaction-native suggested messages', () => {
    expect(
      getDevelopmentLeadDialogGeneratedMessage({
        mode: 'info',
        transactionType: 'for_rent',
        subject: 'Type R at Harbour Rentals',
      }),
    ).toContain('monthly rent, lease terms');

    expect(
      getDevelopmentLeadDialogGeneratedMessage({
        mode: 'brochure',
        transactionType: 'auction',
        subject: 'Auction Heights',
      }),
    ).toContain('auction pack, starting bid details');

    expect(
      getDevelopmentLeadDialogGeneratedMessage({
        mode: 'qualification',
        transactionType: 'auction',
        subject: 'Auction Heights',
        affordabilityData: {
          monthlyIncome: 120000,
          availableDeposit: 250000,
          maxAffordable: 950000,
        },
      }),
    ).toContain('bidder readiness review');
  });

  it('submits canonical unit context with info requests', () => {
    const canonicalUnitId = '123e4567-e89b-12d3-a456-426614174000';

    expect(canonicalUnitId).toHaveLength(DEVELOPMENT_UNIT_ID_MAX_LENGTH);

    render(
      <DevelopmentLeadDialog
        open
        onOpenChange={() => {}}
        mode="info"
        ctaLocation={`unit_floor_plan_dialog_${canonicalUnitId}_info`}
        development={{
          id: 77,
          name: 'Cosmopolitan Projects',
          developerBrandProfileId: 13,
        }}
        unitContext={{
          unitId: canonicalUnitId,
          unitName: 'Type A',
          unitPriceFrom: 1299000,
          unitPriceLabel: 'Price from',
          transactionType: 'sale',
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

    fireEvent.click(screen.getByRole('button', { name: /request information/i }));

    expect(screen.getAllByText('Unit: Type A').length).toBeGreaterThan(0);
    expect(mutateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        developmentId: 77,
        developerBrandProfileId: 13,
        unitId: canonicalUnitId,
        unitName: 'Type A',
        unitPriceFrom: 1299000,
        unitPriceLabel: 'Price from',
        transactionType: 'sale',
        unitBedrooms: 3,
        unitBathrooms: 2,
        leadSource: 'development_detail_info',
      }),
    );
  });

  it('submits page-level rental transaction context when no unit is selected', () => {
    render(
      <DevelopmentLeadDialog
        open
        onOpenChange={() => {}}
        mode="contact"
        ctaLocation="sidebar_interest_card"
        transactionType="for_rent"
        development={{
          id: 88,
          name: 'Harbour Rentals',
          developerBrandProfileId: 22,
        }}
      />,
    );

    expect(screen.getAllByText('Contact Leasing Team').length).toBeGreaterThan(0);
    expect(screen.getAllByText(/rental availability, lease terms/i).length).toBeGreaterThan(0);

    fireEvent.change(screen.getByPlaceholderText(/full name/i), {
      target: { value: 'Rene Renter' },
    });
    fireEvent.change(screen.getByPlaceholderText(/email address/i), {
      target: { value: 'rene@example.com' },
    });
    fireEvent.change(screen.getByPlaceholderText(/phone number/i), {
      target: { value: '0830000000' },
    });

    fireEvent.click(screen.getByRole('button', { name: /send rental enquiry/i }));

    expect(mutateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        developmentId: 88,
        developerBrandProfileId: 22,
        transactionType: 'rent',
        leadSource: 'development_detail_contact',
        message: expect.stringContaining('rental availability, lease terms'),
      }),
    );
  });
});
