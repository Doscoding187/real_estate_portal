import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import mysql from 'mysql2/promise';
import {
  reconcileDistributionRevenue,
  type DistributionRevenueReconciliationReport,
} from '../distributionRevenueReconciliationService';

const hasMysqlDatabaseUrl = Boolean(
  process.env.DATABASE_URL && process.env.DATABASE_URL.startsWith('mysql://'),
);

describe('distribution revenue reconciliation contract', () => {
  if (!hasMysqlDatabaseUrl) {
    it('skips because DATABASE_URL is not a mysql URL', () => {
      expect(true).toBe(true);
    });
    return;
  }

  let connection: mysql.Connection;
  let report: DistributionRevenueReconciliationReport = {
    generatedAt: new Date().toISOString(),
    dealCount: 0,
    totalDealAmount: 0,
    totalCommissionAmount: 0,
    totalPlatformAmount: 0,
    globalDelta: 0,
    mismatchRows: [],
  };

  beforeAll(async () => {
    connection = await mysql.createConnection(process.env.DATABASE_URL!);
    report = await reconcileDistributionRevenue(connection);
  });

  afterAll(async () => {
    try {
      const outputDir = path.resolve('test-results/dominance');
      fs.mkdirSync(outputDir, { recursive: true });
      fs.writeFileSync(
        path.join(outputDir, 'monetization-reconciliation-report.json'),
        `${JSON.stringify(report, null, 2)}\n`,
        'utf8',
      );
    } finally {
      await connection.end();
    }
  });

  it('has zero global delta between deal amount and commission+platform totals', () => {
    expect(report.globalDelta).toBe(0);
  });

  it('has no per-deal reconciliation mismatches', () => {
    expect(report.mismatchRows).toEqual([]);
  });
});
