import { TRPCError } from '@trpc/server';
import { z } from 'zod';

import { protectedProcedure, router } from './_core/trpc';

/**
 * Campaign persistence is intentionally unavailable until its schema,
 * billing authority, ownership checks, and lifecycle are admitted together.
 * Keep the procedure names so clients receive a truthful typed failure while
 * no placeholder table can be queried or mutated.
 */
function campaignAuthorityUnavailable(): never {
  throw new TRPCError({
    code: 'PRECONDITION_FAILED',
    message: 'Campaign operations are unavailable until a canonical campaign authority is implemented.',
  });
}

const unavailableMutation = protectedProcedure.input(z.any()).mutation(() => campaignAuthorityUnavailable());
const unavailableQuery = protectedProcedure.input(z.any()).query(() => campaignAuthorityUnavailable());

export const marketingRouter = router({
  createCampaign: unavailableMutation,
  getCampaign: unavailableQuery,
  listCampaigns: unavailableQuery,
  updateCampaign: unavailableMutation,
  updateTargeting: unavailableMutation,
  updateBudget: unavailableMutation,
  updateSchedule: unavailableMutation,
  updateChannels: unavailableMutation,
  updateCreative: unavailableMutation,
  launchCampaign: unavailableMutation,
});
