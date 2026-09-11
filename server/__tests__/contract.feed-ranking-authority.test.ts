import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

describe('feed ranking authority boundary', () => {
  it('does not silently discard canonical campaign, quality, or trust query failures', () => {
    const source = readFileSync(
      path.resolve(process.cwd(), 'server/services/feedRankingService.ts'),
      'utf8',
    );

    expect(source).toContain("console.error('Error fetching quality scores:', error);");
    expect(source).toContain("console.error('Error fetching partner trust scores:', error);");
    expect(source).not.toContain(
      "console.error('Error fetching quality scores:', error);\n      return {};",
    );
    expect(source).not.toContain(
      "console.error('Error fetching partner trust scores:', error);\n      return {};",
    );
  });

  it('does not read an unapproved boost-campaign authority', () => {
    const source = readFileSync(
      path.resolve(process.cwd(), 'server/services/feedRankingService.ts'),
      'utf8',
    );
    expect(source).not.toContain('exploreBoostCampaigns');
    expect(source).not.toContain('getActiveCampaigns');
  });

  it('does not expose fabricated state from the retired boost service', () => {
    const source = readFileSync(
      path.resolve(process.cwd(), 'server/services/boostCampaignService.ts'),
      'utf8',
    );
    expect(source).toContain('canonical campaign and billing authority');
    expect(source).not.toContain("status: 'disabled'");
    expect(source).not.toContain('// No-op');
  });
});
