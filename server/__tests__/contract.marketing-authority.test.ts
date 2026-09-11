import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

describe('marketing authority boundary', () => {
  it('does not activate campaigns through placeholder revenue persistence', () => {
    const source = readFileSync(path.resolve(process.cwd(), 'server/marketingRouter.ts'), 'utf8');
    const launch = source.slice(source.indexOf('launchCampaign:'));
    expect(existsSync(path.resolve(process.cwd(), 'server/revenueCenterSync.ts'))).toBe(false);
    expect(launch).toContain('Campaign launch is unavailable until a canonical campaign and billing authority is implemented.');
    expect(launch).not.toContain("import('./revenueCenterSync')");
    expect(launch).not.toContain("return { success: true, status: newStatus }");
    expect((source.match(/campaignAuthorityUnavailable\(\);/g) || []).length).toBe(9);
  });
});
