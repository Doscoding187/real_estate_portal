import { execFileSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import {
  chmodSync,
  existsSync,
  lstatSync,
  mkdirSync,
  readFileSync,
  readlinkSync,
  statSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import dotenv from 'dotenv';

export const REQUIRED_LOCAL_VARIABLES = [
  'DATABASE_URL',
  'LOCAL_DEMO_AGENCY_PASSWORD',
  'JWT_SECRET',
  'APP_URL',
  'FRONTEND_URL',
  'VITE_API_URL',
  'VITE_API_BASE_URL',
] as const;

export type RequiredLocalVariable = (typeof REQUIRED_LOCAL_VARIABLES)[number];
export type VariableState = 'configured' | 'missing' | 'placeholder' | 'invalid';
export type WorktreeLinkState = 'linked' | 'missing' | 'incorrect-symlink' | 'conflicting-file';

const APPROVED_LOCAL_HOSTS = new Set([
  'localhost',
  '127.0.0.1',
  '::1',
  'host.docker.internal',
  'listify-mysql-local',
]);
const REMOTE_KEY_PATTERN = /^(?:RAILWAY|VERCEL|TIDB|TURSO|PLANETSCALE|NEON)_/i;
const PLACEHOLDER_PATTERN =
  /(?:replace-with|placeholder|example|changeme|<[^>]+>|your[-_ ]|_replace_me)/i;

export type CentralEnvironment = {
  path: string;
  exists: boolean;
  permissions: 'safe' | 'unsafe' | 'missing';
  values: Record<string, string>;
};

export function resolveCentralLocalEnvironment(home = homedir()) {
  return join(home, '.config', 'property-listify', 'local.env');
}

export function isPlaceholder(value: string | undefined) {
  return !value || PLACEHOLDER_PATTERN.test(value);
}

function isApprovedLocalDatabaseUrl(value: string) {
  try {
    const url = new URL(value);
    return (
      url.protocol === 'mysql:' &&
      APPROVED_LOCAL_HOSTS.has(url.hostname.toLowerCase()) &&
      decodeURIComponent(url.pathname.slice(1)) === 'listify_local'
    );
  } catch {
    return false;
  }
}

export function classifyRequiredLocalVariable(
  name: RequiredLocalVariable,
  value: string | undefined,
): VariableState {
  if (!value) return 'missing';
  if (isPlaceholder(value)) return 'placeholder';
  if (name === 'DATABASE_URL') return isApprovedLocalDatabaseUrl(value) ? 'configured' : 'invalid';
  if (name === 'JWT_SECRET' && value.length < 32) return 'invalid';
  if (name.endsWith('_URL') && !/^http:\/\/localhost(?::\d+)?\/?$/i.test(value)) return 'invalid';
  return 'configured';
}

export function requiredLocalVariableStates(values: Record<string, string>) {
  return Object.fromEntries(
    REQUIRED_LOCAL_VARIABLES.map(name => [name, classifyRequiredLocalVariable(name, values[name])]),
  ) as Record<RequiredLocalVariable, VariableState>;
}

export function hasValidRequiredLocalValues(values: Record<string, string>) {
  return Object.values(requiredLocalVariableStates(values)).every(state => state === 'configured');
}

export function inspectCentralLocalEnvironment(
  path = resolveCentralLocalEnvironment(),
): CentralEnvironment {
  if (!existsSync(path)) return { path, exists: false, permissions: 'missing', values: {} };
  const mode = statSync(path).mode & 0o777;
  return {
    path,
    exists: true,
    permissions: mode === 0o600 ? 'safe' : 'unsafe',
    values: dotenv.parse(readFileSync(path, 'utf8')),
  };
}

function assertLocalOnlyValues(values: Record<string, string>) {
  if (Object.entries(values).some(([key, value]) => REMOTE_KEY_PATTERN.test(key) && value)) {
    throw new Error(
      'Central local environment refused: remote-provider configuration is not permitted.',
    );
  }
  if (values.DATABASE_URL && !isApprovedLocalDatabaseUrl(values.DATABASE_URL)) {
    throw new Error(
      'Central local environment refused: DATABASE_URL must target approved local listify_local.',
    );
  }
}

export function inspectWorktreeLink(worktreeRoot: string, centralPath: string): WorktreeLinkState {
  const localPath = join(worktreeRoot, '.env.local');
  const stat = lstatSync(localPath, { throwIfNoEntry: false });
  if (!stat) return 'missing';
  if (!stat.isSymbolicLink()) return 'conflicting-file';
  try {
    return resolve(dirname(localPath), readlinkSync(localPath)) === resolve(centralPath)
      ? 'linked'
      : 'incorrect-symlink';
  } catch {
    return 'incorrect-symlink';
  }
}

function isWorktreeEnvIgnored(worktreeRoot: string) {
  try {
    execFileSync('git', ['check-ignore', '-q', '.env.local'], {
      cwd: worktreeRoot,
      stdio: 'ignore',
    });
    return true;
  } catch {
    return false;
  }
}

export function ensureWorktreeLink(
  worktreeRoot: string,
  centralPath: string,
  isIgnored: (root: string) => boolean = isWorktreeEnvIgnored,
) {
  if (!isIgnored(worktreeRoot)) {
    throw new Error('Local environment authority refused: .env.local must remain ignored by Git.');
  }
  const state = inspectWorktreeLink(worktreeRoot, centralPath);
  if (state === 'linked') return state;
  if (state === 'missing') {
    symlinkSync(centralPath, join(worktreeRoot, '.env.local'));
    return 'linked';
  }
  if (state === 'conflicting-file') {
    throw new Error(
      'Local environment authority refused: .env.local is a normal file. Preserve it, reconcile its local values into the central environment, then replace it with the approved symlink.',
    );
  }
  throw new Error(
    'Local environment authority refused: .env.local is an incorrect or broken symlink.',
  );
}

function registeredWorktrees(worktreeRoot: string) {
  const output = execFileSync('git', ['worktree', 'list', '--porcelain'], {
    cwd: worktreeRoot,
    encoding: 'utf8',
  });
  return output
    .split(/\n\n+/)
    .map(block => block.match(/^worktree (.+)$/m)?.[1])
    .filter((path): path is string => Boolean(path));
}

export function discoverDemoCredentialState(worktreeRoot: string) {
  const discovered: string[] = [];
  const entries = registeredWorktrees(worktreeRoot).map(root => {
    const file = join(root, '.env.local');
    const stat = lstatSync(file, { throwIfNoEntry: false });
    if (!stat) return { path: file, state: 'missing' as const };
    try {
      const value = dotenv.parse(readFileSync(file, 'utf8')).LOCAL_DEMO_AGENCY_PASSWORD;
      if (!value) return { path: file, state: 'missing' as const };
      if (isPlaceholder(value)) return { path: file, state: 'placeholder' as const };
      discovered.push(value);
      return { path: file, state: 'configured' as const };
    } catch {
      return { path: file, state: 'missing' as const };
    }
  });
  return { entries, configuredValues: discovered, agrees: new Set(discovered).size <= 1 };
}

export function resolveDiscoveredDemoPassword(values: string[]) {
  if (new Set(values).size > 1) {
    throw new Error(
      'Central local environment refused: configured LOCAL_DEMO_AGENCY_PASSWORD values conflict across worktrees.',
    );
  }
  return values[0] ?? randomBytes(24).toString('base64url');
}

function initialCentralValues(password: string) {
  return {
    NODE_ENV: 'development',
    APP_ENV: 'development',
    DATABASE_URL: 'mysql://listify_app:listify_app_password@127.0.0.1:3307/listify_local',
    LOCAL_DEMO_AGENCY_PASSWORD: password,
    JWT_SECRET: randomBytes(32).toString('hex'),
    APP_URL: 'http://localhost:3009',
    FRONTEND_URL: 'http://localhost:3009',
    VITE_API_URL: 'http://localhost:5000',
    VITE_API_BASE_URL: 'http://localhost:5000',
  };
}

function serializeEnvironment(values: Record<string, string>) {
  return [
    '# Property Listify machine-local development authority. Never commit this file.',
    ...Object.entries(values).map(([key, value]) => `${key}=${value}`),
    '',
  ].join('\n');
}

type DemoCredentialDiscovery = ReturnType<typeof discoverDemoCredentialState>;

export function establishCentralLocalEnvironment(
  worktreeRoot: string,
  path = resolveCentralLocalEnvironment(),
  discover: (root: string) => DemoCredentialDiscovery = discoverDemoCredentialState,
) {
  const existing = inspectCentralLocalEnvironment(path);
  if (existing.exists) {
    assertLocalOnlyValues(existing.values);
    return existing;
  }

  const discovery = discover(worktreeRoot);
  const password = resolveDiscoveredDemoPassword(discovery.configuredValues);
  mkdirSync(dirname(path), { recursive: true, mode: 0o700 });
  writeFileSync(path, serializeEnvironment(initialCentralValues(password)), {
    encoding: 'utf8',
    mode: 0o600,
  });
  chmodSync(path, 0o600);
  return inspectCentralLocalEnvironment(path);
}

export function assertCentralEnvironmentReady(environment: CentralEnvironment) {
  if (!environment.exists)
    throw new Error('Central local environment is missing. Run local bootstrap to establish it.');
  if (environment.permissions !== 'safe')
    throw new Error('Central local environment refused: permissions must be exactly 0600.');
  assertLocalOnlyValues(environment.values);
  const states = requiredLocalVariableStates(environment.values);
  if (!hasValidRequiredLocalValues(environment.values)) {
    const summary = Object.entries(states)
      .filter(([, state]) => state !== 'configured')
      .map(([key, state]) => `${key} (${state})`)
      .join(', ');
    throw new Error(
      `Central local environment refused: required local values need reconciliation: ${summary}.`,
    );
  }
}
