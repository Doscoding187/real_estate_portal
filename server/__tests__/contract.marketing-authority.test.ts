import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

describe('marketing authority boundary', () => {
  it('does not activate campaigns through placeholder revenue persistence', () => {
    const source = readFileSync(path.resolve(process.cwd(), 'server/marketingRouter.ts'), 'utf8');
    const launch = source.slice(source.indexOf('launchCampaign:'));
    expect(existsSync(path.resolve(process.cwd(), 'server/revenueCenterSync.ts'))).toBe(false);
    expect(existsSync(path.resolve(process.cwd(), 'server/campaignBoost.ts'))).toBe(false);
    expect(source).toContain('Campaign operations are unavailable until a canonical campaign authority is implemented.');
    expect(launch).toContain('launchCampaign: unavailableMutation');
    expect(source).not.toContain("import('./revenueCenterSync')");
    expect(source).not.toContain("import('./campaignBoost')");
    expect((source.match(/unavailableMutation/g) || []).length).toBe(9);
    expect((source.match(/unavailableQuery/g) || []).length).toBe(3);
    const databaseSource = readFileSync(path.resolve(process.cwd(), 'server/db.ts'), 'utf8');
    expect(databaseSource).not.toContain("import('./campaignBoost')");
  });
});
