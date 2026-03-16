import { beforeEach, describe, expect, it, vi } from 'vitest';

const { executeMock, getDbMock } = vi.hoisted(() => {
  return {
    executeMock: vi.fn(),
    getDbMock: vi.fn(),
  };
});

vi.mock('../../db', () => ({
  getDb: getDbMock,
}));

import { getKpiSummary } from '../kpiRollupService';

describe('kpiRollupService reconciliation logic', () => {
  beforeEach(() => {
    executeMock.mockReset();
    getDbMock.mockReset();
    getDbMock.mockResolvedValue({ execute: executeMock });
  });

  it('computes weighted NRR and weighted totals from role summaries', async () => {
    const queue: any[] = [
      [[]], // ensureRollupTables: daily_role_metrics
      [[]], // ensureRollupTables: daily_funnel_metrics
      [
        [
          {
            metricDate: '2026-02-01',
            role: 'agent',
            activeAccounts: 100,
            newSubscriptions: 12,
            churnedAccounts: 5,
            mrr: 1300,
            expansionRevenue: 300,
            addOnRevenue: 80,
            arpu: 13,
            nrr: 120,
          },
          {
            metricDate: '2026-02-01',
            role: 'developer',
            activeAccounts: 50,
            newSubscriptions: 4,
            churnedAccounts: 2,
            mrr: 600,
            expansionRevenue: 120,
            addOnRevenue: 20,
            arpu: 12,
            nrr: 110,
          },
          {
            metricDate: '2026-02-01',
            role: 'private_seller',
            activeAccounts: 20,
            newSubscriptions: 3,
            churnedAccounts: 1,
            mrr: 220,
            expansionRevenue: 30,
            addOnRevenue: 10,
            arpu: 11,
            nrr: 105,
          },
        ],
      ],
      [
        [
          { userRole: 'agent', buyers: 10 },
          { userRole: 'agency_admin', buyers: 2 },
          { userRole: 'property_developer', buyers: 5 },
          { userRole: 'visitor', buyers: 3 },
        ],
      ],
      [[{ value: 1000 }]], // agent start cohort MRR
      [[{ value: 1300 }]], // agent end MRR
      [[{ value: 1200 }]], // agent endExisting
      [[{ value: 500 }]], // developer start cohort MRR
      [[{ value: 600 }]], // developer end MRR
      [[{ value: 550 }]], // developer endExisting
      [[{ value: 200 }]], // private seller start cohort MRR
      [[{ value: 220 }]], // private seller end MRR
      [[{ value: 210 }]], // private seller endExisting
    ];

    executeMock.mockImplementation(async () => queue.shift() ?? [[]]);

    const summary = await getKpiSummary('2026-02-01', '2026-02-01');

    expect(summary.roles).toHaveLength(3);
    expect(summary.totals.mrr).toBe(2120);
    expect(summary.totals.expansionRevenue).toBe(450);
    expect(summary.totals.addOnRevenue).toBe(110);
    expect(summary.totals.startActiveAccounts).toBe(170);
    expect(summary.totals.activeAccounts).toBe(170);

    // Weighted NRR check:
    // (agent endExisting + developer endExisting + private endExisting) /
    // (agent start + developer start + private start) * 100
    const expectedWeightedNrr = (1960 / 1700) * 100;
    expect(summary.totals.nrr).toBeCloseTo(expectedWeightedNrr, 2);

    // Ensure this is not a simple arithmetic average of role percentages.
    const averageRoleNrr =
      summary.roles.reduce((sum, role) => sum + Number(role.nrr || 0), 0) / summary.roles.length;
    expect(Math.abs(summary.totals.nrr - averageRoleNrr)).toBeGreaterThan(1);

    // Add-on adoption should use weighted totals: total buyers / total active accounts.
    const expectedAdoption = (20 / 170) * 100;
    expect(summary.totals.addOnAdoptionRate).toBeCloseTo(expectedAdoption, 2);
  });
});
