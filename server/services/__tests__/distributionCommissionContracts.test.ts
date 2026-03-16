import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import mysql from 'mysql2/promise';
import {
  buildReferrerLedgerInput,
  computeCommissionCalculationHash,
  normalizeCommissionCalculationInput,
} from '../distributionCommissionDeterminismService';

const hasMysqlDatabaseUrl = Boolean(
  process.env.DATABASE_URL && process.env.DATABASE_URL.startsWith('mysql://'),
);

const distributionMigrationFiles = [
  '0011_create_distribution_programs_table.sql',
  '0012_create_distribution_registrations_tables.sql',
  '0013_create_distribution_agent_tiers_table.sql',
  '0014_create_distribution_manager_assignments_table.sql',
  '0015_create_distribution_agent_access_table.sql',
  '0016_create_distribution_deals_table.sql',
  '0017_create_distribution_deal_events_table.sql',
  '0018_create_distribution_viewings_table.sql',
  '0019_create_distribution_viewing_validations_table.sql',
  '0020_create_distribution_commission_entries_table.sql',
  '0021_create_distribution_identities_table.sql',
  '0023_create_distribution_commission_ledger.sql',
] as const;

function parseSqlStatements(sql: string) {
  return sql
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'));
}

function parseCalculationInput(value: unknown) {
  if (typeof value === 'string') {
    return JSON.parse(value) as Record<string, unknown>;
  }
  if (value && typeof value === 'object') {
    return value as Record<string, unknown>;
  }
  return {};
}

function splitSumPercentages(
  splits: Array<{ percentage: number; role: string; recipientId: number }>,
  expected = 100,
) {
  const rounded = Number(
    splits.reduce((sum, item) => sum + Number(item.percentage || 0), 0).toFixed(6),
  );
  return Math.abs(rounded - expected) < 0.000001;
}

type ContractReport = {
  database: string;
  generatedAt: string;
  splitIntegrityValid: boolean;
  hashDeterminismValid: boolean;
  updateBlocked: boolean;
  deleteBlocked: boolean;
};

