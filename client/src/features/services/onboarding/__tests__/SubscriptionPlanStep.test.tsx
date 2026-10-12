import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

import { SubscriptionPlanStep } from '../steps/SubscriptionPlanStep';
import { initialOnboardingState } from '../useOnboardingReducer';

describe('SubscriptionPlanStep', () => {
  it('does not claim review readiness without an active service', () => {
    const state = {
      ...initialOnboardingState,
      services: initialOnboardingState.services.map(service => ({
        ...service,
        displayName: 'Plumbing repair',
        isActive: false,
      })),
      locations: initialOnboardingState.locations.map(location => ({
        ...location,
        city: 'Cape Town',
        province: 'Western Cape' as const,
      })),
    };

    render(<SubscriptionPlanStep state={state} onNext={vi.fn()} onBack={vi.fn()} />);

    expect(screen.getByRole('alert')).toHaveTextContent(/activate at least one service/i);
    expect(screen.getByRole('button', { name: /finish setup/i })).toBeDisabled();
  });
});
