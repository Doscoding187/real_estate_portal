import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockDb } = vi.hoisted(() => ({
  mockDb: {
    getPropertyById: vi.fn(),
    archiveListing: vi.fn(),
    deleteProperty: vi.fn(),
    updateProperty: vi.fn(),
    getListingById: vi.fn(),
    deleteListing: vi.fn(),
    isFavorite: vi.fn(),
    addFavorite: vi.fn(),
    removeFavorite: vi.fn(),
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

  it('refuses legacy deletion when the source Listing is Commercial marketing', async () => {
    mockDb.getPropertyById.mockResolvedValue({
      id: 703,
      ownerId: 42,
      propertyType: 'house',
      sourceListingId: 1703,
    });
    mockDb.getListingById.mockResolvedValue({ id: 1703, propertyType: 'commercial' });

    await expect(callerFor().properties.delete({ id: 703 })).rejects.toMatchObject({
      code: 'BAD_REQUEST',
      message: 'Commercial leasing listings are managed through Commercial inventory.',
    });

    expect(mockDb.archiveListing).not.toHaveBeenCalled();
    expect(mockDb.deleteProperty).not.toHaveBeenCalled();
  });

  it('refuses direct legacy updates to a Commercial property record', async () => {
    mockDb.getPropertyById.mockResolvedValue({
      id: 704,
      ownerId: 42,
      propertyType: 'commercial',
      sourceListingId: null,
    });

    await expect(callerFor().properties.update({ id: 704 })).rejects.toMatchObject({
      code: 'BAD_REQUEST',
      message: 'Commercial leasing listings are managed through Commercial inventory.',
    });

    expect(mockDb.updateProperty).not.toHaveBeenCalled();
  });

  it('refuses to save a legacy Commercial property mirror as a generic favorite', async () => {
    mockDb.getPropertyById.mockResolvedValue({
      id: 705,
      propertyType: 'commercial',
    });

    await expect(callerFor().properties.toggleFavorite({ propertyId: 705 })).rejects.toMatchObject({
      code: 'BAD_REQUEST',
      message: 'Commercial leasing is available through the dedicated Commercial journey only.',
    });

    expect(mockDb.isFavorite).not.toHaveBeenCalled();
    expect(mockDb.addFavorite).not.toHaveBeenCalled();
    expect(mockDb.removeFavorite).not.toHaveBeenCalled();
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
