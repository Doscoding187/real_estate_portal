import { describe, expect, it } from 'vitest';
import { BACKEND_HOSTS, parseDeployEnv, requireApiUrl } from './env.contract';

describe('frontend API environment contract', () => {
  it('uses exact approved production and staging API hosts', () => {
    expect([...BACKEND_HOSTS.production]).toEqual(['api.propertylistifysa.co.za']);
    expect([...BACKEND_HOSTS.staging]).toEqual(['api-staging.propertylistifysa.co.za']);
    expect(BACKEND_HOSTS.staging.has('api.propertylistifysa.co.za')).toBe(false);
    expect(BACKEND_HOSTS.preview.has('api.propertylistifysa.co.za')).toBe(false);
  });

  it('requires an origin with no path, query, or credentials', () => {
    expect(requireApiUrl('https://api-staging.propertylistifysa.co.za'))
      .toBe('https://api-staging.propertylistifysa.co.za');
    expect(() => requireApiUrl('https://api-staging.propertylistifysa.co.za/api'))
      .toThrow(/origin without path/);
    expect(() => requireApiUrl('https://user:pass@api-staging.propertylistifysa.co.za'))
      .toThrow(/origin without path/);
  });

  it('keeps unknown deployment labels outside authenticated staging', () => {
    expect(parseDeployEnv('staging')).toBe('staging');
    expect(parseDeployEnv('preview')).toBe('preview');
    expect(parseDeployEnv('unrecognized')).toBe('development');
  });
});
