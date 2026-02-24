#!/usr/bin/env tsx
import { config } from 'dotenv';
import { getDb } from '../server/db';

type DbRow = Record<string, unknown>;

function normalizeRows(result: unknown): DbRow[] {
  if (Array.isArray(result)) {
    if (result.length === 2 && Array.isArray(result[0])) {
      return result[0] as DbRow[];
    }
    return result as DbRow[];
  }
  if (result && typeof result === 'object' && Array.isArray((result as any).rows)) {
    return (result as any).rows as DbRow[];
  }
  return [];
}

function readField<T = unknown>(row: DbRow, ...keys: string[]): T | undefined {
  for (const key of keys) {
    if (key in row) return row[key] as T;
  }
  return undefined;
}

function sqlQuote(value: string): string {
  return `'${value.replace(/'/g, "''")}'`;
}

async function run() {
  config();
  if (process.env.NODE_ENV === 'test') {
    config({ path: '.env.test', override: true });
  } else if (process.env.NODE_ENV === 'production') {
    config({ path: '.env.production', override: true });
  }

  const db = await getDb();
  if (!db) {
    throw new Error('Database connection unavailable');
  }
  if (typeof (db as any).execute !== 'function') {
    throw new Error(
      'Database handle does not expose execute(). Set DATABASE_URL so the real DB connection is used.',
    );
  }

  const errors: string[] = [];
  const warnings: string[] = [];
  const executeRows = async (label: string, query: string): Promise<DbRow[] | null> => {
    try {
      const [result] = await (db as any).execute(query);
      return normalizeRows(result);
    } catch (error: any) {
      errors.push(`${label} query failed: ${error?.message || String(error)}`);
      return null;
    }
  };

  console.log('Running pricing/governance migration verification (0030)...\n');

  const requiredTables = [
    'plans',
    'plan_entitlements',
    'subscriptions',
    'agency_agent_memberships',
    'managerial_audit_logs',
  ];
  const tableQuery = `
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = DATABASE()
      AND table_name IN (${requiredTables.map(sqlQuote).join(', ')})
  `;
  const tableRows = await executeRows('required tables', tableQuery);
  if (!tableRows) {
    console.error('\nVerification FAILED:');
    for (const error of errors) {
      console.error(`- ${error}`);
    }
    process.exit(1);
  }
  const existingTables = new Set(
    tableRows
      .map(row => String(readField(row, 'table_name', 'TABLE_NAME') || '').trim())
      .filter(Boolean),
  );
  const missingTables = requiredTables.filter(name => !existingTables.has(name));
  if (missingTables.length > 0) {
    errors.push(`Missing required table(s): ${missingTables.join(', ')}`);
  }
  console.log(`Tables check: ${missingTables.length === 0 ? 'PASS' : 'FAIL'}`);

  const planCountRows = await executeRows(
    'plan counts by segment',
    `
    SELECT segment, COUNT(*) AS plan_count
    FROM plans
    GROUP BY segment
    ORDER BY segment
  `,
  );
  if (planCountRows) {
    console.log('\nPlan counts by segment:');
    for (const row of planCountRows) {
      console.log(
        `- ${String(readField(row, 'segment', 'SEGMENT') || 'unknown')}: ${Number(readField(row, 'plan_count', 'PLAN_COUNT') || 0)}`,
      );
    }
    const requiredSegments = ['agent', 'agency', 'enterprise'];
    const segmentSet = new Set(
      planCountRows.map(row => String(readField(row, 'segment', 'SEGMENT') || '').trim()),
    );
    for (const segment of requiredSegments) {
      if (!segmentSet.has(segment)) {
        errors.push(`Missing seeded plan segment: ${segment}`);
      }
    }
  }

  const requiredPlanCodes = [
    'agent_starter',
    'agent_pro',
    'agent_elite',
    'agency_growth',
    'agency_pro',
    'enterprise',
  ];
  const planCodeRows = await executeRows(
    'required plan codes',
    `SELECT name FROM plans WHERE name IN (${requiredPlanCodes.map(sqlQuote).join(', ')})`,
  );
  if (planCodeRows) {
    const seededCodes = new Set(
      planCodeRows.map(row => String(readField(row, 'name', 'NAME') || '').trim()).filter(Boolean),
    );
    const missingPlanCodes = requiredPlanCodes.filter(code => !seededCodes.has(code));
    if (missingPlanCodes.length > 0) {
      errors.push(`Missing required plan code(s): ${missingPlanCodes.join(', ')}`);
    }
  }

  const entitlementRows = await executeRows(
    'entitlement counts by segment',
    `
    SELECT p.segment, COUNT(*) AS entitlement_count
    FROM plan_entitlements e
    JOIN plans p ON p.id = e.plan_id
    GROUP BY p.segment
    ORDER BY p.segment
  `,
  );
  if (entitlementRows) {
    console.log('\nEntitlement counts by segment:');
    for (const row of entitlementRows) {
      console.log(
        `- ${String(readField(row, 'segment', 'SEGMENT') || 'unknown')}: ${Number(readField(row, 'entitlement_count', 'ENTITLEMENT_COUNT') || 0)}`,
      );
    }
    if (entitlementRows.length === 0) {
      errors.push('No entitlements found in plan_entitlements');
    }
  }

  const subscriptionStatusRows = await executeRows(
    'subscription status counts',
    `
    SELECT status, COUNT(*) AS subscription_count
    FROM subscriptions
    GROUP BY status
    ORDER BY status
  `,
  );
  if (subscriptionStatusRows) {
    console.log('\nSubscription counts by status:');
    for (const row of subscriptionStatusRows) {
      console.log(
        `- ${String(readField(row, 'status', 'STATUS') || 'unknown')}: ${Number(readField(row, 'subscription_count', 'SUBSCRIPTION_COUNT') || 0)}`,
      );
    }
    if (subscriptionStatusRows.length === 0) {
      warnings.push('No subscriptions found. Backfill may not have run yet.');
    }
  }

  const backfillRows = await executeRows(
    'subscription backfill coverage',
    `
    SELECT
      (SELECT COUNT(*) FROM users WHERE role = 'agent') AS agent_user_count,
      (SELECT COUNT(*) FROM subscriptions WHERE owner_type = 'agent') AS agent_subscription_count,
      (SELECT COUNT(*) FROM agencies) AS agency_count,
      (SELECT COUNT(*) FROM subscriptions WHERE owner_type = 'agency') AS agency_subscription_count
  `,
  );
  if (backfillRows) {
    const backfill = backfillRows[0] || {};
    const agentUserCount = Number(readField(backfill, 'agent_user_count', 'AGENT_USER_COUNT') || 0);
    const agentSubscriptionCount = Number(
      readField(backfill, 'agent_subscription_count', 'AGENT_SUBSCRIPTION_COUNT') || 0,
    );
    const agencyCount = Number(readField(backfill, 'agency_count', 'AGENCY_COUNT') || 0);
    const agencySubscriptionCount = Number(
      readField(backfill, 'agency_subscription_count', 'AGENCY_SUBSCRIPTION_COUNT') || 0,
    );

    console.log('\nBackfill coverage:');
    console.log(`- Agents: ${agentSubscriptionCount}/${agentUserCount} subscriptions`);
    console.log(`- Agencies: ${agencySubscriptionCount}/${agencyCount} subscriptions`);

    if (agentSubscriptionCount < agentUserCount) {
      errors.push(
        `Agent subscription backfill incomplete (${agentSubscriptionCount}/${agentUserCount})`,
      );
    }
    if (agencySubscriptionCount < agencyCount) {
      errors.push(
        `Agency subscription backfill incomplete (${agencySubscriptionCount}/${agencyCount})`,
      );
    }
  }

  const trialRows = await executeRows(
    'user trial sanity',
    `
    SELECT plan, trialStatus, COUNT(*) AS user_count
    FROM users
    GROUP BY plan, trialStatus
    ORDER BY user_count DESC
  `,
  );
  if (trialRows) {
    console.log('\nUser trial sanity (plan x trialStatus):');
    for (const row of trialRows) {
      console.log(
        `- plan=${String(readField(row, 'plan', 'PLAN') || 'unknown')}, trialStatus=${String(readField(row, 'trialStatus', 'TRIALSTATUS') || 'unknown')}: ${Number(readField(row, 'user_count', 'USER_COUNT') || 0)}`,
      );
    }
  }

  if (warnings.length > 0) {
    console.log('\nWarnings:');
    for (const warning of warnings) {
      console.log(`- ${warning}`);
    }
  }

  if (errors.length > 0) {
    console.error('\nVerification FAILED:');
    for (const error of errors) {
      console.error(`- ${error}`);
    }
    process.exit(1);
  }

  console.log('\nVerification PASSED.');
}

run().catch(error => {
  console.error('\nVerification FAILED with exception:');
  console.error(error);
  process.exit(1);
});
