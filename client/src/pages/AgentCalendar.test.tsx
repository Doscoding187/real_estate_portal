import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { statusMock, calendarMounted } = vi.hoisted(() => ({
  statusMock: vi.fn(),
  calendarMounted: vi.fn(),
}));

vi.mock('wouter', () => ({ useLocation: () => ['/agent/calendar', vi.fn()] }));
vi.mock('@/hooks/useAgentOnboardingStatus', () => ({
  useAgentOnboardingStatus: () => statusMock(),
}));
vi.mock('@/components/agent/ShowingsCalendar', () => ({
  ShowingsCalendar: () => {
    calendarMounted();
    return <div>Showings calendar</div>;
  },
}));

import AgentCalendar from './AgentCalendar';

beforeEach(() => vi.clearAllMocks());
afterEach(() => cleanup());

describe('AgentCalendar gate', () => {
  it('does not mount the data component for an unpaid agent', () => {
    statusMock.mockReturnValue({
      status: { recommendedNextStep: 'select_package', fullFeaturesUnlocked: false },
      isLoading: false,
      error: null,
      retry: vi.fn(),
    });
    render(<AgentCalendar />);
    expect(calendarMounted).not.toHaveBeenCalled();
    expect(screen.getByText('Calendar unlocks with a plan')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Get access' })).toBeInTheDocument();
  });

  it('fails closed on a status error', () => {
    statusMock.mockReturnValue({ status: null, isLoading: false, error: 'x', retry: vi.fn() });
    render(<AgentCalendar />);
    expect(calendarMounted).not.toHaveBeenCalled();
  });

  it('mounts the calendar for a paid agent', () => {
    statusMock.mockReturnValue({
      status: { recommendedNextStep: 'dashboard', fullFeaturesUnlocked: true },
      isLoading: false,
      error: null,
      retry: vi.fn(),
    });
    render(<AgentCalendar />);
    expect(calendarMounted).toHaveBeenCalled();
  });
});
