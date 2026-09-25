import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOT = process.cwd();

function read(path: string): string {
  return readFileSync(join(ROOT, path), 'utf8');
}

describe('canonical Service Partner server runtime authority', () => {
  const service = read('server/services/servicesEngineService.ts');

  const router = read('server/servicesEngineRouter.ts');

  it('uses partners as the sole Service Partner identity authority', () => {
    expect(service).toContain('partners');

    expect(service).toContain('insert(partners)');

    expect(service).not.toContain('explorePartners');

    expect(service).not.toContain('randomUUID');
  });

  it('uses integer user and provider identities in the service layer', () => {
    expect(service).toMatch(/getProviderByUserId\(userId:\s*number\)/);

    expect(service).not.toMatch(/providerId\??:\s*string/);

    expect(service).not.toMatch(/userId\??:\s*string/);
  });

  it('uses integer provider IDs across active Service Engine methods', () => {
    const requiredSignatures = [
      /getProviderById\(providerId:\s*number\)/,
      /replaceProviderServices\(providerId:\s*number,/,
      /replaceProviderLocations\(providerId:\s*number,/,
      /listProviderLeads\(providerId:\s*number,/,
      /getProviderDashboard\(providerId:\s*number,/,
    ];

    for (const signature of requiredSignatures) {
      expect(service).toMatch(signature);
    }
  });

  it('resolves the authenticated provider as an integer ID', () => {
    expect(router).toMatch(/requireProviderId\(userId:\s*number\):\s*Promise<number>/);

    expect(router).not.toMatch(/requireProviderId\(userId:\s*number\):\s*Promise<string>/);

    expect(router).not.toContain('String(provider.id)');
  });

  it('does not expose Explore publishing from the Services V1 server boundary', () => {
    expect(service).not.toContain('serviceExploreVideos');
    expect(router).not.toContain('submitExploreVideo');
    expect(router).not.toContain('myExploreVideos');
    expect(router).not.toContain('recommendProviders');
    expect(router).not.toContain('logEvent');
  });

  it('enforces the Services V1 public and enquiry boundaries', () => {
    expect(service).toContain('isProviderDirectoryEligible');
    expect(service).toContain('publicDirectorySearch');
    expect(service).toContain('getServiceLeadForViewer');
    expect(service).toContain("eq(partners.verificationStatus, 'verified')");
    expect(service).toContain('providerCoversLocation');
    expect(service).toContain(".for('update')");
    expect(service).toContain('eq(serviceLeads.requestId, requestId)');
    expect(service).toContain('serviceRequestContextsMatch');
    expect(service).toContain('hasProviderCoverage');
    expect(service).not.toContain('JSON_UNQUOTE(JSON_EXTRACT');
    expect(service).not.toContain('requestKey,');
    expect(router).toContain('{16,120}');
    expect(service).toContain('requestId,');

    expect(service).toContain("property.status === 'published'");
    expect(router).toContain('getLead: protectedProcedure');

    expect(router).toContain('serviceCode: serviceCodeSchema');
    expect(router).toContain('requestKey: requestKeySchema');
    expect(router).toContain('requesterRole: user.role');
    expect(router).toContain('checkPublicLeadRateLimit');

    expect(router).not.toContain("'explore'");
    expect(router).toContain('A request area is required');
  });

  it('accepts numeric provider IDs at public server boundaries', () => {
    expect(router).not.toMatch(/providerId:\s*z\.string\(\)/);

    expect(router).toMatch(/providerId:\s*z\.number\(\)\.int\(\)\.positive\(\)/);
  });
});
