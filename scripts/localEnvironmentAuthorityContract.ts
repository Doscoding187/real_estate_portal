import { execFileSync } from 'node:child_process';
import { existsSync, lstatSync, readFileSync, readlinkSync, statSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join, relative, resolve } from 'node:path';
import { parse as parseDotenv } from 'dotenv';
import {
  classifyDatabaseTarget as classifyCanonicalDatabaseTarget,
  loadAuthorityManifest,
  validateAuthorityManifest,
} from './databaseAuthorityStatus';
import { requiredLocalVariableStates } from './localEnvironmentAuthority';

export const CONTRACT_VERSION = 'stage2b-2';

export const VARIABLE_CLASSIFICATIONS = [
  'TRACKED_SAFE_DEFAULT',
  'REQUIRED_MACHINE_LOCAL_SECRET',
  'REQUIRED_MACHINE_LOCAL_NON_SECRET',
  'OPTIONAL_LOCAL_INTEGRATION',
  'WORKTREE_SPECIFIC_OVERRIDE',
  'TEST_ONLY',
  'PRODUCTION_ONLY_PROHIBITED_LOCALLY',
  'DEPRECATED_OR_STALE',
  'UNKNOWN_PENDING_EVIDENCE',
] as const;

export type VariableClassification = (typeof VARIABLE_CLASSIFICATIONS)[number];
export type DiagnosticExitCode = 0 | 1 | 2;
export type WorktreeEnvironmentState =
  | 'CANONICAL_LINK'
  | 'MISSING'
  | 'REGULAR_FILE_CONFLICT'
  | 'INCORRECT_LINK'
  | 'BROKEN_LINK'
  | 'NON_FILE_PATH'
  | 'UNREADABLE'
  | 'OUTSIDE_ALLOWED_AUTHORITY'
  | 'UNKNOWN';

export type VariableContract = {
  name: string;
  classification: VariableClassification;
  authority: string;
  required: boolean;
  mayVaryByWorktree: boolean;
  absence: string;
  fallback: string;
  productionRisk: string;
};

type ContractGroup = Omit<VariableContract, 'name'> & { names: readonly string[] };

const group = (
  names: readonly string[],
  classification: VariableClassification,
  authority: string,
  required: boolean,
  mayVaryByWorktree: boolean,
  absence: string,
  fallback: string,
  productionRisk: string,
): ContractGroup => ({
  names,
  classification,
  authority,
  required,
  mayVaryByWorktree,
  absence,
  fallback,
  productionRisk,
});

