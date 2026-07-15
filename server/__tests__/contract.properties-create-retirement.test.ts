import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockDb } = vi.hoisted(() => ({
  mockDb: {
    createProperty: vi.fn(),
    createPropertyImage: vi.fn(),
  },
}));

vi.mock('../db', () => mockDb);

import { appRouter } from '../routers';

const createInput = {
  title: 'Retired direct property submission',
  description: 'This request must be denied before any property or media write occurs.',
  propertyType: 'house' as const,
  listingType: 'sale' as const,
  price: 2_500_000,
  bedrooms: 3,
  bathrooms: 2,
  area: 180,
  address: '42 Safe Workflow Avenue',
  city: 'Johannesburg',
  province: 'Gauteng',
  images: ['https://cdn.example.test/property.jpg'],
};

const callerFor = (role: string) =>
  appRouter.createCaller({
    req: { headers: {} },
    res: {},
    user: { id: 42, email: `${role}@example.test`, name: role, role },
  } as any);

describe('properties.create retirement contract', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it.each(['agent', 'agency_admin', 'super_admin'])(
    'denies an authenticated %s before property or media persistence',
    async role => {
      await expect(callerFor(role).properties.create(createInput)).rejects.toMatchObject({
        code: 'PRECONDITION_FAILED',
        message:
          'Direct property creation has been retired. Use the canonical listing workflow for review and publication.',
      });

      expect(mockDb.createProperty).not.toHaveBeenCalled();
      expect(mockDb.createPropertyImage).not.toHaveBeenCalled();
    },
  );
});
