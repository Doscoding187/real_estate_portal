import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
const { useQuery } = vi.hoisted(() => ({ useQuery: vi.fn() }));
vi.mock('@/lib/trpc', () => ({ trpc: { agent: { getPresenceSummary: { useQuery } } } }));
import { AgentPresenceProof } from './AgentPresenceProof';
afterEach(cleanup);
describe('Profile activity data states', () => {
  it('keeps loading and failure separate from zero recorded activity', () => {
    useQuery.mockReturnValue({ isLoading: true });
    const view = render(<AgentPresenceProof />);
    expect(screen.getByRole('status', { name: 'Loading profile activity' })).toBeTruthy();
    expect(screen.queryByText(/No recorded interactions/)).toBeNull();
    view.unmount();
    const refetch = vi.fn();
    useQuery.mockReturnValue({ isError: true, refetch });
    render(<AgentPresenceProof />);
    expect(screen.getByRole('alert')).toHaveTextContent('We couldn’t load profile activity.');
    expect(screen.queryByText(/No recorded interactions/)).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(refetch).toHaveBeenCalled();
  });
  it('shows only returned metrics and the recorded reporting window', () => {
    useQuery.mockReturnValue({
      data: {
        profileViews: 8,
        whatsappClicks: 3,
        listingTaps: 2,
        contactActions: 1,
        areaGuideOpens: 4,
        shares: 1,
        totalInteractions: 11,
      },
    });
    render(<AgentPresenceProof />);
    expect(screen.getByText('Last 30 days')).toBeTruthy();
    expect(screen.getByText('8')).toBeTruthy();
    expect(screen.queryByText(/No recorded interactions/)).toBeNull();
  });
});
