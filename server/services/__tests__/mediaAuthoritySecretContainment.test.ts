import { afterEach, describe, expect, it, vi } from 'vitest';
import { createListingMediaUploadToken } from '../listingMediaAuthority';
import { createDeveloperMediaUploadReceipt } from '../developerMediaAuthority';

function listingToken() {
  return createListingMediaUploadToken({
    key: 'properties/draft-42/house.png',
    mediaType: 'image',
    contentType: 'image/png',
    fileName: 'house.png',
    userId: 42,
  });
}

function developerReceipt() {
  return createDeveloperMediaUploadReceipt({
    key: 'properties/draft-42/development.png',
    mediaType: 'image',
    contentType: 'image/png',
    fileName: 'development.png',
    userId: 42,
    organisationId: 7,
    publisherId: 9,
    developmentId: null,
    unitId: null,
    category: 'development_image',
    fileSize: null,
    confirmed: false,
  });
}

afterEach(() => vi.unstubAllEnvs());

describe('launch media signing-secret containment', () => {
  it.each(['staging', 'production'] as const)(
    'rejects development signing fallbacks in %s',
    runtimeEnv => {
      vi.stubEnv('NODE_ENV', runtimeEnv);
      vi.stubEnv('APP_ENV', runtimeEnv);
      vi.stubEnv('MEDIA_UPLOAD_TOKEN_SECRET', '');
      vi.stubEnv('JWT_SECRET', '');

      expect(() => listingToken()).toThrow(/not configured securely/i);
      expect(() => developerReceipt()).toThrow(/not configured securely/i);
    },
  );

  it('requires a dedicated strong media token secret in deployed environments', () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('APP_ENV', 'production');
    vi.stubEnv('JWT_SECRET', 'strong-session-secret-with-enough-characters-12345');
    vi.stubEnv('MEDIA_UPLOAD_TOKEN_SECRET', 'short');

    expect(() => listingToken()).toThrow(/not configured securely/i);
    expect(() => developerReceipt()).toThrow(/not configured securely/i);
  });

  it('preserves the governed local fallback only in development/test', () => {
    vi.stubEnv('NODE_ENV', 'test');
    vi.stubEnv('APP_ENV', 'test');
    vi.stubEnv('JWT_SECRET', '');
    vi.stubEnv('MEDIA_UPLOAD_TOKEN_SECRET', '');

    expect(listingToken()).toContain('.');
    expect(developerReceipt()).toContain('.');
  });
});
