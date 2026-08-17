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

vi.mock('../cataloguePublisherService', () => ({
  cataloguePublisherService: {
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

function existingLead(overrides: Record<string, unknown> = {}) {
  return {
    id: 812,
    propertyId: 501,
    developmentId: null,
    cataloguePublisherId: null,
    agentId: 33,
    agencyId: null,
    name: 'Jane Doe',
    email: 'jane@example.com',
    phone: '+27820000000',
    message: 'Please send details.',
    leadType: 'inquiry',
    unitId: null,
    unitName: null,
    unitPriceFrom: null,
    unitBedrooms: null,
    unitBathrooms: null,
    source: 'property_detail',
    leadSource: 'property_detail',
    referrerUrl: null,
    utmSource: null,
    utmMedium: null,
    utmCampaign: null,
    affordabilityData: null,
    consentVersion: consent.version,
    consentSource: consent.source,
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
    ...overrides,
  } as any;
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
        [
          {
            id: 77,
            cataloguePublisherId: 13,
            isPublished: 1,
            approvalStatus: 'approved',
            transactionType: 'for_sale',
            developmentType: 'residential',
            activeUnitTypeCount: 1,
          },
        ],
        [{ id: 'unit-1', developmentId: 77, isActive: 1 }],
        [
          {
            id: 13,
            authorityKind: 'platform_reference',
            developerOrganisationId: null,
            isVisible: 1,
            isSubscriber: 0,
            sourceAttribution: 'contract-test-source',
          },
        ],
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
        cataloguePublisherId: 13,
        unitId: 'unit-1',
        unitName: 'Type A',
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

  it('rejects a private platform-curated development before creating a lead', async () => {
    const database = makeFakeDatabase({
      selectResults: [
        [],
        [
          {
            id: 77,
            cataloguePublisherId: 13,
            isPublished: 0,
            approvalStatus: 'draft',
            transactionType: 'for_sale',
            developmentType: 'residential',
            activeUnitTypeCount: 1,
          },
        ],
        [{ id: 'unit-1', developmentId: 77, isActive: 1 }],
        [
          {
            id: 13,
            authorityKind: 'platform_reference',
            developerOrganisationId: null,
            isVisible: 1,
            isSubscriber: 0,
            sourceAttribution: 'contract-test-source',
          },
        ],
      ],
    });
    mockGetDb.mockResolvedValue(database);

    await expect(
      capturePublicLead(baseInput({ developmentId: 77, unitId: 'unit-1' })),
    ).rejects.toMatchObject({ code: 'NOT_FOUND' });
    expect(database.insertValues).not.toHaveBeenCalled();
    expect(database.state.deliveryAttempts).toHaveLength(0);
  });

  it('routes a registered, approved development to its matching developer recipient', async () => {
    const database = makeFakeDatabase({
      selectResults: [
        [],
        [
          {
            id: 77,
            cataloguePublisherId: 13,
            isPublished: 1,
            approvalStatus: 'approved',
            transactionType: 'for_sale',
            developmentType: 'residential',
            activeUnitTypeCount: 1,
          },
        ],
        [{ id: 'unit-1', developmentId: 77, isActive: 1 }],
        [
          {
            id: 13,
            authorityKind: 'developer_first_party',
            developerOrganisationId: 7,
            isVisible: 1,
            isSubscriber: 1,
            sourceAttribution: null,
          },
        ],
        [{ id: 7, userId: 70, status: 'approved' }],
        [
          {
            subscription: {
              status: 'active',
              currentPeriodEnd: '2099-01-01 00:00:00',
            },
            plan: {
              name: 'developer_launch_access',
              displayName: 'Launch Access',
              segment: 'developer',
              metadata: JSON.stringify({
                commercial_term_kind: 'paid_launch_access',
                commercial_product_key: 'developer_launch_access',
                commercial_term_duration_days: 90,
              }),
            },
          },
        ],
        [{ id: 70, role: 'property_developer' }],
      ],
    });
    mockGetDb.mockResolvedValue(database);

    const result = await capturePublicLead(baseInput({ developmentId: 77, unitId: 'unit-1' }));

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
        [
          {
            id: 501,
            status: 'available',
            developmentId: null,
            cataloguePublisherId: null,
            agentId: 33,
            // The bridge is deliberately present: public enquiry ownership
            // must still come from the approved property projection.
            sourceListingId: 9001,
            ownerId: 81,
          },
        ],
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
      expect.objectContaining({
        propertyId: 501,
        agentId: 33,
        agencyId: null,
        cataloguePublisherId: null,
      }),
    );
  });

  it('routes an assigned agency agent with both canonical agent and agency attribution', async () => {
    const database = makeFakeDatabase({
      selectResults: [
        [],
        [
          {
            id: 505,
            status: 'published',
            developmentId: null,
            cataloguePublisherId: null,
            agentId: 33,
            ownerId: 81,
          },
        ],
        [{ id: 33, userId: 70, agencyId: 44, status: 'approved' }],
        [{ id: 70, role: 'agent' }],
        [],
        [{ id: 44, isVerified: 1 }],
      ],
      insertId: 904,
    });
    mockGetDb.mockResolvedValue(database);

    const result = await capturePublicLead(
      baseInput({
        propertyId: 505,
        agentId: 999,
        agencyId: 999,
        source: 'property_detail',
        sourceSurface: 'property_detail_contact_modal',
        leadSource: 'property_detail',
      }),
    );

    expect(result).toMatchObject({
      success: true,
      leadId: 904,
      deliveryStatus: 'delivered',
      recipientType: 'agent',
      recipientId: 33,
    });
    expect(database.insertValues).toHaveBeenCalledWith(
      expect.objectContaining({
        propertyId: 505,
        agentId: 33,
        agencyId: 44,
      }),
    );
  });

  it('routes an agency-owned property without an assigned agent to the verified agency', async () => {
    const database = makeFakeDatabase({
      selectResults: [
        [],
        [
          {
            id: 502,
            status: 'published',
            developmentId: null,
            cataloguePublisherId: null,
            agentId: null,
            ownerId: 81,
          },
        ],
        [{ id: 81, agencyId: 44, role: 'agency_admin' }],
        [{ id: 44, isVerified: 1 }],
      ],
      insertId: 902,
    });
    mockGetDb.mockResolvedValue(database);

    const result = await capturePublicLead(
      baseInput({
        propertyId: 502,
        agentId: 999,
        agencyId: 999,
        source: 'property_detail',
        sourceSurface: 'property_detail_contact_modal',
        leadSource: 'property_detail',
      }),
    );

    expect(result).toMatchObject({
      success: true,
      leadId: 902,
      deliveryStatus: 'delivered',
      supplyOrigin: 'customer_managed',
      leadCustody: 'verified_customer_recipient',
      recipientType: 'agency',
      recipientId: 44,
    });
    expect(database.insertValues).toHaveBeenCalledWith(
      expect.objectContaining({
        propertyId: 502,
        agentId: null,
        agencyId: 44,
      }),
    );
  });

  it('keeps a public property without a verified agent or agency in platform custody', async () => {
    const database = makeFakeDatabase({
      selectResults: [
        [],
        [
          {
            id: 503,
            status: 'published',
            developmentId: null,
            cataloguePublisherId: null,
            agentId: null,
            ownerId: 82,
          },
        ],
        [{ id: 82, agencyId: null, role: 'visitor' }],
      ],
      insertId: 903,
    });
    mockGetDb.mockResolvedValue(database);

    const result = await capturePublicLead(baseInput({ propertyId: 503 }));

    expect(result).toMatchObject({
      success: true,
      leadId: 903,
      deliveryStatus: 'attention_required',
      supplyOrigin: 'platform_curated',
      leadCustody: 'platform_managed',
      recipientType: 'manual',
      recipientId: null,
    });
    expect(database.insertValues).toHaveBeenCalledWith(
      expect.objectContaining({
        propertyId: 503,
        agentId: null,
        agencyId: null,
      }),
    );
  });

  it('rejects a non-public property before creating a lead', async () => {
    const database = makeFakeDatabase({
      selectResults: [
        [],
        [
          {
            id: 504,
            status: 'pending',
            developmentId: null,
            cataloguePublisherId: null,
            agentId: null,
            ownerId: 82,
          },
        ],
      ],
    });
    mockGetDb.mockResolvedValue(database);

    await expect(capturePublicLead(baseInput({ propertyId: 504 }))).rejects.toMatchObject({
      code: 'NOT_FOUND',
    });
    expect(database.insertValues).not.toHaveBeenCalled();
  });

  it('rejects brand attribution that does not match the persisted public property', async () => {
    const database = makeFakeDatabase({
      selectResults: [
        [],
        [
          {
            id: 501,
            status: 'available',
            developmentId: null,
            cataloguePublisherId: null,
            agentId: null,
            sourceListingId: null,
            ownerId: null,
          },
        ],
      ],
    });
    mockGetDb.mockResolvedValue(database);

    await expect(
      capturePublicLead(baseInput({ propertyId: 501, cataloguePublisherId: 999 })),
    ).rejects.toMatchObject({ code: 'BAD_REQUEST' });
    expect(database.insertValues).not.toHaveBeenCalled();
  });

  it('rejects a stale transaction context before a development lead is persisted', async () => {
    const database = makeFakeDatabase({
      selectResults: [
        [],
        [
          {
            id: 77,
            cataloguePublisherId: 13,
            transactionType: 'for_sale',
            developmentType: 'residential',
            isPublished: 1,
            approvalStatus: 'approved',
          },
        ],
      ],
    });
    mockGetDb.mockResolvedValue(database);

    await expect(
      capturePublicLead(
        baseInput({
          developmentId: 77,
          transactionType: 'for_rent',
        }),
      ),
    ).rejects.toMatchObject({ code: 'BAD_REQUEST' });
    expect(database.insertValues).not.toHaveBeenCalled();
  });

  it('keeps a platform-curated property in custody rather than routing to public contact data', async () => {
    const database = makeFakeDatabase({
      selectResults: [
        [],
        [
          {
            id: 501,
            status: 'published',
            developmentId: null,
            cataloguePublisherId: 13,
            agentId: null,
            sourceListingId: null,
            ownerId: null,
          },
        ],
        [
          {
            id: 13,
            authorityKind: 'platform_reference',
            developerOrganisationId: null,
            isVisible: 1,
            isSubscriber: 0,
          },
        ],
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
      expect.objectContaining({
        propertyId: 501,
        cataloguePublisherId: 13,
        agentId: null,
        agencyId: null,
      }),
    );
  });

  it('accepts a property replay when canonical development and brand attribution were omitted', async () => {
    mockGetDb.mockResolvedValue(
      makeFakeDatabase({
        selectResults: [[existingLead({ developmentId: 77, cataloguePublisherId: 13 })]],
      }),
    );

    await expect(
      capturePublicLead(
        baseInput({
          propertyId: 501,
          source: 'property_detail',
          sourceSurface: 'property_detail',
          leadSource: 'property_detail',
        }),
      ),
    ).resolves.toMatchObject({ leadId: 812, duplicate: true, deliveryStatus: 'delivered' });
  });

  it('accepts a development replay when canonical brand attribution was omitted', async () => {
    mockGetDb.mockResolvedValue(
      makeFakeDatabase({
        selectResults: [
          [
            existingLead({
              propertyId: null,
              developmentId: 77,
              cataloguePublisherId: 13,
              agentId: null,
              source: 'development_detail',
              leadSource: 'development_detail_contact',
              deliveryAttempts: [
                {
                  id: 'attempt-1',
                  recipientType: 'developer',
                  recipientId: 7,
                  status: 'delivered',
                  supplyOrigin: 'customer_managed',
                  leadCustody: 'verified_customer_recipient',
                },
              ],
            }),
          ],
        ],
      }),
    );

    await expect(capturePublicLead(baseInput({ developmentId: 77 }))).resolves.toMatchObject({
      leadId: 812,
      duplicate: true,
      recipientType: 'developer',
    });
  });

  it('returns the durable lead for an identical retry after the first response is presumed lost', async () => {
    mockGetDb.mockResolvedValue(makeFakeDatabase({ selectResults: [[existingLead()]] }));

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
  });

  it('rejects reuse of a capture identity for a different submitted target', async () => {
    const mismatchDb = makeFakeDatabase({ selectResults: [[existingLead()]] });
    mockGetDb.mockResolvedValue(mismatchDb);

    await expect(
      capturePublicLead(
        baseInput({
          propertyId: 502,
          source: 'property_detail',
          sourceSurface: 'property_detail',
          leadSource: 'property_detail',
        }),
      ),
    ).rejects.toMatchObject({ code: 'CONFLICT' });
  });

  it('rejects reuse of a capture identity for a different material payload', async () => {
    mockGetDb.mockResolvedValue(makeFakeDatabase({ selectResults: [[existingLead()]] }));

    await expect(
      capturePublicLead(
        baseInput({
          propertyId: 501,
          message: 'Please arrange a private viewing instead.',
          source: 'property_detail',
          sourceSurface: 'property_detail',
          leadSource: 'property_detail',
        }),
      ),
    ).rejects.toMatchObject({ code: 'CONFLICT' });
  });

  it('fails closed before persistence when consent or request identity is absent', async () => {
    await expect(
      capturePublicLead({ name: 'Jane Doe', email: 'jane@example.com', propertyId: 501 }),
    ).rejects.toBeInstanceOf(TRPCError);
    expect(mockGetDb).not.toHaveBeenCalled();
  });
});
