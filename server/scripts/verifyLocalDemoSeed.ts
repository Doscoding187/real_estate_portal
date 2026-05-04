import path from 'node:path';
import dotenv from 'dotenv';
import mysql from 'mysql2/promise';
import {
  assertLocalSeedSafety,
  DEMO_DEAL_EXTERNAL_REFS,
  DEMO_DEVELOPMENT_SLUGS,
  DEMO_EMAILS,
  DEMO_PASSWORD,
} from './localDemoSeed';

type SeedTarget = 'local' | 'test';
type CheckResult = {
  label: string;
  actual: number;
  expected: number;
};

function loadEnvForTarget(target: SeedTarget) {
  const envFile = target === 'test' ? '.env.test' : '.env.local';
  dotenv.config({ path: path.resolve(process.cwd(), envFile), override: false });
}

function placeholders(values: readonly unknown[]) {
  return values.map(() => '?').join(', ');
}

async function countRows(
  connection: mysql.Connection,
  sql: string,
  params: readonly unknown[] = [],
): Promise<number> {
  const [rows] = await connection.execute(sql, params);
  const first = (rows as Array<{ count: number | string }>)[0];
  return Number(first?.count ?? 0);
}

function failedChecks(checks: CheckResult[]) {
  return checks.filter(check => check.actual < check.expected);
}

export async function verifyLocalDemoSeed(target: SeedTarget) {
  loadEnvForTarget(target);
  const parsedUrl = assertLocalSeedSafety(process.env, { target });
  const connection = await mysql.createConnection(parsedUrl.toString());

  try {
    const checks: CheckResult[] = [
      {
        label: 'demo accounts',
        actual: await countRows(
          connection,
          `SELECT COUNT(*) AS count FROM users WHERE email IN (${placeholders(DEMO_EMAILS)}) AND emailVerified = 1 AND passwordHash IS NOT NULL`,
          [...DEMO_EMAILS],
        ),
        expected: DEMO_EMAILS.length,
      },
      {
        label: 'active referrer identities',
        actual: await countRows(
          connection,
          `
            SELECT COUNT(*) AS count
            FROM distribution_identities di
            INNER JOIN users u ON u.id = di.user_id
            WHERE u.email IN ('referrer@listify.local', 'agent@listify.local')
              AND di.identity_type = 'referrer'
              AND di.active = 1
          `,
        ),
        expected: 2,
      },
      {
        label: 'active manager identity',
        actual: await countRows(
          connection,
          `
            SELECT COUNT(*) AS count
            FROM distribution_identities di
            INNER JOIN users u ON u.id = di.user_id
            WHERE u.email = 'developer@listify.local'
              AND di.identity_type = 'manager'
              AND di.active = 1
          `,
        ),
        expected: 1,
      },
      {
        label: 'demo developments',
        actual: await countRows(
          connection,
          `SELECT COUNT(*) AS count FROM developments WHERE slug IN (${placeholders(DEMO_DEVELOPMENT_SLUGS)})`,
          [...DEMO_DEVELOPMENT_SLUGS],
        ),
        expected: DEMO_DEVELOPMENT_SLUGS.length,
      },
      {
        label: 'distribution programs',
        actual: await countRows(
          connection,
          `
            SELECT COUNT(*) AS count
            FROM distribution_programs p
            INNER JOIN developments d ON d.id = p.development_id
            WHERE d.slug IN (${placeholders(DEMO_DEVELOPMENT_SLUGS)})
          `,
          [...DEMO_DEVELOPMENT_SLUGS],
        ),
        expected: DEMO_DEVELOPMENT_SLUGS.length,
      },
      {
        label: 'demo referral deals',
        actual: await countRows(
          connection,
          `SELECT COUNT(*) AS count FROM distribution_deals WHERE external_ref IN (${placeholders(DEMO_DEAL_EXTERNAL_REFS)})`,
          [...DEMO_DEAL_EXTERNAL_REFS],
        ),
        expected: DEMO_DEAL_EXTERNAL_REFS.length,
      },
      {
        label: 'approved reward entry',
        actual: await countRows(
          connection,
          `
            SELECT COUNT(*) AS count
            FROM distribution_commission_entries ce
            INNER JOIN distribution_deals dd ON dd.id = ce.deal_id
            WHERE dd.external_ref = 'LOCAL-DEMO-PAYOUT-PROGRESS'
              AND ce.entry_status IN ('approved', 'paid')
          `,
        ),
        expected: 1,
      },
    ];

    const missing = failedChecks(checks);
    if (missing.length) {
      const detail = missing
        .map(check => `- ${check.label}: found ${check.actual}, expected ${check.expected}`)
        .join('\n');
      throw new Error(
        `Local demo verification failed for ${target} database.\n${detail}\n\nRun migrations, then pnpm db:seed:${target}. All demo accounts use password ${DEMO_PASSWORD}.`,
      );
    }

    console.log(`Local demo verification passed for ${target} database.`);
    console.log(`Accounts verified: ${DEMO_EMAILS.join(', ')}`);
    console.log(`Password for all demo accounts: ${DEMO_PASSWORD}`);
    console.log(`Developments verified: ${DEMO_DEVELOPMENT_SLUGS.join(', ')}`);
    console.log(`Referral deals verified: ${DEMO_DEAL_EXTERNAL_REFS.join(', ')}`);
  } finally {
    await connection.end();
  }
}

async function main() {
  const target = (process.argv[2] || (process.env.NODE_ENV === 'test' ? 'test' : 'local')) as SeedTarget;
  if (!['local', 'test'].includes(target)) {
    throw new Error('Usage: tsx server/scripts/verifyLocalDemoSeed.ts <local|test>');
  }
  await verifyLocalDemoSeed(target);
}

if (process.argv[1]?.replace(/\\/g, '/').endsWith('/verifyLocalDemoSeed.ts')) {
  main().catch(error => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
}
