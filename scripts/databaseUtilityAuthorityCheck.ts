import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

type AuthorityGroup = string[];
type AuthorityGroupName =
  | 'canonicalAndAuthoritySupport'
  | 'supportedDiagnostics'
  | 'supportedReplacements'
  | 'localTestLifecycle'
  | 'localTestFixtures'
  | 'readOnlyEvidence';

const AUTHORITY_GROUPS: AuthorityGroupName[] = [
  'canonicalAndAuthoritySupport',
  'supportedDiagnostics',
  'supportedReplacements',
  'localTestLifecycle',
  'localTestFixtures',
  'readOnlyEvidence',
];

export type ResidualUtilityAuthority = {
  scope: {
    extensions: string[];
    excluded: string[];
    runtimeAndSchemaRoots: string[];
  };
  approvedAuthority: Record<AuthorityGroupName, AuthorityGroup>;
  classificationDefinitions: Record<AuthorityGroupName, string>;
  historicalReconciliation: {
    historicalResidualPathCount: number;
    ownerDecision: {
      presentAtStart: number;
      retired: number;
      retainedOrReclassified: number;
      retainedPath: string;
      retainedClassification: AuthorityGroupName;
    };
    readOnlyEvidence: {
      presentAtStart: number;
      retainedAsEvidenceOnly: number;
      retiredOperationalExceptions: number;
      retiredPaths: string[];
    };
    guardedOperationalSurfaceCountAtClosure: number;
    operationalSurfaceDefinition: string;
  };
  retiredUtilities: AuthorityGroup;
};

export type UtilityAuthorityResult = {
  path: string;
  status: 'approved' | 'retired' | 'unclassified';
  signals: string[];
};

const INVENTORY_PATH = 'docs/database-authority/residual-utility-authority.json';
const UTILITY_ROOTS = ['scripts/', 'server/scripts/'];
const ROOT_SOURCE = /^[^/]+\.(?:ts|tsx|js|mjs|cjs|ps1|sh)$/;
const SOURCE_FILE = /\.(?:ts|tsx|js|mjs|cjs|ps1|sh)$/i;
const OPERATIONAL_PATH_SIGNAL =
  /(?:^|\/)[^/]*(?:admin[-_]?bootstrap|account[-_]?(?:bootstrap|recovery|repair)|backfill|bootstrap|check-databases|cleanup|delete|execute|fixture|fix|password|purge|repair|reproduce|reset|seed|verify-(?:db|guard))[^/]*\.(?:ts|tsx|js|mjs|cjs|ps1|sh)$/i;
