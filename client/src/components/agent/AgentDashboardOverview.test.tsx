import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AgentOnboardingStatus } from '@/hooks/useAgentOnboardingStatus';

const { queries, mutate } = vi.hoisted(() => ({
  queries: Object.fromEntries(
    [
      'getDashboardStats',
      'getLeadsPipeline',
      'getMyListings',
      'myListings',
      'getMyShowings',
      'getNotifications',
    ].map(name => [name, vi.fn()]),
  ),
  mutate: vi.fn(),
}));
vi.mock('@/_core/hooks/useAuth', () => ({
  useAuth: () => ({ user: { id: 7, name: 'Test Agent', role: 'agent' } }),
}));
vi.mock('@/lib/trpc', () => ({
  trpc: {
    agent: Object.fromEntries([
      ...[
        'getDashboardStats',
        'getLeadsPipeline',
        'getMyListings',
        'getMyShowings',
        'getNotifications',
      ].map(name => [name, { useQuery: (...args: unknown[]) => queries[name](...args) }]),
      ['recordSurfaceView', { useMutation: () => ({ mutate }) }],
    ]),
    listing: { myListings: { useQuery: (...args: unknown[]) => queries.myListings(...args) } },
  },
}));
vi.mock('./AgentPresenceProof', () => ({
  AgentPresenceProof: () => <section data-testid="agent-presence-proof">Profile activity</section>,
}));
vi.mock('wouter', () => ({
  Link: ({ href, children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));
import { AgentDashboardOverview } from './AgentDashboardOverview';

const result = (data: unknown, overrides = {}) => ({
  data,
  isLoading: false,
  isError: false,
  refetch: vi.fn(),
  ...overrides,
});
const pipeline = { new: [], contacted: [], viewing: [], offer: [], closed: [] };
const status = {
  packageSelected: true,
  approvalStatus: 'approved',
  onboardingComplete: true,
  dashboardUnlocked: true,
  fullFeaturesUnlocked: true,
  recommendedNextStep: 'dashboard',
  subscriptionStatus: 'active',
  entitlements: { canPublishListings: true },
  profile: { slug: 'test-agent' },
} as AgentOnboardingStatus;
function show(overrides: Partial<AgentOnboardingStatus> = {}) {
  return render(
    <AgentDashboardOverview
      onboardingStatus={{ ...status, ...overrides }}
      agentLaunchAccessAvailable
    />,
  );
}
beforeEach(() => {
  queries.getDashboardStats.mockReturnValue(result({ activeListings: 0 }));
  queries.getLeadsPipeline.mockReturnValue(result(pipeline));
  queries.getMyListings.mockReturnValue(result([]));
  queries.myListings.mockReturnValue(result([]));
  queries.getMyShowings.mockReturnValue(result([]));
  queries.getNotifications.mockReturnValue(result([]));
});
afterEach(cleanup);

describe('Agent dashboard presentation and journey states', () => {
  it('gives a ready agent one adjacent first-listing action', () => {
    show();
    const next = screen.getByRole('region', { name: 'Next step' });
    expect(within(next).getByRole('link', { name: /Add your first listing/ })).toHaveAttribute(
      'href',
      '/listings/create',
    );
    expect(screen.getAllByText('Add your first listing')).toHaveLength(1);
  });
  it('does not call prior inventory a first-listing journey when nothing is currently published', () => {
    queries.myListings.mockReturnValue(
      result([{ id: 1, title: 'Previously sold house', status: 'sold' }]),
    );
    queries.getMyListings.mockReturnValue(
      result([{ id: 1, title: 'Previously sold house', status: 'sold' }]),
    );
    show();
    expect(screen.queryByText('Add your first listing')).toBeNull();
    expect(screen.queryByRole('region', { name: 'Next step' })).toBeNull();
  });
  it('prioritises a saved draft over starting another listing', () => {
    queries.myListings.mockReturnValue(
      result([{ id: 1, title: 'Saved property', status: 'draft' }]),
    );
    show();
    expect(
      within(screen.getByRole('region', { name: 'Next step' })).getByRole('link', {
        name: /Continue draft/,
      }),
    ).toHaveAttribute('href', '/agent/listings?tab=draft');
    expect(screen.queryByText('Add your first listing')).toBeNull();
  });
  it('keeps moderation distinct from published inventory', () => {
    queries.myListings.mockReturnValue(
      result([{ id: 1, title: 'Submitted property', status: 'pending_review' }]),
    );
    show();
    expect(screen.getByText('Your first listing is in review')).toBeTruthy();
    expect(screen.getByRole('link', { name: /View review status/ })).toHaveAttribute(
      'href',
      '/agent/listings?tab=pending',
    );
    expect(screen.getByText('Awaiting moderation')).toBeTruthy();
    expect(screen.queryByText(/published listings · Previewing/)).toBeNull();
  });
  it('keeps payment review waiting and operational queries gated', () => {
    show({
      fullFeaturesUnlocked: false,
      recommendedNextStep: 'await_payment_review',
      subscriptionStatus: 'payment_under_review',
      entitlements: { canPublishListings: false } as AgentOnboardingStatus['entitlements'],
    });
    expect(screen.getByText('Your payment proof is under review')).toBeTruthy();
    expect(
      within(screen.getByRole('region', { name: 'Next step' })).queryByRole('link'),
    ).toBeNull();
    for (const name of [
      'getDashboardStats',
      'getLeadsPipeline',
      'getMyListings',
      'getMyShowings',
      'getNotifications',
    ])
      expect(queries[name]).toHaveBeenCalledWith(
        name === 'getDashboardStats' ? undefined : expect.anything(),
        expect.objectContaining({ enabled: false }),
      );
    expect(queries.myListings).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ enabled: true }),
    );
  });
  it('hands incomplete profiles to the existing setup journey', () => {
    show({
      fullFeaturesUnlocked: false,
      recommendedNextStep: 'complete_profile_basics',
      entitlements: { canPublishListings: false } as AgentOnboardingStatus['entitlements'],
    });
    expect(screen.getByRole('link', { name: /Continue setup/ })).toHaveAttribute(
      'href',
      '/agent/setup',
    );
  });
  it('does not describe loading or failed inventory as a first-listing state', () => {
    queries.myListings.mockReturnValue(result(undefined, { isLoading: true }));
    const view = show();
    expect(screen.getByRole('status', { name: 'Loading listing status' })).toBeTruthy();
    expect(screen.queryByText('Add your first listing')).toBeNull();
    view.unmount();
    queries.myListings.mockReturnValue(result(undefined, { isError: true }));
    show();
    expect(screen.getByText('Your listing status is unavailable')).toBeTruthy();
    expect(screen.queryByText('Add your first listing')).toBeNull();
    fireEvent.click(
      within(screen.getByTestId('dashboard-listings')).getByRole('button', { name: 'Try again' }),
    );
    expect(queries.myListings().refetch).toHaveBeenCalled();
  });
  it('puts real new enquiries first with dependable links, one pipeline and actual thumbnails', () => {
    const lead = {
      id: 23,
      name: 'Buyer',
      status: 'new',
      createdAt: '2026-10-13T12:00:00Z',
      property: { id: 8, title: 'Existing house', city: 'Pretoria' },
    };
    queries.getLeadsPipeline.mockReturnValue(
      result({
        ...pipeline,
        new: [lead],
        contacted: [{ ...lead, id: 24, name: 'Active lead', status: 'contacted' }],
      }),
    );
    queries.getMyListings.mockReturnValue(
      result([
        {
          id: 8,
          title: 'Existing house',
          city: 'Pretoria',
          price: 1500000,
          status: 'available',
          primaryImage: '/actual-photo.jpg',
          enquiries: 1,
        },
      ]),
    );
    queries.getDashboardStats.mockReturnValue(result({ activeListings: 1 }));
    show();
    expect(screen.getByText(/1 new enquiry/)).toBeTruthy();
    expect(screen.queryByText(/needs a reply|overdue|last contacted/i)).toBeNull();
    expect(screen.getByRole('link', { name: /Open enquiry/ })).toHaveAttribute(
      'href',
      '/agent/leads?leadId=23',
    );
    expect(screen.getByRole('link', { name: 'Open lead' })).toHaveAttribute(
      'href',
      '/agent/leads?leadId=24',
    );
    expect(screen.getAllByTestId('dashboard-pipeline')).toHaveLength(1);
    expect(screen.getByTestId('dashboard-listings').querySelector('img')).toHaveAttribute(
      'src',
      '/actual-photo.jpg',
    );
    const order = Array.from(
      screen.getByTestId('agent-dashboard-overview').querySelectorAll('[data-testid]'),
    ).map(element => element.getAttribute('data-testid'));
    expect(order.indexOf('dashboard-enquiries')).toBeLessThan(order.indexOf('dashboard-pipeline'));
    expect(order.indexOf('dashboard-listings')).toBeLessThan(order.indexOf('agent-presence-proof'));
    expect(screen.queryByRole('region', { name: 'Next step' })).toBeNull();
  });
  it('excludes cancelled and completed showings and labels the coverage', () => {
    const date = new Date();
    date.setHours(18, 0, 0, 0);
    const showing = {
      id: 1,
      scheduledAt: date.toISOString(),
      status: 'scheduled',
      property: { title: 'Booked house' },
    };
    queries.getMyShowings.mockReturnValue(
      result([
        showing,
        { ...showing, id: 2, status: 'cancelled', property: { title: 'Cancelled house' } },
        { ...showing, id: 3, status: 'completed', property: { title: 'Completed house' } },
      ]),
    );
    show();
    expect(screen.getByText(/1 scheduled showing today/)).toBeTruthy();
    expect(screen.getByText('Booked house')).toBeTruthy();
    expect(screen.queryByText('Cancelled house')).toBeNull();
    expect(screen.queryByText('Completed house')).toBeNull();
    expect(screen.getByText(/Property showings in the selected month only/)).toBeTruthy();
    expect(screen.getByRole('link', { name: /Open showings/ })).toHaveAttribute(
      'href',
      '/agent/productivity?tab=showings',
    );
    fireEvent.click(screen.getByRole('button', { name: 'Next showing month' }));
    expect(queries.getMyShowings.mock.calls.at(-1)?.[0].startDate).not.toEqual(
      queries.getMyShowings.mock.calls[0][0].startDate,
    );
  });
  it('shows failures and retries instead of empty enquiries or schedule claims', () => {
    queries.getLeadsPipeline.mockReturnValue(result(undefined, { isError: true }));
    queries.getMyShowings.mockReturnValue(result(undefined, { isError: true }));
    show();
    expect(screen.getByText(/Enquiry status unavailable/)).toBeTruthy();
    expect(
      screen.queryByText(
        /No active enquiries|No scheduled showings|0 new enquiries|0 scheduled showings today/,
      ),
    ).toBeNull();
    fireEvent.click(
      within(screen.getByTestId('dashboard-enquiries')).getByRole('button', { name: 'Try again' }),
    );
    expect(queries.getLeadsPipeline().refetch).toHaveBeenCalled();
  });
});
