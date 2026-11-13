import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  SAVED_UNIT_TYPES_CAP,
  SAVED_UNIT_TYPES_KEY,
  readSavedUnitTypes,
  toggleSavedUnitType,
  useSavedUnitTypes,
  writeSavedUnitTypes,
} from './savedUnitTypes';

const item = (n: number) => ({
  unitTypeId: `u${n}`,
  developmentId: '5',
  href: `/development/sample/unit/u${n}`,
  title: `Unit ${n}`,
  developmentName: 'Sample Heights',
});

describe('savedUnitTypes', () => {
  beforeEach(() => window.localStorage.clear());
  afterEach(() => vi.restoreAllMocks());

  it('treats missing, corrupt and wrongly shaped storage as empty', () => {
    expect(readSavedUnitTypes()).toEqual([]);
    window.localStorage.setItem(SAVED_UNIT_TYPES_KEY, '{not json');
    expect(readSavedUnitTypes()).toEqual([]);
    window.localStorage.setItem(SAVED_UNIT_TYPES_KEY, '{"a":1}');
    expect(readSavedUnitTypes()).toEqual([]);
    window.localStorage.setItem(SAVED_UNIT_TYPES_KEY, JSON.stringify([{ nope: true }, 3]));
    expect(readSavedUnitTypes()).toEqual([]);
  });

  it('never throws when storage is unavailable, and the hook still toggles in memory', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    expect(readSavedUnitTypes()).toEqual([]);
    expect(writeSavedUnitTypes([])).toBe(false);
    const { result } = renderHook(() => useSavedUnitTypes());
    act(() => {
      expect(result.current.toggle(item(1))).toBe(true);
    });
    expect(result.current.isSaved('u1')).toBe(true);
    act(() => {
      expect(result.current.toggle(item(1))).toBe(false);
    });
    expect(result.current.isSaved('u1')).toBe(false);
  });

  it('toggles, newest first, and persists', () => {
    const { result } = renderHook(() => useSavedUnitTypes());
    act(() => {
      result.current.toggle(item(1));
      result.current.toggle(item(2));
    });
    expect(result.current.items.map(i => i.unitTypeId)).toEqual(['u2', 'u1']);
    expect(readSavedUnitTypes().map(i => i.unitTypeId)).toEqual(['u2', 'u1']);
    act(() => {
      result.current.toggle(item(2));
    });
    expect(readSavedUnitTypes().map(i => i.unitTypeId)).toEqual(['u1']);
  });

  it('caps the list at 200, dropping the oldest', () => {
    let list = [] as ReturnType<typeof readSavedUnitTypes>;
    for (let n = 0; n < SAVED_UNIT_TYPES_CAP + 5; n += 1) {
      list = toggleSavedUnitType(list, item(n), n);
    }
    expect(list).toHaveLength(SAVED_UNIT_TYPES_CAP);
    expect(list[0].unitTypeId).toBe(`u${SAVED_UNIT_TYPES_CAP + 4}`);
    expect(list.some(i => i.unitTypeId === 'u0')).toBe(false);
  });

  it('follows a change made in another tab through the storage event', () => {
    const { result } = renderHook(() => useSavedUnitTypes());
    expect(result.current.isSaved('u9')).toBe(false);
    act(() => {
      window.localStorage.setItem(
        SAVED_UNIT_TYPES_KEY,
        JSON.stringify([{ ...item(9), savedAt: 1 }]),
      );
      window.dispatchEvent(new StorageEvent('storage', { key: SAVED_UNIT_TYPES_KEY }));
    });
    expect(result.current.isSaved('u9')).toBe(true);
  });
});
