import { createHash } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { serviceProviderLocations } from '../../../drizzle/schema';

const { mockGetDb } = vi.hoisted(() => ({
  mockGetDb: vi.fn(),
}));

vi.mock('../../db', () => ({ getDb: mockGetDb }));

import {
  canTransitionServiceLeadStatus,
  hasProviderCoverage,
  isProviderDirectoryEligible,
  providerCoversLocation,
  servicesEngineService,
} from '../servicesEngineService';

function expectedRequestId(requesterUserId: number, requestKey: string) {
  return `sv1:${createHash('sha256')
    .update(JSON.stringify([requesterUserId, requestKey]))
    .digest('hex')}`;
}

function makeSelectQuery(rows: unknown[], lock = false) {
  const query = {
    from: vi.fn(),
    innerJoin: vi.fn(),
    leftJoin: vi.fn(),
    where: vi.fn(),
    limit: vi.fn(),
    for: vi.fn(),
  };
  query.from.mockReturnValue(query);
  query.innerJoin.mockReturnValue(query);
  query.leftJoin.mockReturnValue(query);
  query.where.mockReturnValue(query);
  query.limit.mockReturnValue(query);
  if (lock) {
    query.for.mockResolvedValue(rows);
  } else {
    query.limit.mockResolvedValue(rows);
  }
  return query;
}

function makeLeadRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 7,
    requesterUserId: 10,
    providerId: 20,

    serviceCategory: 'home_improvement',
    sourceSurface: 'directory',
    intentStage: 'general',
    propertyId: null,
    listingId: null,
    developmentId: null,
    geoProvince: 'Gauteng',
    geoCity: 'Johannesburg',
    geoSuburb: 'Sandton',
    notes: 'Need a repair before transfer.',
    contextJson: { serviceCode: 'plumbing' },
    status: 'new',
    createdAt: '2026-01-10 00:00:00',
    updatedAt: '2026-01-10 00:00:00',
    requesterName: 'Requester Name',
    requesterFirstName: 'Requester',
    requesterLastName: 'Name',
    requesterEmail: 'requester@example.com',
    requesterPhone: '+27 11 000 0000',
    providerUserId: 99,
    providerCompanyName: 'Provider Company',
    providerVerificationStatus: 'verified',
    providerHeadline: 'Property service provider',
    ...overrides,
  };
}

