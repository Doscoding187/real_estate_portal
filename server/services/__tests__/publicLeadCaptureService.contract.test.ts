import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TRPCError } from '@trpc/server';

const {
  mockGetDb,
  mockRecordAgentOsEventForAgentId,
  mockRecordProspectLeadAction,
  mockGetOrCreateProspectIdentity,
  mockIncrementLeadCountAsync,
  mockResolvePublicPropertyEligibility,
  mockCreateLeadDeliveryInTransaction,
  mockGetLeadDeliverySnapshot,
} = vi.hoisted(() => ({
  mockGetDb: vi.fn(),
  mockRecordAgentOsEventForAgentId: vi.fn(),
  mockRecordProspectLeadAction: vi.fn(),
  mockGetOrCreateProspectIdentity: vi.fn(),
  mockIncrementLeadCountAsync: vi.fn(),
  mockResolvePublicPropertyEligibility: vi.fn(),
  mockCreateLeadDeliveryInTransaction: vi.fn(),
  mockGetLeadDeliverySnapshot: vi.fn(),
}));

vi.mock('../../db', () => ({
  getDb: mockGetDb,
  db: {},
}));

vi.mock('../agentOsEventService', () => ({
  recordAgentOsEventForAgentId: mockRecordAgentOsEventForAgentId,
}));

vi.mock('../prospectJourneyService', () => ({
  getOrCreateProspectIdentity: mockGetOrCreateProspectIdentity,
  recordProspectLeadAction: mockRecordProspectLeadAction,
}));

vi.mock('../cataloguePublisherService', () => ({
  cataloguePublisherService: {
    incrementLeadCountAsync: mockIncrementLeadCountAsync,
  },
}));

vi.mock('../publicPropertyEligibilityService', () => ({
  resolvePublicPropertyEligibility: mockResolvePublicPropertyEligibility,
}));

vi.mock('../leadDeliveryService', () => ({
  createLeadDeliveryInTransaction: mockCreateLeadDeliveryInTransaction,
  getLeadDeliverySnapshot: mockGetLeadDeliverySnapshot,
  publicStatusForDelivery: (delivery: { state: string; leadCustody: string }) =>
    delivery.state === 'completed' || delivery.state === 'accepted'
      ? 'delivered'
      : delivery.state === 'retryable_failed'
        ? 'failed'
        : delivery.state === 'unknown' || delivery.state === 'exhausted' ||
            delivery.leadCustody === 'platform_managed' ||
            delivery.leadCustody === 'attention_required'
          ? 'attention_required'
          : 'pending',
  toMySqlDateTime: (value: Date | string = new Date()) =>
    value instanceof Date ? value.toISOString().replace('T', ' ').replace('Z', '') : String(value),
}));

import { capturePublicLead } from '../publicLeadCaptureService';

type FakeDatabaseOptions = {
  selectResults?: unknown[];
  insertId?: number;
  deliverySnapshots?: unknown[];
  defaultDeliverySnapshot?: unknown;
};

function makeFakeDatabase(options: FakeDatabaseOptions = {}) {
  const selectResults = [...(options.selectResults || [])];
  const state = { deliveryRows: [] as unknown[] };
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
      __database: fakeDatabase,
      execute: vi.fn().mockResolvedValue([]),
      insert: vi.fn(() => ({ values: insertValues })),
      select: vi.fn(() => {
        const query: any = {
          from: vi.fn(() => query),
          where: vi.fn(() => query),
          limit: vi.fn(async () => []),
        };
        return query;
      }),
      update: vi.fn(() => ({
        set: vi.fn(() => ({ where: vi.fn().mockResolvedValue(undefined) })),
      })),
    };
    return callback(tx);
  });

  const fakeDatabase = {
    select: vi.fn(() => makeQuery()),
    insert: vi.fn(() => ({ values: insertValues })),
    update: vi.fn(() => ({ set: updateSet })),
    transaction,
    insertValues,
    state,
    deliverySnapshots: [...(options.deliverySnapshots || [])],
    defaultDeliverySnapshot: options.defaultDeliverySnapshot,
  };
  return fakeDatabase;
}

let nextDeliveryId = 10_000;
let deliveryStates = new WeakMap<object, Map<number, any>>();

