import { beforeEach, describe, expect, it, vi } from 'vitest';
import { projectPublicDevelopmentFacts } from '../../../shared/publicDevelopmentSearch';

// A drizzle-like chain: every call returns the chain, and awaiting it yields the next queued result.
const queue: unknown[] = [];
const chain: any = new Proxy(
  {},
  {
    get(_target, prop) {
      if (prop === 'then') {
        return (resolve: (value: unknown) => void) => resolve(queue.shift());
      }
      return () => chain;
    },
  },
);

vi.mock('../../db-connection', () => ({ getDb: async () => ({ select: () => chain }) }));
vi.mock('../developmentPlaceAssignmentService', async importOriginal => ({
  ...(await importOriginal<typeof import('../developmentPlaceAssignmentService')>()),
  getDevelopmentPlaceGeography: async () => ({ canonicalPlaceId: null, locationLabels: ['North Riding'] }),
}));

import { PublicDevelopmentDetailService } from '../publicDevelopmentDetailService';
import { mirrorTagline } from '../developmentService';

const row = (overrides: Record<string, unknown> = {}) => ({
  id: 5,
  name: 'Baltimore Lifestyle Estate',
  slug: 'baltimore-lifestyle-estate-5yr6po',
  description: 'A long description of the estate.',
  tagline: null,
  subtitle: null,
  images: '[]',
  videos: '[]',
  latitude: '-26.025',
  longitude: '27.946',
  estateSpecs: '{}',
  isPublished: 1,
  approvalStatus: 'approved',
  status: 'selling',
  developmentType: 'residential',
  transactionType: 'for_sale',
  nature: 'new',
  highlights: '[]',
  cataloguePublisherId: 3,
  publisherName: 'Cosmopolitan Projects',
  publisherAuthorityKind: 'platform_reference',
  ...overrides,
});

const detail = async (overrides: Record<string, unknown> = {}) => {
  queue.length = 0;
  queue.push([row(overrides)], [], [], [{ total: 1 }]);
  return new PublicDevelopmentDetailService().getBySlugOrId('baltimore-lifestyle-estate-5yr6po');
};

describe('tagline in the public read models', () => {
  beforeEach(() => {
    queue.length = 0;
  });

  it('the detail read model returns the tagline and the subtitle, trimmed, or null', async () => {
    const withTagline = await detail({ tagline: ' Freestanding family homes ', subtitle: 'Older subtitle' });
    expect(withTagline?.tagline).toBe('Freestanding family homes');
    expect(withTagline?.subtitle).toBe('Older subtitle');
    const none = await detail();
    expect(none?.tagline).toBeNull();
    expect(none?.subtitle).toBeNull();
  });

  it('the search projection prefers the tagline, falls back to the subtitle, else null', () => {
    const base: any = {
      id: 7,
      name: 'X',
      slug: 'x',
      description: 'Long description',
      images: [],
      canonicalPlaceId: null,
      locationLabels: [],
      developmentType: 'residential',
      transactionType: 'for_sale',
      status: 'selling',
      nature: 'new',
      completionDate: null,
      createdAt: null,
      isFeatured: 0,
      rating: null,
      highlights: [],
      canonicalRoute: '/development/x',
      cataloguePublisherId: 1,
      publisherName: 'P',
      publisherLogoUrl: null,
      publisherAuthorityKind: 'developer_first_party',
    };
    expect(projectPublicDevelopmentFacts({ ...base, tagline: 'New tagline', subtitle: 'Stale subtitle' }, [])?.tagline).toBe('New tagline');
    expect(projectPublicDevelopmentFacts({ ...base, tagline: ' ', subtitle: 'Only subtitle' }, [])?.tagline).toBe('Only subtitle');
    expect(projectPublicDevelopmentFacts({ ...base }, [])?.tagline).toBeNull();
  });
});

describe('tagline and subtitle are stored as one value', () => {
  it('create and update write the same text to both, tagline first, so a stale subtitle never wins', () => {
    expect(mirrorTagline('Edited tagline', 'Stale subtitle')).toBe('Edited tagline');
    expect(mirrorTagline(undefined, 'Only subtitle')).toBe('Only subtitle');
    expect(mirrorTagline('Only tagline', undefined)).toBe('Only tagline');
    expect(mirrorTagline('  ', undefined)).toBeNull();
    // Neither sent: leave the stored values alone.
    expect(mirrorTagline(undefined, undefined)).toBeUndefined();
  });
});
