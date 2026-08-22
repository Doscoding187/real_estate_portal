import { describe, expect, it, vi } from 'vitest';
import {
  buildSearchAreaAuthorityKey,
  SearchAreaAuthority,
  type CanonicalLocationAuthority,
  type CanonicalLocationAuthorityRecord,
  type ResolveSearchAreaOptions,
} from '../searchAreaAuthority';
import { SANDTON_SEARCH_AREA_PREVIEW, type SearchAreaDefinition } from '../searchAreaDefinitions';

const canonicalLocations: Record<string, CanonicalLocationAuthorityRecord> = {
  'province:1': {
    canonicalLocationId: 'province:1',
    level: 'province',
    name: 'Gauteng',
    slug: 'gauteng',
  },
  'city:12': {
    canonicalLocationId: 'city:12',
    level: 'city',
    name: 'Johannesburg',
    slug: 'johannesburg',
    parentCanonicalLocationId: 'province:1',
  },
  'city:13': {
    canonicalLocationId: 'city:13',
    level: 'city',
    name: 'Pretoria',
    slug: 'pretoria',
    parentCanonicalLocationId: 'province:1',
  },
  'suburb:34': {
    canonicalLocationId: 'suburb:34',
    level: 'suburb',
    name: 'Sandton',
    slug: 'sandton',
    parentCanonicalLocationId: 'city:12',
  },
  'suburb:35': {
    canonicalLocationId: 'suburb:35',
    level: 'suburb',
    name: 'Rosebank',
    slug: 'rosebank',
    parentCanonicalLocationId: 'city:12',
  },
  'suburb:99': {
    canonicalLocationId: 'suburb:99',
    level: 'suburb',
    name: 'Pretoria East',
    slug: 'pretoria-east',
    parentCanonicalLocationId: 'city:13',
  },
};

function authorityFor(
  definitions: readonly SearchAreaDefinition[],
  locations: Record<string, CanonicalLocationAuthorityRecord> = canonicalLocations,
) {
  const canonicalLocationAuthority: CanonicalLocationAuthority = {
    resolveCanonicalLocation: vi.fn(
      async canonicalLocationId => locations[canonicalLocationId] ?? null,
    ),
  };

  return {
    authority: new SearchAreaAuthority({ definitions, canonicalLocationAuthority }),
    canonicalLocationAuthority,
  };
}

function activeDefinition(overrides: Partial<SearchAreaDefinition> = {}): SearchAreaDefinition {
  return {
    searchAreaId: 'johannesburg-sandton',
    definitionVersion: 1,
    label: 'Sandton',
    parentCanonicalLocationId: 'city:12',
    anchorCanonicalLocationId: 'suburb:34',
    memberCanonicalLocationIds: ['suburb:34', 'suburb:35'],
    supportedJourneys: ['buy', 'rent'],
    lifecycle: 'active',
    boundary: { kind: 'canonical_members' },
    ...overrides,
  };
}