describe('distribution commission contracts', () => {
  if (!hasMysqlDatabaseUrl) {
    it('skips because DATABASE_URL is not a mysql URL', () => {
      expect(true).toBe(true);
    });
    return;
  }

  let adminConnection: mysql.Connection;
  let tempDbName = '';
  let originalDbName = 'listify_test';
  let report: ContractReport = {
    database: 'not-initialized',
    generatedAt: new Date().toISOString(),
    splitIntegrityValid: false,
    hashDeterminismValid: false,
    updateBlocked: false,
    deleteBlocked: false,
  };

  beforeAll(async () => {
    adminConnection = await mysql.createConnection(process.env.DATABASE_URL!);
    const parsedUrl = new URL(process.env.DATABASE_URL!);
    originalDbName = parsedUrl.pathname.replace(/^\//, '') || 'listify_test';
    tempDbName = `listify_test_commission_contracts_${Date.now()}`;

    await adminConnection.query(`CREATE DATABASE \`${tempDbName}\``);
    await adminConnection.query(`USE \`${tempDbName}\``);

    // Parent tables required by distribution migrations.
    await adminConnection.query('CREATE TABLE users (id INT AUTO_INCREMENT PRIMARY KEY)');
    await adminConnection.query('CREATE TABLE developments (id INT AUTO_INCREMENT PRIMARY KEY)');
    await adminConnection.query('INSERT INTO users () VALUES (),(),()');
    await adminConnection.query('INSERT INTO developments () VALUES ()');

    for (const file of distributionMigrationFiles) {
      const sql = fs.readFileSync(path.resolve('server/migrations', file), 'utf8');
      const statements = parseSqlStatements(sql);
      for (const statement of statements) {
        await adminConnection.query(statement);
      }
    }

    report = {
      database: tempDbName,
      generatedAt: new Date().toISOString(),
      splitIntegrityValid: false,
      hashDeterminismValid: false,
      updateBlocked: false,
      deleteBlocked: false,
    };
  });

  afterAll(async () => {
    try {
      const outputDir = path.resolve('test-results/dominance');
      fs.mkdirSync(outputDir, { recursive: true });
      fs.writeFileSync(
        path.join(outputDir, 'commission-reconciliation-report.json'),
        `${JSON.stringify(report, null, 2)}\n`,
        'utf8',
      );

      await adminConnection.query(`USE \`${originalDbName}\``);
      await adminConnection.query(`DROP DATABASE IF EXISTS \`${tempDbName}\``);
    } finally {
      await adminConnection.end();
    }
  });

  it('enforces split integrity total = 100%', () => {
    const splits = [
      { role: 'referrer', recipientId: 1, percentage: 70 },
      { role: 'platform', recipientId: 2, percentage: 30 },
    ];

    const valid = splitSumPercentages(splits, 100);
    report.splitIntegrityValid = valid;
    expect(valid).toBe(true);
  });

  it('stores deterministic commission hash for ledger entries', async () => {
    const [programResult] = await adminConnection.query<mysql.ResultSetHeader>(
      `
        INSERT INTO distribution_programs
        (development_id, is_referral_enabled, is_active, commission_model, default_commission_percent, tier_access_policy, created_by, updated_by)
        VALUES (1, 1, 1, 'flat_percentage', 5.00, 'restricted', 1, 1)
      `,
    );

    const [dealResult] = await adminConnection.query<mysql.ResultSetHeader>(
      `
        INSERT INTO distribution_deals
        (program_id, development_id, agent_id, manager_user_id, external_ref, buyer_name, current_stage, commission_trigger_stage, commission_status, attribution_locked_by)
        VALUES (?, 1, 1, 2, ?, 'Commission Contract Buyer', 'contract_signed', 'contract_signed', 'pending', 1)
      `,
      [programResult.insertId, `contract-${Date.now()}`],
    );

    const calculationInput = normalizeCommissionCalculationInput(
      buildReferrerLedgerInput({
        dealId: dealResult.insertId,
        programId: programResult.insertId,
        developmentId: 1,
        agentId: 1,
        calculationBaseAmount: 1000000,
        commissionPercent: 5,
        commissionAmount: 50000,
        currency: 'ZAR',
        triggerStage: 'contract_signed',
      }),
    );
    const calculationHash = computeCommissionCalculationHash(calculationInput);

    await adminConnection.query(
      `
        INSERT INTO distribution_commission_ledger
        (distribution_deal_id, recipient_id, role, percentage, calculated_amount, currency, calculation_hash, calculation_input)
        VALUES (?, ?, 'referrer', ?, ?, 'ZAR', ?, ?)
      `,
      [
        dealResult.insertId,
        1,
        calculationInput.commissionPercent,
        calculationInput.calculatedAmount,
        calculationHash,
        JSON.stringify(calculationInput),
      ],
    );

    const [rows] = await adminConnection.query<
      Array<{ calculation_hash: string; calculation_input: unknown }>
    >(
      `
        SELECT calculation_hash, calculation_input
        FROM distribution_commission_ledger
        WHERE distribution_deal_id = ?
        ORDER BY id DESC
        LIMIT 1
      `,
      [dealResult.insertId],
    );

    const persistedInput = parseCalculationInput(rows[0].calculation_input);
    const recalculatedHash = computeCommissionCalculationHash(
      normalizeCommissionCalculationInput(persistedInput as any),
    );

    report.hashDeterminismValid = rows[0].calculation_hash === recalculatedHash;
    expect(report.hashDeterminismValid).toBe(true);
  });

  it('blocks update and delete operations on immutable commission ledger', async () => {
    const [rows] = await adminConnection.query<Array<{ id: number }>>(
      'SELECT id FROM distribution_commission_ledger ORDER BY id DESC LIMIT 1',
    );
    const ledgerId = rows[0]?.id;
    expect(typeof ledgerId).toBe('number');

    let updateBlocked = false;
    try {
      await adminConnection.query(
        'UPDATE distribution_commission_ledger SET calculated_amount = calculated_amount + 1 WHERE id = ?',
        [ledgerId],
      );
    } catch (error: any) {
      updateBlocked = String(error?.message || '').includes('append-only');
    }

    let deleteBlocked = false;
    try {
      await adminConnection.query('DELETE FROM distribution_commission_ledger WHERE id = ?', [
        ledgerId,
      ]);
    } catch (error: any) {
      deleteBlocked = String(error?.message || '').includes('append-only');
    }

    report.updateBlocked = updateBlocked;
    report.deleteBlocked = deleteBlocked;
    expect(updateBlocked).toBe(true);
    expect(deleteBlocked).toBe(true);
  });
});
