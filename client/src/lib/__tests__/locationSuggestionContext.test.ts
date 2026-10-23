import { describe, expect, it } from 'vitest';
import { suggestionContextLabel } from '../locationSuggestionContext';
import type { CanonicalLocationDiscoveryResult } from '@shared/searchDiscovery';

function place(
  overrides: Partial<CanonicalLocationDiscoveryResult> & { label: string },
): CanonicalLocationDiscoveryResult {
  return {
    kind: 'canonical_location',
    canonicalLocationId: 'pl-place-01-2b1c0e5d3f4a5b6c7d8e9f01',
    factualLevel: 'suburb',
    searchScopeKind: 'locality',
    display: { typeLabel: 'Suburb', contextLabel: 'Johannesburg' },
    provinceSlug: 'gauteng',
    provinceName: 'Gauteng',
    citySlug: 'johannesburg',
    suburbSlug: 'melville',
    canonicalPath: '/gauteng/johannesburg/melville',
    source: 'canonical_geography',
    ...overrides,
  } as CanonicalLocationDiscoveryResult;
}

describe('the context a location suggestion shows', () => {
  it('shows the place type and the parent it sits in', () => {
    expect(suggestionContextLabel(place({ label: 'Melville' }))).toBe('Suburb · Johannesburg');
  });

  it('leaves the province out when the parent tells two same-named places apart', () => {
    const melville = place({ label: 'Melville' });
    const other = place({
      label: 'Melville',
      display: { typeLabel: 'Suburb', contextLabel: 'Pretoria' },
      provinceName: 'Gauteng',
      citySlug: 'pretoria',
      canonicalPath: '/gauteng/pretoria/melville',
    });
    expect(suggestionContextLabel(melville, [melville, other])).toBe('Suburb · Johannesburg');
  });

  it('adds the province when the name and the parent are the same', () => {
    const first = place({ label: 'Rooiwal' });
    const second = place({
      label: 'Rooiwal',
      display: { typeLabel: 'Suburb', contextLabel: 'Johannesburg' },
      canonicalLocationId: 'pl-place-01-3c2d1f6e4a5b6c7d8e9f012',
    });
    expect(suggestionContextLabel(first, [first, second])).toBe(
      'Suburb · Johannesburg · Gauteng',
    );
  });

  it('shows the province for a city, which has no parent of its own', () => {
    expect(
      suggestionContextLabel(
        place({
          label: 'Johannesburg',
          factualLevel: 'city',
          display: { typeLabel: 'City', contextLabel: 'Gauteng' },
          citySlug: 'johannesburg',
          suburbSlug: undefined,
        }),
      ),
    ).toBe('City · Gauteng');
  });
});
