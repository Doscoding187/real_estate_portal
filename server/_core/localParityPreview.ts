import { LOCAL_SERVICE_HOST, LOCAL_SERVICE_PORT } from './databaseAuthority/localServicePaths';

type PreviewEnvironment = Record<string, string | undefined>;

/** Set only by scripts/preview/local-parity.sh for the API process it starts. */
export const LOCAL_PARITY_PREVIEW_ENV = 'PROPERTY_LISTIFY_LOCAL_PARITY_PREVIEW';
export const LOCAL_PARITY_PILOT_ENV = 'PROPERTY_LISTIFY_LOCAL_PARITY_PILOT';

const HOSTED_MARKERS = [
  'RAILWAY_ENVIRONMENT',
  'RAILWAY_ENVIRONMENT_NAME',
  'VERCEL_ENV',
  'WEBSITE_SITE_NAME',
] as const;

function targetsLocalAuthorityService(environment: PreviewEnvironment): boolean {
  const raw = environment.DATABASE_URL;
  if (!raw) return false;
  try {
    const url = new URL(raw);
    return url.hostname === LOCAL_SERVICE_HOST && url.port === LOCAL_SERVICE_PORT;
  } catch {
    return false;
  }
}

/**
 * Dev-only local preview gate. Active only when ALL hold: NODE_ENV and APP_ENV
 * are exactly 'development', no test runner or hosted marker is present, the
 * database target is the local Database Authority service (127.0.0.1:3307), and
 * the explicit opt-in set by local-parity.sh is present. Anywhere else: false.
 */
export function isLocalParityPreviewActive(environment: PreviewEnvironment = process.env): boolean {
  return (
    environment.NODE_ENV === 'development' &&
    environment.APP_ENV === 'development' &&
    environment.VITEST === undefined &&
    HOSTED_MARKERS.every(key => !environment[key]) &&
    environment[LOCAL_PARITY_PREVIEW_ENV] === '1' &&
    targetsLocalAuthorityService(environment)
  );
}

/** Pilot launch mode within the local preview (default from local-parity.sh). */
export function isLocalParityPilotActive(environment: PreviewEnvironment = process.env): boolean {
  return isLocalParityPreviewActive(environment) && environment[LOCAL_PARITY_PILOT_ENV] === '1';
}
