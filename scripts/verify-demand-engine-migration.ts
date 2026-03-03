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

function firstStringField(row: DbRow): string | null {
  for (const value of Object.values(row)) {
    if (typeof value === 'string') return value;
  }
  return null;
}

async function run() {
  config();
  if (process.env.NODE_ENV === 'test') {
    config({ path: '.env.test', override: true });
  } else if (process.env.NODE_ENV === 'production') {
    config({ path: '.env.production', override: true });
  } else if (process.env.NODE_ENV === 'staging') {
    config({ path: '.env.staging', override: true });
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

  console.log('Running demand-engine migration verification (0031 + 0032)...\n');

  const requiredDemandTables = [
    'demand_campaigns',
    'demand_leads',
    'demand_lead_matches',
    'demand_lead_assignments',
    'demand_unmatched_leads',
  ];
  const demandTableRows = await executeRows('demand table listing', `SHOW TABLES LIKE 'demand_%'`);
  if (!demandTableRows) {
    console.error('\nVerification FAILED:');
    for (const error of errors) {
      console.error(`- ${error}`);
    }
    process.exit(1);
  }
  const foundDemandTables = new Set(
    demandTableRows
      .map(row => firstStringField(row))
      .filter((value): value is string => typeof value === 'string' && value.length > 0),
  );
  const missingDemandTables = requiredDemandTables.filter(table => !foundDemandTables.has(table));
  if (missingDemandTables.length > 0) {
    errors.push(`Missing demand table(s): ${missingDemandTables.join(', ')}`);
  }
  console.log(`Demand tables check: ${missingDemandTables.length === 0 ? 'PASS' : 'FAIL'}`);

  const linkageRows = await executeRows(
    'demand linkage columns',
    `
    SELECT table_name, column_name
    FROM information_schema.columns
    WHERE table_schema = DATABASE()
      AND (
        (table_name = 'demand_lead_assignments' AND column_name = 'demand_lead_id')
        OR
        (table_name = 'demand_lead_matches' AND column_name = 'demand_lead_id')
      )
  `,
  );
  if (linkageRows) {
    const linkageSet = new Set(
      linkageRows.map(
        row =>
          `${String(readField(row, 'table_name', 'TABLE_NAME') || '').trim()}.${String(
            readField(row, 'column_name', 'COLUMN_NAME') || '',
          ).trim()}`,
      ),
    );
    const expectedLinkage = [
      'demand_lead_assignments.demand_lead_id',
      'demand_lead_matches.demand_lead_id',
    ];
    const missingLinkage = expectedLinkage.filter(key => !linkageSet.has(key));
    if (missingLinkage.length > 0) {
      errors.push(`Missing linkage column(s): ${missingLinkage.join(', ')}`);
    }
    console.log(`Linkage columns check: ${missingLinkage.length === 0 ? 'PASS' : 'FAIL'}`);
  }

  const entitlementKeys = ['tier_weight', 'max_recipients_per_lead', 'lead_distribution_mode'];
  const relevantPlans = ['agent_starter', 'agent_growth', 'agent_pro', 'agent_elite'];
  const planRows = await executeRows(
    'relevant plans',
    `SELECT id, name FROM plans WHERE name IN (${relevantPlans.map(sqlQuote).join(', ')})`,
  );
  const existingPlans: Array<{ id: number; name: string }> = (planRows || [])
    .map(row => ({
      id: Number(readField(row, 'id', 'ID') || 0),
      name: String(readField(row, 'name', 'NAME') || '').trim(),
    }))
    .filter(row => row.id > 0 && row.name.length > 0);

  if (existingPlans.length === 0) {
    errors.push(`None of the expected plans exist: ${relevantPlans.join(', ')}`);
  } else {
    const planIdInClause = existingPlans.map(plan => plan.id).join(', ');
    const entitlementRows = await executeRows(
      'routing entitlements',
      `
      SELECT p.name, e.feature_key, e.value_json
      FROM plan_entitlements e
      JOIN plans p ON p.id = e.plan_id
      WHERE e.plan_id IN (${planIdInClause})
        AND e.feature_key IN (${entitlementKeys.map(sqlQuote).join(', ')})
      ORDER BY p.name, e.feature_key
    `,
    );

    if (entitlementRows) {
      console.log('\nRouting entitlements:');
      for (const row of entitlementRows) {
        const planName = String(readField(row, 'name', 'NAME') || 'unknown');
        const featureKey = String(readField(row, 'feature_key', 'FEATURE_KEY') || 'unknown');
        const valueJson = String(readField(row, 'value_json', 'VALUE_JSON') || 'null');
        console.log(`- ${planName}: ${featureKey}=${valueJson}`);
      }

      const entitlementsByPlan = new Map<string, Set<string>>();
      for (const row of entitlementRows) {
        const planName = String(readField(row, 'name', 'NAME') || '').trim();
        const featureKey = String(readField(row, 'feature_key', 'FEATURE_KEY') || '').trim();
        if (!planName || !featureKey) continue;
        const existing = entitlementsByPlan.get(planName) || new Set<string>();
        existing.add(featureKey);
        entitlementsByPlan.set(planName, existing);
      }

      for (const plan of existingPlans) {
        const featureSet = entitlementsByPlan.get(plan.name) || new Set<string>();
        const missing = entitlementKeys.filter(key => !featureSet.has(key));
        if (missing.length > 0) {
          errors.push(`Plan ${plan.name} missing entitlement key(s): ${missing.join(', ')}`);
        }
      }
    }
  }

  const demandCounts = await executeRows(
    'demand row counts',
    `
    SELECT
      (SELECT COUNT(*) FROM demand_campaigns) AS campaign_count,
      (SELECT COUNT(*) FROM demand_leads) AS demand_lead_count,
      (SELECT COUNT(*) FROM demand_lead_matches) AS match_count,
      (SELECT COUNT(*) FROM demand_lead_assignments) AS assignment_count,
      (SELECT COUNT(*) FROM demand_unmatched_leads) AS unmatched_count
  `,
  );
  if (demandCounts && demandCounts[0]) {
    const row = demandCounts[0];
    console.log('\nDemand row counts:');
    console.log(`- campaigns: ${Number(readField(row, 'campaign_count', 'CAMPAIGN_COUNT') || 0)}`);
    console.log(`- demand leads: ${Number(readField(row, 'demand_lead_count', 'DEMAND_LEAD_COUNT') || 0)}`);
    console.log(`- matches: ${Number(readField(row, 'match_count', 'MATCH_COUNT') || 0)}`);
    console.log(`- assignments: ${Number(readField(row, 'assignment_count', 'ASSIGNMENT_COUNT') || 0)}`);
    console.log(`- unmatched: ${Number(readField(row, 'unmatched_count', 'UNMATCHED_COUNT') || 0)}`);
  } else {
    warnings.push('Could not read demand row counts.');
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
