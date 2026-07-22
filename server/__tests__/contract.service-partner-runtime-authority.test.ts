import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOT = process.cwd();

function read(path: string): string {
  return readFileSync(join(ROOT, path), 'utf8');
}

describe('canonical Service Partner server runtime authority', () => {
  const service = read(
    'server/services/servicesEngineService.ts',
  );

  const router = read(
    'server/servicesEngineRouter.ts',
  );

  it('uses partners as the sole Service Partner identity authority', () => {
    expect(service).toContain('partners');

    expect(service).toContain(
      'db.insert(partners)',
    );

    expect(service).not.toContain(
      'explorePartners',
    );

    expect(service).not.toContain(
      'randomUUID',
    );
  });

  it('uses integer user and provider identities in the service layer', () => {
    expect(service).toMatch(
      /getProviderByUserId\(userId:\s*number\)/,
    );

    expect(service).not.toMatch(
      /providerId\??:\s*string/,
    );

    expect(service).not.toMatch(
      /userId\??:\s*string/,
    );
  });

  it('uses integer provider IDs across active Service Engine methods', () => {
    const requiredSignatures = [
      /getProviderById\(providerId:\s*number\)/,
      /replaceProviderServices\(providerId:\s*number,/,
      /replaceProviderLocations\(providerId:\s*number,/,
      /listProviderLeads\(providerId:\s*number,/,
      /listMyExploreVideos\(providerId:\s*number,/,
      /getProviderDashboard\(providerId:\s*number,/,
      /providerId:\s*number;\s*\n\s*title:/,
    ];

    for (const signature of requiredSignatures) {
      expect(service).toMatch(signature);
    }
  });

  it('resolves the authenticated provider as an integer ID', () => {
    expect(router).toMatch(
      /requireProviderId\(userId:\s*number\):\s*Promise<number>/,
    );

    expect(router).not.toMatch(
      /requireProviderId\(userId:\s*number\):\s*Promise<string>/,
    );

    expect(router).not.toContain(
      'String(provider.id)',
    );
  });

  it('accepts numeric provider IDs at public server boundaries', () => {
    expect(router).not.toMatch(
      /providerId:\s*z\.string\(\)/,
    );

    expect(router).toMatch(
      /providerId:\s*z\.number\(\)\.int\(\)\.positive\(\)/,
    );
  });
});
