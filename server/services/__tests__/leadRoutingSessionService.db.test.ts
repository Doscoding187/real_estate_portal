import { afterEach, describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import { getDb } from '../../db';
import { leadCampaigns, leadEvents, leadFunnelSessions } from '../../../drizzle/schema';
import {
  getLeadFunnelSessionByToken,
  startLeadFunnelSession,
} from '../leadRoutingSessionService';

const describeWithDb = process.env.DATABASE_URL ? describe : describe.skip;

const getInsertId = (insertResult: unknown): number => {
  const candidate = Array.isArray(insertResult) ? insertResult[0] : insertResult;
  if (candidate && typeof candidate === 'object' && 'insertId' in candidate) {
    return Number((candidate as { insertId: number }).insertId);
  }
  throw new Error('Unable to read insertId from insert result');
};

describeWithDb('leadRoutingSessionService DB persistence', () => {
  const createdCampaignIds: number[] = [];
  const createdSessionIds: number[] = [];

  afterEach(async () => {
    const db = await getDb();
    if (!db) return;

    for (const sessionId of createdSessionIds.splice(0).reverse()) {
      await db.delete(leadEvents).where(eq(leadEvents.sessionId, sessionId));
      await db.delete(leadFunnelSessions).where(eq(leadFunnelSessions.id, sessionId));
    }
    for (const campaignId of createdCampaignIds.splice(0).reverse()) {
      await db.delete(leadCampaigns).where(eq(leadCampaigns.id, campaignId));
    }
  });

  it('creates, retrieves, and audits a lead funnel session', async () => {
    const db = await getDb();
    expect(db).toBeTruthy();

    const suffix = `${Date.now()}`;
    const campaignSlug = `lead-routing-db-${suffix}`;
    const campaignInsert = await db.insert(leadCampaigns).values({
      slug: campaignSlug,
      title: `Lead Routing DB Test ${suffix}`,
      status: 'active',
      acceptedSourceTypes: ['meta_ads', 'google_ads'],
      campaignPriority: 10,
      configJson: { test: true },
    });
    const campaignId = getInsertId(campaignInsert);
    createdCampaignIds.push(campaignId);

    const started = await startLeadFunnelSession({
      campaignSlug,
      sourceType: 'meta_ads',
      utmSource: 'facebook',
      utmCampaign: `recovery-${suffix}`,
      fbclid: `fbclid-${suffix}`,
      landingPageUrl: `https://example.test/lead-routing/${suffix}`,
      metadata: { recoveryTest: true, suffix },
      ttlHours: 2,
    });
    createdSessionIds.push(started.sessionId);

    expect(started).toMatchObject({
      campaignId,
      sourceType: 'meta_ads',
    });
    expect(started.sessionToken).toMatch(/^[A-Za-z0-9_-]+$/);

    const [persistedSession] = await db
      .select()
      .from(leadFunnelSessions)
      .where(eq(leadFunnelSessions.id, started.sessionId))
      .limit(1);

    expect(persistedSession).toMatchObject({
      id: started.sessionId,
      campaignId,
      sessionToken: started.sessionToken,
      sourceType: 'meta_ads',
      status: 'active',
      utmSource: 'facebook',
      utmCampaign: `recovery-${suffix}`,
      fbclid: `fbclid-${suffix}`,
    });

    const fetched = await getLeadFunnelSessionByToken(started.sessionToken);
    expect(fetched).toMatchObject({
      id: started.sessionId,
      campaignId,
      sessionToken: started.sessionToken,
      sourceType: 'meta_ads',
      status: 'active',
    });

    const events = await db
      .select()
      .from(leadEvents)
      .where(eq(leadEvents.sessionId, started.sessionId));

    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      sessionId: started.sessionId,
      campaignId,
      sourceType: 'meta_ads',
      eventType: 'session_created',
    });
  });
});
