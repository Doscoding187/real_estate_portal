import path from 'node:path';
import dotenv from 'dotenv';
import mysql from 'mysql2/promise';
import {
  assertLocalSeedSafety,
  DEMO_DEAL_EXTERNAL_REFS,
  DEMO_DEVELOPMENT_SLUGS,
  DEMO_EMAILS,
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

async function agencyScopedListingCount(
  connection: mysql.Connection,
  agencySlug: string,
  extraWhere = '1 = 1',
) {
  return countRows(
    connection,
    `
      SELECT COUNT(*) AS count
      FROM listings l
      LEFT JOIN agents assigned_agent ON assigned_agent.id = l.agentId
      LEFT JOIN users owner_user ON owner_user.id = l.ownerId
      INNER JOIN agencies scoped_agency ON scoped_agency.slug = ?
      WHERE (
        l.agencyId = scoped_agency.id
        OR (
          l.agencyId IS NULL
          AND (
            owner_user.agencyId = scoped_agency.id
            OR (owner_user.agencyId IS NULL AND assigned_agent.agencyId = scoped_agency.id)
          )
        )
      )
        AND ${extraWhere}
    `,
    [agencySlug],
  );
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
        label: 'agency dashboard account',
        actual: await countRows(
          connection,
          `
            SELECT COUNT(*) AS count
            FROM users u
            INNER JOIN agencies a ON a.id = u.agencyId
            INNER JOIN agency_branding ab ON ab.agencyId = a.id
            WHERE u.email = 'agency@listify.local'
              AND u.role = 'agency_admin'
              AND a.slug = 'local-demo-referral-agency'
              AND ab.isEnabled = 1
          `,
        ),
        expected: 1,
      },
      {
        label: 'agency dashboard properties',
        actual: await countRows(
          connection,
          "SELECT COUNT(*) AS count FROM properties WHERE title LIKE '[LOCAL DEMO] Agency%'",
        ),
        expected: 4,
      },
      {
        label: 'canonical agency listing inventory matrix',
        actual: await agencyScopedListingCount(
          connection,
          'local-demo-referral-agency',
          "l.slug LIKE 'local-demo-agency-%'",
        ),
        expected: 10,
      },
      {
        label: 'private draft listing fixture',
        actual: await agencyScopedListingCount(
          connection,
          'local-demo-referral-agency',
          `
            l.slug = 'local-demo-agency-private-draft-loft'
            AND l.status = 'draft'
            AND l.agentId IS NULL
            AND NOT EXISTS (SELECT 1 FROM properties p WHERE p.sourceListingId = l.id)
            AND NOT EXISTS (SELECT 1 FROM listing_analytics la WHERE la.listingId = l.id)
          `,
        ),
        expected: 1,
      },
      {
        label: 'ready listing with known-zero analytics fixture',
        actual: await agencyScopedListingCount(
          connection,
          'local-demo-referral-agency',
          `
            l.slug = 'local-demo-agency-ready-to-submit-apartment'
            AND l.status = 'draft'
            AND l.readiness_score >= 75
            AND EXISTS (
              SELECT 1
              FROM listing_analytics la
              WHERE la.listingId = l.id
                AND la.totalViews = 0
                AND la.totalLeads = 0
            )
          `,
        ),
        expected: 1,
      },
      {
        label: 'pending review private listing fixture',
        actual: await agencyScopedListingCount(
          connection,
          'local-demo-referral-agency',
          `
            l.slug = 'local-demo-agency-pending-review-townhouse'
            AND l.status = 'pending_review'
            AND NOT EXISTS (SELECT 1 FROM properties p WHERE p.sourceListingId = l.id)
          `,
        ),
        expected: 1,
      },
      {
        label: 'rejected listing fixture',
        actual: await agencyScopedListingCount(
          connection,
          'local-demo-referral-agency',
          `
            l.slug = 'local-demo-agency-rejected-listing'
            AND l.status = 'rejected'
            AND l.rejection_reasons IS NOT NULL
          `,
        ),
        expected: 1,
      },
      {
        label: 'published known-zero public metrics fixture',
        actual: await agencyScopedListingCount(
          connection,
          'local-demo-referral-agency',
          `
            l.slug = 'local-demo-agency-published-zero-metrics-home'
            AND l.status = 'published'
            AND EXISTS (
              SELECT 1
              FROM properties p
              WHERE p.sourceListingId = l.id
                AND p.status IN ('available', 'published')
                AND p.views = 0
                AND p.enquiries = 0
            )
          `,
        ),
        expected: 1,
      },
      {
        label: 'published listing with private pending edits fixture',
        actual: await agencyScopedListingCount(
          connection,
          'local-demo-referral-agency',
          `
            l.slug = 'local-demo-agency-live-listing-private-edits'
            AND l.status = 'pending_review'
            AND EXISTS (
              SELECT 1
              FROM properties p
              WHERE p.sourceListingId = l.id
                AND p.status IN ('available', 'published')
            )
          `,
        ),
        expected: 1,
      },
      {
        label: 'withdrawn public mirror fixture',
        actual: await agencyScopedListingCount(
          connection,
          'local-demo-referral-agency',
          `
            l.slug = 'local-demo-agency-withdrawn-public-listing'
            AND l.status = 'published'
            AND EXISTS (
              SELECT 1
              FROM properties p
              WHERE p.sourceListingId = l.id
                AND p.status = 'archived'
            )
          `,
        ),
        expected: 1,
      },
      {
        label: 'archived listing fixture',
        actual: await agencyScopedListingCount(
          connection,
          'local-demo-referral-agency',
          "l.slug = 'local-demo-agency-archived-listing' AND l.status = 'archived'",
        ),
        expected: 1,
      },
      {
        label: 'inactive-agent assignment fixture',
        actual: await agencyScopedListingCount(
          connection,
          'local-demo-referral-agency',
          `
            l.slug = 'local-demo-agency-inactive-agent-assignment'
            AND assigned_agent.status = 'suspended'
          `,
        ),
        expected: 1,
      },
      {
        label: 'legacy owner precedence conflict fixture',
        actual: await agencyScopedListingCount(
          connection,
          'local-demo-referral-agency',
          `
            l.slug = 'local-demo-agency-legacy-owner-wins-conflict'
            AND l.agencyId IS NULL
            AND owner_user.agencyId = scoped_agency.id
            AND assigned_agent.agencyId <> scoped_agency.id
          `,
        ),
        expected: 1,
      },
      {
        label: 'agency dashboard leads',
        actual: await countRows(
          connection,
          `
            SELECT COUNT(*) AS count
            FROM leads l
            INNER JOIN agencies a ON a.id = l.agencyId
            WHERE a.slug = 'local-demo-referral-agency'
              AND l.name LIKE '[LOCAL DEMO]%'
              AND l.email LIKE '%@listify.local'
          `,
        ),
        expected: 6,
      },
      {
        label: 'cross-agency lead protection fixture',
        actual: await countRows(
          connection,
          `
            SELECT COUNT(*) AS count
            FROM leads l
            INNER JOIN agencies a ON a.id = l.agencyId
            WHERE a.slug = 'local-demo-other-agency'
              AND l.email = 'agency-cross-boundary@listify.local'
          `,
        ),
        expected: 1,
      },
      {
        label: 'missing agent details fixture',
        actual: await countRows(
          connection,
          `
            SELECT COUNT(*) AS count
            FROM leads l
            INNER JOIN agencies lead_agency ON lead_agency.id = l.agencyId
            INNER JOIN agents assigned_agent ON assigned_agent.id = l.agentId
            INNER JOIN agencies agent_agency ON agent_agency.id = assigned_agent.agencyId
            WHERE lead_agency.slug = 'local-demo-referral-agency'
              AND agent_agency.slug = 'local-demo-other-agency'
              AND l.email = 'agency-missing-agent@listify.local'
          `,
        ),
        expected: 1,
      },
      {
        label: 'agency dashboard commissions',
        actual: await countRows(
          connection,
          `
            SELECT COUNT(*) AS count
            FROM commissions c
            INNER JOIN agents a ON a.id = c.agentId
            WHERE a.email = 'agent@listify.local'
          `,
        ),
        expected: 2,
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
    const isolationLeaks = [
      {
        label: 'cross-agency canonical listing isolation',
        actual: await agencyScopedListingCount(
          connection,
          'local-demo-referral-agency',
          "l.slug = 'local-demo-agency-boundary-canonical-listing'",
        ),
      },
      {
        label: 'legacy owner precedence not exposed to assigned agent agency',
        actual: await agencyScopedListingCount(
          connection,
          'local-demo-other-agency',
          "l.slug = 'local-demo-agency-legacy-owner-wins-conflict'",
        ),
      },
    ].filter(check => check.actual > 0);

    if (missing.length) {
      const detail = missing
        .map(check => `- ${check.label}: found ${check.actual}, expected ${check.expected}`)
        .join('\n');
      throw new Error(
        `Local demo verification failed for ${target} database.\n${detail}\n\nRun migrations, then pnpm db:seed:${target}. Demo credentials are supplied through local development configuration.`,
      );
    }
    if (isolationLeaks.length) {
      const detail = isolationLeaks
        .map(check => `- ${check.label}: found ${check.actual}, expected 0`)
        .join('\n');
      throw new Error(
        `Local demo verification failed for ${target} database.\n${detail}\n\nAgency listing isolation is expected to be strict.`,
      );
    }

    console.log(`Local demo verification passed for ${target} database.`);
    console.log(`Accounts verified: ${DEMO_EMAILS.length} configured development accounts.`);
    console.log('Password: supplied through local development configuration.');
    console.log(`Developments verified: ${DEMO_DEVELOPMENT_SLUGS.join(', ')}`);
    console.log(`Referral deals verified: ${DEMO_DEAL_EXTERNAL_REFS.join(', ')}`);
  } finally {
    await connection.end();
  }
}

async function main() {
  const target = (process.argv[2] ||
    (process.env.NODE_ENV === 'test' ? 'test' : 'local')) as SeedTarget;
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
