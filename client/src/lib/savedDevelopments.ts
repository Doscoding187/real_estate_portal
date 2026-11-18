// Whole developments saved on this device only. Development favorites do not use the
// property-listing favorite API, which accepts only public property listing IDs.
import { useCallback, useEffect, useRef, useState } from 'react';

export const SAVED_DEVELOPMENTS_KEY = 'pl.savedDevelopments.v1';
export const SAVED_DEVELOPMENTS_CAP = 200;

export type SavedDevelopment = {
  developmentId: string;
  href: string;
  title: string;
  location: string;
  image: string;
  savedAt: number;
};

export type SavedDevelopmentInput = Omit<SavedDevelopment, 'savedAt'>;

function getStorage(): Storage | null {
  try {
    return typeof window !== 'undefined' ? window.localStorage : null;
  } catch {
    return null;
  }
}

function isSavedDevelopment(value: unknown): value is SavedDevelopment {
  if (!value || typeof value !== 'object') return false;
  const item = value as Record<string, unknown>;
  return (
    typeof item.developmentId === 'string' &&
    item.developmentId !== '' &&
    typeof item.href === 'string' &&
    typeof item.title === 'string' &&
    typeof item.location === 'string' &&
    typeof item.image === 'string' &&
    typeof item.savedAt === 'number'
  );
}

export function readSavedDevelopments(): SavedDevelopment[] {
  try {
    const raw = getStorage()?.getItem(SAVED_DEVELOPMENTS_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isSavedDevelopment).slice(0, SAVED_DEVELOPMENTS_CAP);
  } catch {
    return [];
  }
}

/** Returns false when the browser refused the write (storage unavailable or full). */
export function writeSavedDevelopments(items: SavedDevelopment[]): boolean {
  try {
    const storage = getStorage();
    if (!storage) return false;
    storage.setItem(SAVED_DEVELOPMENTS_KEY, JSON.stringify(items.slice(0, SAVED_DEVELOPMENTS_CAP)));
    return true;
  } catch {
    // The in-memory choice stays available for this page session.
    return false;
  }
}

export function toggleSavedDevelopment(
  items: SavedDevelopment[],
  development: SavedDevelopmentInput,
  now: number = Date.now(),
): SavedDevelopment[] {
  if (items.some(item => item.developmentId === development.developmentId)) {
    return items.filter(item => item.developmentId !== development.developmentId);
  }
  return [{ ...development, savedAt: now }, ...items].slice(0, SAVED_DEVELOPMENTS_CAP);
}

export function useSavedDevelopments() {
  const [items, setItems] = useState<SavedDevelopment[]>(() => readSavedDevelopments());
  const itemsRef = useRef(items);

  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key === null || event.key === SAVED_DEVELOPMENTS_KEY) {
        setItems(readSavedDevelopments());
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const isSaved = useCallback(
    (developmentId: string) => items.some(item => item.developmentId === developmentId),
    [items],
  );

  const toggle = useCallback(
    (development: SavedDevelopmentInput): { saved: boolean; persisted: boolean } => {
      const next = toggleSavedDevelopment(itemsRef.current, development);
      const persisted = writeSavedDevelopments(next);
      itemsRef.current = next;
      setItems(next);
      return {
        saved: next.some(item => item.developmentId === development.developmentId),
        persisted,
      };
    },
    [],
  );

  return { items, isSaved, toggle };
}
