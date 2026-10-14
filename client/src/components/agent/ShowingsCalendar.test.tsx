import { fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';

const { showingsQuery, statusMutation, bookingMutation } = vi.hoisted(() => ({
  showingsQuery: vi.fn(),
  statusMutation: vi.fn(),
  bookingMutation: vi.fn(),
}));
vi.mock('wouter', () => ({ useLocation: () => ['/agent/productivity', vi.fn()] }));
vi.mock('@/lib/trpc', () => ({
  trpc: {
    useUtils: () => ({ agent: { getMyShowings: { invalidate: vi.fn() } } }),
    agent: {
      getMyShowings: { useQuery: showingsQuery },
      getShowingListingOptions: {
        useQuery: () => ({
          data: [{ id: 100, title: 'Sandton house', city: 'Sandton', address: 'Bridge Road' }],
        }),
      },
      getLeadsPipeline: {
        useQuery: () => ({
          data: {
            new: [{ id: 20, name: 'Edward Test', email: 'test@example.invalid', phone: null }],
            contacted: [],
            viewing: [],
            offer: [],
            closed: [],
          },
        }),
      },
      updateShowingStatus: { useMutation: () => ({ mutate: statusMutation, isPending: false }) },
      bookShowing: { useMutation: () => ({ mutate: bookingMutation, isPending: false }) },
    },
  },
}));
import { ShowingsCalendar } from './ShowingsCalendar';

const showing = {
  id: 7,
  listingId: 100,
  leadId: 20,
  scheduledAt: new Date(2026, 9, 15, 10).toISOString(),
  status: 'scheduled',
  notes: 'Local test',
  property: null,
  client: null,
};
const openDay = () =>
  fireEvent.click(screen.getByRole('button', { name: /15 October 2026, 1 viewing$/ }));

describe('showings calendar interaction', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 9, 14, 10));
    showingsQuery.mockReturnValue({ data: [showing], isLoading: false, error: null });
  });
  afterEach(() => vi.useRealTimers());
  it('shows the linked property in its date and opens the day actions', () => {
    render(<ShowingsCalendar />);
    const date = screen.getByRole('button', { name: /15 October 2026, 1 viewing$/ });
    expect(within(date).getByText('Sandton house')).toBeInTheDocument();
    expect(within(date).getByText('Edward Test')).toBeInTheDocument();
    date.focus();
    expect(date).toHaveFocus();
    fireEvent.click(date);
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByText('Edward Test')).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Complete', exact: true }));
    expect(statusMutation).toHaveBeenCalledWith({ showingId: 7, status: 'completed' });
  });
  it('uses the same property and visitor search for cells and the date popup', () => {
    render(<ShowingsCalendar />);
    fireEvent.change(screen.getByPlaceholderText('Search properties or visitors...'), {
      target: { value: 'missing' },
    });
    expect(
      screen.getByRole('button', { name: /15 October 2026, 0 viewings$/ }),
    ).toBeInTheDocument();
    fireEvent.change(screen.getByPlaceholderText('Search properties or visitors...'), {
      target: { value: 'Edward' },
    });
    openDay();
    expect(within(screen.getByRole('dialog')).getByText('Sandton house')).toBeInTheDocument();
  });
  it('opens a blank booking for the selected date at 09:00 local time', () => {
    render(<ShowingsCalendar />);
    openDay();
    fireEvent.click(
      within(screen.getByRole('dialog')).getByRole('button', {
        name: 'Book a viewing on this date',
      }),
    );
    const dialog = screen.getByRole('dialog');
    expect(dialog.querySelector('input[type="datetime-local"]')).toHaveValue('2026-10-15T09:00');
    expect(
      within(dialog).getByPlaceholderText('Access notes, visitor context, or follow-up details'),
    ).toHaveValue('');
    expect(bookingMutation).not.toHaveBeenCalled();
  });
  it('keeps outcome actions off completed viewings', () => {
    showingsQuery.mockReturnValue({
      data: [{ ...showing, status: 'completed' }],
      isLoading: false,
      error: null,
    });
    render(<ShowingsCalendar />);
    openDay();
    expect(
      within(screen.getByRole('dialog')).queryByRole('button', { name: 'Complete', exact: true }),
    ).not.toBeInTheDocument();
  });
  it('renders week and day views, including empty dates', () => {
    render(<ShowingsCalendar />);
    fireEvent.click(screen.getByRole('button', { name: 'Week', exact: true }));
    expect(screen.getByRole('button', { name: /15 October 2026, 1 viewing$/ })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Day', exact: true }));
    expect(screen.getByText('No viewings for this date.')).toBeInTheDocument();
  });
});
