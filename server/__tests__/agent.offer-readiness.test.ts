import { MySqlDialect } from 'drizzle-orm/mysql-core';
import { describe, expect, it, vi } from 'vitest';
import { __agentOfferReadinessTestHooks } from '../agentRouter';
import { serializeAgentLeadOfferReadiness } from '../../shared/agentLeadOfferReadiness';

type OfferReadinessHook = typeof __agentOfferReadinessTestHooks.getAgentOfferReadiness;

function createOfferReadinessDb(metadata: string) {
  const limit = vi.fn(() => Promise.resolve([{ metadata }]));
  const orderBy = vi.fn(() => ({ limit }));
  const where = vi.fn(() => ({ orderBy }));
  const from = vi.fn(() => ({ where }));
  const select = vi.fn(() => ({ from }));

  return {
    db: { select },
    limit,
    where,
  };
}

describe('agent offer-readiness lookup', () => {
  it('filters to the newest readiness snapshot before applying its record cap', async () => {
    const metadata = JSON.stringify(
      serializeAgentLeadOfferReadiness({
        viewingCompleted: true,
        feedbackLogged: true,
        affordabilityConfirmed: true,
      }),
    );
    const { db, limit, where } = createOfferReadinessDb(metadata);

    const result = await __agentOfferReadinessTestHooks.getAgentOfferReadiness(
      db as unknown as Parameters<OfferReadinessHook>[0],
      {
        id: 91,
        agentId: 24,
        lastContactedAt: '2026-09-02 10:00:00',
        qualificationStatus: 'qualified',
      } as Parameters<OfferReadinessHook>[1],
    );

    const query = new MySqlDialect().sqlToQuery(where.mock.calls[0][0]);
    expect(query.sql.toLowerCase()).toContain(' like ');
    expect(query.params).toContain('%"kind":"agent_lead_offer_readiness","version":1%');
    expect(limit).toHaveBeenCalledWith(1);
    expect(result).toMatchObject({
      readiness: {
        viewingCompleted: true,
        feedbackLogged: true,
        affordabilityConfirmed: true,
      },
      canMoveToOffer: true,
      blockers: [],
    });
  });
});
