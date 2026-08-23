import { describe, expect, it } from 'vitest';

import { isCurrentActiveAgencyMembership } from '../agencyMembershipService';

const NOW = new Date('2026-08-23T12:00:00.000Z');
const iso = (offsetDays: number) =>
  new Date(NOW.getTime() + offsetDays * 24 * 60 * 60 * 1000).toISOString();

/**
 * The shared current-membership predicate is the single authority consumed
 * by Explore Option-A eligibility and the public agent web presence. The
 * lifecycle transitions themselves are enforced by MySQL inside the atomic
 * maintain() upsert and covered by the disposable-database integration suite.
 */
describe('canonical agency membership semantics', () => {
  describe('isCurrentActiveAgencyMembership', () => {
    it('accepts an active membership with an open effective window', () => {
      expect(
        isCurrentActiveAgencyMembership(
          { status: 'active', effectiveFrom: iso(-5), effectiveTo: null },
          NOW,
        ),
      ).toBe(true);
      expect(
        isCurrentActiveAgencyMembership(
          { status: 'active', effectiveFrom: null, effectiveTo: null },
          NOW,
        ),
      ).toBe(true);
    });

    it('rejects non-active statuses regardless of window', () => {
      for (const status of ['invited', 'suspended', 'left'] as const) {
        expect(
          isCurrentActiveAgencyMembership({ status, effectiveFrom: iso(-5), effectiveTo: null }, NOW),
        ).toBe(false);
      }
      expect(isCurrentActiveAgencyMembership({ status: null, effectiveFrom: iso(-5), effectiveTo: null }, NOW)).toBe(
        false,
      );
    });

    it('enforces the half-open effective window boundaries', () => {
      expect(
        isCurrentActiveAgencyMembership(
          { status: 'active', effectiveFrom: iso(1), effectiveTo: null },
          NOW,
        ),
      ).toBe(false); // not yet effective
      expect(
        isCurrentActiveAgencyMembership(
          { status: 'active', effectiveFrom: iso(-10), effectiveTo: iso(0) },
          NOW,
        ),
      ).toBe(false); // window closed at evaluated time (to is exclusive)
      expect(
        isCurrentActiveAgencyMembership(
          { status: 'active', effectiveFrom: iso(-10), effectiveTo: iso(0) },
          new Date(NOW.getTime() - 60 * 60 * 1000),
        ),
      ).toBe(true);
    });
  });
});
