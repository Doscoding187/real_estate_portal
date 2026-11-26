import { resolveDatabaseAuthority } from './databaseAuthority/context';
import type { DatabaseCredentialClass } from './databaseAuthority/types';
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
  'CONTAINER_APP_NAME',
  'CONTAINER_APP_ENV_DNS_SUFFIX',
  'CONTAINER_APP_REVISION',
  'KUBERNETES_SERVICE_HOST',
] as const;

export type LocalAuthorityTarget = {
  targetClass: string;
  host: string;
  port: string;
  local: boolean;
};

const LOCAL_TARGET_CLASSES = new Set(['clean-main-local', 'disposable-worktree']);

export function isLocalAuthorityTarget(target: LocalAuthorityTarget | null | undefined): boolean {
  return Boolean(
    target &&
      target.local &&
      LOCAL_TARGET_CLASSES.has(target.targetClass) &&
      target.host === LOCAL_SERVICE_HOST &&
      target.port === LOCAL_SERVICE_PORT,
  );
}

/**
 * Same resolution the server connects with (db-connection.ts): synchronous, no
 * database call. Returns null when it cannot resolve.
 */
function resolveRuntimeAuthorityTarget(
  environment: PreviewEnvironment = process.env,
): LocalAuthorityTarget | null {
  try {
    const { context } = resolveDatabaseAuthority({
      operation: 'runtime-connect',
      processEnv: environment as NodeJS.ProcessEnv,
      credentialClass: (environment.DATABASE_CREDENTIAL_CLASS as DatabaseCredentialClass) ?? undefined,
    });
    return context;
  } catch {
    return null;
  }
}

// Decision cached after first resolution (process env does not change target
// mid-run); evaluated lazily at call time, never at module load.
let cachedProcessDecision: boolean | null = null;
export function resetLocalParityPreviewCacheForTests(): void {
  cachedProcessDecision = null;
}

/**
 * Dev-only local preview gate. Active only when ALL hold: NODE_ENV and APP_ENV
 * are exactly 'development', no test runner or hosted marker is present, the
 * database target is the local Database Authority service (127.0.0.1:3307), and
 * the explicit opt-in set by local-parity.sh is present. Anywhere else: false.
 */
export function isLocalParityPreviewActive(
  environment: PreviewEnvironment = process.env,
  resolveTarget: (env: PreviewEnvironment) => LocalAuthorityTarget | null = resolveRuntimeAuthorityTarget,
): boolean {
  const cheap = (
    environment.NODE_ENV === 'development' &&
    environment.APP_ENV === 'development' &&
    environment.VITEST === undefined &&
    HOSTED_MARKERS.every(key => !environment[key]) &&
    environment[LOCAL_PARITY_PREVIEW_ENV] === '1'
  );
  if (!cheap) return false;
  if (environment === process.env && resolveTarget === resolveRuntimeAuthorityTarget) {
    cachedProcessDecision ??= isLocalAuthorityTarget(resolveTarget(environment));
    return cachedProcessDecision;
  }
  return isLocalAuthorityTarget(resolveTarget(environment));
}

/** Pilot launch mode within the local preview (default from local-parity.sh). */
export function isLocalParityPilotActive(
  environment: PreviewEnvironment = process.env,
  resolveTarget?: (env: PreviewEnvironment) => LocalAuthorityTarget | null,
): boolean {
  return isLocalParityPreviewActive(environment, resolveTarget) && environment[LOCAL_PARITY_PILOT_ENV] === '1';
}
