import { existsSync, lstatSync, readFileSync, realpathSync, statSync } from 'node:fs';
import { homedir } from 'node:os';
import { join, resolve } from 'node:path';
import dotenv from 'dotenv';
import type {
  DatabaseEnvironmentSource,
  DatabaseRuntimeMode,
} from './types';

export type ResolvedDatabaseEnvironment = {
  values: Record<string, string | undefined>;
  databaseUrl: string | undefined;
  source: DatabaseEnvironmentSource;
  runtimeMode: DatabaseRuntimeMode;
  loadedFiles: string[];
};

function normalizeRuntime(value: string | undefined): DatabaseRuntimeMode | null {
  const normalized = String(value ?? '').trim().toLowerCase();
  if (normalized === 'dev' || normalized === 'development') return 'development';
  if (normalized === 'test' || normalized === 'testing') return 'test';
  if (normalized === 'stage' || normalized === 'staging') return 'staging';
  if (normalized === 'prod' || normalized === 'production') return 'production';
  return null;
}

export function resolveDatabaseRuntimeMode(
  values: Record<string, string | undefined>,
): DatabaseRuntimeMode {
  return (
    normalizeRuntime(
      values.APP_ENV ??
        values.RAILWAY_ENVIRONMENT_NAME ??
        values.RAILWAY_ENVIRONMENT ??
        values.VERCEL_ENV,
    ) ??
    normalizeRuntime(values.NODE_ENV) ??
    'development'
  );
}

function readEnvironmentFile(path: string): Record<string, string> {
  if (!existsSync(path)) return {};
  return dotenv.parse(readFileSync(path, 'utf8'));
}

function centralEnvironmentPath(home = homedir()): string {
  return join(home, '.config', 'property-listify', 'local.env');
}

function targetFromOneSource(
  values: Record<string, string | undefined>,
  sourceName: string,
): string | undefined {
  const direct = String(values.DATABASE_URL ?? '').trim();
  const e2e = String(values.LISTIFY_E2E_DATABASE_URL ?? '').trim();
  if (direct && e2e && direct !== e2e) {
    throw new Error(
      `Database environment resolution refused: ${sourceName} contains disagreeing explicit target values.`,
    );
  }
  return direct || e2e || undefined;
}

function isSameFile(left: string, right: string): boolean {
  try {
    return realpathSync(left) === realpathSync(right);
  } catch {
    return false;
  }
}

export function resolveDatabaseEnvironment(input: {
  cwd?: string;
  processEnv?: NodeJS.ProcessEnv;
  explicitDatabaseUrl?: string;
  centralPath?: string;
} = {}): ResolvedDatabaseEnvironment {
  const cwd = resolve(input.cwd ?? process.cwd());
  const processValues = { ...(input.processEnv ?? process.env) };
  const preliminaryRuntime = resolveDatabaseRuntimeMode(processValues);
  const basePath = join(cwd, '.env');
  const runtimePath =
    preliminaryRuntime === 'development'
      ? join(cwd, '.env.local')
      : join(cwd, `.env.${preliminaryRuntime}`);
  const centralPath = input.centralPath ?? centralEnvironmentPath();
  const baseValues = readEnvironmentFile(basePath);
  const runtimeValues = readEnvironmentFile(runtimePath);
  let centralValues: Record<string, string> = {};
  if (existsSync(centralPath)) {
    const mode = statSync(centralPath).mode & 0o777;
    if (mode !== 0o600) {
      throw new Error('Central local database environment permissions must be exactly 0600.');
    }
    centralValues = readEnvironmentFile(centralPath);
  }

  const explicitCaller = String(input.explicitDatabaseUrl ?? '').trim() || undefined;
  const processTargetWasLoadedFromFile =
    processValues.DATABASE_AUTHORITY_DATABASE_URL_SOURCE === 'runtime-bootstrap-file';
  const explicitProcess = processTargetWasLoadedFromFile
    ? undefined
    : targetFromOneSource(processValues, 'process environment');
  const worktreeTarget = targetFromOneSource(runtimeValues, 'worktree environment');
  const repositoryTarget = targetFromOneSource(baseValues, 'repository environment');
  const centralTarget = targetFromOneSource(centralValues, 'central local environment');

  if (explicitCaller && explicitProcess && explicitCaller !== explicitProcess) {
    throw new Error(
      'Database environment resolution refused: caller target disagrees with the explicit process target.',
    );
  }

  let source: DatabaseEnvironmentSource = 'unset';
  let databaseUrl: string | undefined;
  if (explicitCaller) {
    source = 'explicit-caller';
    databaseUrl = explicitCaller;
  } else if (explicitProcess) {
    source = 'explicit-process';
    databaseUrl = explicitProcess;
  } else if (worktreeTarget) {
    source = isSameFile(runtimePath, centralPath)
      ? 'central-local-fallback'
      : 'worktree-environment';
    databaseUrl = worktreeTarget;
  } else if (repositoryTarget) {
    source = 'repository-environment';
    databaseUrl = repositoryTarget;
  } else if (centralTarget && preliminaryRuntime !== 'production' && preliminaryRuntime !== 'staging') {
    source = 'central-local-fallback';
    databaseUrl = centralTarget;
  }

  const includeCentralValues =
    preliminaryRuntime !== 'production' && preliminaryRuntime !== 'staging';
  const values: Record<string, string | undefined> = {
    ...baseValues,
    ...(includeCentralValues ? centralValues : {}),
    ...runtimeValues,
    ...processValues,
  };
  if (databaseUrl) values.DATABASE_URL = databaseUrl;

  const runtimeMode = resolveDatabaseRuntimeMode(values);
  if (runtimeMode !== preliminaryRuntime) {
    throw new Error(
      `Database environment resolution refused: runtime changed from ${preliminaryRuntime} to ${runtimeMode} after environment loading.`,
    );
  }

  const loadedFiles = [basePath, runtimePath, centralPath].filter(path => existsSync(path));
  if (existsSync(runtimePath) && lstatSync(runtimePath).isSymbolicLink() && !loadedFiles.includes(runtimePath)) {
    loadedFiles.push(runtimePath);
  }

  return {
    values,
    databaseUrl,
    source,
    runtimeMode,
    loadedFiles,
  };
}
