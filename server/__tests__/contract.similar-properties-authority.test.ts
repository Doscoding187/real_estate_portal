import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

describe('similar-property history authority boundary', () => {
  it('does not acknowledge unimplemented history as an empty successful feed', () => {
    const source = readFileSync(
      path.resolve(process.cwd(), 'server/similarPropertiesRouter.ts'),
      'utf8',
    );

    expect(source).toContain("code: 'PRECONDITION_FAILED'");
    expect(source).toContain('Similar-property history is not available');
    expect(source).not.toContain('For now, return empty array');
  });

  it('anchors Explore media to property reference IDs and rejects log-only engagement', () => {
    const service = readFileSync(
      path.resolve(process.cwd(), 'server/services/similarPropertiesService.ts'),
      'utf8',
    );

    expect(service).toContain('propertyId: exploreContent.referenceId');
    expect(service).toContain('inArray(exploreContent.referenceId, propertyIds)');
    expect(service).toContain('canonical engagement authority');
    expect(service).not.toContain('For now, just log it');
  });

  it('rechecks current public eligibility for the reference and candidates', () => {
    const service = readFileSync(
      path.resolve(process.cwd(), 'server/services/similarPropertiesService.ts'),
      'utf8',
    );

    expect(service).toContain('resolvePublicPropertyEligibilityIds([propertyId])');
    expect(service).toContain('filterEligibleCandidates');
    expect(service).toContain('resolvePublicPropertyEligibilityIds(rows.map');
  });
});
