import { createHash } from 'node:crypto';
import { desc, eq } from 'drizzle-orm';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  serviceLeads,
  serviceProviderLocations,
  serviceProviderProfiles,
  serviceProviderServices,
} from '../../../drizzle/schema';

const { mockGetDb } = vi.hoisted(() => ({
  mockGetDb: vi.fn(),
}));

vi.mock('../../db', () => ({ getDb: mockGetDb }));

import {
  canTransitionServiceLeadStatus,
  hasProviderCoverage,
  isProviderDirectoryEligible,
  providerCoversLocation,
  SERVICES_DIRECTORY_CANDIDATE_SCAN_LIMIT,
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

/**
 * A drizzle-shaped query double that chains every builder method and resolves the
 * supplied rows when awaited, so one helper covers base reads, ordered reads,
 * and `for('update')` reads regardless of which method ends the chain.
 */
function makeQuery(rows: unknown[] = []) {
  const query: Record<string, ReturnType<typeof vi.fn>> = {
    from: vi.fn(),
    innerJoin: vi.fn(),
    leftJoin: vi.fn(),
    where: vi.fn(),
    orderBy: vi.fn(),
    limit: vi.fn(),
    offset: vi.fn(),
    for: vi.fn(),
  };
  for (const key of Object.keys(query)) {
    query[key]!.mockReturnValue(query);
  }
  query.then = (resolve: (value: unknown) => unknown, reject?: (reason: unknown) => unknown) =>
    Promise.resolve(rows).then(resolve, reject);
  return query;
}

function makeUpdateMock() {
  const where = vi.fn().mockResolvedValue({ affectedRows: 1 });
  const set = vi.fn(() => ({ where }));
  const update = vi.fn(() => ({ set }));
  return { update, set, where };
}

function makeDeleteMock() {
  const where = vi.fn().mockResolvedValue({ affectedRows: 1 });
  const deleteFn = vi.fn(() => ({ where }));
  return { delete: deleteFn, where };
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

  it('rejects two submitted coverage rows that claim the same geographic tuple', async () => {
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
    const deleteFn = vi.fn(() => ({ where: vi.fn() }));
    const existingQuery = makeSelectQuery(existing, true);
    const tx = {
      select: vi
        .fn()
        .mockReturnValueOnce(makeSelectQuery([{ id: 20 }], true))
        .mockReturnValueOnce(existingQuery),
      update,
      delete: deleteFn,
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
        {
          id: 24,
          province: 'Gauteng',
          city: 'Pretoria',
          suburb: 'Arcadia',
        },
      ]),
    ).rejects.toThrow('Coverage areas must be unique');

    expect(update).not.toHaveBeenCalled();
    expect(deleteFn).not.toHaveBeenCalled();
  });

  it('moves coverage onto a tuple whose previous row is being removed', async () => {
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
    const deleteWhere = vi.fn().mockResolvedValue({ affectedRows: 1 });
    const deleteFn = vi.fn(() => ({ where: deleteWhere }));
    const insert = vi.fn();
    const existingQuery = makeSelectQuery(existing, true);
    const tx = {
      select: vi
        .fn()
        .mockReturnValueOnce(makeSelectQuery([{ id: 20 }], true))
        .mockReturnValueOnce(existingQuery),
      update,
      delete: deleteFn,
      insert,
    };
    mockGetDb.mockResolvedValue({
      transaction: vi.fn(async callback => callback(tx)),
      select: vi.fn(() => ({
        from: vi.fn(() => ({
          where: vi.fn(() => ({ orderBy: vi.fn().mockResolvedValue(existing) })),
        })),
      })),
    });

    await servicesEngineService.replaceProviderLocations(20, [
      {
        id: 23,
        province: 'Gauteng',
        city: 'Pretoria',
        suburb: 'Arcadia',
      },
    ]);

    expect(update).toHaveBeenCalledTimes(1);
    expect(updateSet).toHaveBeenCalledWith(
      expect.objectContaining({ city: 'Pretoria', suburb: 'Arcadia' }),
    );
    expect(deleteFn).toHaveBeenCalledWith(serviceProviderLocations);
    expect(deleteWhere).toHaveBeenCalledWith(eq(serviceProviderLocations.id, 24));
    expect(insert).not.toHaveBeenCalled();
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
    const deleteWhere = vi.fn().mockResolvedValue({ affectedRows: 1 });
    const deleteFn = vi.fn(() => ({ where: deleteWhere }));
    const insert = vi.fn();
    const existingQuery = makeSelectQuery(existing, true);
    const tx = {
      select: vi
        .fn()
        .mockReturnValueOnce(makeSelectQuery([{ id: 20 }], true))
        .mockReturnValueOnce(existingQuery),
      update,
      delete: deleteFn,
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
    // The row left out of the canonical set stops being published coverage.
    expect(deleteFn).toHaveBeenCalledTimes(1);
    expect(deleteWhere).toHaveBeenCalledWith(eq(serviceProviderLocations.id, 23));
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

    // A newly onboarded provider identity starts unreviewed and unpublished.
    const insertedProfiles = values.mock.calls
      .map(call => call[0])
      .filter(value => value && 'directoryActive' in value);
    expect(insertedProfiles).toHaveLength(1);
    expect(insertedProfiles[0]).toMatchObject({
      providerId: 33,
      directoryActive: 0,
      moderationTier: 'basic',
    });
    const insertedPartners = values.mock.calls
      .map(call => call[0])
      .filter(value => value && 'verificationStatus' in value);
    expect(insertedPartners).toHaveLength(1);
    expect(insertedPartners[0]).toMatchObject({
      userId: 10,
      verificationStatus: 'pending',
      isActive: 1,
    });
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

const READY_PUBLICATION_BASE_ROW = {
  providerId: 20,
  companyName: 'Provider Company',
  verificationStatus: 'pending',
  isActive: 1,
  profileId: 21,
  headline: 'Property service provider',
  bio: 'A truthful provider biography.',
  contactEmail: 'provider@example.com',
  contactPhone: null,
  directoryActive: 0,
  subscriptionStatus: 'trial',
};

function mockReadinessDb(baseRow: Record<string, unknown>, services: unknown[], locations: unknown[]) {
  const readinessQueries = [makeQuery([baseRow]), makeQuery(services), makeQuery(locations)];
  const dbSelect = vi.fn(() => readinessQueries.shift() ?? makeQuery([]));
  return { dbSelect };
}

describe('Services V1 reviewed publication authority', () => {
  it('keeps a newly onboarded provider out of the public directory', async () => {
    const { dbSelect } = mockReadinessDb(READY_PUBLICATION_BASE_ROW, [{ isActive: 1 }], [
      { province: 'Gauteng', city: 'Johannesburg', suburb: 'Sandton' },
    ]);
    mockGetDb.mockResolvedValue({ select: dbSelect });

    const readiness = await servicesEngineService.getProviderPublicationReadiness(20);

    expect(readiness).toMatchObject({
      providerId: 20,
      verificationStatus: 'pending',
      directoryActive: false,
      readyForPublication: true,
      isPublished: false,
      publicationDriftDetected: false,
      blockers: [],
    });
    expect(
      isProviderDirectoryEligible({
        verificationStatus: readiness.verificationStatus,
        isActive: readiness.isActive,
        directoryActive: readiness.directoryActive,
        subscriptionStatus: readiness.subscriptionStatus,
      }),
    ).toBe(false);
  });

  it('reports every readiness blocker a reviewer must resolve', async () => {
    const { dbSelect } = mockReadinessDb(
      {
        ...READY_PUBLICATION_BASE_ROW,
        profileId: null,
        headline: null,
        bio: null,
        contactEmail: null,
        contactPhone: null,
        subscriptionStatus: 'cancelled',
      },
      [{ isActive: 0 }],
      [{ province: null, city: null, suburb: null }],
    );
    mockGetDb.mockResolvedValue({ select: dbSelect });

    const readiness = await servicesEngineService.getProviderPublicationReadiness(20);

    expect(readiness.readyForPublication).toBe(false);
    expect(readiness.blockers).toEqual([
      'profile_missing',
      'no_active_service',
      'no_valid_coverage',
      'subscription_ineligible',
    ]);
  });

  it('fails closed when publication readiness is absent', async () => {
    const { update, set } = makeUpdateMock();
    const insertValues = vi.fn().mockResolvedValue({});
    const tx = {
      select: vi
        .fn()
        .mockReturnValueOnce(makeQuery([{ id: 20 }]))
        .mockReturnValueOnce(makeQuery([READY_PUBLICATION_BASE_ROW]))
        .mockReturnValueOnce(makeQuery([{ isActive: 0 }]))
        .mockReturnValueOnce(makeQuery([{ province: 'Gauteng' }])),
      update,
      insert: vi.fn(() => ({ values: insertValues })),
    };
    mockGetDb.mockResolvedValue({
      transaction: vi.fn(async (callback: (tx: typeof tx) => Promise<unknown>) => callback(tx)),
    });

    await expect(
      servicesEngineService.reviewProviderPublication({
        providerId: 20,
        decision: 'publish',
        actorUserId: 5,
      }),
    ).rejects.toThrow('Provider is not ready for publication: no_active_service');

    expect(update).not.toHaveBeenCalled();
    expect(insertValues).not.toHaveBeenCalled();
    expect(set).not.toHaveBeenCalled();
  });

  it('performs the reviewed publication transition and records it in the audit trail', async () => {
    const { update, set } = makeUpdateMock();
    const insertValues = vi.fn().mockResolvedValue({});
    const tx = {
      select: vi
        .fn()
        .mockReturnValueOnce(makeQuery([{ id: 20 }]))
        .mockReturnValueOnce(makeQuery([READY_PUBLICATION_BASE_ROW]))
        .mockReturnValueOnce(makeQuery([{ isActive: 1 }]))
        .mockReturnValueOnce(makeQuery([{ province: 'Gauteng' }])),
      update,
      insert: vi.fn(() => ({ values: insertValues })),
    };
    mockGetDb.mockResolvedValue({
      transaction: vi.fn(async (callback: (tx: typeof tx) => Promise<unknown>) => callback(tx)),
    });

    const result = await servicesEngineService.reviewProviderPublication({
      providerId: 20,
      decision: 'publish',
      actorUserId: 5,
      notes: 'Identity documents checked.',
    });

    expect(result).toEqual({
      providerId: 20,
      decision: 'publish',
      changed: true,
      verificationStatus: 'verified',
      directoryActive: true,
      isPublished: true,
    });
    expect(set).toHaveBeenNthCalledWith(1, { verificationStatus: 'verified' });
    expect(set).toHaveBeenNthCalledWith(2, { directoryActive: 1 });
    expect(insertValues).toHaveBeenCalledTimes(1);
    const auditEntry = insertValues.mock.calls[0][0];
    expect(auditEntry).toMatchObject({
      userId: 5,
      action: 'services.provider_publication_reviewed',
      targetType: 'service_provider',
      targetId: 20,
    });
    const auditMetadata = JSON.parse(String(auditEntry.metadata));
    expect(auditMetadata).toMatchObject({
      decision: 'publish',
      changed: true,
      notes: 'Identity documents checked.',
      before: { verificationStatus: 'pending', directoryActive: false },
      after: { verificationStatus: 'verified', directoryActive: true },
    });
  });

  it('rejects a provider and clears directory publication in the same transition', async () => {
    const { update, set } = makeUpdateMock();
    const insertValues = vi.fn().mockResolvedValue({});
    const tx = {
      select: vi
        .fn()
        .mockReturnValueOnce(makeQuery([{ id: 20 }]))
        .mockReturnValueOnce(
          makeQuery([{ ...READY_PUBLICATION_BASE_ROW, verificationStatus: 'verified', directoryActive: 1 }]),
        )
        .mockReturnValueOnce(makeQuery([{ isActive: 1 }]))
        .mockReturnValueOnce(makeQuery([{ province: 'Gauteng' }])),
      update,
      insert: vi.fn(() => ({ values: insertValues })),
    };
    mockGetDb.mockResolvedValue({
      transaction: vi.fn(async (callback: (tx: typeof tx) => Promise<unknown>) => callback(tx)),
    });

    const result = await servicesEngineService.reviewProviderPublication({
      providerId: 20,
      decision: 'reject',
      actorUserId: 5,
    });

    expect(result).toMatchObject({
      decision: 'reject',
      verificationStatus: 'rejected',
      directoryActive: false,
      isPublished: false,
    });
    expect(set).toHaveBeenNthCalledWith(1, { verificationStatus: 'rejected' });
    expect(set).toHaveBeenNthCalledWith(2, { directoryActive: 0 });
  });

  it('unpublishes without rejecting the canonical partner', async () => {
    const { update, set } = makeUpdateMock();
    const insertValues = vi.fn().mockResolvedValue({});
    const tx = {
      select: vi
        .fn()
        .mockReturnValueOnce(makeQuery([{ id: 20 }]))
        .mockReturnValueOnce(
          makeQuery([{ ...READY_PUBLICATION_BASE_ROW, verificationStatus: 'verified', directoryActive: 1 }]),
        )
        .mockReturnValueOnce(makeQuery([{ isActive: 1 }]))
        .mockReturnValueOnce(makeQuery([{ province: 'Gauteng' }])),
      update,
      insert: vi.fn(() => ({ values: insertValues })),
    };
    mockGetDb.mockResolvedValue({
      transaction: vi.fn(async (callback: (tx: typeof tx) => Promise<unknown>) => callback(tx)),
    });

    const result = await servicesEngineService.reviewProviderPublication({
      providerId: 20,
      decision: 'unpublish',
      actorUserId: 5,
    });

    expect(result).toMatchObject({
      decision: 'unpublish',
      verificationStatus: 'verified',
      directoryActive: false,
      isPublished: false,
    });
    expect(update).toHaveBeenCalledTimes(1);
    expect(update).toHaveBeenCalledWith(serviceProviderProfiles);
    expect(set).toHaveBeenCalledTimes(1);
    expect(set).toHaveBeenCalledWith({ directoryActive: 0 });
  });

  it('refuses a publication review without an accountable operator', async () => {
    mockGetDb.mockResolvedValue({});

    await expect(
      servicesEngineService.reviewProviderPublication({
        providerId: 20,
        decision: 'publish',
        actorUserId: 0,
      }),
    ).rejects.toThrow('A reviewing operator is required');
  });

  it('surfaces a published provider in the public profile and directory', async () => {
    const publicProfileDb = {
      select: vi
        .fn()
        .mockReturnValueOnce(
          makeQuery([
            {
              ...READY_PUBLICATION_BASE_ROW,
              verificationStatus: 'verified',
              directoryActive: 1,
              description: 'Provider description',
              logoUrl: null,
              websiteUrl: 'https://provider.example.com',
            },
          ]),
        )
        .mockReturnValueOnce(
          makeQuery([
            {
              id: 31,
              category: 'home_improvement',
              code: 'plumbing',
              displayName: 'Plumbing',
              description: null,
              minPrice: null,
              maxPrice: null,
              currency: 'ZAR',
              isActive: 1,
            },
          ]),
        )
        .mockReturnValueOnce(
          makeQuery([
            {
              id: 41,
              countryCode: 'ZA',
              province: 'Gauteng',
              city: 'Johannesburg',
              suburb: 'Sandton',
              postalCode: null,
              radiusKm: 25,
              isPrimary: 1,
            },
          ]),
        )
        .mockReturnValueOnce(makeQuery([])),
    };
    mockGetDb.mockResolvedValue(publicProfileDb);

    const profile = await servicesEngineService.getProviderPublicProfile(20);

    expect(profile).toMatchObject({
      providerId: 20,
      isPublished: true,
      publicationStatus: 'published',
      services: [{ code: 'plumbing' }],
      locations: [{ suburb: 'Sandton' }],
    });

    const directoryDb = {
      select: vi
        .fn()
        .mockReturnValueOnce(
          makeQuery([
            {
              providerId: 20,
              companyName: 'Provider Company',
              logoUrl: null,
              verificationStatus: 'verified',
              trustScore: '50.00',
              isActive: 1,
              headline: 'Property service provider',
              bio: 'A truthful provider biography.',
              moderationTier: 'verified',
              averageRating: '0.00',
              reviewCount: 0,
              subscriptionTier: 'directory',
              subscriptionStatus: 'trial',
            },
          ]),
        )
        .mockReturnValueOnce(
          makeQuery([
            {
              providerId: 20,
              category: 'home_improvement',
              code: 'plumbing',
              displayName: 'Plumbing',
              minPrice: null,
              maxPrice: null,
            },
          ]),
        )
        .mockReturnValueOnce(
          makeQuery([
            {
              providerId: 20,
              province: 'Gauteng',
              city: 'Johannesburg',
              suburb: 'Sandton',
              radiusKm: 25,
            },
          ]),
        ),
    };
    mockGetDb.mockResolvedValue(directoryDb);

    const directory = await servicesEngineService.publicDirectorySearch({});

    expect(directory).toHaveLength(1);
    expect(directory[0]).toMatchObject({ providerId: 20, companyName: 'Provider Company' });
  });

  it('makes a rejected or unpublished provider unavailable for new requests', async () => {
    const insert = vi.fn();
    mockGetDb.mockResolvedValue({
      select: vi.fn(() => makeQuery([])),
      transaction: vi.fn(
        async (callback: (tx: { select: ReturnType<typeof vi.fn>; insert: typeof insert }) => Promise<unknown>) =>
          callback({
            select: vi
              .fn()
              .mockReturnValueOnce(makeQuery([{ id: 10 }]))
              .mockReturnValueOnce(makeQuery([]))
              .mockReturnValueOnce(makeQuery([{ id: 20 }]))
              .mockReturnValueOnce(makeQuery([{ id: 21 }]))
              .mockReturnValueOnce(
                makeQuery([
                  {
                    isActive: 1,
                    verificationStatus: 'rejected',
                    directoryActive: 0,
                    subscriptionStatus: 'trial',
                  },
                ]),
              )
              .mockReturnValueOnce(makeQuery([{ category: 'home_improvement', code: 'plumbing', isActive: 1 }]))
              .mockReturnValueOnce(makeQuery([{ province: 'Gauteng' }])),
            insert,
          }),
      ),
    });

    const profileSpy = vi
      .spyOn(servicesEngineService, 'getProviderPublicProfile')
      .mockResolvedValue(null as never);

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
        notes: 'Need a repair.',
      }),
    ).rejects.toThrow('This provider is not currently available');

    expect(insert).not.toHaveBeenCalled();
    profileSpy.mockRestore();
  });
});

