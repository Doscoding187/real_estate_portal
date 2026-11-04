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
      /listProviderLeads\(\s*providerId:\s*number,/,
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

describe('canonical Service Partner publication authority', () => {
  const service = read('server/services/servicesEngineService.ts');
  const router = read('server/servicesEngineRouter.ts');
  const db = read('server/db.ts');
  const auditLog = read('server/_core/auditLog.ts');

  function extractMethod(source: string, signature: string, nextSignature: string): string {
    const start = source.indexOf(signature);
    if (start < 0) return '';
    const end = source.indexOf(nextSignature, start);
    return source.slice(start, end < 0 ? source.length : end);
  }

  it('exposes the reviewed publication transition only to super administrators', () => {
    expect(router).toContain('reviewProviderPublication: superAdminProcedure');
    expect(router).toContain('providerPublicationReadiness: superAdminProcedure');
  });

  it('exposes the publication review worklist to super administrators as a read', () => {
    expect(router).toContain('listProviderPublicationQueue: superAdminProcedure');
    expect(router).not.toContain('listProviderPublicationQueue: protectedProcedure');
    expect(router).not.toContain('listProviderPublicationQueue: publicProcedure');
  });

  it('keeps the publication review worklist strictly read-only', () => {
    const queueBody = extractMethod(
      service,
      'async listProviderPublicationQueue',
      'async reviewProviderPublication',
    );

    expect(queueBody).not.toBe('');
    expect(queueBody).not.toContain('update(');
    expect(queueBody).not.toContain('.insert(');
    expect(queueBody).not.toContain('.delete(');
    expect(queueBody).not.toContain('auditLogs');
  });

  it('derives queue readiness and reviewed readiness from one authority', () => {
    const singleProviderReadiness = extractMethod(
      service,
      'async readProviderPublicationReadiness',
      'async getProviderPublicationReadiness',
    );
    const queueReadiness = extractMethod(
      service,
      'async listProviderPublicationQueue',
      'async reviewProviderPublication',
    );

    expect(service).toContain('computeProviderPublicationReadiness');
    expect(singleProviderReadiness).toContain('computeProviderPublicationReadiness');
    expect(queueReadiness).toContain('computeProviderPublicationReadiness');
  });

  it('keeps publication controls out of provider self-service mutations', () => {
    // The Services provider surface exposes no publication or verification
    // writer at all; the reviewed transition is the only writer.
    expect(router).not.toContain('directoryActive');
    expect(router).not.toMatch(/verificationStatus:\s*z\./);
    expect(router).not.toMatch(/moderationTier:\s*z\./);
    expect(router).toContain('requireProviderRole(user.role)');
  });

  it('writes canonical verification and directory publication in one reviewed transition', () => {
    expect(service).toContain('reviewProviderPublication');
    expect(service).toContain('Provider is not ready for publication');
    expect(service).toMatch(
      /update\(partners\)\s*\.set\(\{ verificationStatus: 'verified' \}\)[\s\S]{0,400}update\(serviceProviderProfiles\)\s*\.set\(\{ directoryActive: 1 \}\)/,
    );
    expect(service).toContain('publicationDriftDetected');
  });

  it('records the reviewed publication transition in the canonical audit trail', () => {
    expect(auditLog).toContain('REVIEW_SERVICE_PROVIDER_PUBLICATION');
    expect(service).toContain('AuditActions.REVIEW_SERVICE_PROVIDER_PUBLICATION');
    expect(service).toContain("targetType: 'service_provider'");
  });

  it('withdraws Services directory publication when partner verification is withdrawn', () => {
    expect(db).toContain('withdrawsVerification');
    expect(db).toMatch(
      /withdrawsVerification[\s\S]{0,600}update\(serviceProviderProfiles\)\s*\.set\(\{ directoryActive: 0 \}\)/,
    );
  });

  it('bounds review reporting with a shared reporter quota', () => {
    expect(service).toContain('SERVICE_PROVIDER_REVIEW_REPORT_RATE_LIMIT');
    expect(service).toMatch(/gte\(serviceProviderReviewReports\.createdAt/);
    expect(service).toContain(".for('update')");
    expect(router).toContain('SERVICE_PROVIDER_REVIEW_REPORT_RATE_LIMITED_MESSAGE');
    expect(router).toMatch(/code:\s*'TOO_MANY_REQUESTS'/);
  });
});
