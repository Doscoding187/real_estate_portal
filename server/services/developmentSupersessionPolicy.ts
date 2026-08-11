import { and, eq, inArray, or } from 'drizzle-orm';
import { TRPCError } from '@trpc/server';
import { developmentSupersessions } from '../../drizzle/schema';

export const DEVELOPMENT_SUPERSESSION_OPEN_STATUSES = ['verified', 'active'] as const;
export type DevelopmentSupersessionOpenStatus =
  (typeof DEVELOPMENT_SUPERSESSION_OPEN_STATUSES)[number];

export const SUPERSESSION_ACTIVATION_REQUIRED = 'SUPERSESSION_ACTIVATION_REQUIRED';
export const SUPERSESSION_REVERSAL_REQUIRED = 'SUPERSESSION_REVERSAL_REQUIRED';

type TransactionHandle = {
  select: (...args: any[]) => any;
};

export async function lockSupersessionRowsForEndpoint(
  tx: TransactionHandle,
  developmentId: number,
) {
  return tx
    .select()
    .from(developmentSupersessions)
    .where(
      and(
        or(
          eq(developmentSupersessions.sourceDevelopmentId, developmentId),
          eq(developmentSupersessions.replacementDevelopmentId, developmentId),
        ),
        inArray(developmentSupersessions.status, DEVELOPMENT_SUPERSESSION_OPEN_STATUSES),
      ),
    )
    .for('update');
}

export async function assertDevelopmentPublicTransitionAllowed(
  tx: TransactionHandle,
  developmentId: number,
  options: { allowVerifiedRelationshipId?: number } = {},
): Promise<void> {
  const rows = await lockSupersessionRowsForEndpoint(tx, developmentId);

  for (const row of rows) {
    if (options.allowVerifiedRelationshipId === Number(row.id) && row.status === 'verified') {
      continue;
    }

    if (row.status === 'verified') {
      throw new TRPCError({
        code: 'CONFLICT',
        message: SUPERSESSION_ACTIVATION_REQUIRED,
      });
    }

    if (row.status === 'active' && Number(row.sourceDevelopmentId) === developmentId) {
      throw new TRPCError({
        code: 'CONFLICT',
        message: SUPERSESSION_REVERSAL_REQUIRED,
      });
    }

    throw new TRPCError({
      code: 'CONFLICT',
      message: SUPERSESSION_ACTIVATION_REQUIRED,
    });
  }
}
