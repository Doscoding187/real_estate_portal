import { describe, expect, it } from 'vitest';
import { formatLeadActivityDate, getLeadActivityPresentation } from './leadActivityPresentation';

describe('lead activity presentation', () => {
  it('shows the contact channel and outcome without implying a stage move', () => {
    expect(
      getLeadActivityPresentation({
        type: 'contact_attempt',
        description: 'Called buyer; no answer.',
        metadata: JSON.stringify({ channel: 'call', outcome: 'no_answer', status: 'new' }),
      }),
    ).toEqual({
      label: 'Call · No answer',
      description: 'Called buyer; no answer.',
      isFollowUpCompletion: false,
      isViewingScheduled: false,
    });
  });

  it('shows completed follow-ups with their saved note', () => {
    expect(
      getLeadActivityPresentation({
        type: 'note',
        description: 'Follow-up completed. Buyer contacted and viewing discussed.',
      }),
    ).toEqual({
      label: 'Followed up',
      description: 'Buyer contacted and viewing discussed.',
      isFollowUpCompletion: true,
      isViewingScheduled: false,
    });
  });

  it('keeps ordinary notes as notes', () => {
    expect(
      getLeadActivityPresentation({
        type: 'note',
        description: 'Buyer asked for the rates estimate.',
      }),
    ).toEqual({
      label: 'note',
      description: 'Buyer asked for the rates estimate.',
      isFollowUpCompletion: false,
      isViewingScheduled: false,
    });
  });

  it.each([
    {
      type: 'meeting',
      description: 'Viewing confirmed for 2026-10-16 10:30:00.',
      expectedDescription: 'Confirmed for 2026-10-16 10:30:00',
    },
    {
      type: 'status_change',
      description: 'Showing booked for 10/16/2026, 10:30:00 AM',
      expectedDescription: 'Booked for 10/16/2026, 10:30:00 AM',
    },
  ])('identifies scheduled viewings from $type activities', activity => {
    expect(getLeadActivityPresentation(activity)).toEqual({
      label: 'Viewing scheduled',
      description: activity.expectedDescription,
      isFollowUpCompletion: false,
      isViewingScheduled: true,
    });
  });

  it('formats the completion timestamp with a date and time', () => {
    expect(formatLeadActivityDate('2026-10-15T10:30:00.000Z')).toMatch(/15 Oct 2026/);
  });
});
