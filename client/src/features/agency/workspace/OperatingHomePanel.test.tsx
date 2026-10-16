import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { operatingHomeQueryMock, setLocationMock } = vi.hoisted(() => ({
  operatingHomeQueryMock: vi.fn(),
  setLocationMock: vi.fn(),
}));

vi.mock('wouter', () => ({
  useLocation: () => ['/agency', setLocationMock],
}));

vi.mock('@/lib/trpc', () => ({
  trpc: {
    agency: {
      getOperatingHome: {
        useQuery: (...args: unknown[]) => operatingHomeQueryMock(...args),
      },
    },
  },
}));

import { AgencyOperatingHomePanel } from './OperatingHomePanel';

function operatingHome(
  workloadByAgent: Array<{
    agentId: number | null;
    agentName: string;
    activeLeadCount: number;
    overdueFollowUpCount: number;
  }>,
) {
  return {
    data: {
      actions: [],
      brief: {
        leads: {
          firstOutreachOverdueCount: 0,
          newToday: 0,
        },
        listings: { pendingReviewCount: 0 },
        publication: { daysRemaining: 40 },
        team: { workloadByAgent },
      },
    },
    isLoading: false,
    isError: false,
  };
}

describe('AgencyOperatingHomePanel team workload', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('opens all active leads filtered to the selected owner and shows their overdue count', () => {
    operatingHomeQueryMock.mockReturnValue(
      operatingHome([
        { agentId: 17, agentName: 'Lerato Mokoena', activeLeadCount: 7, overdueFollowUpCount: 2 },
      ]),
    );

    render(<AgencyOperatingHomePanel />);

    fireEvent.click(
      screen.getByRole('button', {
        name: 'Open lead queue for Lerato Mokoena: 7 active leads, 2 overdue follow-ups',
      }),
    );

    expect(setLocationMock).toHaveBeenCalledWith('/agency/leads?owner=17');
    expect(screen.getByText('7 active')).toBeInTheDocument();
    expect(screen.getByText(/2 overdue/)).toBeInTheDocument();
  });

  it('shows the clear team state when no active leads need team ownership', () => {
    operatingHomeQueryMock.mockReturnValue(operatingHome([]));

    render(<AgencyOperatingHomePanel />);

    expect(screen.getByTestId('agency-follow-up-watch')).toHaveTextContent(
      'No active leads in the team queue yet.',
    );
    expect(screen.queryByRole('button', { name: /Open active leads for/ })).toBeNull();
  });
});
