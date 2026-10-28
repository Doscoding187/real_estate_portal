import { useEffect, useState, type ReactNode } from 'react';
import { isApiReady } from '@shared/apiReadiness';
import { MaintenancePage } from './MaintenancePage';

const HEALTHY_RECHECK_MS = 15_000;
const UNAVAILABLE_RECHECK_MS = 5_000;
const API_BASE_URL = import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL || '';

export interface ApiAvailabilityBoundaryProps {
  children: ReactNode;
  enabled?: boolean;
  apiBaseUrl?: string;
}

/** Covers an already-open SPA when its API becomes unavailable, and restores it after recovery. */
export function ApiAvailabilityBoundary({
  children,
  enabled = import.meta.env.VITE_DEPLOY_ENV === 'production',
  apiBaseUrl = API_BASE_URL,
}: ApiAvailabilityBoundaryProps) {
  const [maintenance, setMaintenance] = useState(false);

  useEffect(() => {
    if (!enabled) return;

    let disposed = false;
    let timer: number | undefined;

    const check = async () => {
      const ready = await isApiReady(apiBaseUrl);
      if (disposed) return;

      setMaintenance(!ready);
      timer = window.setTimeout(check, ready ? HEALTHY_RECHECK_MS : UNAVAILABLE_RECHECK_MS);
    };

    void check();
    return () => {
      disposed = true;
      if (timer !== undefined) window.clearTimeout(timer);
    };
  }, [apiBaseUrl, enabled]);

  return maintenance ? <MaintenancePage /> : children;
}
