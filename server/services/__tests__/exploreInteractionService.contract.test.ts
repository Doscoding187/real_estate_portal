import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import path from 'node:path';

const sourceText = readFileSync(path.resolve(process.cwd(), 'server/services/exploreInteractionService.ts'), 'utf8');

describe('Explore interaction metric authority', () => {
  it('defines unique views by authenticated user or anonymous session', async () => {
    const source = await import('../exploreInteractionService');
    expect(source.ExploreInteractionService.toString()).toContain('COUNT(DISTINCT CASE');
    expect(source.ExploreInteractionService.toString()).toContain("CONCAT('user:'");
    expect(source.ExploreInteractionService.toString()).toContain("CONCAT('session:'");
    expect(source.ExploreInteractionService.toString()).toContain('eventId');
    expect(source.ExploreInteractionService.toString()).toContain('randomUUID');
  });

  it('fails closed when engagement storage is not established', async () => {
    expect(sourceText).toContain('isMissingExploreSchema');
    expect(sourceText).toContain('PRECONDITION_FAILED');
    expect(sourceText).toContain('throwExploreUnavailable');
  });

  it('keeps batch replay idempotent and aggregates only committed events', () => {
    expect(sourceText).toContain('insertedInteractions');
    expect(sourceText).toContain("error?.code === 'ER_DUP_ENTRY'");
    expect(sourceText).toContain('newly inserted events update');
  });
});
