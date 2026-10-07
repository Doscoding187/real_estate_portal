import { describe, expect, it } from 'vitest';
import { resolveFounderGoogleLoginConfig } from './founderGoogleLoginConfig';
import type { FounderGoogleProofConfig } from './founderGoogleIdentity';

const proof: FounderGoogleProofConfig = {
  clientId: 'controlled.apps.googleusercontent.com',
  clientSecret: 'unit-only',
  founderEmail: 'founder@example.test',
  redisUrl: 'redis://127.0.0.1:6379',
  redirectUri: 'https://api.example.test/api/auth/google/callback',
  secure: true,
};
const env = {
  FOUNDER_GOOGLE_LOGIN_ENABLED: 'true',
  OWNER_OPEN_ID: 'google:' + 'P'.repeat(43),
  APP_URL: 'https://www.example.test',
};
describe('explicit Google founder admission configuration', () => {
  it.each([{}, { FOUNDER_GOOGLE_LOGIN_ENABLED: 'false' }])(
    'keeps proof nonprivileged without login opt-in',
    value => {
      expect(resolveFounderGoogleLoginConfig(proof, value)).toBeNull();
    },
  );
  it('requires the exact immutable owner binding and returns only a fixed app origin', () => {
    expect(resolveFounderGoogleLoginConfig(proof, env)).toEqual({
      ownerPrincipal: env.OWNER_OPEN_ID,
      founderEmail: proof.founderEmail,
      appOrigin: env.APP_URL,
    });
  });
  it('refuses login without the separately enabled provider proof', () => {
    expect(() => resolveFounderGoogleLoginConfig(null, env)).toThrow('unavailable');
  });
  it.each(['TRUE', '1', ' ', 'yes'])('rejects ambiguous opt-in %s', enabled => {
    expect(() =>
      resolveFounderGoogleLoginConfig(proof, { ...env, FOUNDER_GOOGLE_LOGIN_ENABLED: enabled }),
    ).toThrow('unavailable');
  });
  it.each(['', 'founder@example.test', 'google:short', 'legacy-owner'])(
    'rejects an unverified binding representation %s',
    binding => {
      expect(() =>
        resolveFounderGoogleLoginConfig(proof, { ...env, OWNER_OPEN_ID: binding }),
      ).toThrow('unavailable');
    },
  );
  it.each([
    'http://www.example.test',
    'https://www.example.test/admin',
    'https://user:pass@www.example.test',
    'https://www.example.test/?returnTo=bad',
    'https://www.example.test/#fragment',
  ])('rejects an unsafe app destination %s', url => {
    expect(() => resolveFounderGoogleLoginConfig(proof, { ...env, APP_URL: url })).toThrow(
      'unavailable',
    );
  });
});