describe('Services V1 authoritative service replacement', () => {
  const existingServiceRows = [
    {
      id: 31,
      providerId: 20,
      serviceCategory: 'home_improvement',
      serviceCode: 'plumbing',
      displayName: 'Plumbing',
      description: 'Existing description',
      minPrice: 250,
      maxPrice: 900,
      currency: 'ZAR',
      isActive: 1,
    },
    {
      id: 32,
      providerId: 20,
      serviceCategory: 'finance_legal',
      serviceCode: 'conveyancing',
      displayName: 'Conveyancing',
      description: null,
      minPrice: null,
      maxPrice: null,
      currency: 'ZAR',
      isActive: 1,
    },
  ];

  function mockServiceReplacementDb(existing: unknown[]) {
    const { update, set, where } = makeUpdateMock();
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
      transaction: vi.fn(async (callback: (tx: typeof tx) => Promise<unknown>) => callback(tx)),
      select: vi.fn(() => ({
        from: vi.fn(() => ({
          where: vi.fn(() => ({ orderBy: vi.fn().mockResolvedValue(existing) })),
        })),
      })),
    };
    mockGetDb.mockResolvedValue(db);
    return { tx, update, set, where, insert };
  }

  it('rejects a service ID that belongs to another provider', async () => {
    const { update, insert } = mockServiceReplacementDb(existingServiceRows);

    await expect(
      servicesEngineService.replaceProviderServices(20, [
        { id: 999, category: 'home_improvement', code: 'plumbing', displayName: 'Plumbing' },
      ]),
    ).rejects.toThrow('Service not found for this provider');

    expect(update).not.toHaveBeenCalled();
    expect(insert).not.toHaveBeenCalled();
  });

  it('updates the owned canonical row when a service code changes', async () => {
    const { set, insert, update } = mockServiceReplacementDb(existingServiceRows);

    await servicesEngineService.replaceProviderServices(20, [
      { id: 31, category: 'home_improvement', code: 'emergency-plumbing', displayName: 'Emergency plumbing' },
      { id: 32, category: 'finance_legal', code: 'conveyancing', displayName: 'Conveyancing' },
    ]);

    expect(update).toHaveBeenCalledWith(serviceProviderServices);
    expect(set).toHaveBeenCalledTimes(2);
    expect(set).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ serviceCode: 'emergency-plumbing', displayName: 'Emergency plumbing' }),
    );
    expect(insert).not.toHaveBeenCalled();
  });

  it('deactivates services removed from the submitted canonical set', async () => {
    const { set, where, insert } = mockServiceReplacementDb(existingServiceRows);

    await servicesEngineService.replaceProviderServices(20, [
      { id: 31, category: 'home_improvement', code: 'plumbing', displayName: 'Plumbing' },
    ]);

    expect(set).toHaveBeenLastCalledWith({ isActive: 0 });
    expect(where).toHaveBeenLastCalledWith(eq(serviceProviderServices.id, 32));
    expect(insert).not.toHaveBeenCalled();
  });

  it('refuses a code change that would duplicate an omitted service code', async () => {
    const { update, insert } = mockServiceReplacementDb(existingServiceRows);

    await expect(
      servicesEngineService.replaceProviderServices(20, [
        { id: 31, category: 'home_improvement', code: 'conveyancing', displayName: 'Plumbing' },
      ]),
    ).rejects.toThrow('Service codes must be unique within a provider profile');

    expect(update).not.toHaveBeenCalled();
    expect(insert).not.toHaveBeenCalled();
  });

  it('refuses two submitted services that claim the same code', async () => {
    const { update, insert } = mockServiceReplacementDb(existingServiceRows);

    await expect(
      servicesEngineService.replaceProviderServices(20, [
        { id: 31, category: 'home_improvement', code: 'plumbing', displayName: 'Plumbing' },
        { category: 'home_improvement', code: 'PLUMBING', displayName: 'Plumbing again' },
      ]),
    ).rejects.toThrow('Service codes must be unique within a provider profile');

    expect(update).not.toHaveBeenCalled();
    expect(insert).not.toHaveBeenCalled();
  });
});

