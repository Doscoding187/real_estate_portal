import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockLogAudit, mockGetDb, mockResolveIdentity, mockGetLeadRoutingAudit, selectResults } =
  vi.hoisted(() => ({
    mockLogAudit: vi.fn(),
    mockGetDb: vi.fn(),
    mockResolveIdentity: vi.fn(),
    mockGetLeadRoutingAudit: vi.fn(),
    selectResults: [] as unknown[],
  }));

vi.mock('../_core/auditLog', () => ({
  logAudit: mockLogAudit,
  AuditActions: {},
}));

vi.mock('../db', async importOriginal => {
  const actual = await importOriginal<typeof import('../db')>();
  return { ...actual, getDb: mockGetDb };
});

vi.mock('../_core/identityResolver', () => ({
  resolveOperatingIdentity: mockResolveIdentity,
}));

vi.mock('../services/leadRoutingAuditService', () => ({
  getLeadRoutingAudit: mockGetLeadRoutingAudit,
}));

import { superAdminPublisherRouter } from '../superAdminPublisherRouter';
import { systemRouter } from '../_core/systemRouter';

// Fake drizzle builder: every chained call returns itself; awaiting it yields
// the next queued result.
function fakeDb() {
  const chain: any = new Proxy(
    {},
    {
      get(_t, prop) {
        if (prop === 'then') {
          return (resolve: (v: unknown) => void) => resolve(selectResults.shift());
        }
        return () => chain;
      },
    },
  );
  return { select: () => chain };
}

const PII = {
  name: 'Jane Secret',
  email: 'jane.secret@example.com',
  phone: '0821234567',
  message: 'Please call me about the penthouse',
};

const ctxFor = () =>
  ({
    req: { headers: {} },
    res: {},
    user: { id: 9, role: 'super_admin' },
  }) as any;

function expectNoPii(value: unknown) {
  const serialized = JSON.stringify(value);
  for (const secret of Object.values(PII)) {
    expect(serialized).not.toContain(secret);
  }
}

describe('super-admin lead personal-data reads leave an audit record', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    selectResults.length = 0;
    mockGetDb.mockResolvedValue(fakeDb());
    mockResolveIdentity.mockResolvedValue({ mode: 'platform_curator', cataloguePublisherId: 5 });
    mockLogAudit.mockResolvedValue(undefined);
  });

  it('getPublisherLeads audits count and inputs only', async () => {
    selectResults.push([
      { lead: { id: 1, ...PII }, development: { id: 2, name: 'Dev', slug: 'dev' } },
      { lead: { id: 2, ...PII }, development: null },
    ]);
    const caller = superAdminPublisherRouter.createCaller(ctxFor());

    const rows = await caller.getPublisherLeads({
      cataloguePublisherId: 5,
      developmentId: 2,
      limit: 10,
      offset: 20,
    });

    expect(rows).toHaveLength(2);
    expect(mockLogAudit).toHaveBeenCalledOnce();
    const arg = mockLogAudit.mock.calls[0][0];
    expect(arg).toMatchObject({
      userId: 9,
      action: 'lead_data_viewed',
      targetType: 'catalogue_publisher',
      targetId: 5,
      metadata: { count: 2, filters: { developmentId: 2, limit: 10, offset: 20 } },
    });
    expectNoPii({ ...arg, req: undefined });
  });

  it('getPlatformManagedLeads audits count and inputs only', async () => {
    selectResults.push([{ id: 1, ...PII }], [{ total: 1 }]);
    const caller = superAdminPublisherRouter.createCaller(ctxFor());

    const result = await caller.getPlatformManagedLeads({ limit: 25, offset: 0 });

    expect(result.items).toHaveLength(1);
    expect(mockLogAudit).toHaveBeenCalledOnce();
    const arg = mockLogAudit.mock.calls[0][0];
    expect(arg).toMatchObject({
      userId: 9,
      action: 'lead_data_viewed',
      targetType: 'platform_managed_queue',
      metadata: { count: 1, filters: { limit: 25, offset: 0 } },
    });
    expectNoPii({ ...arg, req: undefined });
  });

  it('still returns rows when the audit write throws', async () => {
    selectResults.push([{ id: 1, ...PII }], [{ total: 1 }]);
    mockLogAudit.mockRejectedValue(new Error('audit down'));
    const caller = superAdminPublisherRouter.createCaller(ctxFor());

    const result = await caller.getPlatformManagedLeads({ limit: 25, offset: 0 });

    expect(result.items).toHaveLength(1);
  });

  it('leadRoutingAudit audits attention count and inputs only', async () => {
    mockGetLeadRoutingAudit.mockResolvedValue({
      summary: {},
      attentionLeads: [{ id: 1, name: PII.name, email: PII.email }],
    });
    const caller = systemRouter.createCaller(ctxFor());

    const result = await caller.leadRoutingAudit({ days: 7, attentionLimit: 5 });

    expect(result.attentionLeads).toHaveLength(1);
    expect(mockLogAudit).toHaveBeenCalledOnce();
    const arg = mockLogAudit.mock.calls[0][0];
    expect(arg).toMatchObject({
      userId: 9,
      action: 'lead_data_viewed',
      targetType: 'lead_routing_audit',
      metadata: { count: 1, filters: { days: 7, attentionLimit: 5 } },
    });
    expectNoPii({ ...arg, req: undefined });
  });
});
