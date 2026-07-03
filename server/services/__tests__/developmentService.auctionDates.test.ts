import { describe, expect, it } from 'vitest';

import { computeAuctionRangeFromUnits } from '../developmentService';
import { normalizeDateTimeForDb } from '../developmentDateUtils';
import { normalizeForPublish } from '../publishNormalizer';

describe('normalizeDateTimeForDb', () => {
  it('accepts supported valid date and datetime inputs', () => {
    expect(normalizeDateTimeForDb('2026-08-10')).toBe('2026-08-10 00:00:00');
    expect(normalizeDateTimeForDb('2026-08-10T10:30')).toBe('2026-08-10 10:30:00');
    expect(normalizeDateTimeForDb('2026-08-10 10:30:15')).toBe('2026-08-10 10:30:15');
    expect(normalizeDateTimeForDb('2026-08-10T12:30:15+02:00')).toBe(
      '2026-08-10 10:30:15',
    );
    expect(normalizeDateTimeForDb('2026-08-10T10:30:15Z')).toBe('2026-08-10 10:30:15');
    expect(normalizeDateTimeForDb(new Date('2026-08-10T10:30:15Z'))).toBe(
      '2026-08-10 10:30:15',
    );
  });

  it('rejects malformed or impossible datetime inputs', () => {
    expect(normalizeDateTimeForDb('2026-13-10T10:30')).toBeNull();
    expect(normalizeDateTimeForDb('2026-02-30T10:30')).toBeNull();
    expect(normalizeDateTimeForDb('2026-08-10T24:30')).toBeNull();
    expect(normalizeDateTimeForDb('2026-08-10T10:60')).toBeNull();
    expect(normalizeDateTimeForDb('2026-08-10T10:30:60')).toBeNull();
    expect(normalizeDateTimeForDb('2026-08-10T10:30junk')).toBeNull();
    expect(normalizeDateTimeForDb('2026-08-10T10')).toBeNull();
    expect(normalizeDateTimeForDb('2026-08-10T10:30+0200')).toBeNull();
  });

  it('keeps blank and nullable inputs null', () => {
    expect(normalizeDateTimeForDb('')).toBeNull();
    expect(normalizeDateTimeForDb('   ')).toBeNull();
    expect(normalizeDateTimeForDb(null)).toBeNull();
    expect(normalizeDateTimeForDb(undefined)).toBeNull();
  });
});

describe('developmentService auction date aggregation', () => {
  it('normalizes datetime-local auction dates before development-level DB writes', () => {
    const range = computeAuctionRangeFromUnits([
      {
        startingBid: '950000',
        reservePrice: '1100000',
        auctionStartDate: '2026-08-10T10:30',
        auctionEndDate: '2026-08-12T16:45',
      },
      {
        startingBid: '875000',
        reservePrice: '990000',
        auctionStartDate: '2026-08-09T09:15',
        auctionEndDate: '2026-08-13T18:05',
      },
    ]);

    expect(range).toEqual({
      auctionStartDate: '2026-08-09 09:15:00',
      auctionEndDate: '2026-08-13 18:05:00',
      startingBidFrom: 875000,
      reservePriceFrom: 990000,
    });
    expect(range.auctionStartDate).not.toContain('T');
    expect(range.auctionEndDate).not.toContain('T');
  });

  it('drops invalid auction date strings instead of passing unsafe values to datetime columns', () => {
    const range = computeAuctionRangeFromUnits([
      {
        startingBid: 1000000,
        reservePrice: 1200000,
        auctionStartDate: 'not a date',
        auctionEndDate: '',
      },
    ]);

    expect(range).toEqual({
      auctionStartDate: null,
      auctionEndDate: null,
      startingBidFrom: 1000000,
      reservePriceFrom: 1200000,
    });
  });

  it('normalizes publish payload auction dates through the shared development datetime mapper', () => {
    const payload = normalizeForPublish(
      {
        name: 'Auction Villas',
        city: 'Cape Town',
        province: 'Western Cape',
        developmentType: 'residential',
        transactionType: 'auction',
        unitTypes: [
          {
            name: 'Villa A',
            startingBid: '1250000',
            reservePrice: '1500000',
            auctionStartDate: '2026-09-01T08:45',
            auctionEndDate: '2026-09-03T17:10',
          },
        ],
      },
      'developer',
    );

    expect(payload.auctionStartDate).toBe('2026-09-01 08:45:00');
    expect(payload.auctionEndDate).toBe('2026-09-03 17:10:00');
    expect(payload.startingBidFrom).toBe(1250000);
    expect(payload.reservePriceFrom).toBe(1500000);
  });
});