const CONTRACT_GROUPS: readonly ContractGroup[] = [
  group(
    ['NODE_ENV', 'APP_ENV', 'VITE_APP_ENV', 'VITE_DEPLOY_ENV', 'VITE_APP_ID', 'PORT'],
    'TRACKED_SAFE_DEFAULT',
    'Tracked templates plus runtime mode authority',
    false,
    false,
    'Runtime defaults apply or the consumer chooses a safe development default.',
    'Development mode, local ports, or a non-secret app identity.',
    'Incorrect mode can select staging or production loading rules.',
  ),
  group(
    ['DATABASE_URL', 'LOCAL_DEMO_AGENCY_PASSWORD', 'JWT_SECRET'],
    'REQUIRED_MACHINE_LOCAL_SECRET',
    '~/.config/property-listify/local.env',
    true,
    false,
    'The affected local capability must fail closed or remain unavailable.',
    'No secret fallback is permitted.',
    'A shared, remote, or production value could expose data or credentials.',
  ),
  group(
    ['APP_URL', 'FRONTEND_URL', 'VITE_API_URL', 'VITE_API_BASE_URL'],
    'REQUIRED_MACHINE_LOCAL_NON_SECRET',
    '~/.config/property-listify/local.env',
    true,
    false,
    'The local runtime must fail closed or remain unavailable.',
    'No routing fallback is accepted for the canonical local contract.',
    'Wrong routing can send local requests to shared or production services.',
  ),
  group(
    [
      'BASE_URL',
      'NEXT_PUBLIC_APP_URL',
      'API_URL',
      'VITE_APP_URL',
      'VITE_ASSETS_BASE_URL',
      'VITE_APP_TITLE',
      'VITE_APP_LOGO',
      'MEDIA_RULES_PATH',
      'MAX_IMAGE_SIZE_MB',
    ],
    'REQUIRED_MACHINE_LOCAL_NON_SECRET',
    '~/.config/property-listify/local.env or an approved tracked default',
    false,
    true,
    'The consumer reports an unavailable route or uses an explicit local default.',
    'Local URLs, labels, paths, and bounded numeric defaults are permitted.',
    'Wrong routing can send local requests to shared or production services.',
  ),
  group(
    [
      'AWS_ACCESS_KEY_ID',
      'AWS_REGION',
      'AWS_S3_BUCKET',
      'AWS_SECRET_ACCESS_KEY',
      'S3_BUCKET_NAME',
      'CLOUDFRONT_URL',
      'VITE_CLOUDFRONT_URL',
      'MEDIACONVERT_ENDPOINT',
      'MEDIACONVERT_ROLE_ARN',
      'BILLING_PRIVATE_STORAGE_DIR',
      'BILLING_PROOF_AWS_ACCESS_KEY_ID',
      'BILLING_PROOF_AWS_SECRET_ACCESS_KEY',
      'BILLING_PROOF_S3_BUCKET',
      'BILLING_PROOF_S3_PREFIX',
      'BILLING_PROOF_S3_REGION',
      'BILLING_PROOF_STORAGE_ADAPTER',
    ],
    'OPTIONAL_LOCAL_INTEGRATION',
    'Central local authority only when a separately approved local integration exists',
    false,
    false,
    'The integration must disable honestly or report an unavailable capability.',
    'Local mock, local filesystem, or no integration.',
    'Live media credentials or buckets can alter or expose shared assets.',
  ),
  group(
    [
      'RESEND_API_KEY',
      'RESEND_FROM_EMAIL',
      'EMAIL_FROM',
      'VITE_USE_MOCK_EMAILS',
      'VITE_FEATURE_AUTO_SEND_INVITES',
      'SAVED_SEARCH_ACTION_TOKEN_SECRET',
      'SAVED_SEARCH_SCHEDULER_ENABLED',
      'SAVED_SEARCH_SCHEDULER_INTERVAL_MS',
    ],
    'OPTIONAL_LOCAL_INTEGRATION',
    'Central local authority only for approved local or mocked delivery',
    false,
    false,
    'Email and scheduled delivery must be disabled or mocked safely.',
    'Mock delivery or no delivery.',
    'Live credentials can send messages or tokens outside local testing.',
  ),
  group(
    [
      'BILLING_EFT_ACCOUNT_NAME',
      'BILLING_EFT_ACCOUNT_NUMBER',
      'BILLING_EFT_ACCOUNT_TYPE',
      'BILLING_EFT_BANK_NAME',
      'BILLING_EFT_BRANCH_CODE',
      'BILLING_SUPPORT_EMAIL',
    ],
    'OPTIONAL_LOCAL_INTEGRATION',
    'Separate non-live payment fixture authority',
    false,
    false,
    'Payment behaviour must be disabled or explicitly mocked.',
    'No payment integration.',
    'Live payment keys or banking details must never enter local authority.',
  ),
  group(
    [
      'GOOGLE_GEOCODING_API_KEY',
      'GOOGLE_MAPS_API_KEY',
      'GOOGLE_PLACES_API_KEY',
      'GOOGLE_PLACES_COUNTRY_RESTRICTION',
      'GOOGLE_STREET_VIEW_API_KEY',
      'VITE_GOOGLE_MAPS_API_KEY',
      'OPENAI_API_KEY',
      'CONTENTFUL_SPACE_ID',
      'CONTENTFUL_API_KEY',
      'BUILT_IN_FORGE_API_URL',
      'BUILT_IN_FORGE_API_KEY',
      'VITE_PAYLOAD_API_KEY',
      'VITE_PAYLOAD_API_URL',
      'VITE_CMS_API_KEY',
      'VITE_CMS_API_URL',
      'VITE_CMS_ENABLED',
      'VITE_SENTRY_DSN',
      'VITE_SENTRY_ENABLED',
      'VITE_SENTRY_ENVIRONMENT',
    ],
    'OPTIONAL_LOCAL_INTEGRATION',
    'Central local authority only with an approved scoped integration',
    false,
    false,
    'The integration must be disabled or show a clear unavailable state.',
    'No external integration.',
    'External keys may incur cost, disclose data, or be exposed to the browser.',
  ),
  group(
    ['REDIS_URL', 'REDIS_HOST', 'REDIS_PORT', 'REDIS_PASSWORD', 'REDIS_DB', 'CACHE_ENABLED'],
    'OPTIONAL_LOCAL_INTEGRATION',
    'Approved local cache authority only',
    false,
    false,
    'Cache-dependent behaviour must degrade safely or remain disabled.',
    'In-memory or disabled cache.',
    'A shared cache can leak state between worktrees or environments.',
  ),
  group(
    [
      'FEATURE_DISTRIBUTION_NETWORK',
      'VITE_FEATURE_TEAM_INVITATIONS',
      'VITE_MAX_TEAM_INVITATIONS_PER_AGENCY',
      'VITE_ONBOARDING_DRAFT_EXPIRY_HOURS',
      'AUTH_RATE_LIMIT_MAX',
      'AUTOCOMPLETE_CACHE_TTL_SECONDS',
      'AUTOCOMPLETE_DEBOUNCE_MS',
      'DISTRIBUTION_AFFORDABILITY_INTEREST_RATE_ANNUAL',
      'DISTRIBUTION_AFFORDABILITY_LOW_CONFIDENCE_INCOME',
      'DISTRIBUTION_AFFORDABILITY_MAX_REPAYMENT_RATIO',
      'DISTRIBUTION_AFFORDABILITY_TERM_MONTHS',
      'ENABLE_VIDEO_PIPELINE',
      'TRUST_PROXY',
    ],
    'TRACKED_SAFE_DEFAULT',
    'Tracked defaults with explicit local override only when needed',
    false,
    true,
    'The consumer applies a documented bounded default or disables the feature.',
    'Non-secret feature and tuning defaults.',
    'Incorrect values can change launch behaviour but do not establish service authority.',
  ),
  group(
    [
      'LISTIFY_E2E_DATABASE_URL',
      'LOCAL_SEED_ALLOWED',
      'LOCAL_SEED_SUPER_ADMIN_PASSWORD',
      'LOCAL_SEED_USER_PASSWORD',
      'CI',
      'DOE_S1_BROWSER_AUDIT_DIR',
      'RUN_FUTURE_EXPLORE_AUTHORITY_CONTRACT',
    ],
    'TEST_ONLY',
    'Test or audit runner invocation, never the shared local authority',
    false,
    true,
    'The test or audit path is skipped or refuses to run.',
    'No test override.',
    'A test target or credential in local authority can cause destructive cross-environment use.',
  ),
  group(
    [
      'VERCEL_ENV',
      'VERCEL_GIT_COMMIT_SHA',
      'RAILWAY_ENVIRONMENT',
      'RAILWAY_GIT_COMMIT_SHA',
      'RAILWAY_PUBLIC_DOMAIN',
      'GITHUB_SHA',
      'COMMIT_SHA',
      'PROD',
      'PROD_RESET_ENABLED',
      'PROD_RESET_CONFIRM',
      'PROD_SUPERADMIN_EMAIL',
      'PROD_SUPERADMIN_PASSWORD',
      'TIDB_DATABASE',
      'TIDB_HOST',
      'TIDB_PASSWORD',
      'TIDB_PORT',
      'TIDB_USER',
      'RAILWAY_ENVIRONMENT_NAME',
    ],
    'PRODUCTION_ONLY_PROHIBITED_LOCALLY',
    'Provider or production runtime; never central local authority',
    false,
    false,
    'The local diagnostic must report the name as prohibited and make no connection.',
    'No local fallback.',
    'These names can select or reach shared, staging, or production infrastructure.',
  ),
  group(
    ['API_SECRET', 'NUXT_PUBLIC_API_BASE'],
    'UNKNOWN_PENDING_EVIDENCE',
    'No authority assigned until the active consumer is confirmed',
    false,
    false,
    'Do not add the name to central authority.',
    'No fallback is assumed.',
    'An unknown consumer may conceal a security or routing dependency.',
  ),
  group(
    [
      'DEV',
      'MODE',
      'BUILD_TIME',
      'SKIP_DB_INIT',
      'SKIP_FRONTEND',
      'OWNER_OPEN_ID',
      'OAUTH_SERVER_URL',
      'DB_HOST',
      'DB_NAME',
    ],
    'DEPRECATED_OR_STALE',
    'No shared local authority; retain only in the consuming tool if proven active',
    false,
    false,
    'The consumer default or tool-specific behaviour applies.',
    'No central value.',
    'An obsolete name can silently mask the active authority contract.',
  ),
];

