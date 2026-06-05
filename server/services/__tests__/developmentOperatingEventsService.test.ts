import { describe, expect, it } from 'vitest';

import {
  getAuctionActivationReadinessIssue,
  getAuctionOutcomeTransitionStatuses,
  getAuctionRegistrationReadinessIssue,
  getAuctionRegistrationTransitionStatuses,
  getDevelopmentOperatingEventNote,
  getDistributionHandoffTarget,
  getLeadOutcomeSyncTarget,
  getRentalUnitHoldTransitionStatuses,
  getRentalUnitOutcomeTransitionStatuses,
  getSaleUnitOutcomeTransitionStatuses,
  getSaleUnitReservationTransitionStatuses,
  normalizeOperatingSourceSurface,
  parseDevelopmentOperatingEventJson,
  validateLeadOutcomeSyncTransition,
} from '../developmentOperatingEventsService';

describe('development operating events service helpers', () => {
  it('normalizes operating source surfaces to a safe dashboard default', () => {
    expect(normalizeOperatingSourceSurface('developer_dashboard')).toBe('developer_dashboard');
    expect(normalizeOperatingSourceSurface('admin_review')).toBe('admin_review');
    expect(normalizeOperatingSourceSurface('wizard')).toBe('developer_dashboard');
    expect(normalizeOperatingSourceSurface(null)).toBe('developer_dashboard');
  });

  it('parses operating event JSON from database and object values', () => {
    expect(parseDevelopmentOperatingEventJson({ note: 'Ready for reservation call' })).toEqual({
      note: 'Ready for reservation call',
    });
    expect(parseDevelopmentOperatingEventJson('{"note":"Auction pack uploaded"}')).toEqual({
      note: 'Auction pack uploaded',
    });
    expect(parseDevelopmentOperatingEventJson('[1,2,3]')).toEqual({});
    expect(parseDevelopmentOperatingEventJson('not-json')).toEqual({});
  });

  it('reads note text from metadata before afterData', () => {
    expect(
      getDevelopmentOperatingEventNote({
        metadata: { note: 'Lead handoff checked' },
        afterData: { note: 'Fallback note' },
      }),
    ).toBe('Lead handoff checked');

    expect(
      getDevelopmentOperatingEventNote({
        metadata: null,
        afterData: '{"note":"Fallback from afterData"}',
      }),
    ).toBe('Fallback from afterData');
  });

  it('maps Sale reservation transitions to event statuses and availability deltas', () => {
    expect(getSaleUnitReservationTransitionStatuses('reserve')).toEqual({
      fromStatus: 'available',
      toStatus: 'reserved',
      quantityDelta: -1,
    });

    expect(getSaleUnitReservationTransitionStatuses('release')).toEqual({
      fromStatus: 'reserved',
      toStatus: 'available',
      quantityDelta: 1,
    });
  });

  it('maps Sale sold outcome from reserved inventory without changing public availability', () => {
    expect(getSaleUnitOutcomeTransitionStatuses('mark_sold')).toEqual({
      fromStatus: 'reserved',
      toStatus: 'sold',
      quantityDelta: 0,
    });
  });

  it('maps Rental hold transitions to lease-native event statuses and availability deltas', () => {
    expect(getRentalUnitHoldTransitionStatuses('hold')).toEqual({
      fromStatus: 'available',
      toStatus: 'held',
      quantityDelta: -1,
    });

    expect(getRentalUnitHoldTransitionStatuses('release')).toEqual({
      fromStatus: 'held',
      toStatus: 'available',
      quantityDelta: 1,
    });
  });

  it('maps Rental let outcome from held inventory without changing public availability', () => {
    expect(getRentalUnitOutcomeTransitionStatuses('mark_let')).toEqual({
      fromStatus: 'held',
      toStatus: 'let',
      quantityDelta: 0,
    });
  });

  it('maps Auction registration transitions without inventory quantity semantics', () => {
    expect(getAuctionRegistrationTransitionStatuses('open_registration')).toEqual({
      fromStatus: 'scheduled',
      toStatus: 'registration_open',
    });

    expect(getAuctionRegistrationTransitionStatuses('close_registration')).toEqual({
      fromStatus: 'registration_open',
      toStatus: 'scheduled',
    });
  });

  it('maps Auction outcomes from active and non-final lifecycle statuses', () => {
    expect(
      getAuctionOutcomeTransitionStatuses({
        currentStatus: 'active',
        outcome: 'sold',
      }),
    ).toEqual({ fromStatus: 'active', toStatus: 'sold' });
    expect(
      getAuctionOutcomeTransitionStatuses({
        currentStatus: 'active',
        outcome: 'passed_in',
      }),
    ).toEqual({ fromStatus: 'active', toStatus: 'passed_in' });
    expect(
      getAuctionOutcomeTransitionStatuses({
        currentStatus: 'registration_open',
        outcome: 'withdrawn',
      }),
    ).toEqual({ fromStatus: 'registration_open', toStatus: 'withdrawn' });
  });

  it('rejects Auction final outcomes from invalid current lifecycle statuses', () => {
    expect(() =>
      getAuctionOutcomeTransitionStatuses({
        currentStatus: 'scheduled',
        outcome: 'sold',
      }),
    ).toThrow('Auction sold outcomes require an active auction lot.');
    expect(() =>
      getAuctionOutcomeTransitionStatuses({
        currentStatus: 'sold',
        outcome: 'withdrawn',
      }),
    ).toThrow('Final Auction outcomes cannot be withdrawn again.');
  });

  it('maps transaction-native lead outcome sync targets', () => {
    expect(
      getLeadOutcomeSyncTarget({
        transactionType: 'for_sale',
        outcome: 'sale_sold',
      }),
    ).toEqual({
      toStage: 'closed_won',
      displayLabel: 'Sold',
      activityLabel: 'Sale lead synced as sold',
    });
    expect(
      getLeadOutcomeSyncTarget({
        transactionType: 'for_rent',
        outcome: 'rental_let',
      }),
    ).toEqual({
      toStage: 'closed_won',
      displayLabel: 'Lease signed / Let',
      activityLabel: 'Rental lead synced as lease signed / let',
    });
    expect(
      getLeadOutcomeSyncTarget({
        transactionType: 'auction',
        outcome: 'auction_sold',
      }),
    ).toEqual({
      toStage: 'closed_won',
      displayLabel: 'Sold at auction',
      activityLabel: 'Auction lead synced as sold at auction',
    });
    expect(
      getLeadOutcomeSyncTarget({
        transactionType: 'auction',
        outcome: 'auction_passed_in',
        note: 'Reserve not met',
      }),
    ).toEqual({
      toStage: 'closed_lost',
      displayLabel: 'Passed in follow-up',
      activityLabel: 'Auction lead synced as passed in follow-up',
    });
  });

  it('rejects unsafe lead outcome sync targets and transitions', () => {
    expect(() =>
      getLeadOutcomeSyncTarget({
        transactionType: 'for_sale',
        outcome: 'rental_let',
      }),
    ).toThrow('Rental let lead sync is only available for Rental developments.');
    expect(() =>
      getLeadOutcomeSyncTarget({
        transactionType: 'auction',
        outcome: 'auction_withdrawn',
      }),
    ).toThrow('Auction passed-in or withdrawn lead sync requires a note.');
    expect(() =>
      validateLeadOutcomeSyncTransition({
        fromStage: 'qualified',
        toStage: 'closed_won',
      }),
    ).toThrow('Invalid lead outcome sync from qualified to closed_won.');
    expect(() =>
      validateLeadOutcomeSyncTransition({
        fromStage: 'deal_in_progress',
        toStage: 'closed_won',
      }),
    ).not.toThrow();
  });

  it('maps distribution handoff actions without implying deal stage movement', () => {
    expect(getDistributionHandoffTarget({ action: 'link_only' })).toEqual({
      action: 'link_only',
      toStatus: 'linked_only',
      resultLabel: 'Referral deal linked to DLE outcome context',
      noteRequired: false,
      requestedStage: null,
    });

    expect(
      getDistributionHandoffTarget({
        action: 'request_review',
        note: 'Please review the signed offer pack.',
      }),
    ).toEqual({
      action: 'request_review',
      toStatus: 'review_requested',
      resultLabel: 'Referral handoff review requested',
      noteRequired: true,
      requestedStage: null,
    });
  });

  it('requires explicit review context and blocks commission-stage shortcuts', () => {
    expect(() =>
      getDistributionHandoffTarget({
        action: 'request_review',
        note: ' ',
      }),
    ).toThrow('A handoff review note is required.');

    expect(() =>
      getDistributionHandoffTarget({
        action: 'stage_transition_requested',
        note: 'Ready for manager review.',
        requestedStage: 'commission_pending',
      }),
    ).toThrow('Commission stage requests must go through distribution readiness review.');

    expect(
      getDistributionHandoffTarget({
        action: 'stage_transition_requested',
        note: 'Bond approval uploaded for manager review.',
        requestedStage: 'bond_approved',
      }),
    ).toEqual({
      action: 'stage_transition_requested',
      toStatus: 'stage_transition_requested',
      resultLabel: 'Distribution stage review requested',
      noteRequired: true,
      requestedStage: 'bond_approved',
    });
  });

  it('requires Auction registration readiness before opening registration', () => {
    const nowMs = new Date('2030-01-01T00:00:00.000Z').getTime();
    expect(
      getAuctionRegistrationReadinessIssue(
        {
          startingBid: 850_000,
          reservePrice: 950_000,
          auctionStartDate: '2030-02-01T09:00:00.000Z',
          auctionEndDate: '2030-02-08T17:00:00.000Z',
        },
        nowMs,
      ),
    ).toBeNull();
    expect(
      getAuctionRegistrationReadinessIssue(
        {
          startingBid: 850_000,
          reservePrice: 800_000,
          auctionStartDate: '2030-02-01T09:00:00.000Z',
          auctionEndDate: '2030-02-08T17:00:00.000Z',
        },
        nowMs,
      ),
    ).toBe('Reserve price cannot be below the starting bid.');
    expect(
      getAuctionRegistrationReadinessIssue(
        {
          startingBid: 850_000,
          auctionStartDate: '2029-12-01T09:00:00.000Z',
          auctionEndDate: '2030-02-08T17:00:00.000Z',
        },
        nowMs,
      ),
    ).toBe('Registration can only open before the auction starts.');
  });

  it('requires Auction activation to happen inside the configured auction window', () => {
    const nowMs = new Date('2030-02-01T10:00:00.000Z').getTime();
    expect(
      getAuctionActivationReadinessIssue(
        {
          auctionStartDate: '2030-02-01T09:00:00.000Z',
          auctionEndDate: '2030-02-08T17:00:00.000Z',
        },
        nowMs,
      ),
    ).toBeNull();
    expect(
      getAuctionActivationReadinessIssue(
        {
          auctionStartDate: '2030-02-02T09:00:00.000Z',
          auctionEndDate: '2030-02-08T17:00:00.000Z',
        },
        nowMs,
      ),
    ).toBe('Auction activation can only start at or after the auction start time.');
    expect(
      getAuctionActivationReadinessIssue(
        {
          auctionStartDate: '2030-01-31T09:00:00.000Z',
          auctionEndDate: '2030-02-01T09:30:00.000Z',
        },
        nowMs,
      ),
    ).toBe('Auction activation cannot start after the auction window has ended.');
  });
});
