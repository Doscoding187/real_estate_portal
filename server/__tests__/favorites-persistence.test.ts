import { beforeEach, describe, expect, it, vi } from 'vitest';

const persistence = vi.hoisted(() => ({
  addFavorite: vi.fn(),
  getUserFavorites: vi.fn(),
  removeFavorite: vi.fn(),
}));
vi.mock('../db', () => persistence);
import { favoritesRouter } from '../favoritesRouter';

function caller(user: { id: number } | null = { id: 17 }) {
  return favoritesRouter.createCaller({ user, req: {}, res: {} } as any);
}

describe('favorites persistence boundary', () => {
  beforeEach(() => vi.resetAllMocks());

  it('reads and writes through the same authenticated property-favorites authority', async () => {
    const rows = [{ id: 3, propertyId: 42 }];
    persistence.getUserFavorites.mockResolvedValue(rows);
    expect(await caller().list()).toEqual(rows);
    await expect(caller().add({ propertyId: 42 })).resolves.toEqual({ success: true });
    await expect(caller().remove({ propertyId: 42 })).resolves.toEqual({ success: true });
    expect(persistence.getUserFavorites).toHaveBeenCalledWith(17);
    expect(persistence.addFavorite).toHaveBeenCalledWith(17, 42);
    expect(persistence.removeFavorite).toHaveBeenCalledWith(17, 42);
  });

  it('does not report successful persistence when the database fails', async () => {
    persistence.addFavorite.mockRejectedValue(new Error('database unavailable'));
    await expect(caller().add({ propertyId: 42 })).rejects.toThrow('database unavailable');
  });

  it('rejects anonymous reads and mutations before persistence', async () => {
    await expect(caller(null).list()).rejects.toMatchObject({ code: 'UNAUTHORIZED' });
    await expect(caller(null).add({ propertyId: 42 })).rejects.toMatchObject({
      code: 'UNAUTHORIZED',
    });
    await expect(caller(null).remove({ propertyId: 42 })).rejects.toMatchObject({
      code: 'UNAUTHORIZED',
    });
    Object.values(persistence).forEach(mock => expect(mock).not.toHaveBeenCalled());
  });

  it.each([0, -1, 1.5])('rejects invalid property identity %s', async propertyId => {
    await expect(caller().add({ propertyId })).rejects.toMatchObject({ code: 'BAD_REQUEST' });
    expect(persistence.addFavorite).not.toHaveBeenCalled();
  });
});
