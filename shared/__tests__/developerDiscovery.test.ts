import { describe, expect, it } from 'vitest';
import { developerDiscoveryHref, readDeveloperProvince } from '../developerDiscovery';
describe('Developer discovery scope continuity', () => {
  it('accepts an existing province name or slug, while keeping unsupported scope invalid', () => {
    expect(readDeveloperProvince('?province=western-cape')).toEqual({
      province: 'Western Cape',
      invalid: false,
    });
    expect(readDeveloperProvince('?province=Atlantis')).toEqual({
      province: undefined,
      invalid: true,
    });
    expect(readDeveloperProvince('')).toEqual({ province: undefined, invalid: false });
  });
  it('carries scope to the correct profile section and directory', () => {
    expect(developerDiscoveryHref('/developer/builder', 'Western Cape', true)).toBe(
      '/developer/builder?province=Western+Cape#developments',
    );
    expect(developerDiscoveryHref('/developers', 'Gauteng')).toBe('/developers?province=Gauteng');
  });
});