describe('Services V1 authoritative coverage replacement', () => {
  const existingCoverageRows = [
    {
      id: 41,
      providerId: 20,
      countryCode: 'ZA',
      province: 'Gauteng',
      city: 'Johannesburg',
      suburb: 'Sandton',
      postalCode: '2196',
      radiusKm: 40,
      isPrimary: 1,
    },
    {
      id: 42,
      providerId: 20,
      countryCode: 'ZA',
      province: 'Gauteng',
      city: 'Pretoria',
      suburb: 'Arcadia',
      postalCode: '0008',
      radiusKm: 20,
      isPrimary: 0,
    },
  ];

  function mockCoverageReplacementDb(existing: unknown[], returned = existing) {
    const { update, set, where } = makeUpdateMock();
    const { delete: deleteFn, where: deleteWhere } = makeDeleteMock();
    const insertValues = vi.fn().mockResolvedValue([{ insertId: 99 }]);
    const insert = vi.fn(() => ({ values: insertValues }));
    const tx = {
      select: vi
        .fn()
        .mockReturnValueOnce(makeQuery([{ id: 20 }]))
        .mockReturnValueOnce({
          from: vi.fn(() => ({
            where: vi.fn(() => ({ for: vi.fn().mockResolvedValue(existing) })),
          })),
        }),
      update,
      delete: deleteFn,
      insert,
    };
    const db = {
      transaction: vi.fn(async (callback: (tx: typeof tx) => Promise<unknown>) => callback(tx)),
      select: vi.fn(() => ({
        from: vi.fn(() => ({
          where: vi.fn(() => ({ orderBy: vi.fn().mockResolvedValue(returned) })),
        })),
      })),
    };
    mockGetDb.mockResolvedValue(db);
    return { tx, update, set, where, insert, insertValues, deleteFn, deleteWhere };
  }

  it('rejects a coverage ID that belongs to another provider', async () => {
    const { update, deleteFn, insert } = mockCoverageReplacementDb(existingCoverageRows);

    await expect(
      servicesEngineService.replaceProviderLocations(20, [
        { id: 999, province: 'Gauteng', city: 'Johannesburg', suburb: 'Sandton' },
      ]),
    ).rejects.toThrow('Coverage area not found for this provider');

    expect(update).not.toHaveBeenCalled();
    expect(deleteFn).not.toHaveBeenCalled();
    expect(insert).not.toHaveBeenCalled();
  });

  it('stops matching coverage that is removed from the canonical set', async () => {
    const returned = existingCoverageRows.filter(row => row.id === 41);
    const { set, deleteFn, deleteWhere, insert } = mockCoverageReplacementDb(
      existingCoverageRows,
      returned,
    );

    const rows = (await servicesEngineService.replaceProviderLocations(20, [
      { id: 41, province: 'Gauteng', city: 'Johannesburg', suburb: 'Sandton' },
    ])) as Array<{ suburb: string | null; city: string | null; province: string | null }>;

    expect(set).toHaveBeenCalledTimes(1);
    expect(deleteFn).toHaveBeenCalledWith(serviceProviderLocations);
    expect(deleteWhere).toHaveBeenCalledWith(eq(serviceProviderLocations.id, 42));
    expect(insert).not.toHaveBeenCalled();
    expect(
      providerCoversLocation(rows, { province: 'Gauteng', city: 'Pretoria', suburb: 'Arcadia' }),
    ).toBe(false);
    expect(
      providerCoversLocation(rows, { province: 'Gauteng', city: 'Johannesburg', suburb: 'Sandton' }),
    ).toBe(true);
  });

  it('edits a coverage tuple in place without creating an active duplicate', async () => {
    const { update, set, where, deleteFn, insert } = mockCoverageReplacementDb(existingCoverageRows);

    await servicesEngineService.replaceProviderLocations(20, [
      { id: 41, province: 'Gauteng', city: 'Johannesburg', suburb: 'Bryanston' },
      { id: 42, province: 'Gauteng', city: 'Pretoria', suburb: 'Arcadia' },
    ]);

    expect(update).toHaveBeenCalledTimes(2);
    expect(update).toHaveBeenCalledWith(serviceProviderLocations);
    expect(set).toHaveBeenCalledWith(
      expect.objectContaining({ suburb: 'Bryanston', postalCode: '2196', radiusKm: 40 }),
    );
    expect(where).toHaveBeenCalledWith(eq(serviceProviderLocations.id, 41));
    expect(deleteFn).not.toHaveBeenCalled();
    expect(insert).not.toHaveBeenCalled();
  });

  it('removes a persisted coverage row the provider blanked out', async () => {
    const { deleteFn, deleteWhere, insertValues } = mockCoverageReplacementDb(existingCoverageRows);

    await servicesEngineService.replaceProviderLocations(20, [
      { id: 41, province: 'Gauteng', city: 'Johannesburg', suburb: 'Sandton' },
      { id: 42, province: '', city: '', suburb: '' },
    ]);

    expect(deleteFn).toHaveBeenCalledWith(serviceProviderLocations);
    expect(deleteWhere).toHaveBeenCalledWith(eq(serviceProviderLocations.id, 42));
    expect(insertValues).not.toHaveBeenCalled();
  });
});

