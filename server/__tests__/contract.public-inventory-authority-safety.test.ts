import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockDb } = vi.hoisted(() => ({
  mockDb: {
    getPropertyById: vi.fn(),
    archiveListing: vi.fn(),
    deleteProperty: vi.fn(),
    updateProperty: vi.fn(),
    getListingById: vi.fn(),
    deleteListing: vi.fn(),
  },
}));

vi.mock('../db', () => mockDb);

import { appRouter } from '../routers';

const callerFor = (role = 'agent') =>
  appRouter.createCaller({
    req: { headers: {} },
    res: {},
    user: { id: 42, email: `${role}@example.test`, name: role, role },
  } as any);

describe('public inventory authority safety contracts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDb.archiveListing.mockResolvedValue(undefined);
    mockDb.deleteProperty.mockResolvedValue(undefined);
    mockDb.deleteListing.mockResolvedValue(undefined);
  });

  it('routes a listing-backed property delete to source-listing archive', async () => {
    mockDb.getPropertyById.mockResolvedValue({
      id: 700,
      ownerId: 42,
      sourceListingId: 1700,
    });

    await expect(callerFor().properties.delete({ id: 700 })).resolves.toEqual({
      success: true,
      status: 'archived',
    });

    expect(mockDb.archiveListing).toHaveBeenCalledWith(1700);
    expect(mockDb.deleteProperty).not.toHaveBeenCalled();
  });

  it('keeps unlinked historical property deletion on the explicit legacy path', async () => {
    mockDb.getPropertyById.mockResolvedValue({
      id: 701,
      ownerId: 42,
      sourceListingId: null,
    });

    await expect(callerFor().properties.delete({ id: 701 })).resolves.toEqual({ success: true });

    expect(mockDb.deleteProperty).toHaveBeenCalledWith(701, 42, 'agent');
    expect(mockDb.archiveListing).not.toHaveBeenCalled();
  });

  it('rejects direct updates to listing-backed public properties', async () => {
    mockDb.getPropertyById.mockResolvedValue({
      id: 702,
      ownerId: 42,
      sourceListingId: 1702,
    });

    await expect(callerFor().properties.update({ id: 702 })).rejects.toMatchObject({
      code: 'PRECONDITION_FAILED',
      message:
        'Listing-backed public properties are read-only. Update the source listing through the canonical listing workflow.',
    });

    expect(mockDb.updateProperty).not.toHaveBeenCalled();
  });

  it('archives published listings instead of hard-deleting customer-visible supply', async () => {
    mockDb.getListingById.mockResolvedValue({
      id: 1703,
      userId: 42,
      status: 'published',
    });

    await expect(callerFor().listing.delete({ id: 1703 })).resolves.toEqual({
      success: true,
      status: 'archived',
    });

    expect(mockDb.archiveListing).toHaveBeenCalledWith(1703);
    expect(mockDb.deleteListing).not.toHaveBeenCalled();
  });
});