const DIRECT_DATABASE_CLIENT_CONSTRUCTION =
  /(?:mysql2|mariadb)[^\n;]*\b(?:createConnection|createPool)\s*\(|\b(?:createConnection|createPool)\s*\(/i;
const AMBIENT_TARGET_SELECTION = /\b(?:DATABASE_URL|DB_HOST|DB_NAME)\b/i;
const STANDALONE_EXECUTION_SIGNAL =
  /\bprocess\.argv\b|\brequire\.main\b|\bmodule\.parent\b|\bimport\.meta\.url\b|\b(?:yargs|commander|parseArgs)\b/i;
const RUNTIME_MUTATION_SIGNAL =
  /\b(?:INSERT\s+INTO|UPDATE\s+\w+|DELETE\s+FROM|ALTER\s+TABLE|CREATE\s+TABLE|DROP\s+TABLE|TRUNCATE\s+TABLE)\b|\.(?:insert|update|delete)\s*\(/i;
const TOP_LEVEL_MUTATION_SIGNAL =
  /^(?:await\s+)?(?:db|database|drizzleDb|_db|connection|mysql|pool)\.(?:query|execute|insert|update|delete)\s*\(/m;
const STANDALONE_MAIN_SIGNAL =
  /\b(?:async\s+)?function\s+main\s*\(|\bmain\s*\(\s*\)\s*;?/i;
const CANONICAL_DATABASE_HELPER_IMPORT =
  /(?:from\s+|import\s*\(|require\s*\()\s*['"](?:(?:\.\.\/)+server\/(?:db|db-connection)|(?:\.\.\/)+(?:db|db-connection)|\.\/(?:db|db-connection)|(?:\.\/)?server\/(?:db|db-connection))(?:\.[^'"]*)?['"]/i;
const CANONICAL_ORM_MUTATION = /\.(?:insert|update|delete)\s*\(/i;
const PACKAGE_SCRIPT_PATH =
  /(?:^|[\s;&|])(?:tsx|ts-node|node|bash|sh|powershell|pwsh)\s+(?:\.\/)?([A-Za-z0-9_.-]+(?:\/[A-Za-z0-9_.-]+)*\.(?:ts|tsx|js|mjs|cjs|ps1|sh))(?=$|[\s"';&|])/g;

const DATABASE_CAPABILITY_SIGNALS: Array<[string, RegExp]> = [
  ['database client import', /(?:mysql2|drizzle-orm|createConnection|createPool)/i],
  ['database execution API', /\.(?:execute|query|insert|update|delete)\s*\(/i],
  [
    'SQL operation text',
    /\b(?:SELECT\s+.+\s+FROM|INSERT\s+INTO|UPDATE\s+\w+|DELETE\s+FROM|ALTER\s+TABLE|CREATE\s+TABLE|DROP\s+TABLE|TRUNCATE\s+TABLE)\b/i,
  ],
  ['ambient database configuration', /\b(?:DATABASE_URL|DB_HOST|DB_NAME)\b|process\.env/i],
];

function readInventory(root: string): ResidualUtilityAuthority {
  return JSON.parse(readFileSync(resolve(root, INVENTORY_PATH), 'utf8')) as ResidualUtilityAuthority;
}

function matchesPathPattern(path: string, pattern: string): boolean {
  if (pattern.endsWith('/**')) return path.startsWith(pattern.slice(0, -2));
  if (pattern.endsWith('/*')) {
    const directory = pattern.slice(0, -2);
    return path.startsWith(`${directory}/`) && !path.slice(directory.length + 1).includes('/');
  }
  if (pattern.includes('*')) {
    const [prefix, suffix] = pattern.split('*');
    return path.startsWith(prefix) && path.endsWith(suffix) && !path.slice(prefix.length, -suffix.length).includes('/');
  }
  return path === pattern || path.startsWith(pattern.endsWith('/') ? pattern : `${pattern}/`);
}

function matchesExcludedPath(path: string, excluded: string[]): boolean {
  return excluded.some(pattern => matchesPathPattern(path, pattern));
}

function isCanonicalSchemaOrMigrationPath(path: string): boolean {
  return path.startsWith('server/migrations/') || path.startsWith('drizzle/');
}

function isUtilityPath(path: string, inventory: ResidualUtilityAuthority): boolean {
  const extension = inventory.scope.extensions.find(suffix => path.endsWith(suffix));
  if (!extension || matchesExcludedPath(path, inventory.scope.excluded)) return false;
  const inDeclaredUtilityBoundary = ROOT_SOURCE.test(path) || UTILITY_ROOTS.some(root => path.startsWith(root));
  if (
    !inDeclaredUtilityBoundary &&
    inventory.scope.runtimeAndSchemaRoots.some(root => matchesPathPattern(path, root))
  ) {
    return false;
  }
  return inDeclaredUtilityBoundary;
}

function hasOperationalEvidence(
  path: string,
  source: string,
  packageScriptEntrypoints: Set<string>,
): boolean {
  const operationalName = OPERATIONAL_PATH_SIGNAL.test(path);
  const packageScriptExposure = packageScriptEntrypoints.has(path);
  const hasDirectClient = DIRECT_DATABASE_CLIENT_CONSTRUCTION.test(source);
  const hasCanonicalHelper = CANONICAL_DATABASE_HELPER_IMPORT.test(source);
  const hasAmbientTarget = AMBIENT_TARGET_SELECTION.test(source);
  const hasStandaloneExecution =
    STANDALONE_EXECUTION_SIGNAL.test(source) || STANDALONE_MAIN_SIGNAL.test(source);
  const hasTopLevelMutation = TOP_LEVEL_MUTATION_SIGNAL.test(source);
  const hasMutation = RUNTIME_MUTATION_SIGNAL.test(source);
  const hasCanonicalMutation = hasCanonicalHelper && CANONICAL_ORM_MUTATION.test(source);
  const strongOperationalEvidence =
    hasDirectClient ||
    hasAmbientTarget ||
    hasStandaloneExecution ||
    hasTopLevelMutation;

  if (
    (operationalName || packageScriptExposure) &&
    (strongOperationalEvidence || (packageScriptExposure && hasCanonicalMutation))
  ) {
    return true;
  }

  if (
    hasStandaloneExecution &&
    (hasDirectClient || hasCanonicalMutation || hasAmbientTarget || hasTopLevelMutation)
  ) {
    return true;
  }

  if (hasDirectClient && hasAmbientTarget && hasMutation) return true;

  return hasTopLevelMutation && (hasDirectClient || hasCanonicalMutation || hasAmbientTarget);
}

function isPotentialUtilityPath(
  path: string,
  source: string,
  inventory: ResidualUtilityAuthority,
  packageScriptEntrypoints: Set<string>,
): boolean {
  if (!SOURCE_FILE.test(path)) return false;
  if (matchesExcludedPath(path, inventory.scope.excluded)) return false;
  if (isCanonicalSchemaOrMigrationPath(path)) return false;
  if (isUtilityPath(path, inventory)) return true;
  return hasOperationalEvidence(path, source, packageScriptEntrypoints);
}

export function databaseCapabilitySignals(source: string): string[] {
  const client = DATABASE_CAPABILITY_SIGNALS[0][1].test(source);
  const execution = DATABASE_CAPABILITY_SIGNALS[1][1].test(source);
  const sql = DATABASE_CAPABILITY_SIGNALS[2][1].test(source);
  const canonicalHelper = CANONICAL_DATABASE_HELPER_IMPORT.test(source);
  const ormMutation = canonicalHelper && CANONICAL_ORM_MUTATION.test(source);
  if (!client && !(execution && sql) && !ormMutation) return [];

  const signals = DATABASE_CAPABILITY_SIGNALS.flatMap(([name, pattern], index) => {
    if (index === 2 && !sql) return [];
    return pattern.test(source) ? [name] : [];
  });
  if (canonicalHelper) signals.push('canonical database helper');
  if (ormMutation) signals.push('ORM mutation API');
  return signals;
}

function approvedAuthorityGroup(
  inventory: ResidualUtilityAuthority,
  path: string,
): AuthorityGroupName | null {
  return (
    AUTHORITY_GROUPS.find(group => inventory.approvedAuthority[group].includes(path)) ?? null
  );
}

function sortedWithoutDuplicates(values: string[]): boolean {
  if (values.length !== new Set(values).size) return false;
  return values.every((value, index) => index === 0 || values[index - 1] <= value);
}

function inventoryValidationErrors(inventory: ResidualUtilityAuthority): string[] {
  const errors: string[] = [];

  if (inventory.scope.excluded.some(pattern => pattern.includes('*') && !pattern.endsWith('/**'))) {
    errors.push('scope exclusions may use only explicit paths or a trailing /** boundary');
  }

  const approved = new Set<string>();
  for (const group of AUTHORITY_GROUPS) {
    const paths = inventory.approvedAuthority[group];
    if (!Array.isArray(paths)) {
      errors.push(`approvedAuthority.${group} must be an array`);
      continue;
    }
    if (!sortedWithoutDuplicates(paths)) {
      errors.push(`approvedAuthority.${group} must be sorted and duplicate-free`);
    }
    if (!inventory.classificationDefinitions[group]) {
      errors.push(`classificationDefinitions.${group} must explain the authority boundary`);
    }
    for (const path of paths) {
      if (path.startsWith('/') || path.includes('../') || path.endsWith('/')) {
        errors.push(`approved authority path is not a repository-relative file: ${path}`);
      }
      if (approved.has(path)) errors.push(`approved authority path is classified more than once: ${path}`);
      approved.add(path);
    }
  }

  if (!sortedWithoutDuplicates(inventory.retiredUtilities)) {
    errors.push('retiredUtilities must be sorted and duplicate-free');
  }
  for (const path of inventory.retiredUtilities) {
    if (approved.has(path)) errors.push(`path is both approved and retired: ${path}`);
  }

  const reconciliation = inventory.historicalReconciliation;
  if (
    reconciliation.ownerDecision.presentAtStart !==
    reconciliation.ownerDecision.retired + reconciliation.ownerDecision.retainedOrReclassified
  ) {
    errors.push('owner-decision reconciliation does not add up');
  }
  if (
    reconciliation.readOnlyEvidence.presentAtStart !==
    reconciliation.readOnlyEvidence.retainedAsEvidenceOnly +
      reconciliation.readOnlyEvidence.retiredOperationalExceptions
  ) {
    errors.push('read-only reconciliation does not add up');
  }
  if (
    reconciliation.historicalResidualPathCount !==
    reconciliation.ownerDecision.presentAtStart + reconciliation.readOnlyEvidence.presentAtStart
  ) {
    errors.push('historical residual count does not equal owner-decision plus read-only paths');
  }
  const retainedOwnerPath = inventory.approvedAuthority[
    reconciliation.ownerDecision.retainedClassification
  ];
  if (!retainedOwnerPath?.includes(reconciliation.ownerDecision.retainedPath)) {
    errors.push('retained owner-decision path is not in its declared authority group');
  }
  if (!sortedWithoutDuplicates(reconciliation.readOnlyEvidence.retiredPaths)) {
    errors.push('reconciliation read-only retired paths must be sorted and duplicate-free');
  }

  return errors;
}

export function packageScriptEntrypoints(packageJson: unknown): string[] {
  if (!packageJson || typeof packageJson !== 'object') return [];
  const scripts = (packageJson as { scripts?: unknown }).scripts;
  if (!scripts || typeof scripts !== 'object') return [];

  const paths = new Set<string>();
  for (const command of Object.values(scripts as Record<string, unknown>)) {
    if (typeof command !== 'string') continue;
    for (const match of command.matchAll(PACKAGE_SCRIPT_PATH)) {
      const path = match[1].replace(/^\.\//, '');
      if (!path.startsWith('node_modules/')) paths.add(path);
    }
  }
  return [...paths].sort();
}

function packageScriptEntrypointsFromRoot(root: string): Set<string> {
  const packageJson = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')) as unknown;
  return new Set(packageScriptEntrypoints(packageJson));
}

export function classifyUtilitySource(
  path: string,
  source: string,
  inventory: ResidualUtilityAuthority,
  packageScriptEntrypoints = new Set<string>(),
): UtilityAuthorityResult | null {
  if (!isPotentialUtilityPath(path, source, inventory, packageScriptEntrypoints)) return null;
  const signals = databaseCapabilitySignals(source);
  if (!signals.length) return null;

  if (inventory.retiredUtilities.includes(path)) {
    return { path, status: 'retired', signals };
  }
  const authorityGroup = approvedAuthorityGroup(inventory, path);
  if (authorityGroup === 'readOnlyEvidence' && packageScriptEntrypoints.has(path)) {
    return {
      path,
      status: 'unclassified',
      signals: [...signals, 'read-only evidence is exposed through package.json'],
    };
  }
  if (authorityGroup) {
    return { path, status: 'approved', signals };
  }
  return { path, status: 'unclassified', signals };
}

function trackedFiles(root: string): string[] {
  return execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard', '-z'], {
    cwd: root,
    encoding: 'utf8',
  })
    .split('\0')
    .filter(Boolean)
    .filter(path => existsSync(join(root, path)))
    .sort();
}

export function checkDatabaseUtilityAuthority(root = process.cwd()): UtilityAuthorityResult[] {
  const inventory = readInventory(root);
  const allApproved = Object.values(inventory.approvedAuthority).flat();
  const inventoryErrors: UtilityAuthorityResult[] = [];

  for (const error of inventoryValidationErrors(inventory)) {
    inventoryErrors.push({
      path: INVENTORY_PATH,
      status: 'unclassified',
      signals: [error],
    });
  }

  const packageScriptEntrypoints = packageScriptEntrypointsFromRoot(root);

  for (const path of allApproved) {
    if (!existsSync(join(root, path))) {
      inventoryErrors.push({
        path,
        status: 'unclassified',
        signals: ['approved authority path is absent'],
      });
    }
  }

  for (const path of inventory.retiredUtilities) {
    if (existsSync(join(root, path))) {
      inventoryErrors.push({
        path,
        status: 'retired',
        signals: ['retired utility returned'],
      });
    }
  }

  const results = trackedFiles(root).flatMap(path => {
    if (!SOURCE_FILE.test(path)) return [];
    const source = readFileSync(join(root, path), 'utf8');
    if (!isPotentialUtilityPath(path, source, inventory, packageScriptEntrypoints)) return [];
    const result = classifyUtilitySource(path, source, inventory, packageScriptEntrypoints);
    return result ? [result] : [];
  });

  if (
    results.length !== inventory.historicalReconciliation.guardedOperationalSurfaceCountAtClosure
  ) {
    inventoryErrors.push({
      path: INVENTORY_PATH,
      status: 'unclassified',
      signals: [
        `guarded operational surface count is ${results.length}; expected ${inventory.historicalReconciliation.guardedOperationalSurfaceCountAtClosure}`,
      ],
    });
  }

  return [...inventoryErrors, ...results].sort((left, right) =>
    left.path < right.path ? -1 : left.path > right.path ? 1 : 0,
  );
}

export function assertDatabaseUtilityAuthority(root = process.cwd()): UtilityAuthorityResult[] {
  const results = checkDatabaseUtilityAuthority(root);
  const failures = results.filter(result => result.status !== 'approved');
  if (failures.length) {
    const details = failures
      .map(result => `${result.path}: ${result.status} (${result.signals.join(', ')})`)
      .join('\n');
    throw new Error(`Database utility authority check failed:\n${details}`);
  }
  return results;
}

if (process.argv[1] && resolve(process.argv[1]) === new URL(import.meta.url).pathname) {
  try {
    const results = assertDatabaseUtilityAuthority();
    console.log(`Database utility authority check passed: ${results.length} classified surfaces.`);
  } catch (error) {
    console.error(error instanceof Error ? error.message : 'Database utility authority check failed.');
    process.exit(1);
  }
}