describe('Services V1 authority rules', () => {
  it('publishes only active, verified, directory-active providers', () => {
    expect(
      isProviderDirectoryEligible({
        isActive: true,
        verificationStatus: 'verified',
        directoryActive: true,
        subscriptionStatus: 'trial',
      }),
    ).toBe(true);
    expect(
      isProviderDirectoryEligible({
        isActive: true,
        verificationStatus: 'pending',
        directoryActive: true,
        subscriptionStatus: 'trial',
      }),
    ).toBe(false);
    expect(
      isProviderDirectoryEligible({
        isActive: true,
        verificationStatus: 'verified',
        directoryActive: true,
        subscriptionStatus: 'cancelled',
      }),
    ).toBe(false);
  });

  it('does not treat a blank location row as valid provider coverage', () => {
    expect(hasProviderCoverage({ province: null, city: null, suburb: null })).toBe(false);
    expect(hasProviderCoverage({ province: 'Gauteng', city: null, suburb: null })).toBe(true);
    expect(
      providerCoversLocation(
        [
          { province: null, city: null, suburb: null },
          { province: 'Gauteng', city: 'Johannesburg', suburb: null },
        ],
        { province: 'Gauteng', city: 'Johannesburg' },
      ),
    ).toBe(true);
    expect(
      providerCoversLocation([{ province: null, city: null, suburb: null }], {
        province: 'Gauteng',
      }),
    ).toBe(false);
  });

  it('matches all supplied location fields without widening to a broader area', () => {
    const locations = [{ province: 'Gauteng', city: 'Johannesburg', suburb: 'Sandton' }];

    expect(
      providerCoversLocation(locations, {
        province: 'Gauteng',
        city: 'Johannesburg',
        suburb: 'Sandton',
      }),
    ).toBe(true);
    expect(
      providerCoversLocation(locations, {
        province: 'Gauteng',
        city: 'Pretoria',
      }),
    ).toBe(false);
    expect(providerCoversLocation(locations, {})).toBe(true);
  });

  it('allows only explicit provider lead status transitions', () => {
    expect(canTransitionServiceLeadStatus('new', 'accepted')).toBe(true);
    expect(canTransitionServiceLeadStatus('accepted', 'quoted')).toBe(true);
    expect(canTransitionServiceLeadStatus('new', 'won')).toBe(false);
    expect(canTransitionServiceLeadStatus('new', 'new')).toBe(false);
    expect(canTransitionServiceLeadStatus('won', 'new')).toBe(false);
  });

  it('requires a response note for provider status updates', async () => {
    await expect(
      servicesEngineService.updateProviderLeadStatus({
        leadId: 7,
        providerId: 20,
        status: 'accepted',
        note: '   ',
      }),
    ).rejects.toThrow('response note');

    expect(mockGetDb).not.toHaveBeenCalled();
  });

  it('updates status and writes its event in one guarded transaction', async () => {
    const selectQuery = {
      from: vi.fn(),
      where: vi.fn(),
      limit: vi.fn(),
    };
    selectQuery.from.mockReturnValue(selectQuery);
    selectQuery.where.mockReturnValue(selectQuery);
    selectQuery.limit.mockResolvedValue([{ id: 7, providerId: 20, status: 'new' }]);

    const updateQuery = {
      set: vi.fn(),
    };
    updateQuery.set.mockReturnValue({
      where: vi.fn().mockResolvedValue({ affectedRows: 1 }),
    });
    const insertValues = vi.fn().mockResolvedValue([{ insertId: 9 }]);
    const transaction = {
      select: vi.fn(() => selectQuery),
      update: vi.fn(() => updateQuery),
      insert: vi.fn(() => ({ values: insertValues })),
    };
    mockGetDb.mockResolvedValue({
      transaction: vi.fn(async (callback: (tx: typeof transaction) => Promise<unknown>) =>
        callback(transaction),
      ),
    });

    await servicesEngineService.updateProviderLeadStatus({
      leadId: 7,
      providerId: 20,
      status: 'accepted',
      actorUserId: 99,
      note: 'We can help with this request.',
    });

    expect(transaction.insert).toHaveBeenCalledTimes(1);
    expect(insertValues).toHaveBeenCalledWith(
      expect.objectContaining({
        leadId: 7,
        eventType: 'accepted',
        payload: expect.objectContaining({ from: 'new', to: 'accepted' }),
      }),
    );
  });

  it('fails closed when a concurrent status update wins', async () => {
    const selectQuery = {
      from: vi.fn(),
      where: vi.fn(),
      limit: vi.fn(),
    };
    selectQuery.from.mockReturnValue(selectQuery);
    selectQuery.where.mockReturnValue(selectQuery);
    selectQuery.limit.mockResolvedValue([{ id: 7, providerId: 20, status: 'new' }]);
    const updateQuery = {
      set: vi.fn(),
    };
    updateQuery.set.mockReturnValue({
      where: vi.fn().mockResolvedValue({ affectedRows: 0 }),
    });
    const insert = vi.fn();
    const transaction = {
      select: vi.fn(() => selectQuery),
      update: vi.fn(() => updateQuery),
      insert,
    };
    mockGetDb.mockResolvedValue({
      transaction: vi.fn(async (callback: (tx: typeof transaction) => Promise<unknown>) =>
        callback(transaction),
      ),
    });

    await expect(
      servicesEngineService.updateProviderLeadStatus({
        leadId: 7,
        providerId: 20,
        status: 'accepted',
        note: 'We can help with this request.',
      }),
    ).rejects.toThrow('status changed');
    expect(insert).not.toHaveBeenCalled();
  });
});

