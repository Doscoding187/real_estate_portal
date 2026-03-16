import type mysql from 'mysql2/promise';
import type { RowDataPacket } from 'mysql2';

export type DistributionRevenueMismatchRow = {
  dealId: number;
  dealAmount: number;
  commissionAmount: number;
  platformAmount: number;
  delta: number;
};

export type DistributionRevenueReconciliationReport = {
  generatedAt: string;
  dealCount: number;
  totalDealAmount: number;
  totalCommissionAmount: number;
  totalPlatformAmount: number;
  globalDelta: number;
  mismatchRows: DistributionRevenueMismatchRow[];
};

function toNumber(value: unknown): number {
  const parsed = Number(value ?? 0);
  if (!Number.isFinite(parsed)) return 0;
  return parsed;
}

export async function reconcileDistributionRevenue(
  connection: mysql.Connection,
): Promise<DistributionRevenueReconciliationReport> {
  const [rows] = await connection.query<
    RowDataPacket[]
  >(
    `
      SELECT
        d.id AS dealId,
        COALESCE(d.deal_amount, 0) AS dealAmount,
        COALESCE(SUM(l.calculated_amount), 0) AS commissionAmount,
        COALESCE(d.platform_amount, 0) AS platformAmount
      FROM distribution_deals d
      LEFT JOIN distribution_commission_ledger l
        ON l.distribution_deal_id = d.id
      GROUP BY d.id, d.deal_amount, d.platform_amount
      ORDER BY d.id
    `,
  );

  let totalDealAmount = 0;
  let totalCommissionAmount = 0;
  let totalPlatformAmount = 0;
  const mismatchRows: DistributionRevenueMismatchRow[] = [];

  for (const row of rows) {
    const dealId = Math.trunc(toNumber(row.dealId));
    const dealAmount = Math.trunc(toNumber(row.dealAmount));
    const commissionAmount = Math.trunc(toNumber(row.commissionAmount));
    const platformAmount = Math.trunc(toNumber(row.platformAmount));
    const delta = dealAmount - (commissionAmount + platformAmount);

    totalDealAmount += dealAmount;
    totalCommissionAmount += commissionAmount;
    totalPlatformAmount += platformAmount;

    if (delta !== 0) {
      mismatchRows.push({
        dealId,
        dealAmount,
        commissionAmount,
        platformAmount,
        delta,
      });
    }
  }

  const globalDelta = totalDealAmount - (totalCommissionAmount + totalPlatformAmount);

  return {
    generatedAt: new Date().toISOString(),
    dealCount: rows.length,
    totalDealAmount,
    totalCommissionAmount,
    totalPlatformAmount,
    globalDelta,
    mismatchRows,
  };
}
