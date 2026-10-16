import { fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({
  setLocation: vi.fn(),
  queryInput: null as unknown,
  query: {
    data: {
      developments: [
        {
          identity: {
            id: 42,
            name: 'Harbour Heights',
            location: { city: 'Cape Town', province: 'Western Cape' },
          },
          leads: {
            capturedLeadCount: 4,
            openLeadCount: 3,
            slaWarningCount: 1,
            slaBreachCount: 1,
            stageCounts: {
              new: 1,
              contacted: 1,
              qualified: 0,
              viewing: 0,
              offer: 0,
              dealInProgress: 0,
              closedWon: 1,
              closedLost: 0,
            },
          },
        },
        {
          identity: {
            id: 43,
            name: 'Cedar Grove',
            location: { city: 'Durban', province: 'KwaZulu-Natal' },
          },
          leads: {
            capturedLeadCount: 0,
            openLeadCount: 0,
            slaWarningCount: 0,
            slaBreachCount: 0,
            stageCounts: {
              new: 0,
              contacted: 0,
              qualified: 0,
              viewing: 0,
              offer: 0,
              dealInProgress: 0,
              closedWon: 0,
              closedLost: 0,
            },
          },
        },
      ],
      portfolio: {
        leads: {
          capturedLeadCount: 8,
          openLeadCount: 6,
          slaWarningCount: 1,
          slaBreachCount: 1,
          stageCounts: {
            new: 1,
            contacted: 1,
            qualified: 1,
            viewing: 1,
            offer: 1,
            dealInProgress: 1,
            closedWon: 1,
            closedLost: 1,
          },
        },
      },
    },
    isLoading: false,
    error: null,
    refetch: vi.fn(),
  },
}));

vi.mock('wouter', () => ({
  useLocation: () => ['/developer/analytics', state.setLocation],
}));

vi.mock('@/lib/trpc', () => ({
  trpc: {
    developer: {
      getOperatingHome: {
        useQuery: (input: unknown) => {
          state.queryInput = input;
          return state.query;
        },
      },
    },
  },
}));

import AnalyticsPanel from './AnalyticsPanel';

describe('Developer lead progress analytics', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    state.queryInput = null;
    state.query.data.portfolio.leads.capturedLeadCount = 8;
  });

  it('reports recorded CRM stages without presenting inventory estimates as sales', () => {
    render(<AnalyticsPanel />);

    expect(screen.getByRole('heading', { name: 'Lead progress' })).toBeInTheDocument();
    expect(screen.getByText('Enquiries received')).toBeInTheDocument();
    expect(screen.getByText('Viewing stage')).toBeInTheDocument();
    expect(screen.getAllByText('Marked won')).toHaveLength(3);
    expect(
      screen.getByText(
        /this view does not report signed contracts, completed sales or payments received/i,
      ),
    ).toBeInTheDocument();
    expect(screen.queryByText('Units Sold')).not.toBeInTheDocument();
    expect(screen.queryByText('Conversion Rate')).not.toBeInTheDocument();
    expect(screen.queryByText('Revenue')).not.toBeInTheDocument();
    expect(state.queryInput).toEqual({ range: '30d' });

    expect(
      screen.getByRole('heading', { name: 'Lead progress by development' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Cedar Grove')).toBeInTheDocument();
    const harbourRow = screen.getByRole('row', { name: /Harbour Heights/ });
    expect(within(harbourRow).getByText('Cape Town, Western Cape')).toBeInTheDocument();
    expect(within(harbourRow).getByText('2')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'View leads for Harbour Heights' }));
    expect(state.setLocation).toHaveBeenCalledWith('/developer/leads?developmentId=42&range=30d');

    fireEvent.click(screen.getByRole('button', { name: /open lead manager/i }));
    expect(state.setLocation).toHaveBeenCalledWith('/developer/leads?range=30d');
  });

  it('shows an explicit empty state when the selected period has no enquiries', () => {
    state.query.data.portfolio.leads.capturedLeadCount = 0;
    const developmentLeads = state.query.data.developments[0].leads;
    developmentLeads.capturedLeadCount = 0;
    developmentLeads.openLeadCount = 0;
    developmentLeads.slaWarningCount = 0;
    developmentLeads.slaBreachCount = 0;
    Object.keys(developmentLeads.stageCounts).forEach(stage => {
      developmentLeads.stageCounts[stage as keyof typeof developmentLeads.stageCounts] = 0;
    });

    render(<AnalyticsPanel />);

    expect(screen.getByText(/no enquiries were captured during this period/i)).toBeInTheDocument();
    expect(screen.queryByText('Viewing stage')).not.toBeInTheDocument();
  });
});
