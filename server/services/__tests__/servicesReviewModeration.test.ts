import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockGetDb } = vi.hoisted(() => ({
  mockGetDb: vi.fn(),
}));

vi.mock('../../db', () => ({ getDb: mockGetDb }));

import { AuditActions } from '../../_core/auditLog';
import { servicesEngineService } from '../servicesEngineService';

function makeSelectQuery(rows: unknown[], lock = false) {
  const query: Record<string, ReturnType<typeof vi.fn>> = {
    from: vi.fn(),
    leftJoin: vi.fn(),
    innerJoin: vi.fn(),
    where: vi.fn(),
    groupBy: vi.fn(),
    orderBy: vi.fn(),
    limit: vi.fn(),
    offset: vi.fn(),
    for: vi.fn(),
  };
  for (const key of Object.keys(query)) query[key]!.mockReturnValue(query);
  if (lock) {
    query.for.mockResolvedValue(rows);
  } else {
    query.then = (resolve: (value: unknown) => unknown) => Promise.resolve(rows).then(resolve);
  }
  return query;
}

function makeInsert(insertId: number) {
  const values = vi.fn(() => ({
    then: (resolve: (value: unknown) => unknown) => Promise.resolve([{ insertId }]).then(resolve),
  }));
  return { insert: vi.fn(() => ({ values })), values };
}

function makeUpdate() {
  const where = vi.fn().mockResolvedValue({ affectedRows: 1 });
  const set = vi.fn(() => ({ where }));
  return { update: vi.fn(() => ({ set })), set, where };
}

describe('Services review moderation', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    mockGetDb.mockReset();
  });

  it('stores a new review as pending and hidden from publication', async () => {
    const profileUpdate = makeUpdate();
    const insert = makeInsert(77);
    const tx = {
      select: vi
        .fn()
        .mockReturnValueOnce(makeSelectQuery([{ id: 5 }], true))
        .mockReturnValueOnce(makeSelectQuery([{ id: 1 }]))
        .mockReturnValueOnce(makeSelectQuery([]))
        .mockReturnValueOnce(makeSelectQuery([{ reviewCount: 0, averageRating: '0' }])),
      insert: insert.insert,
      update: profileUpdate.update,
    };
    mockGetDb.mockResolvedValue({
      transaction: (callback: (value: typeof tx) => unknown) => callback(tx),
    });
    vi.spyOn(servicesEngineService, 'getProviderPublicProfile').mockResolvedValue({
      providerId: 20,
      companyName: 'Sandton Repairs',
    } as any);

    const result = await servicesEngineService.submitProviderReview({
      providerId: 20,
      reviewerUserId: 9,
      rating: 5,
      title: 'Excellent',
      content: 'Fixed the geyser quickly.',
    });

    expect(result).toEqual({
      reviewId: 77,
      averageRating: 0,
      reviewCount: 0,
      moderationStatus: 'pending',
    });
    const values = insert.values.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(values).toMatchObject({
      isPublished: 0,
      moderationStatus: 'pending',
      isVerified: 1,
    });
  });

  it('approves a review, republishes it, and recomputes the provider aggregate', async () => {
    const profileUpdate = makeUpdate();
    const auditInsert = makeInsert(1);
    const reviewUpdate = makeUpdate();
    const tx = {
      select: vi
        .fn()
        .mockReturnValueOnce(
          makeSelectQuery(
            [{ id: 77, providerId: 20, moderationStatus: 'pending', isPublished: 0 }],
            true,
          ),
        )
        .mockReturnValueOnce(makeSelectQuery([{ reviewCount: 2, averageRating: '4.5' }])),
      insert: auditInsert.insert,
      update: vi
        .fn()
        .mockReturnValueOnce(reviewUpdate.update())
        .mockReturnValueOnce(profileUpdate.update()),
    };
    mockGetDb.mockResolvedValue({
      transaction: (callback: (value: typeof tx) => unknown) => callback(tx),
    });

    const result = await servicesEngineService.reviewProviderReview({
      reviewId: 77,
      decision: 'approve',
      actorUserId: 1,
      notes: 'Verified against the completed request.',
    });

    expect(result).toMatchObject({
      reviewId: 77,
      moderationStatus: 'published',
      isPublished: true,
      averageRating: 4.5,
      reviewCount: 2,
    });
    const reviewSet = reviewUpdate.set.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(reviewSet).toMatchObject({ moderationStatus: 'published', isPublished: 1 });
    const auditValues = auditInsert.values.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(auditValues).toMatchObject({
      action: AuditActions.MODERATE_SERVICE_PROVIDER_REVIEW,
      targetId: 77,
    });
  });

  it('accepts a report for a published review and keeps it out of the public view', async () => {
    const insert = makeInsert(44);
    const tx = {
      select: vi
        .fn()
        .mockReturnValueOnce(
          makeSelectQuery(
            [
              {
                id: 77,
                providerId: 20,
                reviewerUserId: 9,
                isPublished: 1,
                moderationStatus: 'published',
              },
            ],
            true,
          ),
        )
        .mockReturnValueOnce(makeSelectQuery([])),
      insert: insert.insert,
      update: vi.fn(),
    };
    mockGetDb.mockResolvedValue({
      transaction: (callback: (value: typeof tx) => unknown) => callback(tx),
    });

    const result = await servicesEngineService.reportProviderReview({
      reviewId: 77,
      reporterUserId: 12,
      reason: 'spam',
      detail: 'Looks like an advertisement.',
    });

    expect(result).toEqual({ reportId: 44, reviewId: 77, status: 'pending' });
    const values = insert.values.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(values).toMatchObject({
      reviewId: 77,
      reporterUserId: 12,
      reason: 'spam',
      status: 'pending',
    });
  });
});
