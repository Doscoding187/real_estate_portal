import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TRPCError } from '@trpc/server';

const {
  mockGetDb,
  mockRecordAgentOsEventForAgentId,
  mockRecordProspectLeadAction,
  mockIncrementLeadCountAsync,
} = vi.hoisted(() => ({
  mockGetDb: vi.fn(),
  mockRecordAgentOsEventForAgentId: vi.fn(),
  mockRecordProspectLeadAction: vi.fn(),
  mockIncrementLeadCountAsync: vi.fn(),
}));

vi.mock('../../db', () => ({
  getDb: mockGetDb,
  db: {},
}));

vi.mock('../agentOsEventService', () => ({
  recordAgentOsEventForAgentId: mockRecordAgentOsEventForAgentId,
}));

vi.mock('../prospectJourneyService', () => ({
  recordProspectLeadAction: mockRecordProspectLeadAction,
}));

vi.mock('../developerBrandProfileService', () => ({
  developerBrandProfileService: {
    incrementLeadCountAsync: mockIncrementLeadCountAsync,
  },
}));

import { capturePublicLead } from '../publicLeadCaptureService';

type FakeDatabaseOptions = {
  selectResults?: unknown[];
  insertId?: number;
};

function makeFakeDatabase(options: FakeDatabaseOptions = {}) {
  const selectResults = [...(options.selectResults || [])];
  const state = { deliveryAttempts: [] as unknown[] };
  const insertValues = vi.fn().mockResolvedValue([{ insertId: options.insertId || 456 }]);
  const updateWhere = vi.fn().mockResolvedValue(undefined);
  const updateSet = vi.fn().mockReturnValue({ where: updateWhere });

  const makeQuery = () => {
    let consumed = false;
    const consume = () => {
      if (consumed) return [];
      consumed = true;
      return selectResults.shift() || [];
    };
    const query: any = {
      from: vi.fn(() => query),
      where: vi.fn(() => query),
      limit: vi.fn(async () => consume()),
      leftJoin: vi.fn(() => query),
      innerJoin: vi.fn(() => query),
      orderBy: vi.fn(() => query),
      offset: vi.fn(() => query),
      then: (resolve: (value: unknown) => unknown, reject?: (error: unknown) => unknown) =>
        Promise.resolve(consume()).then(resolve, reject),
    };
    return query;
  };

  const transaction = vi.fn(async (callback: (tx: any) => Promise<unknown>) => {
    const tx = {
      execute: vi.fn().mockResolvedValue([]),
      select: vi.fn(() => {
        const query: any = {
          from: vi.fn(() => query),
          where: vi.fn(() => query),
          limit: vi.fn(async () => [{ deliveryAttempts: state.deliveryAttempts }]),
        };
        return query;
      }),
      update: vi.fn(() => ({
        set: vi.fn((patch: { deliveryAttempts?: unknown[] }) => ({
          where: vi.fn(async () => {
            if (patch.deliveryAttempts) state.deliveryAttempts = patch.deliveryAttempts;
            return undefined;
          }),
        })),
      })),
    };
    return callback(tx);
  });

  return {
    select: vi.fn(() => makeQuery()),
    insert: vi.fn(() => ({ values: insertValues })),
    update: vi.fn(() => ({ set: updateSet })),
    transaction,
    insertValues,
    state,
  };
}

const consent = { accepted: true as const, version: '2026-08-02', source: 'contract-test' };

function baseInput(overrides: Record<string, unknown> = {}) {
  return {
    name: 'Jane Doe',
    email: 'jane@example.com',
    phone: '+27820000000',
    message: 'Please send details.',
    source: 'development_detail',
    sourceSurface: 'development_detail',
    leadSource: 'development_detail_contact',
    captureRequestId: 'capture-request-001',
    consent,
    ...overrides,
  };
}

