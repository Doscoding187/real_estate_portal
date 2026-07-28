import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import dotenv from 'dotenv';
import mysql from 'mysql2/promise';

type AuthorityManifest = {
  authorityVersion: number;
  canonicalMigrationPath: string;
  activeMigrationDirectory: string;
  archivedMigrationDirectory: string;
  canonicalDrizzleSchemaRoots: string[];
  migrationRunner: string;
  migrationLedger: string;
  approvedLocalDatabaseName: string;
  approvedLocalHosts: string[];
  approvedLocalCommands: string[];
  destructiveLocalCommands: string[];
  prohibitedCommandCategories: string[];
  localSeedEntrypoint: string;
  verificationEntrypoints: string[];
  consumerContractEntrypoint: string;
  agentEntryContract: string;
  migrationTreeAuthority: string;
};

const MANIFEST_PATH = 'docs/database-authority/authority-manifest.json';
const REQUIRED_PACKAGE_SCRIPTS = [
  'db:authority:status',
  'db:authority:bootstrap:local',
  'db:authority:consumer-contract',
] as const;

export function loadAuthorityManifest(root = process.cwd()): AuthorityManifest {
  return JSON.parse(readFileSync(resolve(root, MANIFEST_PATH), 'utf8')) as AuthorityManifest;
}

export function validateAuthorityManifest(manifest: AuthorityManifest, root = process.cwd()) {
  const paths = [
    manifest.canonicalMigrationPath,
    manifest.activeMigrationDirectory,
    manifest.archivedMigrationDirectory,
    ...manifest.canonicalDrizzleSchemaRoots,
    manifest.migrationRunner,
    manifest.localSeedEntrypoint,
    ...manifest.verificationEntrypoints,
    manifest.consumerContractEntrypoint,
    manifest.agentEntryContract,
    manifest.migrationTreeAuthority,
  ];
  const missingPaths = paths.filter(path => !existsSync(resolve(root, path)));
  const packageJson = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')) as {
    scripts?: Record<string, string>;
  };
  const scripts = packageJson.scripts ?? {};
  const missingScripts = [
    ...REQUIRED_PACKAGE_SCRIPTS,
    ...manifest.approvedLocalCommands,
    ...manifest.destructiveLocalCommands,
  ].filter(script => !scripts[script]);

  if (
    missingPaths.length ||
    missingScripts.length ||
    manifest.approvedLocalDatabaseName !== 'listify_local'
  ) {
    throw new Error(
      `Database authority manifest is inconsistent: ${[
        missingPaths.length ? `missing paths: ${missingPaths.join(', ')}` : '',
        missingScripts.length ? `missing scripts: ${missingScripts.join(', ')}` : '',
        manifest.approvedLocalDatabaseName !== 'listify_local'
          ? 'local database must be listify_local'
          : '',
      ]
        .filter(Boolean)
        .join('; ')}`,
    );
  }
}

type Target = {
  classification: 'local' | 'test' | 'staging' | 'production' | 'unknown';
  approved: boolean;
  host: string;
  database: string;
  url?: URL;
};

export function classifyDatabaseTarget(
  rawUrl: string | undefined,
  manifest: AuthorityManifest,
  env: NodeJS.ProcessEnv = process.env,
): Target {
  if (!rawUrl)
    return { classification: 'unknown', approved: false, host: '(unset)', database: '(unset)' };
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return { classification: 'unknown', approved: false, host: '(invalid)', database: '(invalid)' };
  }
  const host = url.hostname.toLowerCase() || '(none)';
  const database = decodeURIComponent(url.pathname.replace(/^\//, '')) || '(none)';
  const runtime = String(env.APP_ENV ?? env.NODE_ENV ?? '').toLowerCase();
  const localHost = manifest.approvedLocalHosts.includes(host);
  if (
    localHost &&
    database === manifest.approvedLocalDatabaseName &&
    runtime !== 'production' &&
    runtime !== 'staging'
  ) {
    return { classification: 'local', approved: true, host, database, url };
  }
  if (
    localHost &&
    database === 'listify_test' &&
    runtime !== 'production' &&
    runtime !== 'staging'
  ) {
    return { classification: 'test', approved: true, host, database, url };
  }
  if (
    runtime === 'production' ||
    database === 'listify_property_sa' ||
    /prod|railway|tidb/i.test(host)
  ) {
    return { classification: 'production', approved: false, host, database, url };
  }
  if (runtime === 'staging' || database === 'listify_staging' || /stag/i.test(host)) {
    return { classification: 'staging', approved: false, host, database, url };
  }
  return { classification: 'unknown', approved: false, host, database, url };
}

async function migrationLedgerState(target: Target, ledger: string) {
  if (!target.approved || !target.url) return 'not queried (target is not approved local or test)';
  try {
    const connection = await mysql.createConnection(target.url.toString());
    try {
      const [rows] = await connection.query(`SELECT filename FROM \`${ledger}\` ORDER BY filename`);
      const names = (rows as Array<{ filename: string }>).map(row => row.filename);
      return names.length
        ? `applied: ${names.join(', ')}`
        : 'ledger exists with no applied migrations';
    } finally {
      await connection.end();
    }
  } catch {
    return 'unavailable (no schema or local MySQL is not ready)';
  }
}

async function main() {
  dotenv.config({ path: resolve(process.cwd(), '.env.local'), override: false, quiet: true });
  const manifest = loadAuthorityManifest();
  validateAuthorityManifest(manifest);
  const target = classifyDatabaseTarget(process.env.DATABASE_URL, manifest);
  const ledgerState = await migrationLedgerState(target, manifest.migrationLedger);
  const environment = String(process.env.APP_ENV ?? process.env.NODE_ENV ?? 'unset');

  console.log(`Database Authority Version: ${manifest.authorityVersion}`);
  console.log(`Canonical Baseline: ${manifest.canonicalMigrationPath}`);
  console.log(`Active Migration Directory: ${manifest.activeMigrationDirectory}`);
  console.log(`Archived Migration Directory: ${manifest.archivedMigrationDirectory}`);
  console.log(`Canonical Schema Roots: ${manifest.canonicalDrizzleSchemaRoots.join(', ')}`);
  console.log(`Current Migration Ledger State: ${ledgerState}`);
  console.log(`Current Environment: ${environment}`);
  console.log(`Sanitized Database Host: ${target.host}`);
  console.log(`Database Name: ${target.database}`);
  console.log(
    `Target Classification: ${target.classification}${target.approved ? ' (approved)' : ' (not approved)'}`,
  );
  console.log(
    `Local Demo Seed Credential: ${process.env.LOCAL_DEMO_AGENCY_PASSWORD ? 'configured' : 'missing'}`,
  );
  console.log('Approved Local Workflow: pnpm db:authority:bootstrap:local');
  console.log(`Prohibited Operations: ${manifest.prohibitedCommandCategories.join('; ')}`);
  console.log(`Authority Contract Path: ${manifest.agentEntryContract}`);
  console.log(`Consumer Contract Status: ready (${manifest.consumerContractEntrypoint})`);
}

if (process.argv[1] && resolve(process.argv[1]) === new URL(import.meta.url).pathname) {
  main().catch(error => {
    console.error(error instanceof Error ? error.message : 'Database authority status failed.');
    process.exit(1);
  });
}
