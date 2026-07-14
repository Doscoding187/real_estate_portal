import path from 'node:path';
import { randomUUID } from 'node:crypto';
import dotenv from 'dotenv';
import { afterEach, describe, expect, it } from 'vitest';
import { and, eq } from 'drizzle-orm';

import {
  agencies, agents, agencyDealOfferVersions, agencyDeals, agencyListingPerformanceActivity,
  agencyListingPerformanceReviews, listingAnalytics, listingApprovalQueue, listingLeads, listings, properties,
  showings, users,
} from '../../drizzle/schema';
import { approveListing, createListing, getDb, submitListingForReview } from '../db';
import { appRouter } from '../routers';

dotenv.config({ path: path.resolve(process.cwd(), '.env.test'), override: true });

function usesListifyTest(url?: string) {
  try { return new URL(url || '').pathname.replace(/^\//, '') === 'listify_test'; } catch { return false; }
}
const hasTestDb = usesListifyTest(process.env.DATABASE_URL);
const guardedDescribe: typeof describe = hasTestDb ? describe : ((name, fn) => describe.skip(`${name} (requires listify_test)`, fn)) as typeof describe;
const ids = { agencies: [] as number[], users: [] as number[], agents: [] as number[], listings: [] as number[], properties: [] as number[], reviews: [] as number[], deals: [] as number[] };
const idOf = (result: any) => Number(result?.insertId || result?.[0]?.insertId || 0);
const caller = (user: { id: number; role: 'agency_admin' | 'agent'; agencyId: number }) => appRouter.createCaller({ user, req: { headers: {} }, res: {}, requestId: `performance-${Date.now()}` } as any);

async function user(agencyId: number, role: 'agency_admin' | 'agent', suffix: string, label: string) {
  const db = await getDb(); if (!db) throw new Error('Database not available');
  const [result] = await db.insert(users).values({ agencyId, role, email: `${label}-${suffix}@example.test`, name: label, firstName: label, lastName: 'Performance', phone: '+27115550000', emailVerified: 1, onboardingComplete: 1 } as any);
  const id = idOf(result); ids.users.push(id); return id;
}
async function agent(agencyId: number, userId: number, suffix: string, label: string) {
  const db = await getDb(); if (!db) throw new Error('Database not available');
  const [result] = await db.insert(agents).values({ agencyId, userId, firstName: label, lastName: 'Performance', displayName: label, email: `${label}-${suffix}@example.test`, phone: '+27115550000', whatsapp: '+27115550000', status: 'approved', isVerified: 1, isFeatured: 0 } as any);
  const id = idOf(result); ids.agents.push(id); return id;
}
async function publishedListing(ownerId: number, agencyId: number, agentId: number, suffix: string, price = 2_000_000) {
  const db = await getDb(); if (!db) throw new Error('Database not available');
  const id = await createListing({ userId: ownerId, action: 'sell', propertyType: 'house', title: `[E2E Performance] Canonical ${suffix}`, description: 'Canonical listing used only by guarded listing-performance integration coverage.', pricing: { askingPrice: price }, propertyDetails: { bedrooms: 3, bathrooms: 2, houseAreaM2: 180 }, address: '71 Snapshot Avenue', latitude: -26.1076, longitude: 28.0567, city: 'Johannesburg', province: 'Gauteng', postalCode: '2001', slug: `performance-canonical-${suffix}`.replace(/[^a-z0-9-]/g, '-'), media: [] });
  ids.listings.push(id);
  const publishedAt = new Date(Date.now() - 21 * 86_400_000).toISOString().slice(0, 19).replace('T', ' ');
  await db.update(listings).set({ agencyId, agentId, status: 'published', approvalStatus: 'approved', publishedAt, readinessScore: 100, askingPrice: String(price) } as any).where(eq(listings.id, id));
  const [property] = await db.insert(properties).values({ title: `[E2E Performance] Public ${suffix}`, description: 'Public projection for the canonical performance listing.', propertyType: 'house', listingType: 'sale', transactionType: 'sale', price, bedrooms: 3, bathrooms: 2, area: 180, address: '71 Snapshot Avenue', city: 'Johannesburg', province: 'Gauteng', latitude: '-26.1076', longitude: '28.0567', status: 'available', featured: 0, views: 0, enquiries: 0, ownerId, agentId, sourceListingId: id } as any);
  ids.properties.push(idOf(property));
  return { id, propertyId: idOf(property), publishedAt };
}

afterEach(async () => {
  if (!hasTestDb) return;
  const db = await getDb(); if (!db) return;
  for (const reviewId of ids.reviews) await db.delete(agencyListingPerformanceActivity).where(eq(agencyListingPerformanceActivity.reviewId, reviewId));
  for (const reviewId of ids.reviews) await db.delete(agencyListingPerformanceReviews).where(eq(agencyListingPerformanceReviews.id, reviewId));
  for (const dealId of ids.deals) { await db.delete(agencyDealOfferVersions).where(eq(agencyDealOfferVersions.dealId, dealId)); await db.delete(agencyDeals).where(eq(agencyDeals.id, dealId)); }
  for (const listingId of ids.listings) { await db.delete(showings).where(eq(showings.listingId, listingId)); await db.delete(listingLeads).where(eq(listingLeads.listingId, listingId)); await db.delete(listingAnalytics).where(eq(listingAnalytics.listingId, listingId)); await db.delete(listingApprovalQueue).where(eq(listingApprovalQueue.listingId, listingId)); }
  for (const propertyId of ids.properties) await db.delete(properties).where(eq(properties.id, propertyId));
  for (const listingId of [...ids.listings].reverse()) await db.delete(listings).where(eq(listings.id, listingId));
  for (const agentId of ids.agents) await db.delete(agents).where(eq(agents.id, agentId));
  for (const userId of ids.users) await db.delete(users).where(eq(users.id, userId));
  for (const agencyId of ids.agencies) await db.delete(agencies).where(eq(agencies.id, agencyId));
  Object.assign(ids, { agencies: [], users: [], agents: [], listings: [], properties: [], reviews: [], deals: [] });
});

guardedDescribe('agency listing performance MVP persisted integration', () => {
  it('keeps canonical performance, review, revision, access, and publication contracts intact', async () => {
    const db = await getDb(); if (!db) throw new Error('Database not available');
    const suffix = `${Date.now()}-${randomUUID().slice(0, 8)}`;
    const makeAgency = async (name: string) => { const [r] = await db.insert(agencies).values({ name, slug: `${name}-${suffix}`.toLowerCase().replace(/[^a-z0-9-]/g, '-'), email: `${name}-${suffix}@example.test`, city: 'Johannesburg', province: 'Gauteng', subscriptionPlan: 'premium', subscriptionStatus: 'active', isVerified: 1 } as any); const id = idOf(r); ids.agencies.push(id); return id; };
    const agencyId = await makeAgency('Performance Agency'); const outsideAgencyId = await makeAgency('Outside Performance Agency');
    const managerId = await user(agencyId, 'agency_admin', suffix, 'Manager'); const assignedUserId = await user(agencyId, 'agent', suffix, 'Assigned'); const unassignedUserId = await user(agencyId, 'agent', suffix, 'Unassigned'); const outsideManagerId = await user(outsideAgencyId, 'agency_admin', suffix, 'Outside');
    const assignedAgentId = await agent(agencyId, assignedUserId, suffix, 'Assigned'); await agent(agencyId, unassignedUserId, suffix, 'Unassigned');
    const manager = caller({ id: managerId, role: 'agency_admin', agencyId }); const assigned = caller({ id: assignedUserId, role: 'agent', agencyId }); const unassigned = caller({ id: unassignedUserId, role: 'agent', agencyId }); const outsider = caller({ id: outsideManagerId, role: 'agency_admin', agencyId: outsideAgencyId });
    const canonical = await publishedListing(managerId, agencyId, assignedAgentId, suffix);
    await db.update(listings).set({ status: 'draft' } as any).where(eq(listings.id, canonical.id));
    await expect(assigned.agency.recordListingPerformanceReview({ listingId: canonical.id, recommendation: 'review_later', sellerDecision: 'accepted', contactDate: '2026-07-13T09:00' })).rejects.toMatchObject({ code: 'PRECONDITION_FAILED' });
    await db.update(listings).set({ status: 'published' } as any).where(eq(listings.id, canonical.id));
    await db.insert(listingAnalytics).values({ listingId: canonical.id, totalViews: 37, uniqueVisitors: 25, totalLeads: 1 } as any);
    await db.insert(listingLeads).values([{ listingId: canonical.id, name: 'Counted enquiry', email: `lead-${suffix}@example.test`, leadType: 'contact_form', status: 'qualified' }, { listingId: canonical.id, name: 'Uncounted status still enquiry', leadType: 'request_info', status: 'lost' }] as any);
    await db.insert(showings).values([{ listingId: canonical.id, agentId: assignedAgentId, scheduledAt: new Date().toISOString().slice(0, 19).replace('T', ' '), status: 'requested' }, { listingId: canonical.id, agentId: assignedAgentId, scheduledAt: new Date().toISOString().slice(0, 19).replace('T', ' '), status: 'completed' }, { listingId: canonical.id, agentId: assignedAgentId, scheduledAt: new Date().toISOString().slice(0, 19).replace('T', ' '), status: 'cancelled' }] as any);
    const initial = await assigned.agency.getListingPerformance({ listingId: canonical.id });
    expect(initial.live.metrics).toMatchObject({ views: 37, enquiries: 2, viewingRequests: 1, completedViewings: 1, cancelledOrNoShowViewings: 1 });
    expect(initial.live.metrics.reviewPeriodStart).toBe(canonical.publishedAt);
    await expect(unassigned.agency.recordListingPerformanceReview({ listingId: canonical.id, recommendation: 'review_later', sellerDecision: 'accepted', contactDate: '2026-07-13T09:00' })).rejects.toMatchObject({ code: 'FORBIDDEN' });
    await expect(outsider.agency.getListingPerformance({ listingId: canonical.id })).rejects.toMatchObject({ code: 'NOT_FOUND' });
    await expect(assigned.agency.recordListingPerformanceReview({ listingId: canonical.id, recommendation: 'change_price', sellerDecision: 'accepted', contactDate: '2026-07-13T09:00' })).rejects.toMatchObject({ code: 'BAD_REQUEST' });
    const saved = await assigned.agency.recordListingPerformanceReview({ listingId: canonical.id, contactChannel: 'call', contactDate: '2026-07-13T09:00', agentAssessment: 'Interest is present but the price is preventing offers.', buyerFeedbackThemes: 'Price sensitivity; competing stock.', recommendation: 'change_price', recommendationReason: 'Comparable activity supports a measured reduction.', sellerFeedback: 'Seller accepted the recommendation.', sellerDecision: 'accepted', proposedPrice: 1_850_000, nextReviewAt: '2026-07-20T09:00' });
    ids.reviews.push(saved.reviewId);
    const ineligible = await assigned.agency.recordListingPerformanceReview({ listingId: canonical.id, contactDate: '2026-07-13T09:00', recommendation: 'review_later', sellerDecision: 'accepted' }); ids.reviews.push(ineligible.reviewId);
    await expect(assigned.agency.requestListingPerformancePriceRevision({ reviewId: ineligible.reviewId })).rejects.toMatchObject({ code: 'PRECONDITION_FAILED' });
    const [stored] = await db.select().from(agencyListingPerformanceReviews).where(eq(agencyListingPerformanceReviews.id, saved.reviewId));
    expect(stored).toMatchObject({ reviewPeriodStart: canonical.publishedAt, contactDate: '2026-07-13 09:00:00', agentAssessment: 'Interest is present but the price is preventing offers.', buyerFeedbackThemes: 'Price sensitivity; competing stock.' });
    expect((stored.metricsSnapshot as any).views).toBe(37);
    const [activity] = await db.select().from(agencyListingPerformanceActivity).where(eq(agencyListingPerformanceActivity.reviewId, saved.reviewId)); expect(activity?.eventType).toBe('seller_review_recorded');
    await db.update(listingAnalytics).set({ totalViews: 99, totalLeads: 12 } as any).where(eq(listingAnalytics.listingId, canonical.id));
    const report = await assigned.agency.getListingPerformanceReport({ reviewId: saved.reviewId });
    expect((report.review.metricsSnapshot as any).views).toBe(37); expect(report.limitations.join(' ')).toContain('external portals and offline marketing may not be included'); expect(JSON.stringify(report)).not.toContain('buyer@example');
    const myDayBefore = await assigned.agency.getMyDay({ date: '2026-07-13' }); expect(myDayBefore.performanceReviewWork.some((item: any) => item.reviewId === saved.reviewId)).toBe(true);
    const handoff = await assigned.agency.requestListingPerformancePriceRevision({ reviewId: saved.reviewId }); const repeated = await assigned.agency.requestListingPerformancePriceRevision({ reviewId: saved.reviewId });
    expect(handoff).toMatchObject({ status: 'draft', duplicate: false }); expect(repeated).toMatchObject({ revisionListingId: handoff.revisionListingId, duplicate: true }); ids.listings.push(handoff.revisionListingId);
    const [liveBeforeApproval] = await db.select().from(listings).where(eq(listings.id, canonical.id)); const [draft] = await db.select().from(listings).where(eq(listings.id, handoff.revisionListingId)); const [publicBeforeApproval] = await db.select().from(properties).where(eq(properties.id, canonical.propertyId));
    expect(draft).toMatchObject({ revisionOfListingId: canonical.id, askingPrice: '1850000.00', status: 'draft' }); expect(liveBeforeApproval.askingPrice).toBe('2000000.00'); expect(publicBeforeApproval.price).toBe(2_000_000);
    const myDayAfter = await assigned.agency.getMyDay({ date: '2026-07-13' }); expect(myDayAfter.performanceReviewWork.some((item: any) => item.reviewId === saved.reviewId && item.type === 'accepted_price_change_awaiting_revision')).toBe(false);
    await submitListingForReview(handoff.revisionListingId); const [pending] = await db.select().from(listings).where(eq(listings.id, handoff.revisionListingId)); expect(pending.status).toBe('pending_review');
    await approveListing(handoff.revisionListingId, managerId, 'Approved canonical performance revision');
    const [liveAfterApproval] = await db.select().from(listings).where(eq(listings.id, canonical.id)); const [publicAfterApproval] = await db.select().from(properties).where(eq(properties.id, canonical.propertyId)); const [archived] = await db.select().from(listings).where(eq(listings.id, handoff.revisionListingId));
    expect(liveAfterApproval.askingPrice).toBe('1850000.00'); expect(publicAfterApproval.price).toBe(1_850_000); expect(archived.status).toBe('archived');
    const conflictListing = await publishedListing(managerId, agencyId, assignedAgentId, `${suffix}-conflict`, 2_100_000);
    const conflictReview = await assigned.agency.recordListingPerformanceReview({ listingId: conflictListing.id, contactDate: '2026-07-13T09:00', recommendation: 'change_price', recommendationReason: 'Conflict coverage.', sellerDecision: 'accepted', proposedPrice: 1_900_000 }); ids.reviews.push(conflictReview.reviewId);
    const [competing] = await db.insert(listings).values({ ownerId: managerId, agentId: assignedAgentId, agencyId, action: 'sell', propertyType: 'house', title: 'Competing private revision', description: 'Private conflicting draft.', askingPrice: '1900000.00', address: '71 Snapshot Avenue', latitude: '-26.1076000', longitude: '28.0567000', city: 'Johannesburg', province: 'Gauteng', status: 'draft', approvalStatus: 'pending', slug: `competing-revision-${suffix}`.replace(/[^a-z0-9-]/g, '-'), revisionOfListingId: conflictListing.id } as any); ids.listings.push(idOf(competing));
    await expect(assigned.agency.requestListingPerformancePriceRevision({ reviewId: conflictReview.reviewId })).rejects.toMatchObject({ code: 'CONFLICT' });
    await expect(outsider.agency.requestListingPerformancePriceRevision({ reviewId: saved.reviewId })).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });
});
