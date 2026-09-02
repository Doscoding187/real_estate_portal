import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

import { assertDevelopmentDeletionAllowed } from '../developmentService';

type DeletionCandidate = Parameters<typeof assertDevelopmentDeletionAllowed>[0];

function candidate(
  approvalStatus: DeletionCandidate['approvalStatus'],
  isPublished: DeletionCandidate['isPublished'],
): DeletionCandidate {
  return { approvalStatus, isPublished };
}

describe('development deletion safety policy', () => {
  it('allows only private, non-review development records to enter hard deletion', () => {
    expect(() => assertDevelopmentDeletionAllowed(candidate('draft', 0))).not.toThrow();
    expect(() => assertDevelopmentDeletionAllowed(candidate('rejected', 0))).not.toThrow();
    expect(() => assertDevelopmentDeletionAllowed(candidate('approved', 0))).not.toThrow();

    expect(() => assertDevelopmentDeletionAllowed(candidate('approved', 1))).toThrow(
      /live development cannot be deleted/i,
    );
    expect(() => assertDevelopmentDeletionAllowed(candidate('pending', 0))).toThrow(
      /under review cannot be deleted/i,
    );
  });

  it('keeps ownership, lead history, and dependent-record cleanup in one transaction', () => {
    const source = readFileSync(
      resolve(process.cwd(), 'server/services/developmentService.ts'),
      'utf8',
    );

    expect(source).toContain('return db.transaction(async (tx: any) => {');
    expect(source).toContain('assertDevelopmentDeletionAllowed(owned);');
    expect(source).toContain('.from(leads)');
    expect(source).toContain('A development with recorded enquiries cannot be deleted.');
    expect(source).toContain('await tx\n      .delete(developmentDrafts)');
    expect(source).not.toContain('userId !== -1');
  });
});
