import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockResolvePublicLocation } = vi.hoisted(() => ({
  mockResolvePublicLocation: vi.fn(),
}));

vi.mock('../locationResolverService', () => ({
  locationResolver: {
    resolvePublicLocation: mockResolvePublicLocation,
  },
}));

import {
  parseAgentCoverageAreas,
  parseCanonicalAgentCoverageLocationId,
  serializeAgentCoverageAreas,
} from '../../../shared/agentCoverageArea';
import {
  AgentCoverageAreaValidationError,
  resolveSubmittedAgentCoverageAreas,
} from '../agentCoverageAreaService';

const resolvedSandton = {
  status: 'resolved' as const,
  location: {
    level: 'suburb' as const,
    province: { id: 1, name: 'Gauteng', slug: 'gauteng', code: 'GP' },
    city: { id: 12, name: 'Johannesburg', slug: 'johannesburg', provinceId: 1 },
    suburb: { id: 34, name: 'Sandton', slug: 'sandton', cityId: 12 },
    confidence: 'exact' as const,
    fallbackLevel: 'none' as const,
    originalIntent: 'sandton, johannesburg, gauteng',
  },
};

describe('agent coverage-area authority', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockResolvePublicLocation.mockResolvedValue(resolvedSandton);
  });

  it('accepts only the current colon-form canonical location identity', () => {
    expect(parseCanonicalAgentCoverageLocationId('suburb:34')).toEqual({
      canonicalLocationId: 'suburb:34',
      level: 'suburb',
      id: 34,
    });
    expect(parseCanonicalAgentCoverageLocationId('suburb-34')).toBeNull();
    expect(parseCanonicalAgentCoverageLocationId('Sandton, Johannesburg, Gauteng')).toBeNull();
    expect(parseCanonicalAgentCoverageLocationId('suburb:0')).toBeNull();
  });

  it('fails closed for historic text and bare JSON label arrays', () => {
    expect(parseAgentCoverageAreas('Sandton, Johannesburg, Gauteng')).toEqual([]);
    expect(parseAgentCoverageAreas(JSON.stringify(['Sandton']))).toEqual([]);
    expect(parseAgentCoverageAreas('{"canonicalLocationId":"suburb:34"}')).toEqual([]);
  });

  it('serializes a single typed identity without treating an empty selection as coverage', () => {
    const serialized = serializeAgentCoverageAreas([
      { canonicalLocationId: 'suburb:34', label: 'Sandton, Johannesburg, Gauteng' },
    ]);

    expect(serialized).toBe(
      '[{"canonicalLocationId":"suburb:34","label":"Sandton, Johannesburg, Gauteng"}]',
    );
    expect(parseAgentCoverageAreas(serialized)).toEqual([
      { canonicalLocationId: 'suburb:34', label: 'Sandton, Johannesburg, Gauteng' },
    ]);
    expect(serializeAgentCoverageAreas([])).toBeNull();
  });

  it('deduplicates repeated canonical selections and generates the display label on the server', async () => {
    const result = await resolveSubmittedAgentCoverageAreas(['suburb:34', 'suburb:34']);

    expect(mockResolvePublicLocation).toHaveBeenCalledTimes(1);
    expect(mockResolvePublicLocation).toHaveBeenCalledWith({ locationId: 'suburb:34' });
    expect(result).toEqual([
      { canonicalLocationId: 'suburb:34', label: 'Sandton, Johannesburg, Gauteng' },
    ]);
  });

  it('rejects a client-supplied display label before it can become an area claim', async () => {
    await expect(
      resolveSubmittedAgentCoverageAreas(['Sandton, Johannesburg, Gauteng']),
    ).rejects.toBeInstanceOf(AgentCoverageAreaValidationError);
    expect(mockResolvePublicLocation).not.toHaveBeenCalled();
  });

  it('rejects an unavailable or mismatched canonical record', async () => {
    mockResolvePublicLocation.mockResolvedValueOnce({
      status: 'unresolved',
      location: null,
      message: 'That suburb is no longer available.',
    });
    await expect(resolveSubmittedAgentCoverageAreas(['suburb:34'])).rejects.toThrow(
      /current Property Listify location suggestions/,
    );

    mockResolvePublicLocation.mockResolvedValueOnce({
      ...resolvedSandton,
      location: {
        ...resolvedSandton.location,
        suburb: { ...resolvedSandton.location.suburb, id: 35 },
      },
    });
    await expect(resolveSubmittedAgentCoverageAreas(['suburb:34'])).rejects.toBeInstanceOf(
      AgentCoverageAreaValidationError,
    );
  });

  it('propagates an operational resolver failure instead of disguising it as a policy rejection', async () => {
    mockResolvePublicLocation.mockRejectedValueOnce(new Error('canonical database unavailable'));

    await expect(resolveSubmittedAgentCoverageAreas(['suburb:34'])).rejects.toThrow(
      'canonical database unavailable',
    );
  });
});