describe('SearchAreaAuthority', () => {
  it('resolves explicit canonical members and returns a summary without members', async () => {
    const { authority } = authorityFor([activeDefinition()]);
    const result = await authority.resolveSearchArea('johannesburg-sandton', { journey: 'buy' });

    expect(result.status).toBe('available');
    if (result.status !== 'available') return;

    expect(result.definition.memberCanonicalLocationIds).toEqual(['suburb:34', 'suburb:35']);
    expect(result.definition.members.map(member => member.canonicalLocationId)).toEqual([
      'suburb:34',
      'suburb:35',
    ]);
    expect(result.summary).toMatchObject({
      kind: 'search_area',
      searchAreaId: 'johannesburg-sandton',
      parentCanonicalLocationId: 'city:12',
      parentLabel: 'Johannesburg',
      availability: 'available',
      supportedJourneys: ['buy', 'rent'],
      definitionVersion: 1,
    });
    expect('memberCanonicalLocationIds' in result.summary).toBe(false);
  });

  it('keeps identity stable when the display label changes', async () => {
    const { authority } = authorityFor([activeDefinition({ label: 'North Sandton' })]);
    const result = await authority.getSafeSummary('johannesburg-sandton');

    expect(result).toMatchObject({
      searchAreaId: 'johannesburg-sandton',
      label: 'North Sandton',
    });
  });

  it('includes the definition version in the authority identity key', () => {
    expect(buildSearchAreaAuthorityKey('johannesburg-sandton', 1)).toBe(
      'search-area:johannesburg-sandton:v1',
    );
    expect(buildSearchAreaAuthorityKey('johannesburg-sandton', 2)).not.toBe(
      buildSearchAreaAuthorityKey('johannesburg-sandton', 1),
    );
  });

  it('rejects active definitions without explicit members', async () => {
    const { authority } = authorityFor([activeDefinition({ memberCanonicalLocationIds: [] })]);
    const result = await authority.resolveSearchArea('johannesburg-sandton');

    expect(result).toMatchObject({ status: 'unavailable', reason: 'empty_active_definition' });
  });

  it('rejects duplicate members', async () => {
    const { authority } = authorityFor([
      activeDefinition({ memberCanonicalLocationIds: ['suburb:34', 'suburb:34'] }),
    ]);
    const result = await authority.resolveSearchArea('johannesburg-sandton');

    expect(result).toMatchObject({ status: 'unavailable', reason: 'duplicate_member' });
  });

  it('rejects invalid parent identities before canonical resolution', async () => {
    const { authority, canonicalLocationAuthority } = authorityFor([
      activeDefinition({ parentCanonicalLocationId: 'suburb:34' }),
    ]);
    const result = await authority.resolveSearchArea('johannesburg-sandton');

    expect(result).toMatchObject({ status: 'unavailable', reason: 'invalid_parent_identity' });
    expect(canonicalLocationAuthority.resolveCanonicalLocation).not.toHaveBeenCalled();
  });

  it('rejects invalid member identities and non-locality members', async () => {
    const invalidId = authorityFor([
      activeDefinition({ memberCanonicalLocationIds: ['google-place-1'] }),
    ]).authority;
    await expect(invalidId.resolveSearchArea('johannesburg-sandton')).resolves.toMatchObject({
      status: 'unavailable',
      reason: 'invalid_member_identity',
    });

    const cityMember = authorityFor([
      activeDefinition({ memberCanonicalLocationIds: ['city:12'] }),
    ]).authority;
    await expect(cityMember.resolveSearchArea('johannesburg-sandton')).resolves.toMatchObject({
      status: 'unavailable',
      reason: 'invalid_member_identity',
    });
  });

  it('rejects members outside the canonical parent', async () => {
    const { authority } = authorityFor([
      activeDefinition({ memberCanonicalLocationIds: ['suburb:99'] }),
    ]);
    const result = await authority.resolveSearchArea('johannesburg-sandton');

    expect(result).toMatchObject({
      status: 'unavailable',
      reason: 'canonical_member_outside_parent',
    });
  });

  it('rejects an anchor that is not an explicit member', async () => {
    const { authority } = authorityFor([
      activeDefinition({ anchorCanonicalLocationId: 'suburb:99' }),
    ]);
    const result = await authority.resolveSearchArea('johannesburg-sandton');

    expect(result).toMatchObject({ status: 'unavailable', reason: 'canonical_anchor_not_member' });
  });

  it('rejects an anchor with a non-locality identity', async () => {
    const { authority } = authorityFor([
      activeDefinition({ anchorCanonicalLocationId: 'city:12' }),
    ]);
    const result = await authority.resolveSearchArea('johannesburg-sandton');

    expect(result).toMatchObject({ status: 'unavailable', reason: 'invalid_anchor_identity' });
  });

  it('returns an explicit unavailable result for unsupported journeys', async () => {
    const { authority } = authorityFor([activeDefinition()]);

    await expect(
      authority.resolveSearchArea('johannesburg-sandton', { journey: 'shared_living' }),
    ).resolves.toMatchObject({ status: 'unavailable', reason: 'unsupported_journey' });
    await expect(
      authority.resolveSearchArea('johannesburg-sandton', { journey: 'rent' }),
    ).resolves.toMatchObject({ status: 'available' });
    await expect(
      authority.resolveSearchArea('johannesburg-sandton', { journey: 'plot_land' }),
    ).resolves.toMatchObject({ status: 'unavailable', reason: 'unsupported_journey' });
  });

  it('requires explicit plot_land authorization rather than inheriting Buy capability', async () => {
    const { authority } = authorityFor([
      activeDefinition({ supportedJourneys: ['buy', 'rent', 'plot_land'] }),
    ]);
    await expect(
      authority.resolveSearchArea('johannesburg-sandton', { journey: 'plot_land' }),
    ).resolves.toMatchObject({ status: 'available' });
  });

  it('rejects active definitions that advertise unsupported executable journeys', async () => {
    const { authority } = authorityFor([
      activeDefinition({ supportedJourneys: ['buy', 'shared_living'] }),
    ]);
    const result = await authority.resolveSearchArea('johannesburg-sandton');

    expect(result).toMatchObject({
      status: 'unavailable',
      reason: 'unsupported_journey_configuration',
    });
  });

  it('keeps the Sandton proof preview-only', async () => {
    const { authority } = authorityFor([SANDTON_SEARCH_AREA_PREVIEW]);

    await expect(authority.resolveSearchArea('johannesburg-sandton')).resolves.toMatchObject({
      status: 'unavailable',
      reason: 'preview_only',
    });

    const preview = await authority.resolveSearchArea('johannesburg-sandton', {
      includePreview: true,
    });
    expect(preview).toMatchObject({
      status: 'preview',
      summary: {
        availability: 'preview',
        lifecycle: 'preview',
      },
    });
  });

  it('fails closed for disabled and unknown definitions', async () => {
    const { authority } = authorityFor([activeDefinition({ lifecycle: 'disabled' })]);

    await expect(authority.resolveSearchArea('johannesburg-sandton')).resolves.toMatchObject({
      status: 'unavailable',
      reason: 'disabled',
    });
    await expect(authority.resolveSearchArea('pretoria-east')).resolves.toMatchObject({
      status: 'unavailable',
      reason: 'unknown_search_area',
    });
  });

  it('does not allow caller-provided members to override the registry', async () => {
    const { authority } = authorityFor([
      activeDefinition({ memberCanonicalLocationIds: ['suburb:34'] }),
    ]);
    const result = await authority.resolveSearchArea('johannesburg-sandton', {
      journey: 'buy',
      ...({ memberCanonicalLocationIds: ['suburb:99'] } as unknown as ResolveSearchAreaOptions),
    });

    expect(result.status).toBe('available');
    if (result.status !== 'available') return;
    expect(result.definition.memberCanonicalLocationIds).toEqual(['suburb:34']);
    expect(result.definition.members.map(member => member.canonicalLocationId)).toEqual([
      'suburb:34',
    ]);
  });

  it('does not widen when canonical parent or member resolution fails', async () => {
    const locationsWithoutParent = { ...canonicalLocations };
    delete locationsWithoutParent['city:12'];
    const missingParent = authorityFor([activeDefinition()], locationsWithoutParent).authority;
    await expect(missingParent.resolveSearchArea('johannesburg-sandton')).resolves.toMatchObject({
      status: 'unavailable',
      reason: 'canonical_parent_unresolved',
    });

    const locationsWithoutMember = { ...canonicalLocations };
    delete locationsWithoutMember['suburb:34'];
    const missingMember = authorityFor([activeDefinition()], locationsWithoutMember).authority;
    await expect(missingMember.resolveSearchArea('johannesburg-sandton')).resolves.toMatchObject({
      status: 'unavailable',
      reason: 'canonical_member_unresolved',
    });
  });

  it('does not select a journey when none is supplied', async () => {
    const { authority } = authorityFor([activeDefinition()]);
    const result = await authority.resolveSearchArea('johannesburg-sandton');

    expect(result.status).toBe('available');
    if (result.status !== 'available') return;
    expect(result.summary.supportedJourneys).toEqual(['buy', 'rent']);
    expect('journey' in result.summary).toBe(false);
  });
});