describe('Services V1 provider edit preservation', () => {
  it('preserves service fields omitted from a compact editor update', async () => {
    const existing = [
      {
        id: 17,
        serviceCategory: 'home_improvement',
        serviceCode: 'plumbing',
        displayName: 'Old name',
        description: 'Existing description',
        minPrice: 250,
        maxPrice: 900,
        currency: 'ZAR',
        isActive: 0,
      },
    ];
    const updateSet = vi.fn(() => ({ where: vi.fn().mockResolvedValue({ affectedRows: 1 }) }));
    const update = vi.fn(() => ({ set: updateSet }));
    const insert = vi.fn();
    const tx = {
      select: vi.fn(() => ({
        from: vi.fn(() => ({
          where: vi.fn(() => ({ for: vi.fn().mockResolvedValue(existing) })),
        })),
      })),
      update,
      insert,
    };
    const db = {
      transaction: vi.fn(async callback => callback(tx)),
      select: vi.fn(() => ({
        from: vi.fn(() => ({
          where: vi.fn(() => ({ orderBy: vi.fn().mockResolvedValue(existing) })),
        })),
      })),
    };
    mockGetDb.mockResolvedValue(db);

    await servicesEngineService.replaceProviderServices(20, [
      {
        id: 17,
        category: 'home_improvement',
        code: 'plumbing',
        displayName: 'New name',
      },
    ]);

    expect(updateSet).toHaveBeenCalledWith(
      expect.objectContaining({
        displayName: 'New name',
        description: 'Existing description',
        minPrice: 250,
        maxPrice: 900,
        currency: 'ZAR',
        isActive: 0,
      }),
    );
    expect(insert).not.toHaveBeenCalled();
  });

  it('does not overwrite protected profile flags during a provider edit', async () => {
    const existingProfile = {
      providerId: 20,
      headline: 'Existing headline',
      bio: 'Existing bio',
      websiteUrl: null,
      contactEmail: 'provider@example.com',
      contactPhone: null,
      moderationTier: 'verified',
      directoryActive: 0,
      exploreCreatorActive: 0,
      dashboardActive: 0,
      metadata: null,
    };
    const selectQuery = {
      from: vi.fn(),
      where: vi.fn(),
      limit: vi.fn(),
    };
    selectQuery.from.mockReturnValue(selectQuery);
    selectQuery.where.mockReturnValue(selectQuery);
    selectQuery.limit.mockResolvedValue([existingProfile]);
    const onDuplicateKeyUpdate = vi.fn().mockResolvedValue({ affectedRows: 1 });
    const values = vi.fn(() => ({ onDuplicateKeyUpdate }));
    const insert = vi.fn(() => ({ values }));
    mockGetDb.mockResolvedValue({
      select: vi.fn(() => selectQuery),
      insert,
    });

    await servicesEngineService.upsertProviderProfile(20, { headline: 'Updated headline' });

    const updateSet = onDuplicateKeyUpdate.mock.calls[0]?.[0]?.set;
    expect(updateSet).not.toHaveProperty('moderationTier');
    expect(updateSet).not.toHaveProperty('directoryActive');
    expect(updateSet).not.toHaveProperty('exploreCreatorActive');
    expect(updateSet).not.toHaveProperty('dashboardActive');
  });

  it('preserves location fields omitted from a compact editor update', async () => {
    const existing = [
      {
        id: 23,
        countryCode: 'ZA',
        province: 'Gauteng',
        city: 'Johannesburg',
        suburb: 'Sandton',
        postalCode: '2196',
        radiusKm: 40,
        isPrimary: 1,
      },
    ];
    const updateSet = vi.fn(() => ({ where: vi.fn().mockResolvedValue({ affectedRows: 1 }) }));
    const update = vi.fn(() => ({ set: updateSet }));
    const insert = vi.fn();
    const existingQuery = makeSelectQuery(existing, true);
    const tx = {
      select: vi
        .fn()
        .mockReturnValueOnce(makeSelectQuery([{ id: 20 }], true))
        .mockReturnValueOnce(existingQuery),
      update,
      insert,
    };
    const db = {
      transaction: vi.fn(async callback => callback(tx)),
      select: vi.fn(() => ({
        from: vi.fn(() => ({
          where: vi.fn(() => ({ orderBy: vi.fn().mockResolvedValue(existing) })),
        })),
      })),
    };
    mockGetDb.mockResolvedValue(db);

    await servicesEngineService.replaceProviderLocations(20, [
      {
        id: 23,
        province: 'Gauteng',
        city: 'Johannesburg',
        suburb: 'Sandton',
      },
    ]);

    expect(updateSet).toHaveBeenCalledWith(
      expect.objectContaining({
        countryCode: 'ZA',
        postalCode: '2196',
        radiusKm: 40,
        isPrimary: 1,
      }),
    );
    expect(insert).not.toHaveBeenCalled();
  });

  it('rejects an ID update that collides with an omitted location tuple', async () => {
    const existing = [
      {
        id: 23,
        countryCode: 'ZA',
        province: 'Gauteng',
        city: 'Johannesburg',
        suburb: 'Sandton',
        postalCode: '2196',
        radiusKm: 40,
        isPrimary: 1,
      },
      {
        id: 24,
        countryCode: 'ZA',
        province: 'Gauteng',
        city: 'Pretoria',
        suburb: 'Arcadia',
        postalCode: '0008',
        radiusKm: 20,
        isPrimary: 0,
      },
    ];
    const update = vi.fn(() => ({ set: vi.fn() }));
    const existingQuery = makeSelectQuery(existing, true);
    const tx = {
      select: vi
        .fn()
        .mockReturnValueOnce(makeSelectQuery([{ id: 20 }], true))
        .mockReturnValueOnce(existingQuery),
      update,
      insert: vi.fn(),
    };
    mockGetDb.mockResolvedValue({
      transaction: vi.fn(async callback => callback(tx)),
      select: vi.fn(() => ({
        from: vi.fn(() => ({
          where: vi.fn(() => ({ orderBy: vi.fn().mockResolvedValue(existing) })),
        })),
      })),
    });

    await expect(
      servicesEngineService.replaceProviderLocations(20, [
        {
          id: 23,
          province: 'Gauteng',
          city: 'Pretoria',
          suburb: 'Arcadia',
        },
      ]),
    ).rejects.toThrow('Coverage areas must be unique');

    expect(update).not.toHaveBeenCalled();
  });

  it('matches an ID-less location update by the exact geographic tuple', async () => {
    const existing = [
      {
        id: 23,
        countryCode: 'ZA',
        province: 'Gauteng',
        city: 'Johannesburg',
        suburb: 'Sandton',
        postalCode: '2196',
        radiusKm: 40,
        isPrimary: 1,
      },
      {
        id: 24,
        countryCode: 'ZA',
        province: 'Gauteng',
        city: 'Pretoria',
        suburb: 'Arcadia',
        postalCode: '0008',
        radiusKm: 20,
        isPrimary: 0,
      },
    ];
    const where = vi.fn().mockResolvedValue({ affectedRows: 1 });
    const updateSet = vi.fn(() => ({ where }));
    const update = vi.fn(() => ({ set: updateSet }));
    const insert = vi.fn();
    const existingQuery = makeSelectQuery(existing, true);
    const tx = {
      select: vi
        .fn()
        .mockReturnValueOnce(makeSelectQuery([{ id: 20 }], true))
        .mockReturnValueOnce(existingQuery),
      update,
      insert,
    };
    const db = {
      transaction: vi.fn(async callback => callback(tx)),
      select: vi.fn(() => ({
        from: vi.fn(() => ({
          where: vi.fn(() => ({ orderBy: vi.fn().mockResolvedValue(existing) })),
        })),
      })),
    };
    mockGetDb.mockResolvedValue(db);

    await servicesEngineService.replaceProviderLocations(20, [
      {
        province: 'Gauteng',
        city: 'Pretoria',
        suburb: 'Arcadia',
        postalCode: '0008',
        isPrimary: true,
      },
    ]);

    expect(update).toHaveBeenCalledTimes(1);
    expect(update).toHaveBeenCalledWith(serviceProviderLocations);
    expect(where).toHaveBeenCalledWith(eq(serviceProviderLocations.id, 24));
    expect(insert).not.toHaveBeenCalled();
  });

  it('rejects an empty location replacement instead of deleting existing coverage', async () => {
    mockGetDb.mockResolvedValue({});

    await expect(servicesEngineService.replaceProviderLocations(20, [])).rejects.toThrow(
      'At least one valid coverage area is required',
    );
  });
});

