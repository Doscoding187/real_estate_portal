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

function writeSavedDevelopments(items: SavedDevelopment[]): void {
  try {
    getStorage()?.setItem(
      SAVED_DEVELOPMENTS_KEY,
      JSON.stringify(items.slice(0, SAVED_DEVELOPMENTS_CAP)),
    );
  } catch {
    // Keep the in-memory choice available for this page session if storage is unavailable.
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

  const toggle = useCallback((development: SavedDevelopmentInput): boolean => {
    const next = toggleSavedDevelopment(itemsRef.current, development);
    writeSavedDevelopments(next);
    itemsRef.current = next;
    setItems(next);
    return next.some(item => item.developmentId === development.developmentId);
  }, []);

  return { items, isSaved, toggle };
}
