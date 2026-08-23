import { describe, expect, it } from 'vitest';

import {
  hasWindowOpenForStatus,
  isCurrentActiveAgencyMembership,
  maintainMembershipUpdateSet,
} from '../agencyMembershipService';

const NOW = new Date('2026-08-23T12:00:00.000Z');
const iso = (offsetDays: number) =>
  new Date(NOW.getTime() + offsetDays * 24 * 60 * 60 * 1000).toISOString();

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

  describe('maintainMembershipUpdateSet', () => {
    it('activates a fresh membership with an open window', () => {
      const set = maintainMembershipUpdateSet(
        { status: 'invited', effectiveFrom: null, effectiveTo: null },
        'active',
        NOW,
      );
      expect(set.status).toBe('active');
      expect(set.effectiveFrom).toBeTruthy();
      expect(set.effectiveTo).toBeUndefined(); // already open; left untouched
    });

    it('re-opens a closed window on reactivation', () => {
      const set = maintainMembershipUpdateSet(
        { status: 'left', effectiveFrom: iso(-90), effectiveTo: iso(-30) },
        'active',
        NOW,
      );
      expect(set.status).toBe('active');
      expect(set.effectiveFrom).toBeTruthy();
      expect(set.effectiveTo).toBeNull();
    });

    it('keeps the existing open window when already active', () => {
      const from = iso(-30);
      const set = maintainMembershipUpdateSet(
        { status: 'active', effectiveFrom: from, effectiveTo: null },
        'active',
        NOW,
      );
      expect(set.status).toBe('active');
      expect(set.effectiveFrom).toBeUndefined();
      expect(set.effectiveTo).toBeUndefined();
    });

    it('closes the window when suspending or leaving', () => {
      for (const status of ['suspended', 'left'] as const) {
        const set = maintainMembershipUpdateSet(
          { status: 'active', effectiveFrom: iso(-30), effectiveTo: null },
          status,
          NOW,
        );
        expect(set.status).toBe(status);
        expect(set.effectiveTo).toBeTruthy();
      }
    });
  });

  describe('hasWindowOpenForStatus helper contract', () => {
    it('reports closure only via effectiveTo', () => {
      expect(hasWindowOpenForStatus({ effectiveFrom: iso(-1), effectiveTo: null }, NOW)).toBe(true);
      expect(hasWindowOpenForStatus({ effectiveFrom: iso(-1), effectiveTo: iso(0) }, NOW)).toBe(
        false,
      );
    });
  });
});