describe('publicLeadCaptureService contract', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRecordAgentOsEventForAgentId.mockResolvedValue(undefined);
    mockRecordProspectLeadAction.mockResolvedValue(undefined);
    mockIncrementLeadCountAsync.mockResolvedValue(undefined);
  });

  it('captures platform-curated development demand in platform custody without a fake recipient', async () => {
    const database = makeFakeDatabase({
      selectResults: [
        [],
        [{ id: 77, developerId: null, developerBrandProfileId: 13, devOwnerType: 'platform', isPublished: 1, approvalStatus: 'approved' }],
        [{ id: 'unit-1', developmentId: 77, isActive: 1 }],
        [{ id: 13, ownerType: 'platform', linkedDeveloperAccountId: null, isVisible: 1, isSubscriber: 0 }],
      ],
      insertId: 901,
    });
    mockGetDb.mockResolvedValue(database);

    const result = await capturePublicLead(
      baseInput({ developmentId: 77, unitId: 'unit-1', unitName: 'Type A' }),
    );

    expect(result).toMatchObject({
      success: true,
      leadId: 901,
      route: 'brand',
      delivered: false,
      deliveryStatus: 'attention_required',
      deliveryMethod: 'manual',
      supplyOrigin: 'platform_curated',
      leadCustody: 'platform_managed',
      recipientType: 'manual',
      recipientId: null,
      brandLeadStatus: 'captured',
    });
    expect(database.insertValues).toHaveBeenCalledWith(
      expect.objectContaining({
        developmentId: 77,
        developerBrandProfileId: 13,
        captureRequestId: 'capture-request-001',
        consentVersion: '2026-08-02',
        leadDeliveryMethod: 'manual',
        deliveryStatus: 'attention_required',
        agentId: null,
        agencyId: null,
      }),
    );
    expect(database.state.deliveryAttempts).toHaveLength(1);
    expect(database.state.deliveryAttempts[0]).toMatchObject({
      status: 'attention_required',
      supplyOrigin: 'platform_curated',
      leadCustody: 'platform_managed',
      recipientType: 'manual',
      recipientId: null,
    });
  });

  it('routes a registered, approved development to its matching developer recipient', async () => {
    const database = makeFakeDatabase({
      selectResults: [
        [],
        [{ id: 77, developerId: 7, developerBrandProfileId: 13, devOwnerType: 'developer', isPublished: 1, approvalStatus: 'approved' }],
        [{ id: 'unit-1', developmentId: 77, isActive: 1 }],
        [{ id: 13, ownerType: 'developer', linkedDeveloperAccountId: 7, isVisible: 1, isSubscriber: 1 }],
        [{ id: 7, userId: 70, status: 'approved' }],
        [{ id: 70, role: 'property_developer' }],
      ],
    });
    mockGetDb.mockResolvedValue(database);

    const result = await capturePublicLead(
      baseInput({ developmentId: 77, unitId: 'unit-1' }),
    );

    expect(result).toMatchObject({
      deliveryStatus: 'delivered',
      deliveryMethod: 'crm_export',
      supplyOrigin: 'customer_managed',
      leadCustody: 'verified_customer_recipient',
      recipientType: 'developer',
      recipientId: 7,
      brandLeadStatus: 'delivered_subscriber',
    });
  });

  it('uses canonical property agent ownership and ignores client recipient ids', async () => {
    const database = makeFakeDatabase({
      selectResults: [
        [],
        [{ id: 501, status: 'available', developmentId: null, developerBrandProfileId: null, agentId: 33, sourceListingId: null, ownerId: 81 }],
        [{ id: 33, userId: 70, agencyId: null, status: 'approved' }],
        [{ id: 70, role: 'agent' }],
        [],
      ],
    });
    mockGetDb.mockResolvedValue(database);

    const result = await capturePublicLead(
      baseInput({
        propertyId: 501,
        agentId: 999,
        agencyId: 999,
        source: 'property_detail',
        sourceSurface: 'property_detail_contact_modal',
        leadSource: 'property_detail',
      }),
    );

    expect(result).toMatchObject({
      deliveryStatus: 'delivered',
      supplyOrigin: 'customer_managed',
      recipientType: 'agent',
      recipientId: 33,
    });
    expect(database.insertValues).toHaveBeenCalledWith(
      expect.objectContaining({ propertyId: 501, agentId: 33, agencyId: null, developerBrandProfileId: null }),
    );
  });

  it('rejects brand attribution that does not match the persisted public property', async () => {
    const database = makeFakeDatabase({
      selectResults: [
        [],
        [{ id: 501, status: 'available', developmentId: null, developerBrandProfileId: null, agentId: null, sourceListingId: null, ownerId: null }],
      ],
    });
    mockGetDb.mockResolvedValue(database);

    await expect(
      capturePublicLead(baseInput({ propertyId: 501, developerBrandProfileId: 999 })),
    ).rejects.toMatchObject({ code: 'BAD_REQUEST' });
    expect(database.insertValues).not.toHaveBeenCalled();
  });

  it('keeps a platform-curated property in custody rather than routing to public contact data', async () => {
    const database = makeFakeDatabase({
      selectResults: [
        [],
        [{ id: 501, status: 'published', developmentId: null, developerBrandProfileId: 13, agentId: null, sourceListingId: null, ownerId: null }],
        [{ id: 13, ownerType: 'platform', linkedDeveloperAccountId: null, isVisible: 1, isSubscriber: 0 }],
      ],
    });
    mockGetDb.mockResolvedValue(database);

    const result = await capturePublicLead(baseInput({ propertyId: 501 }));

    expect(result).toMatchObject({
      deliveryStatus: 'attention_required',
      supplyOrigin: 'platform_curated',
      leadCustody: 'platform_managed',
      recipientType: 'manual',
      recipientId: null,
    });
    expect(database.insertValues).toHaveBeenCalledWith(
      expect.objectContaining({ propertyId: 501, developerBrandProfileId: 13, agentId: null, agencyId: null }),
    );
  });

  it('returns an equivalent replay and rejects mismatched target or contact context', async () => {
    const existing = {
      id: 812,
      propertyId: 501,
      developmentId: null,
      developerBrandProfileId: null,
      agentId: 33,
      agencyId: null,
      name: 'Jane Doe',
      email: 'jane@example.com',
      phone: '+27820000000',
      unitId: null,
      source: 'property_detail',
      leadSource: 'property_detail',
      leadDeliveryMethod: 'crm_export',
      deliveryStatus: 'delivered',
      deliveryAttempts: [
        {
          id: 'attempt-1',
          recipientType: 'agent',
          recipientId: 33,
          status: 'delivered',
          supplyOrigin: 'customer_managed',
          leadCustody: 'verified_customer_recipient',
        },
      ],
      brandLeadStatus: null,
    } as any;

    const equivalentDb = makeFakeDatabase({ selectResults: [[existing]] });
    mockGetDb.mockResolvedValue(equivalentDb);
    await expect(
      capturePublicLead(
        baseInput({
          propertyId: 501,
          agentId: 999,
          source: 'property_detail',
          sourceSurface: 'property_detail',
          leadSource: 'property_detail',
        }),
      ),
    ).resolves.toMatchObject({ leadId: 812, duplicate: true, deliveryStatus: 'delivered' });

    const mismatchDb = makeFakeDatabase({ selectResults: [[existing]] });
    mockGetDb.mockResolvedValue(mismatchDb);
    await expect(
      capturePublicLead(baseInput({ developmentId: 77 })),
    ).rejects.toMatchObject({ code: 'CONFLICT' });

    const developmentMismatchDb = makeFakeDatabase({ selectResults: [[existing]] });
    mockGetDb.mockResolvedValue(developmentMismatchDb);
    await expect(
      capturePublicLead(baseInput({ propertyId: 501, developmentId: 77 })),
    ).rejects.toMatchObject({ code: 'CONFLICT' });

    const contactMismatchDb = makeFakeDatabase({ selectResults: [[existing]] });
    mockGetDb.mockResolvedValue(contactMismatchDb);
    await expect(
      capturePublicLead(baseInput({ propertyId: 501, email: 'other@example.com' })),
    ).rejects.toMatchObject({ code: 'CONFLICT' });
  });

  it('fails closed before persistence when consent or request identity is absent', async () => {
    await expect(
      capturePublicLead({ name: 'Jane Doe', email: 'jane@example.com', propertyId: 501 }),
    ).rejects.toBeInstanceOf(TRPCError);
    expect(mockGetDb).not.toHaveBeenCalled();
  });
});
