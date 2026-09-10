import { describe, expect, it } from 'vitest';

describe('Explore interaction metric authority', () => {
  it('defines unique views by authenticated user or anonymous session', async () => {
    const source = await import('../exploreInteractionService');
    expect(source.ExploreInteractionService.toString()).toContain('COUNT(DISTINCT CASE');
    expect(source.ExploreInteractionService.toString()).toContain("CONCAT('user:'");
    expect(source.ExploreInteractionService.toString()).toContain("CONCAT('session:'");
  });
});
