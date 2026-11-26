import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { isValidPastOrTodayDate } from '../listingLifecycleTransition';
import { isServiceLeadLinkAllowed } from '../serviceLeadPropertyLink';
import { wasLastArchivedByModerator } from '../listingTakedownGuard';

const read = (file: string) => readFileSync(path.resolve(process.cwd(), file), 'utf8');

describe('effectiveDate validation', () => {
  const now = new Date('2026-11-26T10:00:00Z');
  it('accepts today and past real dates', () => {
    expect(isValidPastOrTodayDate('2026-11-26', now)).toBe(true);
    expect(isValidPastOrTodayDate('2026-02-28', now)).toBe(true);
  });
  it('rejects impossible calendar dates, the future and bad formats', () => {
    expect(isValidPastOrTodayDate('2026-02-31', now)).toBe(false);
    expect(isValidPastOrTodayDate('2026-13-01', now)).toBe(false);
    expect(isValidPastOrTodayDate('2026-11-27', now)).toBe(false);
    expect(isValidPastOrTodayDate('26-11-01', now)).toBe(false);
  });
});

describe('moderator takedown cannot be undone by the owner', () => {
  const moderation = { action: 'reject_property', metadata: '{"lifecycleAction":"archive"}' };
  it('flags a listing whose latest withdrawal was an admin archive', () => {
    expect(wasLastArchivedByModerator([moderation])).toBe(true);
    expect(
      wasLastArchivedByModerator([
        moderation,
        { action: 'listing.republish', metadata: null },
      ]),
    ).toBe(true);
  });
  it('does not flag lister withdrawals, or a lister action newer than the takedown', () => {
    expect(wasLastArchivedByModerator([{ action: 'listing.unpublish', metadata: null }])).toBe(false);
    expect(
      wasLastArchivedByModerator([{ action: 'listing.republish', metadata: null }, moderation]),
    ).toBe(false);
    expect(
      wasLastArchivedByModerator([
        { action: 'reject_property', metadata: '{"lifecycleAction":"approve"}' },
      ]),
    ).toBe(false);
    expect(wasLastArchivedByModerator([])).toBe(false);
  });
  it('is enforced for non-super-admins in setLifecycle', () => {
    const router = read('server/listingRouter.ts');
    expect(router).toContain("user.role !== 'super_admin' && (await isListingTakenDownByModerator");
    expect(router).toContain('unpublished by a moderator');
  });
});

describe('services requests cannot link to unavailable homes', () => {
  const base = { requesterUserId: 10, publiclyEligible: true };
  it.each(['sold', 'rented', 'archived'])('rejects a %s property or listing, even for the owner', status => {
    for (const kind of ['property', 'listing'] as const) {
      expect(
        isServiceLeadLinkAllowed({ ...base, kind, record: { status, ownerId: 10 } }),
      ).toBe(false);
      expect(
        isServiceLeadLinkAllowed({ ...base, kind, record: { status, ownerId: 99 } }),
      ).toBe(false);
    }
  });
  it('requires public eligibility for non-owners and never-published records', () => {
    expect(
      isServiceLeadLinkAllowed({
        ...base,
        kind: 'property',
        publiclyEligible: false,
        record: { status: 'available', ownerId: 99 },
      }),
    ).toBe(false);
    expect(
      isServiceLeadLinkAllowed({ ...base, kind: 'listing', record: { status: 'draft', ownerId: 99 } }),
    ).toBe(false);
    expect(
      isServiceLeadLinkAllowed({
        ...base,
        kind: 'property',
        record: { status: 'available', ownerId: 99 },
      }),
    ).toBe(true);
    expect(isServiceLeadLinkAllowed({ ...base, kind: 'listing', record: null })).toBe(false);
  });
  it('keeps the owner able to prepare a private listing', () => {
    expect(
      isServiceLeadLinkAllowed({
        ...base,
        publiclyEligible: false,
        kind: 'listing',
        record: { status: 'draft', ownerId: 10 },
      }),
    ).toBe(true);
  });
});

describe('revision approval is serialized with Sold / Let / Unpublish', () => {
  it('locks the original listing row before re-checking it is still published and writing the mirror', () => {
    const source = read('server/db.ts');
    const branch = source.slice(source.indexOf('// A revision is a private listing-engine draft.'));
    const lock = branch.indexOf('await lockListingTransitionRow(db, originalListingId);');
    const recheck = branch.indexOf("original.status !== 'published'");
    const mirror = branch.indexOf('await upsertCanonicalPublicPropertyProjection(db, projection.propertyValues);');
    expect(lock).toBeGreaterThan(-1);
    expect(recheck).toBeGreaterThan(lock);
    expect(mirror).toBeGreaterThan(recheck);
  });
});

const mocks = vi.hoisted(() => ({
  getListingById: vi.fn(),
  getListingMedia: vi.fn(),
  recordAgentOsEvent: vi.fn(),
}));
vi.mock('../../db', async importOriginal => ({
  ...(await importOriginal<typeof import('../../db')>()),
  getListingById: mocks.getListingById,
  getListingMedia: mocks.getListingMedia,
}));
vi.mock('../agentOsEventService', async importOriginal => ({
  ...(await importOriginal<typeof import('../agentOsEventService')>()),
  recordAgentOsEvent: mocks.recordAgentOsEvent,
}));

describe('republish uses the shared submission flow', () => {
  it('is refused below the readiness threshold with the same message as submitForReview, and never reopens the listing', async () => {
    const { submitListingForReviewFlow } = await import('../../listingRouter');
    const listing = {
      id: 5,
      userId: 10,
      ownerId: 10,
      agencyId: null,
      action: 'auction',
      propertyType: 'house',
      status: 'archived',
      title: 'x',
      description: '',
      propertyDetails: {},
    };
    mocks.getListingById.mockResolvedValue(listing);
    mocks.getListingMedia.mockResolvedValue([]);
    const beforeSubmit = vi.fn();
    const ctx = { user: { id: 10, role: 'agent', agencyId: null }, req: {}, requestId: 'r' } as any;

    const message = async (options: any) => {
      try {
        await submitListingForReviewFlow(ctx, 5, options);
      } catch (error: any) {
        return String(error.message);
      }
      return '';
    };
    const asRepublish = await message({ requireOwner: false, beforeSubmit });
    const asSubmit = await message({ requireOwner: true });
    expect(asRepublish).toMatch(/Listing is not ready for submission \(\d+%\)/);
    expect(asRepublish).toBe(asSubmit);
    expect(beforeSubmit).not.toHaveBeenCalled();
  });
});
