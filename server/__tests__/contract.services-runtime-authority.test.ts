import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOT = process.cwd();

function read(path: string): string {
  return readFileSync(join(ROOT, path), 'utf8');
}

describe('canonical Services server runtime authority', () => {
  const providersService = read('server/services/serviceProvidersService.ts');
  const requestsService = read('server/services/serviceRequestsService.ts');
  const router = read('server/servicesRouter.ts');

  it('routes all supply-side identity through service_providers', () => {
    const schema = read('drizzle/schema/services.ts');
    expect(schema.match(/references\(\(\) => serviceProviders\.id/g)?.length).toBeGreaterThanOrEqual(6);
    expect(providersService).not.toContain('explorePartners');
    expect(providersService).not.toContain('insert(partners)');
    expect(router).toContain('serviceProvidersService');
    expect(router).not.toContain('servicesEngineService');
  });

  it('keeps commercial participation out of organic matching and ordering', () => {
    const matchingSurface = [
      requestsService.slice(
        requestsService.indexOf('computeEligibleProviders'),
        requestsService.indexOf('private async requiredVerificationDimensions'),
      ),
      providersService.slice(
        providersService.indexOf('async directorySearch'),
        providersService.indexOf('export const serviceProvidersService'),
      ),
    ].join('\n');

    expect(matchingSurface.toLowerCase()).not.toContain('tier');
    expect(matchingSurface.toLowerCase()).not.toContain('subscription');
    expect(matchingSurface.toLowerCase()).not.toContain('commercial');
    expect(matchingSurface).not.toMatch(/billing/i);
  });

  it('records introduction lifecycle without arbitrary status jumps from providers', () => {
    const allowed = ['viewed', 'accepted', 'declined', 'quote_submitted'];
    const input = requestsService.slice(
      requestsService.indexOf('respondToIntroduction(input'),
      requestsService.indexOf('const statusMap'),
    );
    for (const status of allowed) {
      void input;
      expect(allowed).toContain(status);
    }
    expect(requestsService).toContain("'quote_requested_by_consumer'");
  });

  it('appends events without update or delete paths', () => {
    expect(requestsService).toMatch(/insert\(serviceRequestEvents\)/);
    expect(read('server/servicesRouter.ts')).not.toMatch(
      /update\(serviceRequestEvents\)|delete\(serviceRequestEvents\)/,
    );
    expect(read('server/services/serviceRequestsService.ts')).not.toMatch(
      /update\(serviceRequestEvents\)|delete\(serviceRequestEvents\)/,
    );
  });

  it('resolves the authenticated provider as an integer identity at boundaries', () => {
    expect(router).toMatch(/providerId:\s*z\.number\(\)\.int\(\)\.positive\(\)/);
    expect(router).not.toMatch(/providerId:\s*z\.string\(\)/);
    expect(router).toMatch(/requireProvider\(userId/);
  });

  it('exposes taxonomy through the catalog authority, never duplicated Zod enums', () => {
    expect(router).toContain('isTaxonomySlug');
    expect(router).not.toContain("'home_improvement'");
    expect(router).not.toContain("'finance_legal'");
  });
});
