import { describe, expect, it } from 'vitest';
import {
  formatLeadActivityDate,
  getLeadActivityPresentation,
} from './leadActivityPresentation';

describe('lead activity presentation', () => {
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
    });
  });

  it('formats the completion timestamp with a date and time', () => {
    expect(formatLeadActivityDate('2026-10-15T10:30:00.000Z')).toMatch(
      /15 Oct 2026/,
    );
  });
});