describe('Services V1 bounded and deterministic reads', () => {
  it('orders provider leads by creation time and identifier', async () => {
    const query = makeQuery([makeLeadRow()]);
    mockGetDb.mockResolvedValue({ select: vi.fn(() => query) });

    await servicesEngineService.listProviderLeads(20, 25, 50);

    expect(query.orderBy).toHaveBeenCalledWith(
      desc(serviceLeads.createdAt),
      desc(serviceLeads.id),
    );
  });

  it('bounds the eligible-provider candidate scan before in-memory filtering', async () => {
    const baseQuery = makeQuery([]);
    const servicesQuery = makeQuery([]);
    const locationsQuery = makeQuery([]);
    const selectQueue = [baseQuery, servicesQuery, locationsQuery];
    mockGetDb.mockResolvedValue({ select: vi.fn(() => selectQueue.shift() ?? makeQuery([])) });

    await servicesEngineService.publicDirectorySearch({});

    expect(baseQuery.limit).toHaveBeenCalledWith(SERVICES_DIRECTORY_CANDIDATE_SCAN_LIMIT);
  });

  it('fails closed with a deterministic error for an unreadable stored request context', async () => {
    const insert = vi.fn();
    mockGetDb.mockResolvedValue({
      select: vi.fn(() =>
        makeQuery([
          makeLeadRow({
            contextJson: '{"serviceCode":"plumbing","unapprovedKey":',
          }),
        ]),
      ),
      transaction: vi.fn(
        async (callback: (tx: unknown) => Promise<unknown>) =>
          callback({ select: vi.fn(), insert }),
      ),
    });

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
      }),
    ).rejects.toThrow('A previous request for this key cannot be replayed safely');

    expect(insert).not.toHaveBeenCalled();
  });

  it('fails closed when the stored request context carries a non-allowlisted key', async () => {
    mockGetDb.mockResolvedValue({
      select: vi.fn(() =>
        makeQuery([
          makeLeadRow({
            contextJson: { serviceCode: 'plumbing', legacyFlag: 'retired' },
          }),
        ]),
      ),
    });

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
      }),
    ).rejects.toThrow('A previous request for this key cannot be replayed safely');
  });
});