describe('Services V1 lead privacy', () => {
  beforeEach(() => {
    const query = {
      from: vi.fn(),
      leftJoin: vi.fn(),
      where: vi.fn(),
      orderBy: vi.fn(),
      limit: vi.fn(),
    };
    query.from.mockReturnValue(query);
    query.leftJoin.mockReturnValue(query);
    query.where.mockReturnValue(query);
    query.orderBy.mockReturnValue(query);
    query.limit.mockResolvedValue([makeLeadRow()]);
    mockGetDb.mockResolvedValue({ select: vi.fn(() => query) });
  });
  it('detects assigned request custody for an existing provider lead', async () => {
    const query = makeSelectQuery([{ id: 7 }]);
    mockGetDb.mockResolvedValue({ select: vi.fn(() => query) });

    await expect(servicesEngineService.hasProviderLeads(20)).resolves.toBe(true);
  });
  it('does not expose requester contact to an unrelated provider', async () => {
    const profileSpy = vi

      .spyOn(servicesEngineService, 'getProviderPublicProfile')
      .mockResolvedValue({
        providerId: 20,
        companyName: 'Provider Company',
        logoUrl: null,
        services: [],
        locations: [],
        reviews: [],
      } as never);

    const result = await servicesEngineService.getServiceLeadForViewer({
      leadId: 7,
      userId: 99,
      role: 'service_provider',
    });

    expect(result.requester).toEqual({
      name: 'Requester Name',
      email: 'requester@example.com',
      phone: '+27 11 000 0000',
    });
    profileSpy.mockRestore();
  });

  it('does not expose an unpublished provider projection to the requester', async () => {
    const profileSpy = vi
      .spyOn(servicesEngineService, 'getProviderPublicProfile')
      .mockResolvedValue(null as never);

    const result = await servicesEngineService.getServiceLeadForViewer({
      leadId: 7,
      userId: 10,
      role: 'visitor',
    });

    expect(result.provider).toEqual({
      providerId: 20,
      companyName: 'Provider Company',
    });
    profileSpy.mockRestore();
  });

  it('does not expose requester contact to an unrelated provider', async () => {
    const profileSpy = vi
      .spyOn(servicesEngineService, 'getProviderPublicProfile')
      .mockResolvedValue({
        providerId: 20,
        companyName: 'Provider Company',
        logoUrl: null,
        services: [],
        locations: [],
        reviews: [],
      } as never);

    await expect(
      servicesEngineService.getServiceLeadForViewer({
        leadId: 7,
        userId: 100,
        role: 'service_provider',
      }),
    ).rejects.toThrow('Forbidden');
    profileSpy.mockRestore();
  });

  it('requires the service-provider role for a linked provider identity', async () => {
    await expect(
      servicesEngineService.getServiceLeadForViewer({
        leadId: 7,
        userId: 99,
        role: 'agent',
      }),
    ).rejects.toThrow('Forbidden');
  });
});

