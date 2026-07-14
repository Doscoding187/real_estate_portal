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

    expect(reviewPath).toContain("code: 'BAD_REQUEST', message: 'A contact date is required");
    expect(reviewPath).toContain("code: 'BAD_REQUEST', message: 'A proposed price and rationale are required");
    expect(reviewPath).toContain("code: 'PRECONDITION_FAILED', message: 'Seller reviews can only be recorded for published listings.'");
    expect(revisionPath).toContain("code: 'PRECONDITION_FAILED', message: 'Only an accepted price recommendation");
    expect(revisionPath).toContain("code: 'CONFLICT', message: 'Another listing revision is already in progress.");
    expect(revisionPath).toContain('await requirePerformanceListingAccess(db, user, review.listingId);');
  });

  it('persists the seller contact date separately from the immutable snapshot boundary', () => {
    expect(source).toContain('contactDate: input.contactDate ? toDbTimestampRequired(input.contactDate) : null');
    expect(source).toContain('reviewPeriodStart: snapshot.metrics.reviewPeriodStart');
    expect(readFileSync(path.join(root, 'drizzle/schema/listingPerformance.ts'), 'utf8')).toContain("contactDate: timestamp('contact_date'");
  });
});
