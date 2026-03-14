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
          developerBrandProfileId: 13,
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

    fireEvent.click(screen.getByRole('button', { name: /request information/i }));

    expect(screen.getByText('Unit: Type A')).toBeInTheDocument();
    expect(mutateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        developmentId: 77,
        developerBrandProfileId: 13,
        unitId: 'unit-1',
        unitName: 'Type A',
        unitPriceFrom: 1299000,
        unitBedrooms: 3,
        unitBathrooms: 2,
        leadSource: 'development_detail_info',
      }),
    );
  });
});
