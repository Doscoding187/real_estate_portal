import { describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/trpc', () => ({ trpc: {} }));
vi.mock('@/components/agent/AgentAppShell', () => ({ AgentAppShell: () => null }));
vi.mock('@/components/location/CanonicalPlaceSelector', () => ({ CanonicalPlaceSelector: () => null }));

import { formatLandAskingPrice, landClaimDetail } from './LandAuthoringWorkspace';

describe('Land workspace formatting', () => {
  it('formats the asking price in rands', () => {
    expect(formatLandAskingPrice('1200000')).toBe('R1,200,000');
    expect(formatLandAskingPrice(950000)).toBe('R950,000');
    expect(formatLandAskingPrice('')).toBeNull();
    expect(formatLandAskingPrice('abc')).toBeNull();
  });

  it('shows the declared detail text of a fact', () => {
    expect(landClaimDetail('Borehole on site')).toBe('Borehole on site');
    expect(landClaimDetail(null)).toBeNull();
    expect(landClaimDetail({ a: 1 })).toBe('{"a":1}');
  });
});