function syntheticDeliverySnapshot(leadId: number) {
  const deliveryId = nextDeliveryId++;
  const delivery = {
    id: deliveryId,
    leadId,
    purpose: 'primary_custody',
    routingRevision: 1,
    channel: 'crm_export',
    recipientType: 'agent',
    recipientId: 33,
    recipientUserId: null,
    recipientAgentId: 33,
    recipientAgencyId: null,
    recipientDeveloperOrganisationId: null,
    recipientPublisherId: null,
    destinationName: null,
    destinationAddress: null,
    destinationSnapshot: null,
    supplyOrigin: 'customer_managed',
    leadCustody: 'verified_customer_recipient',
    state: 'completed',
    idempotencyKey: `test:lead:${leadId}`,
    dueAt: '2026-08-02 00:00:00.000000',
    maxAttempts: 3,
    completedAt: '2026-08-02 00:00:00.000000',
    supersededAt: null,
    createdAt: '2026-08-02 00:00:00.000000',
    updatedAt: '2026-08-02 00:00:00.000000',
  };
  return {
    current: delivery,
    attempts: [
      {
        id: `attempt-${deliveryId}`,
        deliveryId,
        deliveryKey: delivery.idempotencyKey,
        recipientType: 'agent',
        recipientId: 33,
        channel: 'crm_export',
        status: 'delivered',
        attemptCount: 1,
        maxAttempts: 3,
        attemptedAt: delivery.createdAt,
        deliveredAt: delivery.completedAt,
        createdAt: delivery.createdAt,
        updatedAt: delivery.updatedAt,
        supplyOrigin: 'customer_managed',
        leadCustody: 'verified_customer_recipient',
        state: 'completed',
      },
    ],
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
    brandLeadStatus: null,
    ...overrides,
  } as any;
}

function launchPlan(ownerType: 'agent' | 'agency' | 'developer') {
  return {
    name: `${ownerType}_launch_access`,
    displayName: `${ownerType} Launch Access`,
    segment: ownerType,
    isActive: 1,
    metadata: {
      commercial_term_kind: 'paid_launch_access',
      commercial_product_key: `${ownerType}_launch_access`,
      commercial_term_duration_days: 90,
      commercial_requires_verified_payment: true,
      commercial_auto_renews: false,
    },
  };
}

function entitledLaunchSubscription(
  ownerType: 'agent' | 'agency' | 'developer',
  currentPeriodEnd = '2099-01-01 00:00:00',
) {
  return {
    subscription: { status: 'active', currentPeriodEnd },
    plan: launchPlan(ownerType),
  };
}

