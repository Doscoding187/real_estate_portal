import { getDb, resetDb } from '../server/db-connection';
import {
  runLeadDeliveryWorker,
  type LeadDeliveryDispatcher,
} from '../server/services/leadDeliveryService';

/**
 * One-shot delivery worker entrypoint. Scheduling is owned by the deployment
 * supervisor; this process never creates an in-process timer. Provider adapters
 * are registered explicitly as they gain stable idempotency support.
 */
const dispatcher: LeadDeliveryDispatcher = async claim => {
  if (claim.channel === 'none' || claim.channel === 'manual' || claim.leadCustody === 'platform_managed') {
    return { status: 'attention_required', error: 'Manual/platform custody requires operations reconciliation.' };
  }
  return {
    status: 'attention_required',
    error: `No idempotent provider adapter is registered for channel ${claim.channel}.`,
  };
};

const database = await getDb();
if (!database) throw new Error('Database unavailable');
try {
  const result = await runLeadDeliveryWorker({ database, dispatcher, limit: 25 });
  console.log(JSON.stringify(result));
} finally {
  resetDb();
}
