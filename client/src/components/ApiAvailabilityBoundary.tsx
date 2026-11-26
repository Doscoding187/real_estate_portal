import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import { isApiReady } from '@shared/apiReadiness';
import { MaintenancePage } from './MaintenancePage';

const HEALTHY_RECHECK_MS = 15_000;
const UNAVAILABLE_RECHECK_MS = 5_000;
const REQUIRED_CONSECUTIVE_FAILURES = 2;
const API_BASE_URL = import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL || '';

export interface ApiAvailabilityBoundaryProps {
  children: ReactNode;
  enabled?: boolean;
  apiBaseUrl?: string;
}

export type ApiAvailabilityStatus = 'available' | 'checking' | 'unavailable';

export type ApiAvailability = {
  status: ApiAvailabilityStatus;
  isAvailable: boolean;
  isUnavailable: boolean;
};

const DEFAULT_API_AVAILABILITY: ApiAvailability = {
  status: 'available',
  isAvailable: true,
  isUnavailable: false,
};

const ApiAvailabilityContext = createContext<ApiAvailability>(DEFAULT_API_AVAILABILITY);

/**
 * Gives a page a confirmed API-outage signal without treating a failed request
 * as proof that its resource is unpublished or no longer exists.
 */
export function useApiAvailability(): ApiAvailability {
  return useContext(ApiAvailabilityContext);
}

/**
 * These pages remain useful when live provider data is unavailable: they can
 * describe the marketplace and its categories without revealing a provider or
 * accepting a write. Dynamic Services pages render their own honest outage
 * state before attempting a request, application, or profile claim.
 */
export function isServicesOutageResilientPath(pathname: string): boolean {
  return (
    pathname === '/services' ||
    pathname.startsWith('/services/') ||
    pathname === '/advertise/services'
  );
}

export function ApiAvailabilityGate({
  pathname,
  children,
}: {
  pathname: string;
  children: ReactNode;
}) {
  const { isUnavailable } = useApiAvailability();

  if (isUnavailable && !isServicesOutageResilientPath(pathname)) {
    return <MaintenancePage />;
  }

  return <>{children}</>;
}

/**
 * Tracks API availability for an already-open SPA and restores normal behavior
 * after recovery. The route-aware gate lives inside the router so a Services
 * visitor can still reach static public information during an API outage.
 */
export function ApiAvailabilityBoundary({
  children,
  enabled = import.meta.env.VITE_DEPLOY_ENV === 'production' ||
    import.meta.env.VITE_MAINTENANCE_GATE_ENABLED === 'true',
  apiBaseUrl = API_BASE_URL,
}: ApiAvailabilityBoundaryProps) {
  const [status, setStatus] = useState<ApiAvailabilityStatus>(
    enabled ? 'checking' : 'available',
  );

  useEffect(() => {
    if (!enabled) {
      setStatus('available');
      return;
    }

    let disposed = false;
    let timer: number | undefined;
    let consecutiveFailures = 0;

    const check = async () => {
      const ready = await isApiReady(apiBaseUrl);
      if (disposed) return;

      consecutiveFailures = ready ? 0 : consecutiveFailures + 1;
      // A single failed check (blocked, slow or transient) must not replace the page.
      setStatus(
        ready
          ? 'available'
          : consecutiveFailures >= REQUIRED_CONSECUTIVE_FAILURES
            ? 'unavailable'
            : 'checking',
      );
      timer = window.setTimeout(check, ready ? HEALTHY_RECHECK_MS : UNAVAILABLE_RECHECK_MS);
    };

    void check();
    return () => {
      disposed = true;
      if (timer !== undefined) window.clearTimeout(timer);
    };
  }, [apiBaseUrl, enabled]);

  const value: ApiAvailability = {
    status,
    isAvailable: status === 'available',
    isUnavailable: status === 'unavailable',
  };

  return <ApiAvailabilityContext.Provider value={value}>{children}</ApiAvailabilityContext.Provider>;
}
