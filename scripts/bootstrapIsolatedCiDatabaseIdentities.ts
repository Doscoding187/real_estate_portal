import { randomBytes } from 'node:crypto';
import { appendFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { authorizeDatabaseOperation } from '../server/_core/databaseAuthority/authorization';
import { createAuthoritySqlConnection } from '../server/_core/databaseAuthority/connectionAuthority';
import { resolveDatabaseAuthority } from '../server/_core/databaseAuthority/context';
import {
  buildIsolatedCiGrantPlan,
  ISOLATED_CI_HOST,
  ISOLATED_CI_PORT,
  ISOLATED_CI_ROLE_URL_ENV,
  ISOLATED_CI_ROLE_USERS,
} from '../server/_core/databaseAuthority/isolatedCiCredentials';

function sqlString(value: string): string {
  return `'${value.replace(/'/g, "''")}'`;
}

function account(user: string): string {
  if (!/^[a-z0-9_]+$/.test(user))
    throw new Error('Isolated CI identity provisioning refused: invalid account.');
  return `'${user}'@'%'`;
}

function roleUrl(user: string, password: string): string {
  const url = new URL(`mysql://${ISOLATED_CI_HOST}:${ISOLATED_CI_PORT}/listify_test`);
  url.username = user;
  url.password = password;
  return url.toString();
}

function appendGithubEnvironment(values: Record<string, string>): void {
  const path = String(process.env.GITHUB_ENV ?? '').trim();
  if (!path || !resolve(path).startsWith('/')) {
    throw new Error('Isolated CI identity provisioning refused: GITHUB_ENV is required.');
  }
  for (const value of Object.values(values)) console.log(`::add-mask::${value}`);
  appendFileSync(
    path,
    `${Object.entries(values)
      .map(([key, value]) => `${key}=${value}`)
      .join('\n')}\n`,
    {
      encoding: 'utf8',
      mode: 0o600,
    },
  );
}

async function main(): Promise<void> {
  if (process.env.CI !== 'true' || process.env.GITHUB_ACTIONS !== 'true') {
    throw new Error('Isolated CI identity provisioning refused: GitHub Actions CI is required.');
  }
  const authority = resolveDatabaseAuthority({ operation: 'ci-identity-bootstrap' });
  const decision = authorizeDatabaseOperation(authority);
  const connection = await createAuthoritySqlConnection(authority, decision);
  const plan = buildIsolatedCiGrantPlan();
  const passwords = {
    runtime: randomBytes(32).toString('base64url'),
    worker: randomBytes(32).toString('base64url'),
    'read-only': randomBytes(32).toString('base64url'),
    migration: randomBytes(32).toString('base64url'),
  } as const;

  try {
    for (const credential of Object.keys(passwords) as Array<keyof typeof passwords>) {
      const user = ISOLATED_CI_ROLE_USERS[credential];
      await connection.execute(
        `CREATE USER IF NOT EXISTS ${account(user)} IDENTIFIED BY ${sqlString(passwords[credential])}`,
      );
      await connection.execute(
        `ALTER USER ${account(user)} IDENTIFIED BY ${sqlString(passwords[credential])}`,
      );
      await connection.execute(`REVOKE ALL PRIVILEGES, GRANT OPTION FROM ${account(user)}`);
      for (const statement of plan.statementsByCredential[credential]) {
        await connection.execute(statement);
      }
    }
  } finally {
    await connection.end();
  }

  const values = {
    DATABASE_URL: roleUrl(ISOLATED_CI_ROLE_USERS.runtime, passwords.runtime),
    [ISOLATED_CI_ROLE_URL_ENV.runtime]: roleUrl(ISOLATED_CI_ROLE_USERS.runtime, passwords.runtime),
    [ISOLATED_CI_ROLE_URL_ENV.worker]: roleUrl(ISOLATED_CI_ROLE_USERS.worker, passwords.worker),
    [ISOLATED_CI_ROLE_URL_ENV['read-only']]: roleUrl(
      ISOLATED_CI_ROLE_USERS['read-only'],
      passwords['read-only'],
    ),
    [ISOLATED_CI_ROLE_URL_ENV.migration]: roleUrl(
      ISOLATED_CI_ROLE_USERS.migration,
      passwords.migration,
    ),
    DATABASE_CREDENTIAL_CLASS: '',
  };
  appendGithubEnvironment(values);
  console.log(
    JSON.stringify({
      targetFingerprintHash: authority.context.targetFingerprintHash,
      credentialSource: authority.context.credentialSource,
      applicationTableCount: plan.applicationTables.length,
      grantFingerprints: plan.fingerprints,
      bootstrapCredentialPersisted: false,
    }),
  );
}

if (process.argv[1] && resolve(process.argv[1]) === new URL(import.meta.url).pathname) {
  main().catch(error => {
    console.error(
      error instanceof Error ? error.message : 'Isolated CI identity provisioning failed.',
    );
    process.exit(1);
  });
}