describe('publicLeadCaptureService contract', () => {
  it('rejects retired non-property geography targets before reading or writing the database', async () => {
    const retiredTargets = [
      { listingId: 701 },
      { listingId: 703, commercialAvailabilityId: 801 },
      { developmentId: 1701 },
      { slPlaceId: 18, slSpaceId: 21 },
    ];
    for (const target of retiredTargets) {
      mockGetDb.mockClear();
      await expect(capturePublicLead(baseInput(target))).rejects.toMatchObject({
        code: 'PRECONDITION_FAILED',
      });
      expect(mockGetDb).not.toHaveBeenCalled();
    }
  });

  beforeEach(() => {
    vi.clearAllMocks();
    nextDeliveryId = 10_000;
    deliveryStates = new WeakMap();
    mockCreateLeadDeliveryInTransaction.mockImplementation(async (tx: any, input: any) => {
      const deliveryId = nextDeliveryId++;
      const state =
        input.initialStatus === 'delivered'
          ? 'completed'
          : input.initialStatus === 'failed'
            ? 'retryable_failed'
            : 'queued';
      const timestamp = '2026-08-02 00:00:00.000000';
      const delivery = {
        id: deliveryId,
        leadId: input.leadId,
        purpose: input.purpose || 'primary_custody',
        routingRevision: input.routingRevision || 1,
        channel: input.channel,
        recipientType: input.recipientType,
        recipientId:
          input.recipientType === 'agent'
            ? input.recipientAgentId
            : input.recipientType === 'agency'
              ? input.recipientAgencyId
              : input.recipientType === 'developer'
                ? input.recipientDeveloperOrganisationId
                : input.recipientUserId || null,
        recipientUserId: input.recipientUserId || null,
        recipientAgentId: input.recipientAgentId || null,
        recipientAgencyId: input.recipientAgencyId || null,
        recipientDeveloperOrganisationId: input.recipientDeveloperOrganisationId || null,
        recipientPublisherId: input.recipientPublisherId || null,
        destinationName: input.destinationName || null,
        destinationAddress: input.destinationAddress || null,
        destinationSnapshot: input.destinationSnapshot || null,
        supplyOrigin: input.supplyOrigin,
        leadCustody: input.leadCustody,
        state,
        idempotencyKey: input.idempotencyKey,
        dueAt: timestamp,
        maxAttempts: input.maxAttempts || 3,
        completedAt: state === 'completed' ? timestamp : null,
        supersededAt: null,
        createdAt: timestamp,
        updatedAt: timestamp,
      };
      const attempt =
        state === 'completed' || state === 'retryable_failed'
          ? {
              id: `attempt-${deliveryId}`,
              deliveryId,
              deliveryKey: delivery.idempotencyKey,
              recipientType: delivery.recipientType,
              recipientId: delivery.recipientId,
              channel: delivery.channel,
              status: state === 'completed' ? 'delivered' : 'failed',
              attemptCount: 1,
              maxAttempts: delivery.maxAttempts,
              attemptedAt: timestamp,
              deliveredAt: state === 'completed' ? timestamp : null,
              createdAt: timestamp,
              updatedAt: timestamp,
              supplyOrigin: delivery.supplyOrigin,
              leadCustody: delivery.leadCustody,
              state,
            }
          : null;
      const ownerDatabase = tx.__database;
      const entries = deliveryStates.get(ownerDatabase) || new Map<number, any>();
      entries.set(input.leadId, { current: delivery, attempts: attempt ? [attempt] : [] });
      deliveryStates.set(ownerDatabase, entries);
      ownerDatabase.state.deliveryRows.push(delivery);
      return { delivery, attempt, duplicate: false };
    });
    mockGetLeadDeliverySnapshot.mockImplementation(async ({ leadId, database: snapshotDatabase }: any) => {
      if (snapshotDatabase.deliverySnapshots?.length) {
        return snapshotDatabase.deliverySnapshots.shift();
      }
      if (snapshotDatabase.defaultDeliverySnapshot !== undefined) {
        return snapshotDatabase.defaultDeliverySnapshot;
      }
      const entries = deliveryStates.get(snapshotDatabase);
      return entries?.get(Number(leadId)) || syntheticDeliverySnapshot(Number(leadId));
    });
    mockRecordAgentOsEventForAgentId.mockResolvedValue(undefined);
    mockGetOrCreateProspectIdentity.mockResolvedValue({
      id: 'prospect-identity-001',
      userId: 701,
      contactPreferences: {},
    });
    mockRecordProspectLeadAction.mockResolvedValue(undefined);
    mockIncrementLeadCountAsync.mockResolvedValue(undefined);
    mockResolvePublicPropertyEligibility.mockImplementation(async (propertyId: number) =>
      propertyId === 503 || propertyId === 504
        ? null
        : {
            publicAuthority: 'public_property_eligibility',
            property: {
              id: propertyId,
              developmentId: null,
              cataloguePublisherId: null,
            },
            custody: {
              supplyOrigin: 'customer_managed',
              leadCustody: 'verified_customer_recipient',
              recipientType: 'agent',
              recipientId: 33,
              agentId: 33,
              agencyId: null,
              developerId: null,
              leadDeliveryMethod: 'crm_export',
              brandLeadStatus: null,
              reason: null,
            },
          },
    );
  });

  it('captures a public agent-profile enquiry directly into the selected agent CRM', async () => {
    const database = makeFakeDatabase({
      selectResults: [
        [],
        [{ id: 33, userId: 70, agencyId: null, status: 'approved', isVerified: 0 }],
        [],
        [entitledLaunchSubscription('agent')],
        [{ role: 'agent' }],
      ],
      insertId: 916,
    });
    mockGetDb.mockResolvedValue(database);

    await expect(
      capturePublicLead(
        baseInput({
          agentId: 33,
          source: 'agent_profile',
          sourceSurface: 'agent_profile_enquiry',
          leadSource: 'agent_profile',
        }),
      ),
    ).resolves.toMatchObject({
      success: true,
      leadId: 916,
      deliveryStatus: 'delivered',
      recipientType: 'agent',
      recipientId: 33,
    });

    expect(database.insertValues).toHaveBeenCalledWith(
      expect.objectContaining({
        listingId: null,
        propertyId: null,
        developmentId: null,
        agentId: 33,
        source: 'agent_profile',
        leadSource: 'agent_profile',
      }),
    );
  });

  it('fails closed when an approved public profile is not commercially eligible to receive leads', async () => {
    const database = makeFakeDatabase({
      selectResults: [
        [],
        [{ id: 33, userId: 70, agencyId: null, status: 'approved', isVerified: 0 }],
        [],
        [],
        [{ role: 'agent' }],
      ],
    });
    mockGetDb.mockResolvedValue(database);

    await expect(
      capturePublicLead(
        baseInput({
          agentId: 33,
          source: 'agent_profile',
          sourceSurface: 'agent_profile_enquiry',
          leadSource: 'agent_profile',
        }),
      ),
    ).rejects.toMatchObject({ code: 'NOT_FOUND' });
    expect(database.insertValues).not.toHaveBeenCalled();
  });

  it('captures a direct profile enquiry for a current unbadged agency member through the agency entitlement', async () => {
    const database = makeFakeDatabase({
      selectResults: [
        [],
        [{ id: 33, userId: 70, agencyId: 44, status: 'approved', isVerified: 0 }],
        [{ agentId: 33, agencyId: 44, status: 'active', effectiveFrom: null, effectiveTo: null }],
        [],
        [entitledLaunchSubscription('agency')],
        [{ role: 'agent' }],
      ],
      insertId: 917,
    });
    mockGetDb.mockResolvedValue(database);

    await expect(
      capturePublicLead(
        baseInput({
          agentId: 33,
          source: 'agent_profile',
          sourceSurface: 'agent_profile_enquiry',
          leadSource: 'agent_profile',
        }),
      ),
    ).resolves.toMatchObject({
      success: true,
      leadId: 917,
      deliveryStatus: 'delivered',
      recipientType: 'agent',
      recipientId: 33,
    });
  });

  it('accepts a current individual term when an earlier subscription row has expired', async () => {
    const database = makeFakeDatabase({
      selectResults: [
        [],
        [{ id: 33, userId: 70, agencyId: null, status: 'approved', isVerified: 0 }],
        [],
        [
          entitledLaunchSubscription('agent', '2000-01-01 00:00:00'),
          entitledLaunchSubscription('agent'),
        ],
        [{ role: 'agent' }],
      ],
      insertId: 918,
    });
    mockGetDb.mockResolvedValue(database);

    await expect(capturePublicLead(baseInput({ agentId: 33 }))).resolves.toMatchObject({
      success: true,
      leadId: 918,
      recipientType: 'agent',
      recipientId: 33,
    });
  });

  it('persists a signed-in property enquiry and its prospect identity in one transaction', async () => {
    const database = makeFakeDatabase({ selectResults: [[]], insertId: 913 });
    mockGetDb.mockResolvedValue(database);

    await capturePublicLead(
      baseInput({
        propertyId: 505,
        source: 'property_detail',
        sourceSurface: 'property_detail_contact_modal',
        leadSource: 'property_detail',
        authenticatedUserId: 701,
      }),
    );

    expect(database.transaction).toHaveBeenCalledTimes(1);
    expect(mockGetOrCreateProspectIdentity).toHaveBeenCalledWith(expect.anything(), 701);
    expect(database.insertValues).toHaveBeenCalledWith(
      expect.objectContaining({
        propertyId: 505,
        prospectIdentityId: 'prospect-identity-001',
      }),
    );
    expect(mockRecordProspectLeadAction).toHaveBeenCalledWith(
      expect.objectContaining({
        leadId: 913,
        prospectIdentityId: 'prospect-identity-001',
      }),
    );
  });

  it('fails closed when signed-in journey ownership cannot be persisted transactionally', async () => {
    const database = makeFakeDatabase({ selectResults: [[]] });
    delete (database as { transaction?: unknown }).transaction;
    mockGetDb.mockResolvedValue(database);

    await expect(
      capturePublicLead(baseInput({ propertyId: 505, authenticatedUserId: 701 })),
    ).rejects.toThrow('Atomic public lead persistence is unavailable.');
    expect(database.insertValues).not.toHaveBeenCalled();
    expect(mockRecordProspectLeadAction).not.toHaveBeenCalled();
  });

  it('blocks Development lead capture until reviewed Place assignments exist', async () => {
    await expect(capturePublicLead(baseInput({ developmentId: 77 }))).rejects.toMatchObject({
      code: 'PRECONDITION_FAILED',
      message: expect.stringContaining('reviewed Place assignments'),
    });
    expect(mockGetDb).not.toHaveBeenCalled();
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
    mockResolvePublicPropertyEligibility.mockResolvedValueOnce({
      publicAuthority: 'public_property_eligibility',
      property: { id: 505, developmentId: null, cataloguePublisherId: null },
      custody: {
        supplyOrigin: 'customer_managed',
        leadCustody: 'verified_customer_recipient',
        recipientType: 'agent',
        recipientId: 33,
        agentId: 33,
        agencyId: 44,
        developerId: null,
        leadDeliveryMethod: 'crm_export',
        brandLeadStatus: null,
        reason: null,
      },
    });
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
    mockResolvePublicPropertyEligibility.mockResolvedValueOnce({
      publicAuthority: 'public_property_eligibility',
      property: { id: 502, developmentId: null, cataloguePublisherId: null },
      custody: {
        supplyOrigin: 'customer_managed',
        leadCustody: 'verified_customer_recipient',
        recipientType: 'agency',
        recipientId: 44,
        agentId: null,
        agencyId: 44,
        developerId: null,
        leadDeliveryMethod: 'crm_export',
        brandLeadStatus: null,
        reason: null,
      },
    });
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

  it('rejects a projection-only property without a canonical approved source listing', async () => {
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

    await expect(capturePublicLead(baseInput({ propertyId: 503 }))).rejects.toMatchObject({
      code: 'NOT_FOUND',
    });
    expect(database.insertValues).not.toHaveBeenCalled();
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

  it('keeps a platform-curated property in custody rather than routing to public contact data', async () => {
    mockResolvePublicPropertyEligibility.mockResolvedValueOnce({
      publicAuthority: 'public_property_eligibility',
      property: { id: 501, developmentId: null, cataloguePublisherId: 13 },
      custody: {
        supplyOrigin: 'platform_curated',
        leadCustody: 'platform_managed',
        recipientType: 'manual',
        recipientId: null,
        agentId: null,
        agencyId: null,
        developerId: null,
        leadDeliveryMethod: 'manual',
        brandLeadStatus: 'captured',
        reason: 'Explicit Property Listify operations custody.',
      },
    });
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
            sourceListingId: 9001,
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

  it('does not turn optional post-capture analytics failure into a lost enquiry', async () => {
    const database = makeFakeDatabase({
      selectResults: [
        [],
        [
          {
            id: 501,
            status: 'published',
            developmentId: null,
            cataloguePublisherId: null,
            agentId: 33,
            sourceListingId: 9001,
            ownerId: 81,
          },
        ],
        [{ id: 33, userId: 70, agencyId: null, status: 'approved' }],
        [{ id: 70, role: 'agent' }],
        [],
      ],
      insertId: 905,
    });
    mockGetDb.mockResolvedValue(database);
    mockRecordProspectLeadAction.mockRejectedValueOnce(new Error('analytics unavailable'));

    await expect(
      capturePublicLead(
        baseInput({
          propertyId: 501,
          source: 'property_detail',
          sourceSurface: 'property_detail',
          leadSource: 'property_detail',
        }),
      ),
    ).resolves.toMatchObject({ leadId: 905, deliveryStatus: 'delivered' });
    expect(database.state.deliveryRows).toHaveLength(1);
  });

  it('resumes a missing delivery attempt on an idempotent replay', async () => {
    const replayLead = existingLead({ deliveryStatus: 'delivered' });
    const finalizedReplayLead = existingLead();
    const database = makeFakeDatabase({
      selectResults: [[replayLead], [finalizedReplayLead]],
      deliverySnapshots: [{ current: null, attempts: [] }],
    });
    mockGetDb.mockResolvedValue(database);

    await expect(
      capturePublicLead(
        baseInput({
          propertyId: 501,
          source: 'property_detail',
          sourceSurface: 'property_detail',
          leadSource: 'property_detail',
        }),
      ),
    ).resolves.toMatchObject({ leadId: 812, duplicate: true });
    expect(database.state.deliveryRows).toHaveLength(1);
    expect(database.state.deliveryRows[0]).toMatchObject({
      recipientType: 'agent',
      recipientId: 33,
    });
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

  it.each([
    ['name', { name: 'n'.repeat(201) }],
    ['email', { email: `${'e'.repeat(309)}@example.test` }],
    ['phone', { phone: '1'.repeat(51) }],
    ['message', { message: 'm'.repeat(5001) }],
    ['source', { source: 's'.repeat(101) }],
    ['lead source', { leadSource: 's'.repeat(101) }],
    ['source surface', { sourceSurface: 's'.repeat(101) }],
    ['referrer URL', { referrerUrl: 'r'.repeat(2049) }],
    ['UTM source', { utmSource: 'u'.repeat(101) }],
    ['UTM medium', { utmMedium: 'u'.repeat(101) }],
    ['UTM campaign', { utmCampaign: 'u'.repeat(101) }],
    ['capture identity', { captureRequestId: 'r'.repeat(129) }],
    ['consent version', { consent: { ...consent, version: 'v'.repeat(65) } }],
    ['consent source', { consent: { ...consent, source: 's'.repeat(101) } }],
    ['affordability timestamp', { affordabilityData: { calculatedAt: 't'.repeat(65) } }],
  ])('rejects an oversized %s before database access', async (_field, override) => {
    await expect(
      capturePublicLead(baseInput({ propertyId: 501, ...override })),
    ).rejects.toMatchObject({ code: 'BAD_REQUEST' });
    expect(mockGetDb).not.toHaveBeenCalled();
  });
});
