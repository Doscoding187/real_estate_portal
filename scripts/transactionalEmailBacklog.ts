import { getWorkerDb, resetDb } from '../server/db-connection';
import { transactionalEmailBacklog } from '../server/services/transactionalEmailDeliveryService';

const database = await getWorkerDb();
if (!database) throw new Error('Transactional email report database unavailable.');
try {
  console.log(JSON.stringify(await transactionalEmailBacklog(database), null, 2));
} finally {
  resetDb();
}
