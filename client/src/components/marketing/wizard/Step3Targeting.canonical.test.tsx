import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import Step3Targeting from './Step3Targeting';

vi.mock('@/lib/trpc', () => ({
  trpc: {
    marketing: {
      updateTargeting: {
        useMutation: () => ({ mutateAsync: vi.fn() }),
      },
    },
  },
}));

describe('campaign targeting canonical geography boundary', () => {
  it('does not expose free-text city or province targeting', () => {
    render(
      <Step3Targeting
        data={{}}
        updateData={vi.fn()}
        onNext={vi.fn()}
        onBack={vi.fn()}
        campaignId={1}
      />,
    );

    expect(screen.queryByPlaceholderText('Enter city or province...')).not.toBeInTheDocument();
    expect(screen.queryByText('Location Targeting')).not.toBeInTheDocument();
  });
});
