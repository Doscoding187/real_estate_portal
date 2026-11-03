import { beforeEach, describe, expect, it, vi } from 'vitest';

const { getDbMock } = vi.hoisted(() => ({
  getDbMock: vi.fn(),
}));

vi.mock('../../db', () => ({
  getDb: getDbMock,
}));

import {
  computeLeadResponsePerformance,
  SERVICE_LEAD_RESPONSE_MIN_SAMPLE,
  SERVICE_LEAD_RESPONSE_WINDOW_DAYS,
  servicesEngineService,
} from '../servicesEngineService';

type MeasurementRow = { leadId: number; createdAt: string; firstResponseAt: string | null };

function row(id: number, createdAt: string, firstResponseAt: string | null): MeasurementRow {
  return { leadId: id, createdAt, firstResponseAt };
}

function makeFakeQueryDb(rows: MeasurementRow[]) {
  const db = {
    select: () => ({
      from: () => ({
        innerJoin: () => ({
          where: () => ({
            groupBy: async () => rows,
          }),
        }),
      }),
    }),
  };
  return db;
}

describe('computeLeadResponsePerformance', () => {
  const base = '2026-10-01 10:00:00';

  it('takes the middle duration for an odd sample', () => {
    const result = computeLeadResponsePerformance([
      row(1, base, '2026-10-01 10:10:00'),
      row(2, base, '2026-10-01 10:30:00'),
      row(3, base, '2026-10-01 11:40:00'),
    ]);

    expect(result.medianResponseSeconds).toBe(1800);
    expect(result.measuredLeads).toBe(3);
    expect(result.sampleReady).toBe(true);
  });

  it('averages the two middle durations for an even sample', () => {
    const result = computeLeadResponsePerformance([
      row(1, base, '2026-10-01 10:15:00'),
      row(2, base, '2026-10-01 10:45:00'),
    ]);

    expect(result.medianResponseSeconds).toBe(1800);
    expect(result.measuredLeads).toBe(2);
    expect(result.sampleReady).toBe(false);
  });

  it('gates the public claim until the minimum response sample is measured', () => {
    const underSample = computeLeadResponsePerformance([
      row(1, base, '2026-10-01 10:01:00'),
      row(2, base, '2026-10-01 10:02:00'),
    ]);
    expect(underSample.sampleReady).toBe(false);
    expect(SERVICE_LEAD_RESPONSE_MIN_SAMPLE).toBe(3);

    const atSample = computeLeadResponsePerformance([
      row(1, base, '2026-10-01 10:01:00'),
      row(2, base, '2026-10-01 10:02:00'),
      row(3, base, '2026-10-01 10:03:00'),
    ]);
    expect(atSample.sampleReady).toBe(true);
  });

  it('drops unmeasured leads and impossible negative durations instead of inventing a value', () => {
    const result = computeLeadResponsePerformance([
      row(1, base, null),
      row(2, base, 'not-a-date'),
      row(3, base, '2026-10-01 09:00:00'),
      row(4, base, '2026-10-01 12:00:00'),
    ]);

    expect(result.measuredLeads).toBe(1);
    expect(result.medianResponseSeconds).toBe(7200);
    expect(result.sampleReady).toBe(false);
  });

  it('reports an empty honest measurement for a provider with no measured leads', () => {
    const result = computeLeadResponsePerformance([], 90);
    expect(result).toEqual({
      windowDays: 90,
      measuredLeads: 0,
      medianResponseSeconds: 0,
      sampleReady: false,
    });
    expect(SERVICE_LEAD_RESPONSE_WINDOW_DAYS).toBe(90);
  });
});

describe('servicesEngineService.getProviderLeadResponsePerformance', () => {
  beforeEach(() => {
    getDbMock.mockReset();
  });

  it('measures provider leads through the recorded response-event truth', async () => {
    getDbMock.mockResolvedValue(
      makeFakeQueryDb([
        row(1, '2026-10-01 10:00:00', '2026-10-01 10:30:00'),
        row(2, '2026-10-02 10:00:00', '2026-10-02 11:30:00'),
        row(3, '2026-10-03 10:00:00', '2026-10-03 11:00:00'),
      ]),
    );

    const result = await servicesEngineService.getProviderLeadResponsePerformance(44);

    expect(result.measuredLeads).toBe(3);
    expect(result.medianResponseSeconds).toBe(3600);
    expect(result.sampleReady).toBe(true);
    expect(result.windowDays).toBe(SERVICE_LEAD_RESPONSE_WINDOW_DAYS);
  });

  it('returns an unmeasured sample when the provider has no response events', async () => {
    getDbMock.mockResolvedValue(makeFakeQueryDb([]));

    const result = await servicesEngineService.getProviderLeadResponsePerformance(44);

    expect(result.measuredLeads).toBe(0);
    expect(result.sampleReady).toBe(false);
  });
});
