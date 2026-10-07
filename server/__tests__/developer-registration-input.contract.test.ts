import { beforeEach, describe, expect, it, vi } from 'vitest';

const { identities, createOrganisation, getIdentity, resubmit, ensureSubscription } = vi.hoisted(
  () => ({
    identities: new Map<number, Record<string, unknown>>(),
    createOrganisation: vi.fn(),
    getIdentity: vi.fn(),
    resubmit: vi.fn(),
    ensureSubscription: vi.fn(),
  }),
);

vi.mock('../services/developerIdentityService', () => ({
  developerIdentityService: {
    createDeveloperOrganisation: createOrganisation,
    getDeveloperByUserId: getIdentity,
    resubmitRejectedDeveloperOrganisation: resubmit,
  },
}));
vi.mock('../services/developerSubscriptionService', () => ({
  developerSubscriptionService: { ensureSubscription },
}));

import { developerRouter } from '../developerRouter';

const input = {
  name: 'Example Residential Company',
  category: 'residential',
  specializations: ['residential'],
  establishedYear: null,
  description: 'Residential development organisation.',
  email: 'owner@example.com',
  phone: null,
  website: null,
  address: 'Parktown',
  city: 'Johannesburg',
  province: 'Gauteng',
  logo: null,
};

function caller(role: string | null = 'property_developer') {
  return developerRouter.createCaller({
    req: { headers: {} },
    res: {},
    user: role ? { id: 31, role } : null,
  } as any);
}

beforeEach(() => {
  identities.clear();
  vi.clearAllMocks();
  getIdentity.mockImplementation(async (userId: number) => identities.get(userId) ?? null);
  // Only persistence is mocked. Exercise the real protected route, input
  // parser, canonical service arguments and subsequent profile read.
  createOrganisation.mockImplementation(async (value: Record<string, unknown>) => {
    const profile = {
      ...value,
      id: 41,
      organisationId: 41,
      status: 'pending',
      organisation: { status: 'pending' },
    };
    identities.set(Number(value.createdByUserId), structuredClone(profile));
    return profile;
  });
  ensureSubscription.mockResolvedValue(undefined);
});

describe('canonical Developer registration input', () => {
  it('saves the supported organisation fields and reloads the same pending identity', async () => {
    const developer = caller();
    const saved = await developer.createProfile(input);
    expect(createOrganisation).toHaveBeenCalledWith({ ...input, createdByUserId: 31 });
    expect(ensureSubscription).toHaveBeenCalledWith(41);
    await expect(developer.getProfile()).resolves.toEqual(saved);
    expect(saved).toMatchObject({ ...input, status: 'pending' });
  });

  it.each(['completedProjects', 'currentProjects', 'upcomingProjects'])(
    'rejects unsupported %s before any identity write',
    async key => {
      await expect(caller().createProfile({ ...input, [key]: 5 } as any)).rejects.toMatchObject({
        code: 'BAD_REQUEST',
      });
      expect(createOrganisation).not.toHaveBeenCalled();
      expect(resubmit).not.toHaveBeenCalled();
      expect(ensureSubscription).not.toHaveBeenCalled();
    },
  );

  it('rejects the production-reproduced 5/5/5 payload rather than silently discarding it', async () => {
    await expect(
      caller().createProfile({
        ...input,
        completedProjects: 5,
        currentProjects: 5,
        upcomingProjects: 5,
      } as any),
    ).rejects.toMatchObject({ code: 'BAD_REQUEST' });
    expect(createOrganisation).not.toHaveBeenCalled();
  });

  it.each([null, 'visitor', 'agent', 'agency_admin', 'super_admin'])(
    'retains account/role denial for %s',
    async role => {
      await expect(caller(role).createProfile(input)).rejects.toMatchObject({
        code: role === null ? 'UNAUTHORIZED' : 'FORBIDDEN',
      });
      expect(createOrganisation).not.toHaveBeenCalled();
    },
  );

  it.each(['pending', 'approved'])(
    'keeps existing %s organisations protected from a duplicate submission',
    async status => {
      identities.set(31, { organisationId: 41, status, organisation: { status } });
      await expect(caller().createProfile(input)).rejects.toMatchObject({ code: 'CONFLICT' });
      expect(createOrganisation).not.toHaveBeenCalled();
      expect(resubmit).not.toHaveBeenCalled();
      expect(identities.get(31)?.status).toBe(status);
    },
  );

  it('retains the explicit rejected-organisation resubmission route', async () => {
    identities.set(31, {
      organisationId: 41,
      status: 'rejected',
      organisation: { status: 'rejected' },
    });
    resubmit.mockResolvedValue({ organisationId: 41, status: 'pending' });
    await expect(caller().createProfile(input)).resolves.toMatchObject({ status: 'pending' });
    expect(resubmit).toHaveBeenCalledWith({ organisationId: 41, ...input });
    expect(createOrganisation).not.toHaveBeenCalled();
  });
});