describe('Services V1 enquiry attribution', () => {
  it('creates provider identity, profile, and subscription in one transaction', async () => {
    const userLookup = vi
      .spyOn(servicesEngineService, 'getProviderByUserId')
      .mockResolvedValue(null as never);
    const providerLookup = vi
      .spyOn(servicesEngineService, 'getProviderById')
      .mockResolvedValue({ id: 33 } as never);
    const values = vi.fn().mockResolvedValue([{ insertId: 33 }]);
    const transaction = {
      insert: vi.fn(() => ({ values })),
    };
    mockGetDb.mockResolvedValue({
      transaction: vi.fn(async (callback: (tx: typeof transaction) => Promise<unknown>) =>
        callback(transaction),
      ),
    });

    await servicesEngineService.upsertProviderIdentity({
      userId: 10,
      companyName: 'Acme Plumbing',
    });

    expect(transaction.insert).toHaveBeenCalledTimes(3);
    expect(values).toHaveBeenCalledTimes(3);
    expect(providerLookup).toHaveBeenCalledWith(33);
    userLookup.mockRestore();
    providerLookup.mockRestore();
  });

  it('writes one lead to the selected eligible provider', async () => {
    const values = vi.fn().mockResolvedValue([{ insertId: 55 }]);
    const insert = vi.fn(() => ({ values }));
    const requesterQuery = makeSelectQuery([{ id: 10 }], true);
    const existingQuery = makeSelectQuery([], true);
    const providerLockQuery = makeSelectQuery([{ id: 20 }], true);
    const profileLockQuery = makeSelectQuery([{ id: 20 }], true);
    const providerQuery = makeSelectQuery([
      {
        isActive: 1,
        verificationStatus: 'verified',
        directoryActive: 1,
        subscriptionStatus: 'trial',
      },
    ]);
    const servicesQuery = makeSelectQuery(
      [{ category: 'home_improvement', code: 'Plumbing', isActive: 1 }],
      true,
    );
    const locationsQuery = makeSelectQuery(
      [{ province: 'Gauteng', city: 'Johannesburg', suburb: 'Sandton' }],
      true,
    );
    const preflightQuery = makeSelectQuery([]);

    mockGetDb.mockResolvedValue({
      select: vi.fn(() => preflightQuery),
      transaction: async (
        callback: (tx: {
          select: ReturnType<typeof vi.fn>;
          insert: typeof insert;
        }) => Promise<unknown>,
      ) =>
        callback({
          select: vi
            .fn()
            .mockReturnValueOnce(requesterQuery)
            .mockReturnValueOnce(existingQuery)
            .mockReturnValueOnce(providerLockQuery)
            .mockReturnValueOnce(profileLockQuery)
            .mockReturnValueOnce(providerQuery)
            .mockReturnValueOnce(servicesQuery)
            .mockReturnValueOnce(locationsQuery),
          insert,
        }),
    });

    const profileSpy = vi
      .spyOn(servicesEngineService, 'getProviderPublicProfile')
      .mockResolvedValue({
        providerId: 20,
        companyName: 'Provider Company',
        services: [{ category: 'home_improvement', code: 'Plumbing', displayName: 'Plumbing' }],

        locations: [{ province: 'Gauteng', city: 'Johannesburg', suburb: 'Sandton' }],
        reviews: [],
      } as never);

    const result = await servicesEngineService.createLeadFromContext({
      requesterUserId: 10,
      requestKey: 'service-request-key-123456',
      providerId: 20,

      category: 'home_improvement',
      sourceSurface: 'directory',
      intentStage: 'general',
      province: 'Gauteng',
      city: 'Johannesburg',

      suburb: 'Sandton',
      serviceCode: 'plumbing',
      notes: 'Please call after work hours.',
    });

    expect(result).toMatchObject({
      leadId: 55,
      leadIds: [55],
      providerId: 20,
      providerIds: [20],
      unmatched: false,
    });
    expect(insert).toHaveBeenCalledTimes(2);
    expect(values.mock.calls[0][0]).toEqual(
      expect.objectContaining({
        requestId: expectedRequestId(10, 'service-request-key-123456'),

        providerId: 20,
        requesterUserId: 10,
        serviceCategory: 'home_improvement',
        contextJson: expect.objectContaining({ serviceCode: 'Plumbing' }),
        billingEligible: 0,
      }),
    );

    profileSpy.mockRestore();
  });

  it('replays a matching request key without creating a second lead', async () => {
    const requesterQuery = makeSelectQuery([{ id: 10 }], true);
    const existingQuery = makeSelectQuery(
      [
        {
          id: 55,
          requesterUserId: 10,
          providerId: 20,
          serviceCategory: 'home_improvement',
          sourceSurface: 'directory',
          intentStage: 'general',
          contextJson: {
            serviceCode: 'Plumbing',
            requestKey: 'service-request-key-123456',
          },

          notes: 'Please call after work hours.',
          geoProvince: 'gauteng',
          geoCity: 'johannesburg',
          geoSuburb: 'sandton',
          propertyId: null,
          listingId: null,
          developmentId: null,
        },
      ],
      true,
    );

    const preflightQuery = makeSelectQuery([]);
    const transaction = vi.fn(
      async (callback: (tx: { select: ReturnType<typeof vi.fn> }) => Promise<unknown>) =>
        callback({
          select: vi.fn().mockReturnValueOnce(requesterQuery).mockReturnValueOnce(existingQuery),
        }),
    );
    mockGetDb.mockResolvedValue({
      select: vi.fn(() => preflightQuery),
      transaction,
    });

    const profileSpy = vi
      .spyOn(servicesEngineService, 'getProviderPublicProfile')
      .mockResolvedValue({
        providerId: 20,
        companyName: 'Provider Company',
        services: [{ category: 'home_improvement', code: 'Plumbing', displayName: 'Plumbing' }],
        locations: [{ province: 'Gauteng', city: 'Johannesburg', suburb: 'Sandton' }],
        reviews: [],
      } as never);

    const result = await servicesEngineService.createLeadFromContext({
      requesterUserId: 10,
      requestKey: 'service-request-key-123456',
      providerId: 20,
      category: 'home_improvement',
      sourceSurface: 'directory',
      intentStage: 'general',
      province: 'Gauteng',
      city: 'Johannesburg',
      suburb: 'Sandton',
      serviceCode: 'plumbing',
      notes: 'Please call after work hours.',
    });

    expect(result.leadId).toBe(55);
    expect(transaction).toHaveBeenCalledTimes(1);
    expect(existingQuery.for).toHaveBeenCalledWith('update');

    profileSpy.mockRestore();
  });
  it.each(['sourceDetail', 'reasonKey'] as const)(
    'rejects a retry when %s changes',
    async changedKey => {
      const existingQuery = makeSelectQuery([
        makeLeadRow({
          contextJson: {
            serviceCode: 'plumbing',
            sourceDetail: 'property_detail',
            reasonKey: 'original_reason',
            propertyLinked: false,
          },
        }),
      ]);
      mockGetDb.mockResolvedValue({ select: vi.fn(() => existingQuery) });

      const context =
        changedKey === 'sourceDetail'
          ? {
              sourceDetail: 'changed_source',
              reasonKey: 'original_reason',
              propertyLinked: false,
            }
          : {
              sourceDetail: 'property_detail',
              reasonKey: 'changed_reason',
              propertyLinked: false,
            };

      await expect(
        servicesEngineService.createLeadFromContext({
          requesterUserId: 10,
          requestKey: 'service-request-key-123456',
          providerId: 20,
          category: 'home_improvement',
          sourceSurface: 'directory',
          intentStage: 'general',
          province: 'Gauteng',
          city: 'Johannesburg',
          suburb: 'Sandton',
          serviceCode: 'plumbing',
          notes: 'Need a repair before transfer.',
          context,
        }),
      ).rejects.toThrow('Request key has already been used');
    },
  );

  it('rejects a retry when only propertyLinked changes', async () => {
    const existingQuery = makeSelectQuery([
      makeLeadRow({
        propertyId: 99,
        contextJson: {
          serviceCode: 'plumbing',
          propertyLinked: false,
        },
      }),
    ]);
    mockGetDb.mockResolvedValue({ select: vi.fn(() => existingQuery) });

    await expect(
      servicesEngineService.createLeadFromContext({
        requesterUserId: 10,
        requestKey: 'service-request-key-123456',
        providerId: 20,
        category: 'home_improvement',
        sourceSurface: 'directory',
        intentStage: 'general',
        province: 'Gauteng',
        city: 'Johannesburg',
        suburb: 'Sandton',
        serviceCode: 'plumbing',
        notes: 'Need a repair before transfer.',
        propertyId: 99,
      }),
    ).rejects.toThrow('Request key has already been used');
  });

  it('requires a project description and a request area', async () => {
    mockGetDb.mockResolvedValue({});

    await expect(
      servicesEngineService.createLeadFromContext({
        requesterUserId: 10,
        requestKey: 'service-request-key-123456',
        providerId: 20,
        category: 'home_improvement',
        sourceSurface: 'directory',
        intentStage: 'general',
        serviceCode: 'plumbing',
        notes: '   ',

        province: 'Gauteng',
      }),
    ).rejects.toThrow('project description');

    await expect(
      servicesEngineService.createLeadFromContext({
        requesterUserId: 10,
        requestKey: 'service-request-key-123456',
        providerId: 20,
        category: 'home_improvement',
        sourceSurface: 'directory',
        intentStage: 'general',
        serviceCode: 'plumbing',
        notes: 'Need a repair.',
      }),
    ).rejects.toThrow('request area');
  });

  it('rejects a request without an explicitly selected provider', async () => {
    const insert = vi.fn();
    mockGetDb.mockResolvedValue({ insert });

    await expect(
      servicesEngineService.createLeadFromContext({
        requesterUserId: 10,
        requestKey: 'service-request-key-123456',
        providerId: 0,

        category: 'home_improvement',
        sourceSurface: 'directory',
        intentStage: 'general',
        province: 'Gauteng',
        serviceCode: 'plumbing',
        notes: 'Need a repair.',
      }),
    ).rejects.toThrow('Select a provider');

    expect(insert).not.toHaveBeenCalled();
  });
});
