import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const root = path.resolve(__dirname, '..', '..');
const source = readFileSync(path.join(root, 'server/agencyRouter.ts'), 'utf8');

describe('agency listing performance API contract', () => {
  it('keeps invalid input, lifecycle, conflict, and access semantics distinct', () => {
    const reviewPath = source.slice(
      source.indexOf('recordListingPerformanceReview: protectedProcedure'),
      source.indexOf('requestListingPerformancePriceRevision: protectedProcedure'),
    );
    const revisionPath = source.slice(
      source.indexOf('requestListingPerformancePriceRevision: protectedProcedure'),
      source.indexOf('getMyDay: agentProcedure'),
    );

    expect(reviewPath).toMatch(/code:\s*'BAD_REQUEST',\s*message:\s*'A contact date is required/);
    expect(reviewPath).toMatch(
      /code:\s*'BAD_REQUEST',\s*message:\s*'A proposed price and rationale are required/,
    );
    expect(reviewPath).toMatch(
      /code:\s*'PRECONDITION_FAILED',\s*message:\s*'Seller reviews can only be recorded for published listings\.'/,
    );
    expect(revisionPath).toMatch(
      /code:\s*'PRECONDITION_FAILED',\s*message:\s*'Only an accepted price recommendation/,
    );
    expect(revisionPath).toMatch(
      /code:\s*'CONFLICT',\s*message:\s*'Another listing revision is already in progress\./,
    );
    expect(revisionPath).toContain('await requirePerformanceListingAccess(db, user, review.listingId);');
  });

  it('persists the seller contact date separately from the immutable snapshot boundary', () => {
    expect(source).toContain('contactDate: input.contactDate ? toDbTimestampRequired(input.contactDate) : null');
    expect(source).toContain('reviewPeriodStart: snapshot.metrics.reviewPeriodStart');
    expect(readFileSync(path.join(root, 'drizzle/schema/listingPerformance.ts'), 'utf8')).toContain("contactDate: timestamp('contact_date'");
  });
});
