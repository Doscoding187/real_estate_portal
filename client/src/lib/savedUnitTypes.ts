// Unit types (new-development home types) saved on THIS device only. Owner decision 2026-11-12:
// account saving needs a new database table and is planned with the New Developments journey.
// Nothing here is sent to the server and no cookie is used. See
// docs/product/homepage/trending-properties.md.
import { useCallback, useEffect, useRef, useState } from 'react';

export const SAVED_UNIT_TYPES_KEY = 'pl.savedUnitTypes.v1';
export const SAVED_UNIT_TYPES_CAP = 200;

export type SavedUnitType = {
  unitTypeId: string;
  developmentId: string;
  href: string;
  title: string;
  developmentName: string;
  savedAt: number;
};

function getStorage(): Storage | null {
  try {
    return typeof window !== 'undefined' ? window.localStorage : null;
  } catch {
    return null;
  }
}

function isSavedUnitType(value: unknown): value is SavedUnitType {
  if (!value || typeof value !== 'object') return false;
  const item = value as Record<string, unknown>;
  return (
    typeof item.unitTypeId === 'string' &&
    item.unitTypeId !== '' &&
    typeof item.developmentId === 'string' &&
    typeof item.href === 'string' &&
    typeof item.title === 'string' &&
    typeof item.developmentName === 'string' &&
    typeof item.savedAt === 'number'
  );
}

/** Reads the saved list. Missing, unavailable or corrupt storage gives an empty list; never throws. */
export function readSavedUnitTypes(): SavedUnitType[] {
  try {
    const raw = getStorage()?.getItem(SAVED_UNIT_TYPES_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isSavedUnitType).slice(0, SAVED_UNIT_TYPES_CAP);
  } catch {
    return [];
  }
}

/** Writes the list (newest first, capped). Returns false when the browser refused the write. */
export function writeSavedUnitTypes(items: SavedUnitType[]): boolean {
  try {
    const storage = getStorage();
    if (!storage) return false;
    storage.setItem(SAVED_UNIT_TYPES_KEY, JSON.stringify(items.slice(0, SAVED_UNIT_TYPES_CAP)));
    return true;
  } catch {
    return false;
  }
}

export type SavedUnitTypeInput = Omit<SavedUnitType, 'savedAt'>;

/** Pure toggle: removes the item when present, otherwise adds it at the front. */
export function toggleSavedUnitType(
  items: SavedUnitType[],
  item: SavedUnitTypeInput,
  now: number = Date.now(),
): SavedUnitType[] {
  if (items.some(existing => existing.unitTypeId === item.unitTypeId)) {
    return items.filter(existing => existing.unitTypeId !== item.unitTypeId);
  }
  return [{ ...item, savedAt: now }, ...items].slice(0, SAVED_UNIT_TYPES_CAP);
}

export function useSavedUnitTypes() {
  const [items, setItems] = useState<SavedUnitType[]>(() => readSavedUnitTypes());
  // Latest list, so a toggle still works in memory when the browser refuses to store anything.
  const itemsRef = useRef(items);
  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key === null || event.key === SAVED_UNIT_TYPES_KEY) {
        setItems(readSavedUnitTypes());
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const isSaved = useCallback(
    (unitTypeId: string) => items.some(item => item.unitTypeId === unitTypeId),
    [items],
  );

  /** Toggles and returns whether the unit type is now saved (in memory even if storage refuses). */
  const toggle = useCallback((item: SavedUnitTypeInput): boolean => {
    const next = toggleSavedUnitType(itemsRef.current, item);
    writeSavedUnitTypes(next);
    itemsRef.current = next;
    setItems(next);
    return next.some(existing => existing.unitTypeId === item.unitTypeId);
  }, []);

  return { items, isSaved, toggle };
}
