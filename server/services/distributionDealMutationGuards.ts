import { TRPCError } from '@trpc/server';

export function assertDealIsMutable(
  currentStage: string | null | undefined,
  actionDescription = 'modify this deal',
) {
  if (currentStage === 'cancelled' || currentStage === 'commission_paid') {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: `Cannot ${actionDescription} for closed deals.`,
    });
  }
}
