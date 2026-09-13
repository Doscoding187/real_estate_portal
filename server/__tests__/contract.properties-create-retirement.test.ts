import { readFileSync } from 'node:fs';
import path from 'node:path';
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

  it('removes the unreachable direct property and image writers from the database facade', () => {
    const databaseSource = readFileSync(path.resolve(process.cwd(), 'server/db.ts'), 'utf8');
    expect(databaseSource).not.toContain('export async function createProperty(');
    expect(databaseSource).not.toContain('export async function createPropertyImage(');
  });

  it('keeps the canonical projection insert behind one source-linked writer', () => {
    const databaseSource = readFileSync(path.resolve(process.cwd(), 'server/db.ts'), 'utf8');
    expect(databaseSource.match(/insert\(properties\)/g) || []).toHaveLength(1);
    expect(databaseSource).toContain('async function upsertCanonicalPublicPropertyProjection(');
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