const duplicateNames = CONTRACT_GROUPS.flatMap(groupItem => groupItem.names).filter(
  (name, index, names) => names.indexOf(name) !== index,
);

if (duplicateNames.length) {
  throw new Error(`Environment contract contains duplicate names: ${duplicateNames.join(', ')}`);
}

export const ENVIRONMENT_VARIABLE_CONTRACT: readonly VariableContract[] = CONTRACT_GROUPS.flatMap(
  ({ names, ...contract }) => names.map(name => ({ name, ...contract })),
);

const contractByName = new Map(
  ENVIRONMENT_VARIABLE_CONTRACT.map(variable => [variable.name, variable]),
);

export function contractForName(name: string): VariableContract | undefined {
  return contractByName.get(name);
}

export type ParsedEnvironment = {
  names: string[];
  duplicateNames: string[];
  malformedEntries: number;
  values: Record<string, string>;
};

const ASSIGNMENT = /^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/;

export function parseEnvironmentText(text: string): ParsedEnvironment {
  const names: string[] = [];
  const duplicateNames = new Set<string>();
  const values: Record<string, string> = {};
  let malformedEntries = 0;

  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const match = line.match(ASSIGNMENT);
    if (!match) {
      malformedEntries += 1;
      continue;
    }
    const [, name, rawValue] = match;
    if (name in values) duplicateNames.add(name);
    names.push(name);
    const parsed = parseDotenv(rawLine);
    values[name] = parsed[name] ?? rawValue.trim().replace(/^(['"])(.*)\1$/, '$2');
  }

  return { names, duplicateNames: [...duplicateNames].sort(), malformedEntries, values };
}

export type PathInspection = {
  state: WorktreeEnvironmentState;
  target?: string;
  readable: boolean;
};

function isWithin(parent: string, candidate: string) {
  const relativePath = relative(resolve(parent), resolve(candidate));
  return relativePath === '' || (!relativePath.startsWith('..') && !relativePath.startsWith('/'));
}

export function inspectEnvironmentPath(
  worktreeRoot: string,
  centralPath = join(homedir(), '.config', 'property-listify', 'local.env'),
): PathInspection {
  const localPath = join(worktreeRoot, '.env.local');
  let localStat;
  try {
    localStat = lstatSync(localPath, { throwIfNoEntry: false });
  } catch {
    return { state: 'UNREADABLE', readable: false };
  }
  if (!localStat) return { state: 'MISSING', readable: true };
  if (localStat.isDirectory() || (!localStat.isFile() && !localStat.isSymbolicLink())) {
    return { state: 'NON_FILE_PATH', readable: false };
  }
  if (!localStat.isSymbolicLink()) return { state: 'REGULAR_FILE_CONFLICT', readable: true };

  let target: string;
  try {
    target = resolve(dirname(localPath), readlinkSync(localPath));
  } catch {
    return { state: 'UNREADABLE', readable: false };
  }
  if (resolve(target) === resolve(centralPath)) {
    return existsSync(target)
      ? { state: 'CANONICAL_LINK', target, readable: true }
      : { state: 'BROKEN_LINK', target, readable: false };
  }
  if (!isWithin(dirname(centralPath), target)) {
    return { state: 'OUTSIDE_ALLOWED_AUTHORITY', target, readable: existsSync(target) };
  }
  return {
    state: existsSync(target) ? 'INCORRECT_LINK' : 'BROKEN_LINK',
    target,
    readable: existsSync(target),
  };
}

export type CentralInspection = {
  state: 'MISSING' | 'REGULAR_FILE' | 'SYMLINK' | 'NON_FILE_PATH' | 'UNREADABLE';
  permissions: 'SAFE_0600' | 'UNSAFE' | 'UNKNOWN';
  ownership: 'OWNER_CURRENT_USER' | 'OWNER_MISMATCH' | 'OWNER_UNAVAILABLE';
  parsed: ParsedEnvironment;
};

type CanonicalAuthorityManifest = ReturnType<typeof loadAuthorityManifest>;

export function inspectCentralAuthority(
  path: string,
  options: { effectiveUid?: () => number | undefined } = {},
): CentralInspection {
  let fileStat;
  try {
    fileStat = lstatSync(path, { throwIfNoEntry: false });
  } catch {
    return {
      state: 'UNREADABLE',
      permissions: 'UNKNOWN',
      ownership: 'OWNER_UNAVAILABLE',
      parsed: parseEnvironmentText(''),
    };
  }
  if (!fileStat)
    return {
      state: 'MISSING',
      permissions: 'UNKNOWN',
      ownership: 'OWNER_UNAVAILABLE',
      parsed: parseEnvironmentText(''),
    };
  if (fileStat.isSymbolicLink())
    return {
      state: 'SYMLINK',
      permissions: 'UNKNOWN',
      ownership: 'OWNER_UNAVAILABLE',
      parsed: parseEnvironmentText(''),
    };
  if (!fileStat.isFile())
    return {
      state: 'NON_FILE_PATH',
      permissions: 'UNKNOWN',
      ownership: 'OWNER_UNAVAILABLE',
      parsed: parseEnvironmentText(''),
    };
  try {
    const mode = statSync(path).mode & 0o777;
    const effectiveUid = options.effectiveUid ?? process.geteuid;
    const currentUid = effectiveUid?.();
    const ownership =
      typeof currentUid === 'number' && typeof fileStat.uid === 'number'
        ? fileStat.uid === currentUid
          ? 'OWNER_CURRENT_USER'
          : 'OWNER_MISMATCH'
        : 'OWNER_UNAVAILABLE';
    return {
      state: 'REGULAR_FILE',
      permissions: mode === 0o600 ? 'SAFE_0600' : 'UNSAFE',
      ownership,
      parsed: parseEnvironmentText(readFileSync(path, 'utf8')),
    };
  } catch {
    return {
      state: 'UNREADABLE',
      permissions: 'UNKNOWN',
      ownership: 'OWNER_UNAVAILABLE',
      parsed: parseEnvironmentText(''),
    };
  }
}

export type DiagnosticResult = {
  contractVersion: string;
  timestamp: string;
  repositoryRoot: string | null;
  requestedTarget: string;
  environmentPath: PathInspection;
  centralAuthority: {
    path: string;
    inspection: {
      state: CentralInspection['state'];
      permissions: CentralInspection['permissions'];
      ownership: CentralInspection['ownership'];
      names: string[];
      duplicateNames: string[];
      malformedEntryCount: number;
    };
    unknownNames: string[];
    deprecatedNames: string[];
    prohibitedLocalNames: string[];
    testOnlyNames: string[];
    missingRequiredNames: string[];
    emptyNames: string[];
    duplicateNames: string[];
    malformedEntryCount: number;
  };
  variableSummary: Record<VariableClassification, number>;
  databaseTarget: {
    classification: 'local' | 'test' | 'staging' | 'production' | 'unknown';
    approved: boolean;
    host: string;
    database: string;
  };
  completeApplicationCompliance: boolean;
  stage3Eligibility: boolean;
  blockers: string[];
  warnings: string[];
  boundaryNotes: string[];
  exitCode: DiagnosticExitCode;
  targetClassification: 'SUPPORTED' | 'UNSUPPORTED';
};

function classifyDatabaseTarget(
  raw: string | undefined,
  manifest: CanonicalAuthorityManifest | null,
  environment: Record<string, string | undefined>,
) {
  if (!raw)
    return {
      classification: 'unknown' as const,
      approved: false,
      host: '(unset)',
      database: '(unset)',
    };
  if (!manifest)
    return {
      classification: 'unknown' as const,
      approved: false,
      host: '(unknown)',
      database: '(unknown)',
    };
  const target = classifyCanonicalDatabaseTarget(raw, manifest, environment);
  return {
    classification: target.classification,
    approved: target.approved,
    host: target.host,
    database: target.database,
  };
}

function emptySummary() {
  return Object.fromEntries(
    VARIABLE_CLASSIFICATIONS.map(classification => [classification, 0]),
  ) as Record<VariableClassification, number>;
}

function readWorktreeEnvironment(pathInspection: PathInspection, central: CentralInspection) {
  if (
    !pathInspection.readable ||
    pathInspection.state !== 'CANONICAL_LINK' ||
    central.state !== 'REGULAR_FILE'
  )
    return parseEnvironmentText('');
  return central.parsed;
}

function emptyCentralAuthority(path: string) {
  return {
    path,
    inspection: {
      state: 'UNREADABLE' as const,
      permissions: 'UNKNOWN' as const,
      ownership: 'OWNER_UNAVAILABLE' as const,
      names: [],
      duplicateNames: [],
      malformedEntryCount: 0,
    },
    unknownNames: [],
    deprecatedNames: [],
    prohibitedLocalNames: [],
    testOnlyNames: [],
    missingRequiredNames: [],
    emptyNames: [],
    duplicateNames: [],
    malformedEntryCount: 0,
  };
}

function unsupportedDiagnosticResult(
  requestedTarget: string,
  centralPath: string,
  now: () => Date,
): DiagnosticResult {
  return {
    contractVersion: CONTRACT_VERSION,
    timestamp: now().toISOString(),
    repositoryRoot: null,
    requestedTarget,
    environmentPath: { state: 'UNKNOWN', readable: false },
    centralAuthority: emptyCentralAuthority(centralPath),
    variableSummary: emptySummary(),
    databaseTarget: {
      classification: 'unknown',
      approved: false,
      host: '(unknown)',
      database: '(unknown)',
    },
    completeApplicationCompliance: false,
    stage3Eligibility: false,
    blockers: ['Requested target could not be resolved as a supported Git worktree.'],
    warnings: [],
    boundaryNotes: [
      'Target resolution failed before any environment file was read.',
      'Values are never printed; no files, links, permissions, services, databases, or providers were modified or connected.',
    ],
    exitCode: 2,
    targetClassification: 'UNSUPPORTED',
  };
}

function validateCanonicalManifest(manifest: CanonicalAuthorityManifest, repositoryRoot: string) {
  validateAuthorityManifest(manifest, repositoryRoot);
  if (!Array.isArray(manifest.requiredLocalVariables) || !manifest.requiredLocalVariables.length) {
    throw new Error('requiredLocalVariables is missing or empty');
  }
  if (!Array.isArray(manifest.approvedLocalHosts) || !manifest.approvedLocalHosts.length) {
    throw new Error('approvedLocalHosts is missing or empty');
  }
  if (manifest.approvedLocalDatabaseName !== 'listify_local') {
    throw new Error('approvedLocalDatabaseName is not listify_local');
  }
  const requiredAuthorityNames = [
    'DATABASE_URL',
    'LOCAL_DEMO_AGENCY_PASSWORD',
    'JWT_SECRET',
    'APP_URL',
    'FRONTEND_URL',
    'VITE_API_URL',
    'VITE_API_BASE_URL',
  ];
  if (requiredAuthorityNames.some(name => !manifest.requiredLocalVariables.includes(name))) {
    throw new Error('canonical required local-variable authority contradicts Stage 2B');
  }
  if (manifest.requiredLocalVariables.some(name => !contractForName(name))) {
    throw new Error('canonical required local-variable authority contains an unclassified name');
  }
}

export function runEnvironmentAuthorityDiagnostic(
  requestedTarget = process.cwd(),
  options: {
    centralPath?: string;
    now?: () => Date;
    repositoryRoot?: string;
    manifestRoot?: string;
    effectiveUid?: () => number | undefined;
    manifestLoader?: (root: string) => CanonicalAuthorityManifest;
  } = {},
): DiagnosticResult {
  const now = options.now ?? (() => new Date());
  const centralPath = resolve(
    options.centralPath ?? join(homedir(), '.config', 'property-listify', 'local.env'),
  );
  let repositoryRoot: string;
  try {
    repositoryRoot = resolve(
      options.repositoryRoot ??
        execFileSync('git', ['rev-parse', '--show-toplevel'], {
          cwd: requestedTarget,
          encoding: 'utf8',
          stdio: ['ignore', 'pipe', 'ignore'],
        }).trim(),
    );
  } catch {
    return unsupportedDiagnosticResult(requestedTarget, centralPath, now);
  }
  const environmentPath = inspectEnvironmentPath(repositoryRoot, centralPath);
  const central = inspectCentralAuthority(centralPath, { effectiveUid: options.effectiveUid });
  const worktree = readWorktreeEnvironment(environmentPath, central);
  const source = central.parsed;
  let manifest: CanonicalAuthorityManifest | null = null;
  let manifestError = false;
  try {
    manifest = options.manifestLoader?.(repositoryRoot) ?? loadAuthorityManifest(repositoryRoot);
    validateCanonicalManifest(manifest, options.manifestRoot ?? repositoryRoot);
  } catch {
    manifestError = true;
  }
  const summary = emptySummary();
  const names = [...new Set([...source.names, ...worktree.names])];
  for (const name of names)
    summary[contractForName(name)?.classification ?? 'UNKNOWN_PENDING_EVIDENCE'] += 1;

  const unknownNames = [
    ...new Set(
      source.names.filter(name => {
        const classification = contractForName(name)?.classification;
        return !classification || classification === 'UNKNOWN_PENDING_EVIDENCE';
      }),
    ),
  ].sort();
  const deprecatedNames = [
    ...new Set(
      source.names.filter(name => contractForName(name)?.classification === 'DEPRECATED_OR_STALE'),
    ),
  ].sort();
  const prohibitedLocalNames = [
    ...new Set(
      source.names.filter(name => {
        const classification = contractForName(name)?.classification;
        return (
          classification === 'PRODUCTION_ONLY_PROHIBITED_LOCALLY' ||
          /^(?:RAILWAY|VERCEL|TIDB)_|^PROD(?:_|$)/.test(name)
        );
      }),
    ),
  ].sort();
  const required = manifest?.requiredLocalVariables ?? [];
  const missingRequiredNames = required.filter(name => !source.values[name]);
  const canonicalRequiredStates = requiredLocalVariableStates(source.values);
  const invalidRequiredNames = required.filter(name => {
    const state = canonicalRequiredStates[name as keyof typeof canonicalRequiredStates];
    return state ? state !== 'configured' : !source.values[name];
  });
  const emptyNames = source.names
    .filter(name => source.values[name] === '')
    .filter((name, index, all) => all.indexOf(name) === index)
    .sort();
  const databaseTarget = classifyDatabaseTarget(source.values.DATABASE_URL, manifest, {
    APP_ENV: source.values.APP_ENV,
    NODE_ENV: source.values.NODE_ENV,
  });
  const blockers: string[] = [];
  const warnings: string[] = [];
  const testOnlyNames = [
    ...new Set(source.names.filter(name => contractForName(name)?.classification === 'TEST_ONLY')),
  ].sort();
  if (manifestError) blockers.push('Canonical authority manifest is unavailable or malformed.');
  if (central.state !== 'REGULAR_FILE') blockers.push(`Central authority is ${central.state}.`);
  if (central.permissions !== 'SAFE_0600')
    blockers.push('Central authority is not a regular file with mode 0600.');
  if (central.ownership !== 'OWNER_CURRENT_USER')
    blockers.push(`Central authority ownership is ${central.ownership}.`);
  if (central.parsed.malformedEntries)
    blockers.push(
      `Central authority has ${central.parsed.malformedEntries} malformed assignment(s).`,
    );
  if (central.parsed.duplicateNames.length)
    blockers.push(
      `Central authority has duplicate name(s): ${central.parsed.duplicateNames.join(', ')}.`,
    );
  if (missingRequiredNames.length)
    blockers.push(`Required names are missing: ${missingRequiredNames.join(', ')}.`);
  if (invalidRequiredNames.length)
    blockers.push(`Required names have invalid values: ${invalidRequiredNames.join(', ')}.`);
  if (testOnlyNames.length)
    blockers.push(
      `TEST_ONLY names are prohibited in central authority: ${testOnlyNames.join(', ')}.`,
    );
  if (unknownNames.length)
    warnings.push(
      `Unknown names require evidence before central-authority adoption: ${unknownNames.join(', ')}.`,
    );
  if (deprecatedNames.length)
    warnings.push(`Deprecated or stale names are present: ${deprecatedNames.join(', ')}.`);
  if (prohibitedLocalNames.length)
    blockers.push(
      `Production/provider names are prohibited locally: ${prohibitedLocalNames.join(', ')}.`,
    );
  if (!databaseTarget.approved)
    blockers.push(
      `Database target is ${databaseTarget.classification}; only approved local/test targets may be used.`,
    );
  if (environmentPath.state !== 'CANONICAL_LINK')
    blockers.push(
      `Worktree environment path is ${environmentPath.state}; Stage 3 requires CANONICAL_LINK.`,
    );
  if (environmentPath.state === 'REGULAR_FILE_CONFLICT')
    warnings.push(
      'Preserve the regular .env.local file; reconciliation is separately authorized and was not performed.',
    );
  const completeApplicationCompliance =
    blockers.length === 0 && unknownNames.length === 0 && deprecatedNames.length === 0;
  const stage3Eligibility =
    completeApplicationCompliance && environmentPath.state === 'CANONICAL_LINK';
  return {
    contractVersion: CONTRACT_VERSION,
    timestamp: (options.now ?? (() => new Date()))().toISOString(),
    repositoryRoot,
    requestedTarget: requestedTarget,
    environmentPath,
    centralAuthority: {
      path: centralPath,
      inspection: {
        state: central.state,
        permissions: central.permissions,
        ownership: central.ownership,
        names: [...new Set(source.names)].sort(),
        duplicateNames: central.parsed.duplicateNames,
        malformedEntryCount: central.parsed.malformedEntries,
      },
      unknownNames,
      deprecatedNames,
      prohibitedLocalNames,
      testOnlyNames,
      missingRequiredNames,
      emptyNames,
      duplicateNames: central.parsed.duplicateNames,
      malformedEntryCount: central.parsed.malformedEntries,
    },
    variableSummary: summary,
    databaseTarget,
    completeApplicationCompliance,
    stage3Eligibility,
    blockers,
    warnings,
    boundaryNotes: [
      'Names and sanitized classifications are reported; values are never emitted.',
      'No file, symlink, permission, service, database, or provider state was changed or connected by this diagnostic.',
      'Database-target eligibility is reported separately from complete-application compliance.',
    ],
    exitCode:
      blockers.length || unknownNames.length || deprecatedNames.length
        ? ['UNKNOWN', 'UNREADABLE', 'BROKEN_LINK'].includes(environmentPath.state)
          ? 2
          : 1
        : 0,
    targetClassification: 'SUPPORTED',
  };
}
