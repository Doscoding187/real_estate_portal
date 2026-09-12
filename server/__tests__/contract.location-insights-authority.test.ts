import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

describe('location insights authority boundary', () => {
  it('does not acknowledge writes when the review schema is not authoritative', () => {
    const source = readFileSync(
      path.resolve(process.cwd(), 'server/services/locationInsightsService.ts'),
      'utf8',
    );

    expect(source).toContain("code: 'PRECONDITION_FAILED'");
    expect(source).toContain('canonical schema is approved');
    expect(source).not.toContain('Reviews temporarily disabled');
    expect(source).not.toContain('submitReview called but disabled');
    expect(source).not.toContain('returning mock insights');
    expect(source).not.toContain("source: 'mock'");
  });
});
