import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({
  wizard: {
    developmentType: 'residential' as string | null,
    developmentData: { transactionType: undefined as string | undefined },
    workflowId: null as string | null,
    setWorkflowSelector: vi.fn(),
    setPhase: vi.fn(),
    reset: vi.fn(),
  },
}));

vi.mock('@/hooks/useDevelopmentWizard', () => ({
  useDevelopmentWizard: Object.assign(() => state.wizard, {
    getState: () => ({ setDevelopmentType: vi.fn() }),
  }),
}));
vi.mock('sonner', () => ({ toast: { info: vi.fn(), error: vi.fn(), warning: vi.fn() } }));

import { DevelopmentTypePhase } from './DevelopmentTypePhase';

describe('DevelopmentTypePhase', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    state.wizard.workflowId = null;
    state.wizard.developmentData = { transactionType: undefined };
  });

  it('hides options that are not ready instead of showing "Not available yet"', () => {
    render(<DevelopmentTypePhase />);
    expect(screen.getByText('Residential Development')).toBeInTheDocument();
    expect(screen.getByText('For Sale')).toBeInTheDocument();
    expect(screen.getByText('To Let / Rent')).toBeInTheDocument();

    expect(screen.queryByText('Mixed-Use Development')).not.toBeInTheDocument();
    expect(screen.queryByText('Land Development')).not.toBeInTheDocument();
    expect(screen.queryByText('Commercial Development')).not.toBeInTheDocument();
    expect(screen.queryByText('Auction')).not.toBeInTheDocument();
    expect(screen.queryByText(/Not available yet/i)).not.toBeInTheDocument();
  });

  it('returns to the wizard without re-initialising when Project Setup is revisited unchanged', () => {
    state.wizard.workflowId = 'residential_sale';
    state.wizard.developmentData = { transactionType: 'for_sale' };
    const onResume = vi.fn();
    render(<DevelopmentTypePhase onResume={onResume} />);

    fireEvent.click(screen.getByRole('button', { name: /Continue/ }));
    expect(onResume).toHaveBeenCalledOnce();
    expect(state.wizard.setWorkflowSelector).not.toHaveBeenCalled();
  });
});
