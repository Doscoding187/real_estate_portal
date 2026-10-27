import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockLoadPlaceProjection } = vi.hoisted(() => ({
  mockLoadPlaceProjection: vi.fn(),
}));

vi.mock('../canonicalPlaceSearchService', () => ({
  loadCanonicalPlaceSearchProjection: mockLoadPlaceProjection,
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

const SANDTON_ID = 'pl-place-01-000000000000000000000034';
const resolvedSandton = {
  executions: new Map([[SANDTON_ID, { placeId: SANDTON_ID, scope: 'locality' }]]),
  labels: new Map([
    [
      SANDTON_ID,
      {
        canonicalPlaceId: SANDTON_ID,
        label: 'Sandton',
        placeType: 'suburb',
        scope: 'locality',
        province: 'Gauteng',
        city: 'Johannesburg',
        locality: 'Sandton',
      },
    ],
  ]),
};

describe('agent coverage-area authority', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLoadPlaceProjection.mockResolvedValue(resolvedSandton);
  });

  it('accepts only an admitted canonical Place identity', () => {
    expect(parseCanonicalAgentCoverageLocationId(SANDTON_ID)).toEqual({
      canonicalLocationId: SANDTON_ID,
    });
    expect(parseCanonicalAgentCoverageLocationId('suburb:34')).toBeNull();
    expect(parseCanonicalAgentCoverageLocationId('Sandton, Johannesburg, Gauteng')).toBeNull();
    expect(parseCanonicalAgentCoverageLocationId('pl-place-01-not-a-place-id')).toBeNull();
  });

  it('fails closed for historic text and bare JSON label arrays', () => {
    expect(parseAgentCoverageAreas('Sandton, Johannesburg, Gauteng')).toEqual([]);
    expect(parseAgentCoverageAreas(JSON.stringify(['Sandton']))).toEqual([]);
    expect(parseAgentCoverageAreas(JSON.stringify({ canonicalLocationId: 'suburb:34' }))).toEqual([]);
  });

  it('serializes a single typed identity without treating an empty selection as coverage', () => {
    const serialized = serializeAgentCoverageAreas([
      { canonicalLocationId: SANDTON_ID, label: 'Sandton, Johannesburg, Gauteng' },
    ]);

    expect(serialized).toBe(
      `[{"canonicalLocationId":"${SANDTON_ID}","label":"Sandton, Johannesburg, Gauteng"}]`,
    );
    expect(parseAgentCoverageAreas(serialized)).toEqual([
      { canonicalLocationId: SANDTON_ID, label: 'Sandton, Johannesburg, Gauteng' },
    ]);
    expect(serializeAgentCoverageAreas([])).toBeNull();
  });

  it('deduplicates repeated canonical selections and generates the display label on the server', async () => {
    const result = await resolveSubmittedAgentCoverageAreas([SANDTON_ID, SANDTON_ID]);

    expect(mockLoadPlaceProjection).toHaveBeenCalledTimes(1);
    expect(mockLoadPlaceProjection).toHaveBeenCalledWith(undefined, { placeIds: [SANDTON_ID] });
    expect(result).toEqual([
      { canonicalLocationId: SANDTON_ID, label: 'Sandton, Johannesburg, Gauteng' },
    ]);
  });

  it('rejects a client-supplied display label before it can become an area claim', async () => {
    await expect(
      resolveSubmittedAgentCoverageAreas(['Sandton, Johannesburg, Gauteng']),
    ).rejects.toBeInstanceOf(AgentCoverageAreaValidationError);
    expect(mockLoadPlaceProjection).not.toHaveBeenCalled();
  });

  it('rejects an unavailable canonical Place', async () => {
    mockLoadPlaceProjection.mockResolvedValueOnce({ executions: new Map(), labels: new Map() });
    await expect(resolveSubmittedAgentCoverageAreas([SANDTON_ID])).rejects.toBeInstanceOf(
      AgentCoverageAreaValidationError,
    );
  });

  it('propagates an operational Place authority failure instead of disguising it as a policy rejection', async () => {
    mockLoadPlaceProjection.mockRejectedValueOnce(new Error('canonical database unavailable'));

    await expect(resolveSubmittedAgentCoverageAreas([SANDTON_ID])).rejects.toThrow(
      'canonical database unavailable',
    );
  });
});
