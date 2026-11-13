import { useCallback, useState } from 'react';

import { HOME_PROVINCE_OPTIONS } from '@/lib/homeProvinceOptions';

/** The one province the whole homepage follows. Kept for the browser session only. */
export const DEFAULT_HOME_PROVINCE = 'Gauteng';
export const HOME_PROVINCE_STORAGE_KEY = 'pl.home.province';

/** The stored province when it is a known one, otherwise Gauteng. Safe when storage is blocked. */
export function readStoredHomeProvince(): string {
  try {
    const stored = window.sessionStorage.getItem(HOME_PROVINCE_STORAGE_KEY);
    if (stored && HOME_PROVINCE_OPTIONS.includes(stored)) return stored;
  } catch {
    // Storage unavailable (private mode, blocked): use the default.
  }
  return DEFAULT_HOME_PROVINCE;
}

export function storeHomeProvince(province: string): void {
  try {
    window.sessionStorage.setItem(HOME_PROVINCE_STORAGE_KEY, province);
  } catch {
    // Not remembered; the choice still applies on this page.
  }
}

/** Owner of the shared homepage province (used by the page). */
export function useHomeProvinceState(): [string, (province: string) => void] {
  const [province, setProvince] = useState(readStoredHomeProvince);
  const change = useCallback((next: string) => {
    setProvince(next);
    storeHomeProvince(next);
  }, []);
  return [province, change];
}

/**
 * A section's view of the shared province. With props it follows the page; on its own (no props)
 * it keeps the province itself, so it also works when used outside the homepage.
 */
export function useSharedHomeProvince(
  selectedProvince?: string,
  onProvinceChange?: (province: string) => void,
): [string, (province: string) => void] {
  const [local, setLocal] = useState(readStoredHomeProvince);
  const change = useCallback(
    (next: string) => {
      setLocal(next);
      storeHomeProvince(next);
      onProvinceChange?.(next);
    },
    [onProvinceChange],
  );
  return [selectedProvince ?? local, change];
}
